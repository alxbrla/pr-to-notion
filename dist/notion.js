"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTaskUrlInNotion = findTaskUrlInNotion;
exports.createOrUpdateRowInPrLinkDb = createOrUpdateRowInPrLinkDb;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("./config");
async function findTaskUrlInNotion(taskId) {
    const notionToken = core.getInput("notion_token");
    const notionTasksDbId = core.getInput("notion_tasks_db_id");
    const notionPropertyTaskId = core.getInput("notion_property_task_id");
    const formattedTaskId = Number(taskId.split("-")[1]);
    const res = await (0, node_fetch_1.default)(`https://api.notion.com/v1/databases/${notionTasksDbId}/query`, {
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
    });
    if (!res.ok) {
        const error = await res.json();
        core.setFailed(`❌ Notion API error: ${error.message}`);
        return null;
    }
    const data = await res.json();
    const task = data.results[0];
    return task ? { id: task.id, url: task.url } : null;
}
async function createOrUpdateRowInPrLinkDb(taskId) {
    const pr = github.context.payload.pull_request;
    if (!pr) {
        core.setFailed("❌ This action only runs on pull_request events.");
        return;
    }
    const existingRowId = await findNotionRowByPrNumber(pr.number);
    if (existingRowId) {
        await updateNotionRow(existingRowId, pr, taskId);
    }
    else {
        await createNotionRow(pr, taskId);
    }
}
async function findNotionRowByPrNumber(prNumber) {
    const notionToken = core.getInput("notion_token");
    const notionPrLinkDbId = core.getInput("notion_pr_link_db_id");
    const res = await (0, node_fetch_1.default)(`https://api.notion.com/v1/databases/${notionPrLinkDbId}/query`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${notionToken}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
            filter: {
                property: "PR Number",
                number: { equals: prNumber },
            },
        }),
    });
    if (!res.ok) {
        const error = await res.json();
        core.setFailed(`❌ Notion API error: ${error.message}`);
        return null;
    }
    const data = await res.json();
    return data.results[0].id || null;
}
function getPrState(pr) {
    if (pr.state === "open") {
        return "open";
    }
    else if (pr.state === "closed" && !pr.merged_at) {
        return "closed";
    }
    else {
        return "merged";
    }
}
function getNotionPayload(pr, notionTasks) {
    const notionPropertiesConfig = (0, config_1.getNotionPropertiesConfig)();
    const properties = {
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
            relation: [{ id: notionTasks }],
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
async function updateNotionRow(rowid, pr, taskId) {
    const notionToken = core.getInput("notion_token");
    core.info(`🔄 Updating Notion row ${rowid}`);
    const res = await (0, node_fetch_1.default)(`https://api.notion.com/v1/pages/${rowid}`, {
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
async function createNotionRow(pr, taskId) {
    const notionToken = core.getInput("notion_token");
    const notionPrLinkDbId = core.getInput("notion_pr_link_db_id");
    const res = await (0, node_fetch_1.default)("https://api.notion.com/v1/pages", {
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
