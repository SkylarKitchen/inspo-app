#!/bin/bash
# Show PRD status

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRD_FILE="$PROJECT_DIR/prd.json"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Inspo PRD Status                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stats
total=$(jq '.stories | length' "$PRD_FILE")
done=$(jq '[.stories[] | select(.status == "done")] | length' "$PRD_FILE")
todo=$(jq '[.stories[] | select(.status == "todo")] | length' "$PRD_FILE")
in_progress=$(jq '[.stories[] | select(.status == "in_progress")] | length' "$PRD_FILE")
failed=$(jq '[.stories[] | select(.status == "failed")] | length' "$PRD_FILE")

echo -e "  ${GREEN}✅ Done:${NC}        $done"
echo -e "  ${YELLOW}🔄 In Progress:${NC} $in_progress"
echo -e "  ${BLUE}📋 Todo:${NC}        $todo"
echo -e "  ${RED}❌ Failed:${NC}      $failed"
echo -e "  ─────────────────"
echo -e "  📊 Total:       $total"
echo ""

# Progress bar
pct=$((done * 100 / total))
filled=$((pct / 5))
empty=$((20 - filled))
bar=$(printf '█%.0s' $(seq 1 $filled 2>/dev/null) || true)
bar+=$(printf '░%.0s' $(seq 1 $empty 2>/dev/null) || true)
echo -e "  Progress: [${GREEN}$bar${NC}] $pct%"
echo ""

# List stories by status
echo -e "${CYAN}─────────────────────────────────────────────────────────────${NC}"

if [ "$done" -gt 0 ]; then
    echo -e "\n${GREEN}✅ Completed:${NC}"
    jq -r '.stories[] | select(.status == "done") | "   \(.id): \(.title)"' "$PRD_FILE"
fi

if [ "$in_progress" -gt 0 ]; then
    echo -e "\n${YELLOW}🔄 In Progress:${NC}"
    jq -r '.stories[] | select(.status == "in_progress") | "   \(.id): \(.title)"' "$PRD_FILE"
fi

if [ "$todo" -gt 0 ]; then
    echo -e "\n${BLUE}📋 Todo (by priority):${NC}"
    jq -r '.stories | map(select(.status == "todo")) | sort_by(.priority) | .[] | "   P\(.priority) \(.id): \(.title)"' "$PRD_FILE"
fi

if [ "$failed" -gt 0 ]; then
    echo -e "\n${RED}❌ Failed:${NC}"
    jq -r '.stories[] | select(.status == "failed") | "   \(.id): \(.title) - \(.failure_reason // "unknown")"' "$PRD_FILE"
fi

echo ""
