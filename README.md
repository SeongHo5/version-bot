# version-bot

PR 코멘트 한 줄로 Maven/Gradle 버전을 올리거나 지정 버전으로 바꾸고, 변경 파일을 자동 커밋/푸시하는 GitHub Action입니다.

## 주요 기능
- PR 코멘트 기반 버전 변경 (`bump`, `set`)
- Maven/Gradle 자동 감지 (`--tool`로 강제 가능)
- `-SNAPSHOT` 유지/제거 제어 (`--keepSnapshot`)
- 실제 반영 없이 미리보기 실행 (`--dryRun`)
- 작성자 권한 기반 실행 제한 (`allowedAssociations`)
- 커밋 메시지 템플릿 및 author 정보 커스터마이징

## 지원 파일
- Maven: `pom.xml`
- Gradle: `gradle.properties`
- Gradle: `build.gradle`
- Gradle: `build.gradle.kts`

## 빠른 시작
1. 리포지토리에 워크플로우 파일을 만듭니다. 예: `.github/workflows/version-bot.yml`
2. 아래 예시를 붙여 넣고 `uses` 버전을 원하는 태그로 맞춥니다.
3. PR 코멘트에 `/ver bump patch`를 입력합니다.
4. 액션이 버전 파일을 수정하고 자동 커밋/푸시합니다.

## Workflow 설정 가이드
아래 설정은 가장 일반적인 PR 코멘트 기반 동작입니다.

```yaml
name: version-bot

on:
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: read

jobs:
  bump:
    if: >
      github.event.issue.pull_request &&
      startsWith(github.event.comment.body, '/ver ')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: refs/pull/${{ github.event.issue.number }}/head
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run version-bot action
        uses: SeongHo5/version-bot@0.1.1
        with:
          comment: ${{ github.event.comment.body }}
          commandPrefix: /ver
          tool: auto
          prefer: maven
          defaultBump: patch
          keepSnapshot: true
          dryRun: false
          allowedAssociations: OWNER,MEMBER,COLLABORATOR
```

## 명령 사용법
액션은 코멘트 **첫 줄만** 읽습니다.

```text
/ver bump patch
/ver bump minor
/ver bump major
/ver bump +1
/ver set 1.2.3
/ver set 1.2.3-SNAPSHOT
```

옵션을 함께 쓰는 예시:

```text
/ver bump patch --tool auto --prefer maven --dryRun true
/ver set 2.0.0 --tool gradle --target build.gradle.kts
/ver set 1.4.0-SNAPSHOT --keepSnapshot false
```

## 입력값 설명

| Input                   | Required | Default                                      | 설명                        |
|-------------------------|----------|----------------------------------------------|---------------------------|
| `comment`               | yes      | -                                            | PR comment body           |
| `commandPrefix`         | no       | `/ver`                                       | 명령 프리픽스                   |
| `tool`                  | no       | `auto`                                       | `auto`, `maven`, `gradle` |
| `prefer`                | no       | `maven`                                      | auto 감지 시 우선순위            |
| `defaultBump`           | no       | `patch`                                      | `bump +1` 기본 전략           |
| `keepSnapshot`          | no       | `true`                                       | `-SNAPSHOT` 유지 여부         |
| `dryRun`                | no       | `false`                                      | 파일 수정/커밋/푸시 없이 로그만 출력     |
| `allowedAssociations`   | no       | `OWNER,MEMBER,COLLABORATOR`                  | 허용할 코멘트 작성자 권한(CSV)       |
| `commitMessageTemplate` | no       | `chore(version): {tool} {before} -> {after}` | 커밋 메시지 템플릿                |
| `authorName`            | no       | `version-bot`                                | git author name           |
| `authorEmail`           | no       | `version-bot@users.noreply.github.com`       | git author email          |

## 버전 규칙
- 허용 형식: `X.Y.Z` 또는 `X.Y.Z-SNAPSHOT`
- `bump patch`: `X.Y.Z -> X.Y.(Z+1)`
- `bump minor`: `X.Y.Z -> X.(Y+1).0`
- `bump major`: `X.Y.Z -> (X+1).0.0`
- `set`: 지정한 버전으로 변경
- `keepSnapshot=false`: 최종 결과에서 `-SNAPSHOT` 제거

## 권한/보안 가이드
- 기본적으로 `OWNER`, `MEMBER`, `COLLABORATOR`만 허용됩니다.
- 외부 기여자 코멘트를 허용하려면 `allowedAssociations`를 명시적으로 변경하세요.
- 이 액션은 커밋/푸시를 수행하므로 workflow `permissions.contents: write`가 필요합니다.

## 실행 결과
- 변경이 있으면 지정 파일 1개를 수정하고 커밋/푸시합니다.
- 변경이 없으면 `버전 변경 없음` 로그만 남기고 종료합니다.
- `dryRun=true`이면 변경 예정 내용만 출력하고 종료합니다.

## 로컬 개발
```bash
npm install
npm test
npm run build
```
