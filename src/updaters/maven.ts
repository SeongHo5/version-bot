import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

import { VersionCommand } from "../lib/cmd";
import { applyCommand } from "../lib/semverish";
import { fileExists } from "../lib/fsutil";

type ReadResult = { toolId: "maven"; targetPath: string; before: string };

export class MavenUpdater {
    readonly id = "maven" as const;

    async detect(repoRoot: string): Promise<boolean> {
        return fileExists(path.join(repoRoot, "pom.xml"));
    }

    async readCurrent(opts: { targetPath?: string }): Promise<ReadResult> {
        const targetPath = opts.targetPath?.trim() || "pom.xml";
        const xml = await fs.readFile(targetPath, "utf8");

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true
        });
        const obj = parser.parse(xml);
        const project = obj?.project;
        if (!project) throw new Error("pom.xml에서 <project> 루트 못 찾음");

        const props = project.properties ?? {};
        const hasRevision = typeof props.revision === "string";
        const before = hasRevision
            ? String(props.revision)
            : (typeof project.version === "string" ? String(project.version) : "");

        if (!before) throw new Error("Maven 버전 위치를 찾지 못함: properties.revision 또는 project.version");

        return { toolId: "maven", targetPath, before };
    }

    async computeNext(opts: { current: string; command: VersionCommand; keepSnapshot: boolean }): Promise<string> {
        return applyCommand(opts.current, opts.command, opts.keepSnapshot);
    }

    async writeNext(opts: { targetPath: string; next: string }): Promise<void> {
        const targetPath = opts.targetPath;
        const xml = await fs.readFile(targetPath, "utf8");

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            allowBooleanAttributes: true
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
        } else {
            project.version = opts.next;
        }

        const builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true,
            indentBy: "  ",
            suppressEmptyNode: true
        });

        const updated = builder.build(obj);
        await fs.writeFile(targetPath, updated, "utf8");
    }
}
