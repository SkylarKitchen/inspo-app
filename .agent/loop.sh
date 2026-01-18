#!/bin/bash
# Recursive Development Loop for Inspo
# Continuously picks stories from prd.json and implements them

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Config
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRD_FILE="$PROJECT_DIR/prd.json"
LEARNINGS_FILE="$PROJECT_DIR/.agent/learnings.md"
PROMPT_FILE="$PROJECT_DIR/.agent/prompt.md"
MAX_ITERATIONS=${MAX_ITERATIONS:-100}
PAUSE_BETWEEN=${PAUSE_BETWEEN:-5}

# Ensure we're in project directory
cd "$PROJECT_DIR"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         🔄 Recursive Development Loop - Inspo             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check dependencies
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: 'claude' CLI not found. Install Claude Code first.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: 'jq' not found. Install with: brew install jq${NC}"
    exit 1
fi

# Function to get next todo story
get_next_story() {
    jq -r '.stories | map(select(.status == "todo")) | sort_by(.priority) | .[0] // empty' "$PRD_FILE"
}

# Function to mark story as in-progress
mark_in_progress() {
    local story_id="$1"
    local tmp_file=$(mktemp)
    jq --arg id "$story_id" '
        .stories |= map(if .id == $id then .status = "in_progress" else . end)
    ' "$PRD_FILE" > "$tmp_file" && mv "$tmp_file" "$PRD_FILE"
}

# Function to mark story as done
mark_done() {
    local story_id="$1"
    local tmp_file=$(mktemp)
    jq --arg id "$story_id" --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .stories |= map(if .id == $id then .status = "done" | .completed_at = $date else . end) |
        .meta.completed = ([.stories[] | select(.status == "done")] | length) |
        .meta.last_updated = $date
    ' "$PRD_FILE" > "$tmp_file" && mv "$tmp_file" "$PRD_FILE"
}

# Function to mark story as failed
mark_failed() {
    local story_id="$1"
    local reason="$2"
    local tmp_file=$(mktemp)
    jq --arg id "$story_id" --arg reason "$reason" --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
        .stories |= map(if .id == $id then .status = "failed" | .failed_at = $date | .failure_reason = $reason else . end) |
        .meta.last_updated = $date
    ' "$PRD_FILE" > "$tmp_file" && mv "$tmp_file" "$PRD_FILE"
}

# Function to log learnings
log_learning() {
    local story_id="$1"
    local learning="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    echo "" >> "$LEARNINGS_FILE"
    echo "## $story_id - $timestamp" >> "$LEARNINGS_FILE"
    echo "" >> "$LEARNINGS_FILE"
    echo "$learning" >> "$LEARNINGS_FILE"
    echo "" >> "$LEARNINGS_FILE"
    echo "---" >> "$LEARNINGS_FILE"
}

# Function to get progress stats
get_stats() {
    local total=$(jq '.stories | length' "$PRD_FILE")
    local done=$(jq '[.stories[] | select(.status == "done")] | length' "$PRD_FILE")
    local todo=$(jq '[.stories[] | select(.status == "todo")] | length' "$PRD_FILE")
    local failed=$(jq '[.stories[] | select(.status == "failed")] | length' "$PRD_FILE")
    echo "$done/$total done, $todo todo, $failed failed"
}

# Main loop
iteration=0
while [ $iteration -lt $MAX_ITERATIONS ]; do
    iteration=$((iteration + 1))

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Iteration $iteration | $(get_stats)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Get next story
    story=$(get_next_story)

    if [ -z "$story" ]; then
        echo -e "${GREEN}✅ All stories completed! 🎉${NC}"
        break
    fi

    story_id=$(echo "$story" | jq -r '.id')
    story_title=$(echo "$story" | jq -r '.title')
    story_desc=$(echo "$story" | jq -r '.description')
    story_criteria=$(echo "$story" | jq -r '.acceptance_criteria | join("\n  - ")')

    echo -e "${YELLOW}📋 Story: $story_id - $story_title${NC}"
    echo ""

    # Mark as in-progress
    mark_in_progress "$story_id"

    # Build the prompt for Claude
    prompt="You are implementing story $story_id for the Inspo app.

## Story: $story_title

$story_desc

## Acceptance Criteria
  - $story_criteria

## Instructions

1. Read the existing codebase to understand patterns and conventions
2. Implement the story following the project's architecture (Tauri + React)
3. Use existing components from src/components/ui/ where appropriate
4. Follow the TypeScript types in src/types/index.ts
5. Use the Tauri API wrappers in src/lib/tauri.ts

After implementing:
1. Run \`bun run lint\` and fix any errors
2. Run \`bun run build\` to verify no type errors
3. If all checks pass, commit with message: \"feat($story_id): $story_title\"
4. If checks fail, fix the issues and try again

When done, output exactly one of these on its own line:
- SUCCESS: <brief summary of what was implemented>
- FAILED: <reason for failure>
- LEARNING: <any insights or patterns discovered>
"

    # Run Claude with the prompt
    echo -e "${CYAN}🤖 Starting Claude agent...${NC}"
    echo ""

    # Capture output
    output_file=$(mktemp)

    # Run claude with prompt piped in
    # Using --dangerously-skip-permissions for autonomous mode
    if echo "$prompt" | claude --dangerously-skip-permissions 2>&1 | tee "$output_file"; then
        output=$(cat "$output_file")

        # Check for success/failure markers
        if echo "$output" | grep -q "^SUCCESS:"; then
            success_msg=$(echo "$output" | grep "^SUCCESS:" | head -1 | sed 's/^SUCCESS: //')
            echo ""
            echo -e "${GREEN}✅ Story completed: $success_msg${NC}"
            mark_done "$story_id"

            # Extract and log learnings
            if echo "$output" | grep -q "^LEARNING:"; then
                learning=$(echo "$output" | grep "^LEARNING:" | sed 's/^LEARNING: //')
                log_learning "$story_id" "$learning"
                echo -e "${CYAN}📝 Learning logged${NC}"
            fi
        elif echo "$output" | grep -q "^FAILED:"; then
            fail_msg=$(echo "$output" | grep "^FAILED:" | head -1 | sed 's/^FAILED: //')
            echo ""
            echo -e "${RED}❌ Story failed: $fail_msg${NC}"
            mark_failed "$story_id" "$fail_msg"
        else
            # No explicit marker - check if build passed
            if bun run build 2>/dev/null; then
                echo ""
                echo -e "${GREEN}✅ Build passed - marking complete${NC}"
                mark_done "$story_id"
            else
                echo ""
                echo -e "${RED}❌ Build failed - marking as failed${NC}"
                mark_failed "$story_id" "Build verification failed"
            fi
        fi
    else
        echo -e "${RED}❌ Claude agent errored${NC}"
        mark_failed "$story_id" "Agent execution error"
    fi

    rm -f "$output_file"

    # Pause between iterations
    if [ $iteration -lt $MAX_ITERATIONS ]; then
        remaining=$(jq '[.stories[] | select(.status == "todo")] | length' "$PRD_FILE")
        if [ "$remaining" -gt 0 ]; then
            echo ""
            echo -e "${CYAN}⏳ Pausing ${PAUSE_BETWEEN}s before next story...${NC}"
            sleep $PAUSE_BETWEEN
        fi
    fi
done

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Loop Complete                           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Final stats: $(get_stats)"
echo ""
