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

const escapeRegExp = (s: string): string => {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const parseCommandLine = (
    commentBody: string,
    prefix: string,
    defaultBump: BumpStrategy
): ParsedLine | null => {
    const firstLine = (commentBody ?? "").split(/\r?\n/)[0]?.trim() ?? "";
    if (!firstLine.startsWith(prefix)) {
        return null;
    }

    const p = escapeRegExp(prefix);

    const rest = firstLine.replace(new RegExp(`^${p}\\s*`), "").trim();
    if (!rest) {
        throw new Error(`Invalid command format. e.g. ${prefix} bump patch | ${prefix} set 1.2.3`);
    }

    const tokens = tokenize(rest);

    const verb = (tokens.shift() ?? "").toLowerCase();
    if (verb !== "bump" && verb !== "set") {
        throw new Error(`Invalid command format. e.g. ${prefix} bump patch | ${prefix} set 1.2.3`);
    }

    let command: VersionCommand;
    if (verb === "bump") {
        const arg = tokens.shift();
        const strategy = parseBumpStrategy(arg ?? "", defaultBump);
        command = {kind: "bump", strategy};
    } else {
        const version = tokens.shift();
        if (!version) throw new Error(`Missing version for set command. e.g. ${prefix} set 1.2.3`);
        command = {kind: "set", version};
    }

    const options = parseFlags(tokens);
    return {command, options};
}

const tokenize = (s: string): string[] => {
    const out: string[] = [];
    let current = "";
    let quote: "'" | '"' | null = null;

    for (let i = 0; i < s.length; i++) {
        const ch = s[i];

        if (quote) {
            if (ch === quote) {
                quote = null;
            } else {
                current += ch;
            }
            continue;
        }

        if (ch === "'" || ch === '"') {
            quote = ch;
            continue;
        }

        if (/\s/.test(ch)) {
            if (current.length) {
                out.push(current);
                current = "";
            }
            continue;
        }

        current += ch;
    }

    if (quote) {
        throw new Error("Unclosed quote detected.");
    }
    if (current.length) {
        out.push(current);
    }

    return out;
}

const parseFlags = (tokens: string[]): ParsedOptions => {
    const opts: ParsedOptions = {};
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (!t.startsWith("--")) {
            throw new Error(`Invalid option format: ${t}`);
        }

        const key = t.slice(2);
        const val = tokens[i + 1];
        if (!val || val.startsWith("--")) {
            throw new Error(`Missing value for option: --${key} <value>`);
        }
        i++;

        switch (key) {
            case "tool":
                if (!isOneOf(val, ["auto", "maven", "gradle"])) {
                    throw new Error(`Invalid value for --tool: ${val}`);
                }
                opts.tool = val as ToolOption;
                break;

            case "target":
                opts.target = val;
                break;

            case "prefer":
                if (!isOneOf(val, ["maven", "gradle"])) {
                    throw new Error(`Invalid value for --prefer: ${val}`);
                }
                opts.prefer = val as PreferOption;
                break;

            case "keepSnapshot":
                opts.keepSnapshot = parseBool(val, "--keepSnapshot");
                break;

            case "dryRun":
                opts.dryRun = parseBool(val, "--dryRun");
                break;

            default:
                throw new Error(`Unsupported option: --${key}`);
        }
    }
    return opts;
}

const parseBumpStrategy = (arg: string, defaultBump: BumpStrategy): BumpStrategy => {
    if (!arg) {
        throw new Error("Missing bump argument. e.g. bump patch");
    }

    const v = arg.trim().toLowerCase();

    if (v === "+1") {
        return defaultBump;
    }

    switch (v) {
        case "patch":
        case "minor":
        case "major":
            return v;
        default:
            throw new Error(`Invalid bump argument: ${arg} (patch|minor|major|+1)`);
    }
}


const parseBool = (v: string, label: string): boolean => {
    const trimmed = v.trim().toLowerCase();
    if (trimmed === "true") {
        return true;
    }
    if (trimmed === "false") {
        return false;
    }
    throw new Error(`Invalid value for ${label}: ${v} (true|false)`);
}

const isOneOf = (v: string, arr: string[]): boolean => {
    return arr.includes(v.trim().toLowerCase());
}
