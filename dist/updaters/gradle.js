"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradleUpdater = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const semverish_1 = require("../lib/semverish");
const fs_1 = require("../lib/fs");
class GradleUpdater {
    id = "gradle";
    async detect(repoRoot) {
        const candidates = [
            node_path_1.default.join(repoRoot, "gradle.properties"),
            node_path_1.default.join(repoRoot, "build.gradle"),
            node_path_1.default.join(repoRoot, "build.gradle.kts"),
        ];
        for (const c of candidates) {
            if (await (0, fs_1.fileExists)(c))
                return true;
        }
        return false;
    }
    async autoPickTarget() {
        if (await (0, fs_1.fileExists)("gradle.properties"))
            return "gradle.properties";
        if (await (0, fs_1.fileExists)("build.gradle"))
            return "build.gradle";
        if (await (0, fs_1.fileExists)("build.gradle.kts"))
            return "build.gradle.kts";
        throw new Error("Gradle 대상 파일을 찾지 못함: gradle.properties/build.gradle/build.gradle.kts");
    }
    async readCurrent(opts) {
        const targetPath = opts.targetPath?.trim() || (await this.autoPickTarget());
        const text = await promises_1.default.readFile(targetPath, "utf8");
        if (targetPath.endsWith("gradle.properties")) {
            const { before } = readFromGradleProperties(text);
            return { toolId: "gradle", targetPath, before };
        }
        const { before } = readFromBuildGradle(text, targetPath);
        return { toolId: "gradle", targetPath, before };
    }
    async computeNext(opts) {
        return (0, semverish_1.applyCommand)(opts.current, opts.command, opts.keepSnapshot);
    }
    async writeNext(opts) {
        const targetPath = opts.targetPath;
        const text = await promises_1.default.readFile(targetPath, "utf8");
        let updated;
        if (targetPath.endsWith("gradle.properties")) {
            updated = writeToGradleProperties(text, opts.next);
        }
        else {
            updated = writeToBuildGradle(text, targetPath, opts.next);
        }
        await promises_1.default.writeFile(targetPath, updated, "utf8");
    }
}
exports.GradleUpdater = GradleUpdater;
function readFromGradleProperties(text) {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\s*version\s*=\s*([^\s#]+)\s*(?:#.*)?$/);
        if (m)
            return { before: m[1].trim() };
    }
    throw new Error("gradle.properties에서 version=... 라인을 찾지 못함");
}
function writeToGradleProperties(text, next) {
    const lines = text.split(/\r?\n/);
    let changed = false;
    const out = lines.map((line) => {
        const m = line.match(/^(\s*version\s*=\s*)([^\s#]+)(\s*(?:#.*)?)$/);
        if (!m)
            return line;
        changed = true;
        return `${m[1]}${next}${m[3]}`;
    });
    if (!changed)
        throw new Error("gradle.properties에 version=... 라인이 없어 수정 불가");
    return out.join("\n");
}
function readFromBuildGradle(text, fileName) {
    const isKts = fileName.endsWith(".kts");
    const re = isKts
        ? /^\s*version\s*=\s*"([^"]+)"\s*$/m
        : /^\s*version\s*=\s*['"]([^'"]+)['"]\s*$/m;
    const m = text.match(re);
    if (!m) {
        throw new Error(`${fileName}에서 지원되는 version 선언을 찾지 못함. ` +
            `지원: 단일 라인 version = "1.2.3"(kts) 또는 version = "1.2.3"/'1.2.3'(groovy)`);
    }
    return { before: m[1].trim() };
}
function writeToBuildGradle(text, fileName, next) {
    const isKts = fileName.endsWith(".kts");
    const re = isKts
        ? /^(\s*version\s*=\s*")([^"]+)(".*)$/m
        : /^(\s*version\s*=\s*['"])([^'"]+)(['"].*)$/m;
    if (!re.test(text)) {
        throw new Error(`${fileName}에서 지원되는 version 라인 패턴이 없어 수정 불가`);
    }
    return text.replace(re, `$1${next}$3`);
}
