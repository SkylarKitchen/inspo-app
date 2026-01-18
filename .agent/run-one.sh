#!/bin/bash
# Run a single story from prd.json
# Usage: ./run-one.sh [story-id]

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRD_FILE="$PROJECT_DIR/prd.json"

cd "$PROJECT_DIR"

# Get story - either by ID or next todo
if [ -n "$1" ]; then
    story=$(jq -r --arg id "$1" '.stories[] | select(.id == $id)' "$PRD_FILE")
    if [ -z "$story" ]; then
        echo "Story $1 not found"
        exit 1
    fi
else
    story=$(jq -r '.stories | map(select(.status == "todo")) | sort_by(.priority) | .[0] // empty' "$PRD_FILE")
    if [ -z "$story" ]; then
        echo "No todo stories remaining"
        exit 0
    fi
fi

story_id=$(echo "$story" | jq -r '.id')
story_title=$(echo "$story" | jq -r '.title')
story_desc=$(echo "$story" | jq -r '.description')
story_criteria=$(echo "$story" | jq -r '.acceptance_criteria | join("\n  - ")')

echo "📋 Story: $story_id - $story_title"
echo ""
echo "Description: $story_desc"
echo ""
echo "Acceptance Criteria:"
echo "  - $story_criteria"
echo ""
echo "---"
echo ""

# Build prompt
prompt="Implement story $story_id: $story_title

## Description
$story_desc

## Acceptance Criteria
  - $story_criteria

## Instructions
1. Read existing codebase patterns
2. Implement following Tauri + React architecture
3. Use components from src/components/ui/
4. Run \`bun run lint\` and \`bun run build\`
5. If passing, commit: \"feat($story_id): $story_title\"

Output: SUCCESS/FAILED/LEARNING with brief explanation"

echo "Starting Claude..."
echo ""
echo "$prompt" | claude
