"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitConfigUser = gitConfigUser;
exports.gitStage = gitStage;
exports.gitCommitPushIfChanged = gitCommitPushIfChanged;
const node_child_process_1 = require("node:child_process");
function runGit(args) {
    (0, node_child_process_1.execFileSync)("git", args, { stdio: "inherit" });
}
async function gitConfigUser(name, email) {
    runGit(["config", "user.name", name]);
    runGit(["config", "user.email", email]);
}
async function gitStage(filePath) {
    runGit(["add", "--", filePath]);
}
function hasDiff() {
    const result = (0, node_child_process_1.spawnSync)("git", ["diff", "--cached", "--quiet"], {
        stdio: "ignore",
    });
    return result.status !== 0;
}
async function gitCommitPushIfChanged(message) {
    if (!hasDiff())
        return;
    runGit(["commit", "-m", message]);
    runGit(["push"]);
}
