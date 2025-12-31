import { execSync } from "node:child_process";

function sh(cmd: string) {
    execSync(cmd, { stdio: "inherit" });
}

export async function gitConfigUser(name: string, email: string) {
    sh(`git config user.name "${name}"`);
    sh(`git config user.email "${email}"`);
}

export async function gitStage(filePath: string) {
    sh(`git add "${filePath}"`);
}

function hasDiff(): boolean {
    try {
        execSync("git diff --cached --quiet");
        return false;
    } catch {
        return true;
    }
}

export async function gitCommitPushIfChanged(message: string) {
    if (!hasDiff()) return;
    sh(`git commit -m "${message.replaceAll('"', '\\"')}"`);
    sh(`git push`);
}
