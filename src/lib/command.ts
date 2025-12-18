export type BumpStrategy = "patch" | "minor" | "major";
export type ToolOption = "auto" | "maven" | "gradle";
export type PreferOption = "maven" | "gradle";

export type VersionCommand =
    | { kind: "bump"; strategy: BumpStrategy }
    | { kind: "set"; version: string };

export type ParsedOptions = {
    tool?: ToolOption;
    target?: string;
    prefer?: PreferOption;
    keepSnapshot?: boolean;
    dryRun?: boolean;
};

export type ParsedLine = {
    command: VersionCommand;
    options: ParsedOptions;
};

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseCommandLine(
    commentBody: string,
    prefix: string,
    defaultBump: BumpStrategy
): ParsedLine | null {
    const firstLine = (commentBody ?? "").split(/\r?\n/)[0]?.trim() ?? "";
    if (!firstLine.startsWith(prefix)) return null;

    const p = escapeRegExp(prefix);

    // prefix 제거하고 토큰화
    const rest = firstLine.replace(new RegExp(`^${p}\\s*`), "").trim();
    if (!rest) throw new Error(`명령 형식 오류. 예) ${prefix} bump patch | ${prefix} set 1.2.3`);

    const tokens = tokenize(rest);
    // tokens 예: ["bump","patch","--tool","gradle","--dryRun","true"]

    const verb = (tokens.shift() ?? "").toLowerCase();
    if (verb !== "bump" && verb !== "set") {
        throw new Error(`명령 형식 오류. 예) ${prefix} bump patch | ${prefix} set 1.2.3`);
    }

    let command: VersionCommand;
    if (verb === "bump") {
        const arg = (tokens.shift() ?? "").toLowerCase();
        if (!arg) throw new Error(`bump 인자가 필요. 예) ${prefix} bump patch`);

        const strategy: BumpStrategy =
            arg === "+1" ? defaultBump :
                arg === "patch" ? "patch" :
                    arg === "minor" ? "minor" :
                        arg === "major" ? "major" :
                            (() => {
                                throw new Error(`bump 인자 오류: ${arg} (patch|minor|major|+1)`);
                            })();

        command = {kind: "bump", strategy};
    } else {
        const version = tokens.shift();
        if (!version) throw new Error(`set 버전이 필요. 예) ${prefix} set 1.2.3`);
        command = {kind: "set", version};
    }

    const options = parseFlags(tokens);
    return {command, options};
}

/**
 * 공백 기준 토큰화 + 따옴표 지원
 *  - --target "some path/pom.xml" 가능
 */
function tokenize(s: string): string[] {
    const out: string[] = [];
    let cur = "";
    let quote: "'" | '"' | null = null;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                cur += ch;
            }
            continue;
        }

        if (ch === "'" || ch === '"') {
            quote = ch;
            continue;
        }

        if (/\s/.test(ch)) {
            if (cur.length) {
                out.push(cur);
                cur = "";
            }
            continue;
        }

        cur += ch;
    }

    if (quote) throw new Error("따옴표가 닫히지 않았음");
    if (cur.length) out.push(cur);

    return out;
}

function parseFlags(tokens: string[]): ParsedOptions {
    const opts: ParsedOptions = {};
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!t.startsWith("--")) throw new Error(`옵션 형식 오류: ${t}`);

        const key = t.slice(2);
        const val = tokens[i + 1]; // key-value 형태만 지원
        if (!val || val.startsWith("--")) throw new Error(`옵션 값 필요: --${key} <value>`);
        i++;

        switch (key) {
            case "tool":
                if (!isOneOf(val, ["auto", "maven", "gradle"])) throw new Error(`--tool 값 오류: ${val}`);
                opts.tool = val as ToolOption;
                break;

            case "target":
                opts.target = val;
                break;

            case "prefer":
                if (!isOneOf(val, ["maven", "gradle"])) throw new Error(`--prefer 값 오류: ${val}`);
                opts.prefer = val as PreferOption;
                break;

            case "keepSnapshot":
                opts.keepSnapshot = parseBool(val, "--keepSnapshot");
                break;

            case "dryRun":
                opts.dryRun = parseBool(val, "--dryRun");
                break;

            default:
                throw new Error(`지원하지 않는 옵션: --${key}`);
        }
    }
    return opts;
}

function parseBool(v: string, label: string): boolean {
    const t = v.trim().toLowerCase();
    if (t === "true") return true;
    if (t === "false") return false;
    throw new Error(`${label} 값 오류: ${v} (true|false)`);
}

function isOneOf(v: string, arr: string[]): boolean {
    return arr.includes(v.trim().toLowerCase());
}
