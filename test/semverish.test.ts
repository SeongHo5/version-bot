import { applyCommand, bumpXYZ, ensureXYZ, splitSnapshot } from "../src/lib/semverish";

describe("semverish", () => {
  it("splits snapshot suffix", () => {
    expect(splitSnapshot("1.2.3-SNAPSHOT")).toEqual({
      base: "1.2.3",
      snapshot: true,
    });
    expect(splitSnapshot("1.2.3")).toEqual({
      base: "1.2.3",
      snapshot: false,
    });
  });

  it("validates X.Y.Z", () => {
    expect(ensureXYZ("10.20.30")).toEqual({ major: 10, minor: 20, patch: 30 });
    expect(() => ensureXYZ("1.2")).toThrow("X.Y.Z");
  });

  it("bumps patch/minor/major and keeps snapshot when present", () => {
    expect(bumpXYZ("1.2.3-SNAPSHOT", "patch")).toBe("1.2.4-SNAPSHOT");
    expect(bumpXYZ("1.2.3-SNAPSHOT", "minor")).toBe("1.3.0-SNAPSHOT");
    expect(bumpXYZ("1.2.3-SNAPSHOT", "major")).toBe("2.0.0-SNAPSHOT");
  });

  it("applies set with keepSnapshot=false by stripping suffix", () => {
    const next = applyCommand(
      "1.0.0-SNAPSHOT",
      { kind: "set", version: "2.0.0-SNAPSHOT" },
      false,
    );
    expect(next).toBe("2.0.0");
  });

  it("applies bump with keepSnapshot=false by stripping suffix", () => {
    const next = applyCommand(
      "1.2.3-SNAPSHOT",
      { kind: "bump", strategy: "patch" },
      false,
    );
    expect(next).toBe("1.2.4");
  });

  it("throws when set version format is invalid", () => {
    expect(() =>
      applyCommand("1.0.0", { kind: "set", version: "v2" }, true),
    ).toThrow("X.Y.Z");
  });
});
