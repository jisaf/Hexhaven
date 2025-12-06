---
description: Commit changes, push branch, and create PR
model: haiku
---

## Goal

Automate the git workflow by committing staged/unstaged changes, pushing to remote, and creating a pull request when appropriate.

## Execution Steps

### 1. Check Git Status

First, determine the current state:
```bash
git status
git branch --show-current
git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's/origin\///'
```

### 2. Branch Management

**If on main/master:**
- Ask user for branch name or generate from commit message
- Create and checkout new branch: `git checkout -b <branch-name>`

**If on feature branch:**
- Continue on current branch

### 3. Stage Changes

Check for unstaged changes:
```bash
git status --porcelain
```

**If there are unstaged changes:**
```bash
git add .
```

### 4. Create Commit

**If there are staged changes:**
- Review changes with `git diff --cached --stat`
- Generate commit message following repository style
- Commit with message:
```bash
git commit -m "$(cat <<'EOF'
[commit message here]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

**If no changes to commit:**
- Skip to push step

### 5. Push to Remote

```bash
# Check if remote tracking branch exists
if git rev-parse --abbrev-ref @{upstream} >/dev/null 2>&1; then
  # Push to existing upstream
  git push
else
  # Set upstream and push
  git push -u origin $(git branch --show-current)
fi
```

### 6. Create Pull Request

**Only create PR if:**
- Current branch is NOT main/master
- Changes have been pushed
- PR doesn't already exist

**Check for existing PR:**
```bash
gh pr list --head $(git branch --show-current) --json number -q '.[0].number'
```

**If no PR exists, create one:**
```bash
gh pr create --title "[PR Title]" --body "$(cat <<'EOF'
## Summary
- [Change 1]
- [Change 2]

## Test Plan
- [ ] Manual testing completed
- [ ] Visual tests pass (`/visual smoke`)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 7. Report Results

Provide summary:
- Branch name
- Commit SHA (if created)
- Push status
- PR URL (if created)

## Branch Naming Convention

When creating new branch from main:
- Use lowercase with hyphens
- Descriptive but concise
- Examples:
  - "fix-card-overflow" (for bug fixes)
  - "add-user-auth" (for features)
  - "refactor-api-layer" (for refactoring)

## Usage

```bash
# Commit, push, and create PR
/submit

# With custom prompt (uses arguments for commit message guidance)
/submit fix login redirect issue
```

## Important Notes

- Always check git status first
- Create new branch if on main/master
- Stage all changes automatically
- Follow repository commit message style
- Only create PR if on feature branch
- Report PR URL for easy access

## Task

Execute the git workflow: check status, manage branches, commit changes, push to remote, and create PR if appropriate.

{PROMPT}
