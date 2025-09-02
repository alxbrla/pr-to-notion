const core = require("@actions/core");
const github = require("@actions/github");
const fetch = require("node-fetch");

async function run() {
  try {
    const notionToken = core.getInput("notion_token");
    const ticketsDb = core.getInput("tickets_db_id");
    const prsDb = core.getInput("prs_db_id");
    const notionTicketIdProperty = core.getInput("notion_ticket_id");

    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed("❌ This action only runs on pull_request events.");
      return;
    }

    const prTitle = pr.title;
    const prNumber = pr.number;
    const prUrl = pr.html_url;
    const { owner, repo } = github.context.repo;

    core.info(`🔍 PR Title: ${prTitle}`);

    // Extract IDs before the colon
    const matches = [...prTitle.matchAll(/([a-zA-Z]+-\d+)(?=[^:]*:)/g)].map(
      (m) => m[1]
    );
    if (matches.length === 0) {
      core.warning("⚠️ No ticket IDs found in PR title.");
      return;
    }

    if (process.env.GITHUB_TOKEN === undefined) {
      core.setFailed("❌ GITHUB_TOKEN is not defined.");
      return;
    }

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

    for (const ticketId of matches) {
      core.info(`🔎 Looking for ticket: ${ticketId}`);

      // Search Notion Tickets DB
      const searchRes = await notionQuery(
        notionToken,
        ticketsDb,
        ticketId,
        notionTicketIdProperty
      );

      if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
        const msg = `❌ Ticket not found in Notion: ${ticketId}`;
        core.warning(msg);
        // await commentPR(octokit, repo, prNumber, msg);
        continue;
      }

      core.info(`🔍 Found ticket in Notion: ${ticketId}`);

      const ticketPage = searchRes.results[0];
      const ticketUrl = ticketPage.url;

      // Comment on PR
      await commentPR(
        octokit,
        repo,
        owner,
        prNumber,
        `✅ Linked ticket [${ticketId}](${ticketUrl})`
      );

      // Add row in PRs DB
      await addPrToNotion(notionToken, prsDb, {
        prTitle,
        prUrl,
        ticketId,
        ticketRelation: ticketPage.id,
        prNumber,
      });
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
  { prTitle, prUrl, ticketId, ticketRelation, prNumber }
) {
  const payload = {
    parent: { database_id: dbId },
    properties: {
      Name: { title: [{ text: { content: prTitle } }] },
      "PR URL": { url: prUrl },
      Ticket: { relation: [{ id: ticketRelation }] },
      "Ticket ID": { rich_text: [{ text: { content: ticketId } }] },
      "PR Number": { number: prNumber },
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
  core.info(`💬 Commenting on PR #${prNumber}: ${body}`);
  core.info(`💬 Repo: ${repo}`);
  core.info(`💬 Owner: ${owner}`);
  await octokit.rest.issues.createComment({
    owner: owner,
    repo: repo,
    issue_number: prNumber,
    body,
  });
}

run();
