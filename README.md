# PR to Notion Sync

Stop manually updating Notion when your PRs are opened, merged, or closed. This GitHub Action automatically syncs your Pull Requests with your Notion workspace, creating a seamless link between your code and your project management.

## Why use this?

- **Automatic PR tracking**: Every PR is automatically logged in your Notion database
- **Task-to-PR linking**: Link PRs to Notion tasks by simply including task IDs in your PR title
- **Real-time status updates**: PR status (open/merged/closed) automatically syncs to Notion
- **Smart commenting**: Automatically adds comments with Notion task links to your PRs
- **Fully customizable**: Configure property names to match your existing Notion setup

## How it works

When you create a Pull Request, include your task ID in the title following this pattern:

**Format:** `TASK-2: Update Documentation`

### Supported formats:

- `TASK-2: Update Documentation`
- `📝 TASK-2: Update Documentation`
- `📝 TASK-2 & TASK-3 & TASK-4: Update Documentation`
- `doc TASK-2: Update Documentation`
- `doc TASK-2 & TASK-3 & TASK-4: Update Documentation`

**Important rule:** Don't use spaces or `:` before the task IDs.

### What happens automatically:

Each time a PR is created, updated, merged, or closed, this action will:
1. Extract task IDs from the PR title
2. Find matching tasks in your Notion tasks database
3. Create or update a row in your Notion GitHub PRs database
4. Link the PR to the related tasks
5. Add a comment to the PR with links to the Notion tasks

The pull requests will appear on your linked tasks in Notion. You can then add Notion automations on your tasks database to change task status based on PR status.

## Quick Start

### 1. Notion Configuration

#### Notion GitHub PRs database

1. Create a new integration at [Notion Integrations](https://www.notion.so/my-integrations)
2. Copy the Internal Integration Secret
3. Create a database in Notion with these properties:
   - **Title** (Title type) - Will store the PR title
   - **Tasks** (Relation type) - Relation to your tasks database
   - **URL** (URL type) - Will store the URL to the PR
   - **PR Number** (Number type) - Will store the PR number
   - **Closed At** (Date type) - Will store when the PR has been closed
   - **Merged At** (Date type) - Will store when the PR has been merged
   - **Created At** (Date type) - Will store when the PR has been created
   - **Updated At** (Date type) - Will store when the PR has been updated
   - **Description** (Long text type) - Will store the PR's description
   - **State** (Select type) - With 'Open, Closed, Merged' options, to store the PR's state
4. Share your database with the integration
5. Copy the database ID from the URL

#### Notion tasks database

1. Verify that your tasks database has a column for ID number (auto generated)
   - Your task IDs should follow the format: `PREFIX-NUMBER` (e.g., `TASK-1`, `TASK-2`, `BUG-123`)
   - The prefix must contain only letters (no numbers allowed in the prefix)

### 2. GitHub Token Setup

1. Go to your repo settings → Actions → General → Workflow permissions and allow read and write
2. Go to your repo settings → Actions → General → Allow GitHub Actions to create and approve pull requests and enable it

### 3. Add GitHub Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions → New repository secret):
- `NOTION_TOKEN`: Your Notion Internal Integration Secret from step 1.2
- `NOTION_TICKETS_DB`: Your Notion tasks database ID
- `NOTION_PRS_DB`: Your Notion GitHub PRs database ID from step 1.5

## Usage

Create `.github/workflows/pr-sync.yml` in your repository:

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
      - uses: alxbrla/pr-to-notion@v1
        with:
          notion_token: ${{ secrets.NOTION_TOKEN }}
          notion_tasks_db_id: ${{ secrets.NOTION_TICKETS_DB }}
          notion_pr_links_db_id: ${{ secrets.NOTION_PRS_DB }}
          notion_property_task_id: "ID"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Replace the `notion_property_task_id` value with the ID property name you configured in your Notion TASKS database.

## Configuration Options

### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `notion_token` | Your Notion Integration Secret | `${{ secrets.NOTION_TOKEN }}` |
| `notion_tasks_db_id` | Your Notion tasks database ID | `${{ secrets.NOTION_TICKETS_DB }}` |
| `notion_pr_links_db_id` | Your Notion GitHub PRs database ID | `${{ secrets.NOTION_PRS_DB }}` |
| `notion_property_task_id` | The property name for task IDs in your tasks database | `"ID"` |

### Custom Property Names (Optional)

You can customize the Notion database property names to match your existing setup by adding these optional parameters:

```yaml
- uses: alxbrla/pr-to-notion@v1
  with:
    notion_token: ${{ secrets.NOTION_TOKEN }}
    notion_tasks_db_id: ${{ secrets.NOTION_TICKETS_DB }}
    notion_pr_links_db_id: ${{ secrets.NOTION_PRS_DB }}
    # Required
    notion_property_task_id: "ID"
    # Optional - customize property names
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

If not specified, the action will use the default property names listed in the setup section:
- **Title** → PR title
- **URL** → PR URL
- **PR Number** → PR number
- **Closed At** → PR closed date
- **Merged At** → PR merged date
- **Created At** → PR created date
- **Updated At** → PR updated date
- **Description** → PR description/body
- **State** → PR state (Open/Closed/Merged)
- **Tasks** → Relation to tasks

## Troubleshooting

### No tasks are being linked

- Verify that your task IDs in the PR title match the format in your Notion database (e.g., `TASK-123`)
- Check that the `notion_property_task_id` matches the property name in your tasks database
- Ensure the task prefix matches (e.g., if your tasks use `TICKET-1`, your PR title should say `TICKET-1`)

### Action fails with "Notion API error"

- Verify that your Notion integration has access to both databases (check sharing settings)
- Ensure your `NOTION_TOKEN` secret is correct
- Confirm database IDs are correct

### PR comments are not appearing

- Check that "Allow GitHub Actions to create and approve pull requests" is enabled
- Verify that workflow permissions are set to "Read and write"

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
