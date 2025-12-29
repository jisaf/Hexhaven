---
description: Code review a PR, fix issues, update docs, push and check CI
model: opus
thinking: true
---

## Goal

Conduct a comprehensive code review of a GitHub pull request, fix all critical/high/medium issues found, update relevant documentation, push changes, and verify CI passes.

## Execution Steps

### Step 1: Clear Context and Prepare

Execute `/clear` to remove all previous conversation history and start fresh.

### Step 2: Fetch PR Information

Parse the PR number from the argument and fetch PR details:

```bash
# Get PR details including branch info
gh pr view {PROMPT} --json number,title,body,headRefName,baseRefName,files,additions,deletions

# Get the diff for review
gh pr diff {PROMPT}
```

### Step 3: Checkout PR Branch

```bash
# Fetch and checkout the PR branch
gh pr checkout {PROMPT}

# Ensure we have latest changes
git pull
```

### Step 4: Conduct Code Quality Review

Use the **code-quality-architect** agent (via Task tool with `subagent_type: code-quality-architect`) to perform a thorough code review:

- Analyze all changed files in the PR
- Evaluate against DRY, SOLID, clean code, and maintainability principles
- Categorize issues by severity: CRITICAL, HIGH, MEDIUM, LOW, TRIVIAL
- Generate detailed report with locations, descriptions, impacts, and proposed actions
- Create GitHub issues for LOW and TRIVIAL items

Provide the agent with:
- The PR number and diff
- List of changed files
- Request for severity-categorized report

### Step 5: Fix Critical, High, and Medium Issues

Use the **tdd-solid-developer** agent (via Task tool with `subagent_type: tdd-solid-developer`) to fix all identified issues. This agent excels at:

- Finding root causes rather than treating symptoms
- Following TDD principles (Red-Green-Refactor)
- Applying SOLID and DRY best practices
- Running tests before committing

For each issue category:

1. **CRITICAL issues** - Must fix immediately
   - Security vulnerabilities
   - Data loss risks
   - Breaking changes
   - Race conditions
   - Memory leaks

2. **HIGH issues** - Should fix
   - Performance problems
   - Major SOLID violations
   - Missing error handling
   - Architectural tech debt
   - Type safety issues

3. **MEDIUM issues** - Fix now
   - Moderate DRY violations
   - Suboptimal patterns
   - Missing edge cases
   - Incomplete typing

Provide the tdd-solid-developer agent with:
- The list of issues from the code quality review
- File locations and descriptions
- Expected behavior after fixes

### Step 6: Update Documentation

Use the **docs-maintainer** agent (via Task tool with `subagent_type: docs-maintainer`) to synchronize documentation with code changes. This agent specializes in:

- Maintaining comprehensive documentation structure
- Ensuring accuracy between code and docs
- Following documentation best practices
- Cross-referencing related sections

**Documentation the agent will review and update:**
- `PRD.md` - If features or requirements changed
- `docs/ARCHITECTURE.md` - If architectural patterns, components, or data flow changed
- `docs/API.md` - If API endpoints were added/modified
- `docs/SERVICES.md` - If services or utilities changed
- Other `docs/*.md` files - If related systems were modified
- README files - If setup, usage, or API changed

Provide the docs-maintainer agent with:
- Summary of code changes from the PR
- List of files modified
- Any new features or architectural changes

### Step 7: Commit and Push Changes

```bash
# Stage all changes
git add .

# Check what we're committing
git diff --cached --stat

# Commit with descriptive message
git commit -m "$(cat <<'EOF'
fix: Address code review issues from PR #{PROMPT}

- Fixed critical/high/medium issues identified in code quality review
- Updated documentation to reflect changes

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"

# Push changes to PR branch
git push
```

### Step 8: Monitor CI on GitHub

After pushing, watch the CI workflow results on GitHub:

```bash
# Wait for CI workflow to start (may take a few seconds)
sleep 5

# Get the latest workflow run for this branch
gh run list --branch $(git branch --show-current) --limit 1

# Watch the CI workflow in real-time
gh run watch --exit-status

# If watch times out or you need details, check status
gh run list --branch $(git branch --show-current) --limit 1 --json status,conclusion,name,databaseId
```

**If CI fails:**
```bash
# View the failed run logs
gh run view --log-failed

# Get specific job logs if needed
gh run view <run-id> --log
```

### Step 9: Report Results

Provide a comprehensive summary:

1. **Code Review Summary**
   - Total issues found by severity
   - Issues fixed vs. deferred (with GitHub issue links for LOW/TRIVIAL)

2. **Changes Made**
   - Files modified
   - Documentation updated

3. **GitHub CI Status**
   - Workflow run URL
   - Pass/fail status for each job
   - Any failure logs if CI failed

4. **PR Status**
   - Link to updated PR
   - Ready for merge status

## Error Handling

**If PR not found:**
- Exit with clear error message

**If checkout fails:**
- Check for uncommitted changes
- Stash or reset as needed

**If GitHub CI fails:**
- Use `gh run view --log-failed` to analyze failures
- Fix the identified issues
- Commit and push fixes
- Monitor new CI run with `gh run watch --exit-status`
- If persistent, report remaining issues with failure logs

**If no issues found:**
- Report clean review
- Skip to CI verification

## Usage

```bash
# Review PR #123
/cr 123

# Review PR from URL
/cr https://github.com/owner/repo/pull/123
```

## Task

Review, fix, document, push, and verify PR: {PROMPT}
