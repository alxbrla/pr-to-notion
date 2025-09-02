const core = require("@actions/core");
const github = require("@actions/github");
const fetch = require("node-fetch");

async function run() {
  try {
    const notionToken = core.getInput("notion_token");
    const notionTasksDatabaseId = core.getInput("notion_tasks_db_id");
    const notionPullRequestLinksDbId = core.getInput("notion_pr_links_db_id");
    const notionTaskId = core.getInput("notion_property_task_id");
    const notionAssignee = core.getInput("notion_property_assignee");
    const notionClosedAt = core.getInput("notion_property_closed_at");
    const notionCreatedAt = core.getInput("notion_property_created_at");
    const notionCreator = core.getInput("notion_property_creator");
    const notionDescription = core.getInput("notion_property_description");
    const notionMergedAt = core.getInput("notion_property_merged_at");
    const notionPrNumber = core.getInput("notion_property_pr_number");
    const notionReviewer = core.getInput("notion_property_reviewer");
    const notionState = core.getInput("notion_property_state");
    const notionUpdatedAt = core.getInput("notion_property_updated_at");
    const notionTasks = core.getInput("notion_property_tasks");
    const notionPrUrl = core.getInput("notion_property_pr_url");

    const pr = github.context.payload.pull_request;

    if (!pr) {
      core.setFailed("❌ This action only runs on pull_request events.");
      return;
    }

    const prTitle = pr.title;
    const prNumber = pr.number;
    const prUrl = pr.html_url;
    const { owner, repo } = github.context.repo;

    const matches = [...prTitle.matchAll(/([a-zA-Z]+-\d+)(?=[^:]*:)/g)].map(
      (m) => m[1]
    );

    if (matches.length === 0) {
      core.warning("⚠️ No ticket IDs found in PR title.");
      return;
    }

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    for (const taskId of matches) {
      core.info(`🔎 Looking for task: ${taskId}`);

      // Search Notion Task DB
      const searchRes = await notionQuery(
        notionToken,
        notionTasksDatabaseId,
        taskId,
        notionTaskId
      );

      if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
        const msg = `❌ Task not found in Notion: ${taskId}`;
        core.warning(msg);
        continue;
      }

      const taskPage = searchRes.results[0];
      const taskUrl = taskPage.url;

      // Comment on PR
      await commentPR(
        octokit,
        repo,
        owner,
        prNumber,
        `✅ Linked task [${taskId}](${taskUrl})`
      );

      // Add row in PRs DB
      await addPrToNotion(
        notionToken,
        notionPullRequestLinksDbId,
        {
          prTitle,
          notionTasks: taskPage.id,
          notionPrNumber: prNumber,
          notionClosedAt: pr.closed_at,
          notionCreatedAt: pr.created_at,
          notionUpdatedAt: pr.updated_at,
          notionCreator: pr.user ? pr.user.login : null,
          notionDescription: pr.body,
          notionMergedAt: pr.merged_at,
          notionPrNumber: pr.number,
          notionReviewer: pr.requested_reviewers
            ? pr.requested_reviewers.map((r) => r.login)
            : [],
          notionState: pr.state,
          notionPrUrl: pr.html_url,
        },
        {
          notionClosedAt: notionClosedAt,
          notionCreatedAt: notionCreatedAt,
          notionCreator: notionCreator,
          notionDescription: notionDescription,
          notionMergedAt: notionMergedAt,
          notionPrNumber: notionPrNumber,
          notionReviewer: notionReviewer,
          notionState: notionState,
          notionUpdatedAt: notionUpdatedAt,
          notionTasks: notionTasks,
          notionPrUrl: notionPrUrl,
        }
      );
    }
  } catch (err) {
    core.setFailed(`❌ ${err.message}`);
  }
}

async function notionQuery(token, dbId, ticketId, notionTicketIdProperty) {
  const formattedTicketId = Number(ticketId.split("-")[1]);
  core.info(`🔍 Querying Notion for ticket ID number: ${formattedTicketId}`);

  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: {
        property: notionTicketIdProperty,
        number: { equals: formattedTicketId },
      },
    }),
  });

  if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`);

  return res.json();
}

async function addPrToNotion(
  token,
  dbId,
  {
    prTitle,
    notionClosedAt,
    notionCreatedAt,
    notionUpdatedAt,
    notionCreator,
    notionDescription,
    notionMergedAt,
    notionPrNumber,
    notionReviewer,
    notionState,
    notionTasks,
    notionPrUrl,
  },
  notionConfig
) {
  const payload = {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: prTitle } }] },
      [notionConfig.notionPrUrl]: { url: notionPrUrl },
      [notionConfig.notionTasks]: { relation: [{ id: notionTasks }] },
      [notionConfig.notionPrNumber]: { number: notionPrNumber },
      [notionConfig.notionPropertyCreatedAt]: {
        date: { start: notionCreatedAt },
      },
      [notionConfig.notionPropertyUpdatedAt]: {
        date: { start: notionUpdatedAt },
      },
      [notionConfig.notionPropertyClosedAt]: {
        date: { start: notionClosedAt },
      },
      [notionConfig.notionPropertyMergedAt]: {
        date: { start: notionMergedAt },
      },
      [notionConfig.notionPropertyCreator]: {
        rich_text: [{ text: { content: notionCreator } }],
      },
      [notionConfig.notionPropertyDescription]: {
        rich_text: [{ text: { content: notionDescription } }],
      },
      [notionConfig.notionPropertyReviewer]: {
        multi_select: notionReviewer.map((r) => ({ name: r })),
      },
      [notionConfig.notionPropertyState]: { select: { name: notionState } },
    },
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`Notion insert failed: ${await res.text()}`);
}

async function commentPR(octokit, repo, owner, prNumber, body) {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
  });

  const alreadyCommented = comments.some((c) =>
    c.body?.includes(myCommentBody)
  );

  if (alreadyCommented) {
    return;
  }

  await octokit.rest.issues.createComment({
    owner: owner,
    repo: repo,
    issue_number: prNumber,
    body,
  });
}

run();
