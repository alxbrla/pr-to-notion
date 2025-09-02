import * as core from "@actions/core";
import * as github from "@actions/github";

export async function commentPR(message: string) {
  const pr = github.context.payload.pull_request;

  if (!pr) {
    core.setFailed("❌ This action only runs on pull_request events.");
    return;
  }

  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("❌ GITHUB_TOKEN is not set.");
    return;
  }

  const prNumber = pr.number;
  const { owner, repo } = github.context.repo;

  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const alreadyCommented = comments.some((c: any) => c.body?.includes(message));

  if (alreadyCommented) {
    return;
  }

  await octokit.rest.issues.createComment({
    owner: owner,
    repo: repo,
    issue_number: prNumber,
    body: message,
  });
}
