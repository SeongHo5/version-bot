"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBoolStrict = normalizeBoolStrict;
exports.normalizeTool = normalizeTool;
exports.normalizePrefer = normalizePrefer;
exports.normalizeBump = normalizeBump;
function normalizeBoolStrict(v, label) {
    const b = String(v || "")
        .trim()
        .toLowerCase();
    if (b === "true")
        return true;
    if (b === "false")
        return false;
    throw new Error(`${label} 옵션이 잘못됨: ${v} (true|false)`);
}
function normalizeTool(v) {
    const t = String(v || "")
        .trim()
        .toLowerCase();
    if (t === "auto" || t === "maven" || t === "gradle") {
        return t;
    }
    throw new Error(`tool 옵션이 잘못됨: ${v} (auto|maven|gradle)`);
}
function normalizePrefer(v) {
    const p = String(v || "")
        .trim()
        .toLowerCase();
    if (p === "maven" || p === "gradle") {
        return p;
    }
    throw new Error(`prefer 옵션이 잘못됨: ${v} (maven|gradle)`);
}
function normalizeBump(v) {
    const b = String(v || "")
        .trim()
        .toLowerCase();
    if (b === "patch" || b === "minor" || b === "major") {
        return b;
    }
    throw new Error(`defaultBump 옵션이 잘못됨: ${v} (patch|minor|major)`);
}
