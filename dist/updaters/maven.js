"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MavenUpdater = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const semverish_1 = require("../lib/semverish");
const fs_1 = require("../lib/fs");
class MavenUpdater {
    id = "maven";
    async detect(repoRoot) {
        return (0, fs_1.fileExists)(node_path_1.default.join(repoRoot, "pom.xml"));
    }
    async readCurrent(opts) {
        const targetPath = opts.targetPath?.trim() || "pom.xml";
        const xml = await promises_1.default.readFile(targetPath, "utf8");
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true,
        });
        const obj = parser.parse(xml);
        const project = obj?.project;
        if (!project)
            throw new Error("pom.xml에서 <project> 루트 못 찾음");
        const props = project.properties ?? {};
        const hasRevision = typeof props.revision === "string";
        const before = hasRevision
            ? String(props.revision)
            : typeof project.version === "string"
                ? String(project.version)
                : "";
        if (!before)
            throw new Error("Maven 버전 위치를 찾지 못함: properties.revision 또는 project.version");
        return { toolId: "maven", targetPath, before };
    }
    async computeNext(opts) {
        return (0, semverish_1.applyCommand)(opts.current, opts.command, opts.keepSnapshot);
    }
    async writeNext(opts) {
        const targetPath = opts.targetPath;
        const xml = await promises_1.default.readFile(targetPath, "utf8");
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true,
        });
        const obj = parser.parse(xml);
        const project = obj?.project;
        if (!project) {
            throw new Error("pom.xml에서 <project> 루트 못 찾음");
        }
        const props = project.properties ?? {};
        const hasRevision = typeof props.revision === "string";
        if (hasRevision) {
            project.properties = { ...props, revision: opts.next };
        }
        else {
            project.version = opts.next;
        }
        const builder = new fast_xml_parser_1.XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true,
            indentBy: "  ",
            suppressEmptyNode: true,
        });
        const updated = builder.build(obj);
        await promises_1.default.writeFile(targetPath, updated, "utf8");
    }
}
exports.MavenUpdater = MavenUpdater;
