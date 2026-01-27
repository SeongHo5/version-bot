"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitConfigUser = gitConfigUser;
exports.gitStage = gitStage;
exports.gitCommitPushIfChanged = gitCommitPushIfChanged;
const node_child_process_1 = require("node:child_process");
function sh(cmd) {
    (0, node_child_process_1.execSync)(cmd, { stdio: "inherit" });
}
async function gitConfigUser(name, email) {
    sh(`git config user.name "${name}"`);
    sh(`git config user.email "${email}"`);
}
async function gitStage(filePath) {
    sh(`git add "${filePath}"`);
}
function hasDiff() {
    try {
        (0, node_child_process_1.execSync)("git diff --cached --quiet");
        return false;
    }
    catch {
        return true;
    }
}
async function gitCommitPushIfChanged(message) {
    if (!hasDiff())
        return;
    sh(`git commit -m "${message.replaceAll('"', '\\"')}"`);
    sh(`git push`);
}
