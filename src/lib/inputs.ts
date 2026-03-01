import { BumpStrategy } from "./command";

export type ToolInput = "auto" | "maven" | "gradle";
export type PreferInput = "maven" | "gradle";

export function normalizeBoolStrict(v: string, label: string): boolean {
  const b = String(v || "")
    .trim()
    .toLowerCase();
  if (b === "true") return true;
  if (b === "false") return false;
  throw new Error(`${label} 옵션이 잘못됨: ${v} (true|false)`);
}

export function normalizeTool(v: string): ToolInput {
  const t = String(v || "")
    .trim()
    .toLowerCase();
  if (t === "auto" || t === "maven" || t === "gradle") {
    return t;
  }
  throw new Error(`tool 옵션이 잘못됨: ${v} (auto|maven|gradle)`);
}

export function normalizePrefer(v: string): PreferInput {
  const p = String(v || "")
    .trim()
    .toLowerCase();
  if (p === "maven" || p === "gradle") {
    return p;
  }
  throw new Error(`prefer 옵션이 잘못됨: ${v} (maven|gradle)`);
}

export function normalizeBump(v: string): BumpStrategy {
  const b = String(v || "")
    .trim()
    .toLowerCase();
  if (b === "patch" || b === "minor" || b === "major") {
    return b;
  }
  throw new Error(`defaultBump 옵션이 잘못됨: ${v} (patch|minor|major)`);
}
