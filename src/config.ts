import * as core from "@actions/core";

export function getNotionPropertiesConfig() {
  return {
    notionPropertyAssignee: core.getInput("notion_property_assignee"),
    notionPropertyClosedAt: core.getInput("notion_property_closed_at"),
    notionPropertyCreatedAt: core.getInput("notion_property_created_at"),
    notionPropertyCreator: core.getInput("notion_property_creator"),
    notionPropertyDescription: core.getInput("notion_property_description"),
    notionPropertyMergedAt: core.getInput("notion_property_merged_at"),
    notionPropertyPrNumber: core.getInput("notion_property_pr_number"),
    notionPropertyReviewer: core.getInput("notion_property_reviewer"),
    notionPropertyState: core.getInput("notion_property_state"),
    notionPropertyUpdatedAt: core.getInput("notion_property_updated_at"),
    notionPropertyTasks: core.getInput("notion_property_tasks"),
    notionPropertyPrUrl: core.getInput("notion_property_pr_url"),
  };
}
