import * as core from "@actions/core";
import * as github from "@actions/github";
import path from "node:path";

import { parseCommandLine, ParsedLine } from "./lib/command";
import { gitCommitPushIfChanged, gitConfigUser, gitStage } from "./lib/git";
import { fileExists } from "./lib/fs";
import {
  normalizeBoolStrict,
  normalizeBump,
  normalizePrefer,
  normalizeTool,
  PreferInput,
  ToolInput,
} from "./lib/inputs";
import { inferToolFromTarget } from "./lib/targets";

import { MavenUpdater } from "./updaters/maven";
import { GradleUpdater } from "./updaters/gradle";

type Tool = ToolInput;
type Prefer = PreferInput;

function getAuthorAssociation(): string {
  const association =
    (github.context.payload as any)?.comment?.author_association ??
    (github.context.payload as any)?.sender?.type ??
    "NONE";
  return String(association).toUpperCase();
}

function assertAllowedAssociation(allowedCsv: string) {
  const allowed = new Set(
    allowedCsv
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
  const association = getAuthorAssociation();
  if (!allowed.has(association)) {
    throw new Error(
      `권한 없음: author_association=${association}, allowed=${Array.from(allowed).join(",")}`,
    );
  }
}

async function pickUpdater(tool: Tool, prefer: Prefer) {
  const maven = new MavenUpdater();
  const gradle = new GradleUpdater();

  if (tool === "maven") {
    return maven;
  }
  if (tool === "gradle") {
    return gradle;
  }

  const hasPom = await maven.detect(process.cwd());
  const hasGradle = await gradle.detect(process.cwd());

  if (hasPom && hasGradle) return prefer === "maven" ? maven : gradle;
  if (hasPom) return maven;
  if (hasGradle) return gradle;

  throw new Error(
    "지원되는 빌드 파일을 찾지 못함: Expected pom.xml or gradle.properties/build.gradle(.kts)",
  );
}

async function run() {
  try {
    const comment = core.getInput("comment", { required: true });
    const commandPrefix = core.getInput("commandPrefix") || "/ver";

    // workflow/action input 기본값 (코멘트 옵션으로 override 가능)
    const baseTool = normalizeTool(core.getInput("tool") || "auto");
    const basePrefer = normalizePrefer(core.getInput("prefer") || "maven");
    const defaultBump = normalizeBump(core.getInput("defaultBump") || "patch");
    const baseKeepSnapshot = normalizeBoolStrict(
      core.getInput("keepSnapshot") || "true",
      "keepSnapshot",
    );
    const baseDryRun = normalizeBoolStrict(
      core.getInput("dryRun") || "false",
      "dryRun",
    );

    const allowedAssociations =
      core.getInput("allowedAssociations") || "OWNER,MEMBER,COLLABORATOR";
    const commitMessageTemplate =
      core.getInput("commitMessageTemplate") ||
      "chore(version): {tool} {before} -> {after}";
    const authorName = core.getInput("authorName") || "version-bot";
    const authorEmail =
      core.getInput("authorEmail") || "version-bot@users.noreply.github.com";

    const parsed: ParsedLine | null = parseCommandLine(
      comment,
      commandPrefix,
      defaultBump,
    );
    if (!parsed) {
      core.info("커맨드 프리픽스 불일치/명령 없음 → 스킵");
      return;
    }

    assertAllowedAssociation(allowedAssociations);

    // 코멘트 옵션으로 override (없으면 base 사용)
    const tool = parsed.options.tool
      ? normalizeTool(parsed.options.tool)
      : baseTool;
    const prefer = parsed.options.prefer
      ? normalizePrefer(parsed.options.prefer)
      : basePrefer;
    const keepSnapshot =
      parsed.options.keepSnapshot != null
        ? parsed.options.keepSnapshot
        : baseKeepSnapshot;
    const dryRun =
      parsed.options.dryRun != null ? parsed.options.dryRun : baseDryRun;

    const target = (parsed.options.target ?? "").trim();

    if (target) {
      const p = path.resolve(process.cwd(), target);
      if (!(await fileExists(p))) {
        core.setFailed(`--target 파일 없음: ${target}`);
        return;
      }
    }

    const inferredTargetTool =
      tool === "auto" && target ? inferToolFromTarget(target) : null;

    if (inferredTargetTool) {
      core.info(`--target 기준 tool 선택: ${inferredTargetTool} (${target})`);
    }

    const updater = await pickUpdater(inferredTargetTool ?? tool, prefer);

    const { toolId, targetPath, before } = await updater.readCurrent({
      targetPath: target || undefined,
    });

    const after = await updater.computeNext({
      current: before,
      command: parsed.command,
      keepSnapshot,
    });

    if (before === after) {
      core.info(`버전 변경 없음: ${before}`);
      return;
    }

    if (dryRun) {
      core.info(
        `[dryRun] tool=${toolId}, file=${targetPath}, ${before} -> ${after}`,
      );
      return;
    }

    await updater.writeNext({
      targetPath,
      next: after,
    });

    await gitConfigUser(authorName, authorEmail);
    await gitStage(targetPath);

    const commitMessage = commitMessageTemplate
      .replaceAll("{tool}", toolId)
      .replaceAll("{before}", before)
      .replaceAll("{after}", after);

    await gitCommitPushIfChanged(commitMessage);

    core.info(
      `완료: tool=${toolId}, file=${targetPath}, ${before} -> ${after}`,
    );
  } catch (e: any) {
    core.setFailed(e?.message ?? String(e));
  }
}

run();
