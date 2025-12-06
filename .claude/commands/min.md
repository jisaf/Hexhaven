---
description: Execute command with Haiku (minimal resources), then restore OpusPlan
---

## User Input

```text
$ARGUMENTS
```

## Goal

Execute the user's command using Claude Haiku (faster, cheaper model) with thinking disabled, then automatically restore Claude OpusPlan with thinking enabled for subsequent tasks.

## Execution Steps

1. **Switch to Haiku**: Use `/model haiku` to set the model to Claude Haiku
2. **Disable Thinking**: Use `/thinking off` to disable thinking mode
3. **Execute Command**: Perform the task specified in the arguments above
4. **Restore OpusPlan**: Use `/model opusplan` to switch back to Claude OpusPlan
5. **Enable Thinking**: Use `/thinking on` to re-enable thinking mode

## Usage Example

```
/min change the font size to 10px
```

This will:
- Switch to Haiku with thinking off
- Change the font size to 10px
- Switch back to OpusPlan with thinking on

## Task

$ARGUMENTS
