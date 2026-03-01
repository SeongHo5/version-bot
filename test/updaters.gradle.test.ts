import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { GradleUpdater } from "../src/updaters/gradle";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "version-bot-gradle-"));
}

describe("GradleUpdater", () => {
  it("reads/writes gradle.properties version line", async () => {
    const dir = await makeTempDir();
    const gradlePropsPath = path.join(dir, "gradle.properties");
    await fs.writeFile(
      gradlePropsPath,
      ["org.gradle.jvmargs=-Xmx2g", "version=1.2.3-SNAPSHOT # comment"].join(
        "\n",
      ),
      "utf8",
    );

    const updater = new GradleUpdater();
    const current = await updater.readCurrent({ targetPath: gradlePropsPath });
    expect(current.before).toBe("1.2.3-SNAPSHOT");

    await updater.writeNext({ targetPath: gradlePropsPath, next: "1.2.4" });
    const updated = await fs.readFile(gradlePropsPath, "utf8");
    expect(updated).toContain("version=1.2.4 # comment");
  });

  it("reads/writes build.gradle.kts version assignment", async () => {
    const dir = await makeTempDir();
    const ktsPath = path.join(dir, "build.gradle.kts");
    await fs.writeFile(
      ktsPath,
      ['plugins { java }', 'group = "com.example"', 'version = "2.0.0"'].join(
        "\n",
      ),
      "utf8",
    );

    const updater = new GradleUpdater();
    const current = await updater.readCurrent({ targetPath: ktsPath });
    expect(current.before).toBe("2.0.0");

    await updater.writeNext({ targetPath: ktsPath, next: "2.1.0-SNAPSHOT" });
    const updated = await fs.readFile(ktsPath, "utf8");
    expect(updated).toContain('version = "2.1.0-SNAPSHOT"');
  });

  it("reads build.gradle.kts version assignment with trailing comment", async () => {
    const dir = await makeTempDir();
    const ktsPath = path.join(dir, "build.gradle.kts");
    await fs.writeFile(ktsPath, 'version = "2.0.0" // keep', "utf8");

    const updater = new GradleUpdater();
    const current = await updater.readCurrent({ targetPath: ktsPath });
    expect(current.before).toBe("2.0.0");

    await updater.writeNext({ targetPath: ktsPath, next: "2.1.0" });
    const updated = await fs.readFile(ktsPath, "utf8");
    expect(updated).toContain('version = "2.1.0" // keep');
  });

  it("reads/writes build.gradle groovy version assignment", async () => {
    const dir = await makeTempDir();
    const groovyPath = path.join(dir, "build.gradle");
    await fs.writeFile(
      groovyPath,
      ["plugins { id 'java' }", "group = 'com.example'", "version = '3.0.0'"].join(
        "\n",
      ),
      "utf8",
    );

    const updater = new GradleUpdater();
    const current = await updater.readCurrent({ targetPath: groovyPath });
    expect(current.before).toBe("3.0.0");

    await updater.writeNext({ targetPath: groovyPath, next: "3.0.1" });
    const updated = await fs.readFile(groovyPath, "utf8");
    expect(updated).toContain("version = '3.0.1'");
  });

  it("reads/writes quoted version in gradle.properties", async () => {
    const dir = await makeTempDir();
    const gradlePropsPath = path.join(dir, "gradle.properties");
    await fs.writeFile(gradlePropsPath, 'version="1.2.3-SNAPSHOT"', "utf8");

    const updater = new GradleUpdater();
    const current = await updater.readCurrent({ targetPath: gradlePropsPath });
    expect(current.before).toBe("1.2.3-SNAPSHOT");

    await updater.writeNext({ targetPath: gradlePropsPath, next: "1.2.4" });
    const updated = await fs.readFile(gradlePropsPath, "utf8");
    expect(updated).toContain('version="1.2.4"');
  });
});
