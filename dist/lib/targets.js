"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferToolFromTarget = inferToolFromTarget;
const node_path_1 = __importDefault(require("node:path"));
function inferToolFromTarget(targetPath) {
    const base = node_path_1.default.basename(targetPath).toLowerCase();
    if (base === "pom.xml")
        return "maven";
    if (base === "gradle.properties" ||
        base === "build.gradle" ||
        base === "build.gradle.kts") {
        return "gradle";
    }
    return null;
}
