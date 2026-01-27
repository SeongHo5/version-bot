"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSnapshot = splitSnapshot;
exports.ensureXYZ = ensureXYZ;
exports.bumpXYZ = bumpXYZ;
exports.applyCommand = applyCommand;
function splitSnapshot(v) {
    const t = v.trim();
    const snapshot = t.toUpperCase().endsWith("-SNAPSHOT");
    const base = snapshot ? t.slice(0, -"-SNAPSHOT".length) : t;
    return { base, snapshot };
}
function ensureXYZ(base) {
    const m = base.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!m)
        throw new Error(`현재/지정 버전이 X.Y.Z 형태가 아닙니다.: ${base}`);
    return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}
function bumpXYZ(cur, strategy) {
    const { base, snapshot } = splitSnapshot(cur);
    const { major, minor, patch } = ensureXYZ(base);
    let next;
    if (strategy === "patch")
        next = `${major}.${minor}.${patch + 1}`;
    else if (strategy === "minor")
        next = `${major}.${minor + 1}.0`;
    else
        next = `${major + 1}.0.0`;
    return snapshot ? `${next}-SNAPSHOT` : next;
}
function applyCommand(current, cmd, keepSnapshot) {
    const cur = current.trim();
    if (cmd.kind === "set") {
        const { base, snapshot } = splitSnapshot(cmd.version);
        ensureXYZ(base);
        if (!keepSnapshot)
            return base;
        return snapshot ? `${base}-SNAPSHOT` : base;
    }
    const bumped = bumpXYZ(cur, cmd.strategy);
    if (!keepSnapshot)
        return splitSnapshot(bumped).base;
    return bumped;
}
