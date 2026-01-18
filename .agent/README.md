# Recursive Development System

Autonomous AI-powered development loop for the Inspo app, inspired by [Loom](https://github.com/ghuntley/loom).

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │ prd.json │───▶│  Claude  │───▶│  Commit  │            │
│    │  (todo)  │    │  Agent   │    │ (if pass)│            │
│    └──────────┘    └────┬─────┘    └──────────┘            │
│         ▲               │                                   │
│         │               ▼                                   │
│         │         ┌──────────┐                             │
│         │         │  Lint +  │                             │
│         │         │  Build   │                             │
│         │         └────┬─────┘                             │
│         │              │                                   │
│         │    ┌─────────┴─────────┐                         │
│         │    │                   │                         │
│         │  Pass               Fail                         │
│         │    │                   │                         │
│         │    ▼                   ▼                         │
│    ┌────┴─────┐           ┌──────────┐                     │
│    │ Mark Done│           │Mark Failed│                    │
│    │ + Learn  │           │          │                     │
│    └──────────┘           └──────────┘                     │
│         │                                                   │
│         └──────────── Loop ────────────────────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|------|---------|
| `loop.sh` | Main loop - runs continuously until all stories done |
| `run-one.sh` | Run a single story (for testing) |
| `status.sh` | Show PRD status and progress |
| `prompt.md` | Agent system prompt (context for Claude) |
| `learnings.md` | Log of insights discovered during development |

## Usage

### Check Status
```bash
./.agent/status.sh
```

### Run Single Story
```bash
# Next todo story
./.agent/run-one.sh

# Specific story
./.agent/run-one.sh INSPO-003
```

### Run Full Loop
```bash
# Default: up to 100 iterations, 5s pause between
./.agent/loop.sh

# Custom settings
MAX_ITERATIONS=10 PAUSE_BETWEEN=10 ./.agent/loop.sh
```

## PRD Format (prd.json)

```json
{
  "stories": [
    {
      "id": "INSPO-001",
      "title": "Feature Title",
      "description": "What to build",
      "acceptance_criteria": ["Criterion 1", "Criterion 2"],
      "status": "todo|in_progress|done|failed",
      "priority": 1,
      "estimate": "small|medium|large",
      "tags": ["frontend", "core-ui"]
    }
  ]
}
```

### Status Values
- `todo` - Not started
- `in_progress` - Agent is working on it
- `done` - Completed and committed
- `failed` - Agent couldn't complete (see `failure_reason`)

## Agent Output Protocol

The agent outputs status markers that the loop script parses:

```
SUCCESS: Implemented sidebar with folder tree
FAILED: Could not find required component
LEARNING: Radix ScrollArea needs explicit height
```

## Customization

### Add New Stories
Edit `prd.json` and add to the `stories` array. Set `status: "todo"` and appropriate `priority`.

### Modify Agent Behavior
Edit `prompt.md` to change how the agent approaches tasks.

### Review Learnings
Check `learnings.md` for patterns and insights the agent discovered.

## Requirements

- Claude Code CLI (`claude`)
- jq (`brew install jq`)
- bun (package manager)

## Tips

1. **Start small**: Test with `run-one.sh` before running the full loop
2. **Watch the first few**: Monitor early iterations to catch issues
3. **Review commits**: Check git log to see what the agent produced
4. **Iterate on prompts**: Refine `prompt.md` based on results
5. **Keep stories focused**: Smaller, specific stories work better than big vague ones
