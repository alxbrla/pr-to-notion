# PR to Notion Sync

A GitHub Action that automatically syncs Pull Requests with Notion tasks.

## Setup

### 1. Notion Configuration

#### Notion Github Prs database

1. Create a new integration at [Notion Integrations](https://www.notion.so/my-integrations)
2. Copy the Internal Integration Secret
3. Create a database in Notion with these properties:
   - **Title** (Title)
   - **Tasks** (Relation to your tasks database)
   - **URL** (url type, will store the url to the PR)
   - **PR Number** (number, will store the pr number)
   - **Closed At** (Date type, will store when the PR has been closed)
   - **Merged At** (Date type, will store when the PR has been merged)
   - **Created At** (Date type, will store when the PR has been created)
   - **Updated At** (Date type, will store when the PR has been updated)
   - **Description** (Long text, will store the PR's description)
   - **State** (Select, with 'Open, Closed, Merged' options, to store the PR's state)
4. Share your database with the integration
5. Copy the database ID from the URL

#### Notion tasks database

1. Verify that your tasks database has a column for ID number (auto generated) and save the prefix you use to update the action config

### 2. GitHub Token Setup

1. Go to your repo settings -> Actions -> General -> Workflow permissions and allow read and write
2. Go to your repo settings -> Actions -> General -> Allow GitHub Actions to create and approve pull requests and allow it

## Usage

Create `.github/workflows/pr-sync.yml`:

```yaml
name: PR to Notion Sync

on:
  pull_request:
    types: [opened, edited, reopened, synchronize, merged, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: alxbrla/pr-to-notion@latest
        with:
          notion_token: ${{ secrets.NOTION_TOKEN }}
          notion_tasks_db_id: ${{ secrets.NOTION_TICKETS_DB }}
          notion_pr_links_db_id: ${{ secrets.NOTION_PRS_DB }}
          notion_property_task_id: "ID"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Replace the **notion_property_task_id** with the ID you configured in your notion TASKS database.

## Configuration Options

### Custom Property Names

You can customize the Notion database property names by adding these optional parameters:

```yaml
- uses: alxbrla/pr-to-notion@latest
    with:
        notion_token: ${{ secrets.NOTION_TOKEN }}
        notion_tasks_db_id: ${{ secrets.NOTION_TICKETS_DB }}
        notion_pr_links_db_id: ${{ secrets.NOTION_PRS_DB }}
        # Customize property names
        notion_property_task_id: "ID"
        notion_property_title: "Title"
        notion_property_pr_url: "URL"
        notion_property_pr_number: "PR Number"
        notion_property_closed_at: "Closed At"
        notion_property_created_at: "Created At"
        notion_property_updated_at: "Updated At"
        notion_property_merged_at: "Merged At"
        notion_property_description: "Description"
        notion_property_state: "State"
        notion_property_tasks: "Tasks"
    env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If not specified, the action will use the default property names listed in the setup section.

## How it works

When you create a Pull request, specify the task Id in the title like **'TASK-2: Update Documentation'**

You can also write it like:

- '📝 TASK-2: Update Documentation'
- '📝 TASK-2 & TASK-3 & TASK-4: Update Documentation'
- 'doc TASK-2: Update Documentation'
- 'doc TASK-2 & TASK-3 & TASK-4: Update Documentation'

**the rules are: don't use spaces or ':' before the tasks ids.**

Each time the a PR is created/updated/merged/closed, the workflow will run again an add or update a row in your notion github PRs database and link the tasks from the tasks database. so the pull requests will appear on your tasks. You can then add notion automation on your tasks database to change the task status based on your pull request status.
