import * as core from "@actions/core";
import * as github from "@actions/github";
import fetch from "node-fetch";
import { getNotionPropertiesConfig } from "./config";

export async function findTaskUrlInNotion(
  taskId: string
): Promise<{ id: string; url: string } | null> {
  const notionToken = core.getInput("notion_token");
  const notionTasksDbId = core.getInput("notion_tasks_db_id");
  const notionPropertyTaskId = core.getInput("notion_property_task_id");

  const formattedTaskId = Number(taskId.split("-")[1]);

  const res = await fetch(
    `https://api.notion.com/v1/databases/${notionTasksDbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: notionPropertyTaskId,
          number: { equals: formattedTaskId },
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    core.setFailed(`❌ Notion API error: ${error.message}`);
    return null;
  }

  const data = await res.json();
  const task = data.results[0];

  return task ? { id: task.id, url: task.url } : null;
}

export async function upsertRowInPrLinkDb(taskId: string) {
  const pr = github.context.payload.pull_request;

  if (!pr) {
    core.setFailed("❌ This action only runs on pull_request events.");
    return;
  }

  const existingRowId = await findNotionRowByUrl();

  if (existingRowId) {
    await updateNotionRow(existingRowId, pr, taskId);
  } else {
    await createNotionRow(pr, taskId);
  }
}

async function findNotionRowByUrl(): Promise<string | null> {
  const pr = github.context.payload.pull_request;

  if (!pr) {
    core.setFailed("❌ This action only runs on pull_request events.");
    return null;
  }

  if (!process.env.GITHUB_TOKEN) {
    core.setFailed("❌ GITHUB_TOKEN is not set.");
    return null;
  }

  const { owner, repo } = github.context.repo;

  const notionToken = core.getInput("notion_token");
  const notionPrLinkDbId = core.getInput("notion_pr_links_db_id");
  const notionPropertiesConfig = getNotionPropertiesConfig();
  core.info(`🔍 Searching for Notion row with PR number ${pr.number}`);
  const res = await fetch(
    `https://api.notion.com/v1/databases/${notionPrLinkDbId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        filter: {
          property: notionPropertiesConfig.notionPropertyPrUrl,
          url: {
            equals: `https://github.com/${owner}/${repo}/pull/${pr.number}`,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.json();
    core.setFailed(`❌ Notion API error: ${error.message}`);
    return null;
  }

  core.info(`✅ Found Notion row for PR number ${pr.number}`);

  const data = await res.json();
  return data.results[0]?.id || null;
}

function getPrState(pr: any) {
  if (pr.state === "open") {
    return "open";
  } else if (pr.state === "closed" && !pr.merged_at) {
    return "closed";
  } else {
    return "merged";
  }
}

function getNotionPayload(pr: any, notionTasks: string[]) {
  const notionPropertiesConfig = getNotionPropertiesConfig();
  const properties: any = {
    Name: {
      title: [
        {
          text: {
            content: pr.title,
          },
        },
      ],
    },
    [notionPropertiesConfig.notionPropertyPrNumber]: {
      number: pr.number,
    },
    [notionPropertiesConfig.notionPropertyTasks]: {
      relation: [...notionTasks.map((taskId) => ({ id: taskId }))],
    },
    [notionPropertiesConfig.notionPropertyCreatedAt]: {
      date: {
        start: pr.created_at,
      },
    },
    [notionPropertiesConfig.notionPropertyUpdatedAt]: {
      date: {
        start: pr.updated_at,
      },
    },
    [notionPropertiesConfig.notionPropertyState]: {
      select: {
        name: getPrState(pr),
      },
    },
  };

  if (pr.html_url) {
    properties[notionPropertiesConfig.notionPropertyPrUrl] = {
      url: pr.html_url,
    };
  }

  if (pr.updated_at) {
    properties[notionPropertiesConfig.notionPropertyUpdatedAt] = {
      date: {
        start: pr.updated_at,
      },
    };
  }

  if (pr.closed_at) {
    properties[notionPropertiesConfig.notionPropertyClosedAt] = {
      date: {
        start: pr.closed_at,
      },
    };
  }

  if (pr.merged_at) {
    properties[notionPropertiesConfig.notionPropertyMergedAt] = {
      date: {
        start: pr.merged_at,
      },
    };
  }

  if (pr.body) {
    properties[notionPropertiesConfig.notionPropertyDescription] = {
      rich_text: [
        {
          text: {
            content: pr.body,
          },
        },
      ],
    };
  }

  return properties;
}

async function updateNotionRow(rowid: string, pr: any, taskId: string) {
  const notionToken = core.getInput("notion_token");

  core.info(`🔄 Updating Notion row ${rowid}`);

  const res = await fetch(`https://api.notion.com/v1/pages/${rowid}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { page_id: rowid },
      properties: getNotionPayload(pr, [taskId]),
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    core.setFailed(`❌ Notion API error: ${error.message}`);
    return null;
  }

  return await res.json();
}

async function createNotionRow(pr: any, taskId: string) {
  const notionToken = core.getInput("notion_token");
  const notionPrLinkDbId = core.getInput("notion_pr_links_db_id");

  core.info(`🔄 Creating Notion row for PR number ${pr.number}`);

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: notionPrLinkDbId },
      properties: getNotionPayload(pr, [taskId]),
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    core.setFailed(`❌ Notion API error: ${error.message}`);
    return null;
  }

  return await res.json();
}
