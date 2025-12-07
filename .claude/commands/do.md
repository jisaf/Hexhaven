---
description: Fetch GitHub issue and execute /new with issue content
model: opusplan
thinking: true
---

## Goal

Fetch the content of a GitHub issue by issue number and execute the `/new` command with the issue content as the task description.

## Execution Steps

1. **Parse Issue Number**: Extract the issue number from the command argument (e.g., `/do 189` → issue #189)
2. **Fetch Issue Content**: Use `gh issue view <issue-number>` to fetch the issue details including:
   - Issue title
   - Issue description/body
   - Labels (if any)
3. **Format Task Description**: Combine the issue title and body into a clear task description
4. **Execute /new**: Run the `/new` command with the formatted task description

## Issue Number

{PROMPT}

## Instructions

1. First, validate that the argument is a valid issue number
2. Use GitHub CLI (`gh`) to fetch issue details:
   ```bash
   gh issue view {PROMPT} --json title,body,labels
   ```
3. Parse the JSON response to extract title and body
4. Format the task as: "Address issue #{PROMPT}: {title}\n\n{body}"
5. Execute `/new` slash command with the formatted task description
