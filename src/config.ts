import * as core from "@actions/core";

export function getNotionPropertiesConfig() {
  return {
    notionPropertyClosedAt: core.getInput("notion_property_closed_at"),
    notionPropertyCreatedAt: core.getInput("notion_property_created_at"),
    notionPropertyDescription: core.getInput("notion_property_description"),
    notionPropertyMergedAt: core.getInput("notion_property_merged_at"),
    notionPropertyPrNumber: core.getInput("notion_property_pr_number"),
    notionPropertyState: core.getInput("notion_property_state"),
    notionPropertyUpdatedAt: core.getInput("notion_property_updated_at"),
    notionPropertyTasks: core.getInput("notion_property_tasks"),
    notionPropertyPrUrl: core.getInput("notion_property_pr_url"),
  };
}
