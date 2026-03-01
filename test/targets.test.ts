import { inferToolFromTarget } from "../src/lib/targets";

describe("inferToolFromTarget", () => {
  it("infers maven from pom.xml", () => {
    expect(inferToolFromTarget("pom.xml")).toBe("maven");
    expect(inferToolFromTarget("module-a/pom.xml")).toBe("maven");
  });

  it("infers gradle from supported gradle files", () => {
    expect(inferToolFromTarget("gradle.properties")).toBe("gradle");
    expect(inferToolFromTarget("build.gradle")).toBe("gradle");
    expect(inferToolFromTarget("build.gradle.kts")).toBe("gradle");
    expect(inferToolFromTarget("module-a/build.gradle.kts")).toBe("gradle");
  });

  it("returns null for unsupported target file", () => {
    expect(inferToolFromTarget("module-a/custom-version.txt")).toBeNull();
  });
});
