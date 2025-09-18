import * as core from "@actions/core";
import * as github from "@actions/github";
import { upsertRowInPrLinkDb, findTaskUrlInNotion } from "./notion";
import { commentPR } from "./github";

async function run() {
  try {
    const pr = github.context.payload.pull_request;

    if (!pr) {
      core.setFailed("❌ This action only runs on pull_request events.");
      return;
    }

    const prTitle: string = pr.title;
    const matches: string[] = [
      ...prTitle.matchAll(/([a-zA-Z]+-\d+)(?=[^:]*:)/g),
    ].map((m) => m[1]);

    if (matches.length === 0) {
      core.warning("⚠️ No ticket IDs found in PR title.");
      return;
    }

    processMatches(matches);
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

async function processMatches(matches: string[]) {
  const tasks: string[] = [];
  await Promise.all(
    matches.map(async (match) => {
      const foundTaskInNotion = await findTaskUrlInNotion(match);

      if (!foundTaskInNotion) {
        const msg = `❌ Task not found in Notion: ${match}`;
        core.warning(msg);
        return;
      }

      await commentPR(`✅ Linked task [${match}](${foundTaskInNotion.url})`);
      tasks.push(foundTaskInNotion.id);
    })
  );
  await upsertRowInPrLinkDb(tasks);
}

run();
