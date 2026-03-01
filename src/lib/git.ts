import { execFileSync, spawnSync } from "node:child_process";

function runGit(args: string[]) {
  execFileSync("git", args, { stdio: "inherit" });
}

export async function gitConfigUser(name: string, email: string) {
  runGit(["config", "user.name", name]);
  runGit(["config", "user.email", email]);
}

export async function gitStage(filePath: string) {
  runGit(["add", "--", filePath]);
}

function hasDiff(): boolean {
  const result = spawnSync("git", ["diff", "--cached", "--quiet"], {
    stdio: "ignore",
  });
  return result.status !== 0;
}

export async function gitCommitPushIfChanged(message: string) {
  if (!hasDiff()) return;
  runGit(["commit", "-m", message]);
  runGit(["push"]);
}
