import path from "node:path";

export type TargetInferredTool = "maven" | "gradle";

export function inferToolFromTarget(
  targetPath: string,
): TargetInferredTool | null {
  const base = path.basename(targetPath).toLowerCase();

  if (base === "pom.xml") return "maven";
  if (
    base === "gradle.properties" ||
    base === "build.gradle" ||
    base === "build.gradle.kts"
  ) {
    return "gradle";
  }

  return null;
}
