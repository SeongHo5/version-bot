import * as core from "@actions/core";
import * as github from "@actions/github";
import path from "node:path";

import { parseCommandLine, ParsedLine } from "./lib/command";
import { gitCommitPushIfChanged, gitConfigUser, gitStage } from "./lib/git";
import { fileExists } from "./lib/fs";

import { MavenUpdater } from "./updaters/maven";
import { GradleUpdater } from "./updaters/gradle";

type Tool = "auto" | "maven" | "gradle";
type Prefer = "maven" | "gradle";

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

function normalizeBool(v: string): boolean {
  return String(v).trim().toLowerCase() === "true";
}

function normalizeTool(v: string): Tool {
  const t = String(v || "")
    .trim()
    .toLowerCase();
  if (t === "auto" || t === "maven" || t === "gradle") {
    return t;
  }
  throw new Error(`tool 옵션이 잘못됨: ${v} (auto|maven|gradle)`);
}

function normalizePrefer(v: string): Prefer {
  const p = String(v || "")
    .trim()
    .toLowerCase();
  if (p === "maven" || p === "gradle") {
    return p;
  }
  throw new Error(`prefer 옵션이 잘못됨: ${v} (maven|gradle)`);
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
    "지원되는 빌드 파일을 찾지 못함: pom.xml 또는 gradle.properties/build.gradle(.kts)",
  );
}

async function run() {
  try {
    const comment = core.getInput("comment", { required: true });
    const commandPrefix = core.getInput("commandPrefix") || "/ver";

    // workflow/action input 기본값 (코멘트 옵션으로 override 가능)
    const baseTool = normalizeTool(core.getInput("tool") || "auto");
    const basePrefer = normalizePrefer(core.getInput("prefer") || "maven");
    const defaultBump = (core.getInput("defaultBump") || "patch") as
      | "patch"
      | "minor"
      | "major";
    const baseKeepSnapshot = normalizeBool(
      core.getInput("keepSnapshot") || "true",
    );
    const baseDryRun = normalizeBool(core.getInput("dryRun") || "false");

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
        throw new Error(`--target 파일 없음: ${target}`);
      }
    }

    const updater = await pickUpdater(tool, prefer);

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
