import {
  normalizeBoolStrict,
  normalizeBump,
  normalizePrefer,
  normalizeTool,
} from "../src/lib/inputs";

describe("inputs", () => {
  it("parses strict booleans", () => {
    expect(normalizeBoolStrict("true", "dryRun")).toBe(true);
    expect(normalizeBoolStrict("FALSE", "dryRun")).toBe(false);
  });

  it("throws on invalid booleans", () => {
    expect(() => normalizeBoolStrict("yes", "dryRun")).toThrow("true|false");
  });

  it("normalizes tool/prefer values", () => {
    expect(normalizeTool("AUTO")).toBe("auto");
    expect(normalizePrefer("GRADLE")).toBe("gradle");
  });

  it("throws on invalid tool/prefer values", () => {
    expect(() => normalizeTool("npm")).toThrow("auto|maven|gradle");
    expect(() => normalizePrefer("npm")).toThrow("maven|gradle");
  });

  it("normalizes and validates default bump", () => {
    expect(normalizeBump("PATCH")).toBe("patch");
    expect(() => normalizeBump("p1")).toThrow("patch|minor|major");
  });
});
