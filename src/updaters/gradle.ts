import fs from "node:fs/promises";
import path from "node:path";
import { VersionCommand } from "../lib/command";
import { applyCommand } from "../lib/semverish";
import { fileExists } from "../lib/fs";

type ReadResult = { toolId: "gradle"; targetPath: string; before: string };

export class GradleUpdater {
  readonly id = "gradle" as const;

  async detect(repoRoot: string): Promise<boolean> {
    const candidates = [
      path.join(repoRoot, "gradle.properties"),
      path.join(repoRoot, "build.gradle"),
      path.join(repoRoot, "build.gradle.kts"),
    ];
    for (const c of candidates) {
      if (await fileExists(c)) return true;
    }
    return false;
  }

  private async autoPickTarget(): Promise<string> {
    if (await fileExists("gradle.properties")) return "gradle.properties";
    if (await fileExists("build.gradle")) return "build.gradle";
    if (await fileExists("build.gradle.kts")) return "build.gradle.kts";
    throw new Error(
      "Gradle 대상 파일을 찾지 못함: gradle.properties/build.gradle/build.gradle.kts",
    );
  }

  async readCurrent(opts: { targetPath?: string }): Promise<ReadResult> {
    const targetPath = opts.targetPath?.trim() || (await this.autoPickTarget());
    const text = await fs.readFile(targetPath, "utf8");

    if (targetPath.endsWith("gradle.properties")) {
      const { before } = readFromGradleProperties(text);
      return { toolId: "gradle", targetPath, before };
    }

    const { before } = readFromBuildGradle(text, targetPath);
    return { toolId: "gradle", targetPath, before };
  }

  async computeNext(opts: {
    current: string;
    command: VersionCommand;
    keepSnapshot: boolean;
  }): Promise<string> {
    return applyCommand(opts.current, opts.command, opts.keepSnapshot);
  }

  async writeNext(opts: { targetPath: string; next: string }): Promise<void> {
    const targetPath = opts.targetPath;
    const text = await fs.readFile(targetPath, "utf8");

    let updated: string;
    if (targetPath.endsWith("gradle.properties")) {
      updated = writeToGradleProperties(text, opts.next);
    } else {
      updated = writeToBuildGradle(text, targetPath, opts.next);
    }

    await fs.writeFile(targetPath, updated, "utf8");
  }
}

function readFromGradleProperties(text: string): { before: string } {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*version\s*=\s*(["']?)([^"'#\s]+)\1\s*(?:#.*)?$/);
    if (m) return { before: m[2].trim() };
  }
  throw new Error("gradle.properties에서 version=... 라인을 찾지 못함");
}

function writeToGradleProperties(text: string, next: string): string {
  const lines = text.split(/\r?\n/);
  let changed = false;

  const out = lines.map((line) => {
    const m = line.match(
      /^(\s*version\s*=\s*)(["']?)([^"'#\s]+)(\2)(\s*(?:#.*)?)$/,
    );
    if (!m) return line;
    changed = true;
    return `${m[1]}${m[2]}${next}${m[4]}${m[5]}`;
  });

  if (!changed)
    throw new Error("gradle.properties에 version=... 라인이 없어 수정 불가");
  return out.join("\n");
}

function readFromBuildGradle(
  text: string,
  fileName: string,
): { before: string } {
  const isKts = fileName.endsWith(".kts");
  const re = isKts
    ? /^\s*version\s*=\s*"([^"]+)"\s*(?:(?:\/\/|#).*)?$/m
    : /^\s*version\s*=\s*['"]([^'"]+)['"]\s*(?:(?:\/\/|#).*)?$/m;

  const m = text.match(re);
  if (!m) {
    throw new Error(
      `${fileName}에서 지원되는 version 선언을 찾지 못함. ` +
        `지원: 단일 라인 version = "1.2.3"(kts) 또는 version = "1.2.3"/'1.2.3'(groovy)`,
    );
  }
  return { before: m[1].trim() };
}

function writeToBuildGradle(
  text: string,
  fileName: string,
  next: string,
): string {
  const isKts = fileName.endsWith(".kts");
  const re = isKts
    ? /^(\s*version\s*=\s*")([^"]+)(".*)$/m
    : /^(\s*version\s*=\s*['"])([^'"]+)(['"].*)$/m;

  if (!re.test(text)) {
    throw new Error(
      `${fileName}에서 지원되는 version 라인 패턴이 없어 수정 불가`,
    );
  }
  return text.replace(re, `$1${next}$3`);
}
