---
description: Select and fix bug from top 3 with planning and verification
model: opusplan
thinking: true
---

## Goal

Automate the complete bug fixing workflow by loading context, presenting the top 3 unfixed bugs for user selection, planning a fix, implementing it, verifying with visual testing, and deleting the bug from the list once resolved.

## Execution Steps

### 1. Initialize with /new Command

Execute `/new {PROMPT}` to:
- Clear previous context with `/clear`
- Load project documentation with `/context-load`
- Create a feature branch from main
- Set up fresh environment for bug fixing

### 2. Open and Parse Bug File (Using Haiku)

**Switch to Haiku for efficiency:**
- Use `/model haiku` to switch to Claude Haiku
- Use `/thinking off` to disable thinking mode
- Read `/home/opc/hexhaven/frontend/tests/bugs.md`
- Parse the file to find the **top 3 unchecked bugs** (lines starting with `## - [ ]`)
- Extract bug details for each:
  - Title
  - Explanation
  - Steps to recreate
  - Expected behavior
  - Screenshot/video reference (if available)
  - Branch and timestamp (if available)
- **Use `AskUserQuestion` tool** to present the 3 bugs and let the user select which one to fix
- Display the selected bug information

### 3. Switch to OpusPlan with Thinking for Planning

**Restore OpusPlan with thinking:**
- Use `/model opusplan` to switch back to Claude OpusPlan
- Use `/thinking on` to enable thinking mode

### 4. Enter Planning Mode

- Use the `EnterPlanMode` tool to thoroughly analyze the bug
- Explore the codebase to understand:
  - Root cause of the bug
  - Affected files and components
  - Related code patterns
  - Potential impact of changes
- Design a comprehensive fix strategy

### 5. Ask Clarifying Questions

If needed, use the `AskUserQuestion` tool to clarify:
- Preferred implementation approach
- Priority of different aspects
- Any constraints or requirements
- Whether to include additional improvements

### 6. Implement the Fix

- Execute the plan created in planning mode
- Make necessary code changes
- Follow project conventions and best practices
- Ensure the fix addresses the root cause, not just symptoms

### 7. Run Visual Verification

Execute `/visual smoke` to verify the fix:
- This will use Haiku to run Playwright MCP tests
- Verify that the previously failing step now passes
- Ensure no regressions were introduced
- Check that screenshots show correct behavior

### 8. Delete Bug from List (If Fixed)

**Only if visual tests pass:**
- Read the current bugs.md file
- Find the complete bug entry that was fixed (from the `## - [ ]` heading through the `---` separator)
- **Delete the entire bug entry** to keep the file size efficient
- Write the updated bugs.md back to disk
- Confirm to the user that the bug has been removed from the list

### 9. Submit Pull Request (If Fixed)

**Only if visual tests pass and bug was deleted:**
- Execute `/min submit pr` to use Haiku for efficient PR creation
- This will automatically:
  - Create a feature branch (if not already on one)
  - Stage and commit changes with descriptive message
  - Push to remote repository
  - Create pull request with summary and test plan

### 10. Report Results

Provide a summary including:
- Bug that was fixed
- Changes made
- Files modified
- Visual test results
- Status of bug list update
- Pull request URL (if created)

## Important Notes

- **Model switching is critical:**
  - Haiku for reading bugs.md (efficient, no thinking needed)
  - OpusPlan with thinking for planning and implementation (comprehensive analysis)
- **Planning is mandatory:** Always enter plan mode to ensure thorough analysis
- **Visual verification is required:** Don't delete bugs without running `/visual`
- **Only delete if tests pass:** If visual tests fail, leave the bug in the list and report the issue
- **User selection:** Always present top 3 bugs and let user choose which to fix

## Task

{PROMPT}
