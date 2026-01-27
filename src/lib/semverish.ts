import { BumpStrategy, VersionCommand } from "./command";

export function splitSnapshot(v: string): { base: string; snapshot: boolean } {
  const t = v.trim();
  const snapshot = t.toUpperCase().endsWith("-SNAPSHOT");
  const base = snapshot ? t.slice(0, -"-SNAPSHOT".length) : t;
  return { base, snapshot };
}

export function ensureXYZ(base: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const m = base.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`현재/지정 버전이 X.Y.Z 형태가 아닙니다.: ${base}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function bumpXYZ(cur: string, strategy: BumpStrategy): string {
  const { base, snapshot } = splitSnapshot(cur);
  const { major, minor, patch } = ensureXYZ(base);

  let next: string;
  if (strategy === "patch") next = `${major}.${minor}.${patch + 1}`;
  else if (strategy === "minor") next = `${major}.${minor + 1}.0`;
  else next = `${major + 1}.0.0`;

  return snapshot ? `${next}-SNAPSHOT` : next;
}

export function applyCommand(
  current: string,
  cmd: VersionCommand,
  keepSnapshot: boolean,
): string {
  const cur = current.trim();

  if (cmd.kind === "set") {
    const { base, snapshot } = splitSnapshot(cmd.version);
    ensureXYZ(base);
    if (!keepSnapshot) return base; // 스냅샷 제거
    return snapshot ? `${base}-SNAPSHOT` : base;
  }

  const bumped = bumpXYZ(cur, cmd.strategy);
  if (!keepSnapshot) return splitSnapshot(bumped).base;
  return bumped;
}
