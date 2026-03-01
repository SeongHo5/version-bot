import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { MavenUpdater } from "../src/updaters/maven";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "version-bot-maven-"));
}

describe("MavenUpdater", () => {
  it("reads revision from properties first and writes it", async () => {
    const dir = await makeTempDir();
    const pomPath = path.join(dir, "pom.xml");
    const xml = [
      "<project>",
      "  <modelVersion>4.0.0</modelVersion>",
      "  <groupId>com.example</groupId>",
      "  <artifactId>demo</artifactId>",
      "  <version>0.9.0</version>",
      "  <properties>",
      "    <revision>1.2.3-SNAPSHOT</revision>",
      "  </properties>",
      "</project>",
    ].join("\n");
    await fs.writeFile(pomPath, xml, "utf8");

    const updater = new MavenUpdater();
    const current = await updater.readCurrent({ targetPath: pomPath });
    expect(current.before).toBe("1.2.3-SNAPSHOT");

    await updater.writeNext({ targetPath: pomPath, next: "2.0.0" });
    const updated = await fs.readFile(pomPath, "utf8");
    expect(updated).toContain("<revision>2.0.0</revision>");
    expect(updated).toContain("<version>0.9.0</version>");
  });

  it("falls back to project.version and writes it when revision is absent", async () => {
    const dir = await makeTempDir();
    const pomPath = path.join(dir, "pom.xml");
    const xml = [
      "<project>",
      "  <modelVersion>4.0.0</modelVersion>",
      "  <groupId>com.example</groupId>",
      "  <artifactId>demo</artifactId>",
      "  <version>1.0.0</version>",
      "</project>",
    ].join("\n");
    await fs.writeFile(pomPath, xml, "utf8");

    const updater = new MavenUpdater();
    const current = await updater.readCurrent({ targetPath: pomPath });
    expect(current.before).toBe("1.0.0");

    await updater.writeNext({ targetPath: pomPath, next: "1.1.0" });
    const updated = await fs.readFile(pomPath, "utf8");
    expect(updated).toContain("<version>1.1.0</version>");
  });
});
