import { parseCommandLine } from "../src/lib/command";

describe("parseCommandLine", () => {
  it("returns null when prefix does not match", () => {
    const parsed = parseCommandLine("/bump patch", "/ver", "patch");
    expect(parsed).toBeNull();
  });

  it("parses bump command", () => {
    const parsed = parseCommandLine("/ver bump patch", "/ver", "patch");
    expect(parsed).toEqual({
      command: { kind: "bump", strategy: "patch" },
      options: {},
    });
  });

  it("parses bump +1 using defaultBump", () => {
    const parsed = parseCommandLine("/ver bump +1", "/ver", "minor");
    expect(parsed).toEqual({
      command: { kind: "bump", strategy: "minor" },
      options: {},
    });
  });

  it("parses set command with options", () => {
    const parsed = parseCommandLine(
      '/ver set 1.2.3-SNAPSHOT --tool gradle --target "module a/build.gradle.kts" --prefer gradle --keepSnapshot false --dryRun true',
      "/ver",
      "patch",
    );

    expect(parsed).toEqual({
      command: { kind: "set", version: "1.2.3-SNAPSHOT" },
      options: {
        tool: "gradle",
        target: "module a/build.gradle.kts",
        prefer: "gradle",
        keepSnapshot: false,
        dryRun: true,
      },
    });
  });

  it("throws on unsupported option", () => {
    expect(() =>
      parseCommandLine("/ver bump patch --unknown foo", "/ver", "patch"),
    ).toThrow("Unsupported option");
  });

  it("throws when defaultBump is invalid for bump +1", () => {
    expect(() =>
      parseCommandLine("/ver bump +1", "/ver", "foo" as any),
    ).toThrow("Invalid default bump strategy");
  });

  it("throws on unclosed quote", () => {
    expect(() =>
      parseCommandLine('/ver set 1.2.3 --target "a/b', "/ver", "patch"),
    ).toThrow("Unclosed quote");
  });
});
