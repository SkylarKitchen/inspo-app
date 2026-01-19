---
status: pending
priority: p3
issue_id: "010"
tags: [code-review, simplicity]
dependencies: []
---

# Duplicate Delete Logic in App.tsx

## Problem Statement

`deleteSelected` (lines 143-168) and `handleDeleteSelected` (lines 568-593) are nearly identical functions doing the same thing.

**Why it matters:** Code duplication increases maintenance burden and risk of bugs when one is updated but not the other.

## Findings

**Location 1:** `src/App.tsx:143-168` - `deleteSelected` (keyboard shortcut handler)
**Location 2:** `src/App.tsx:568-593` - `handleDeleteSelected` (context menu handler)

Both:
- Check `currentView === "trash"`
- Call same Tauri APIs
- Update same state variables
- Handle errors identically

## Proposed Solutions

### Option A: Keep handleDeleteSelected, remove deleteSelected (Recommended)
- Keep the more descriptively named function
- Use it from both keyboard handler and context menu
- **Effort:** Low (~25 LOC removed)
- **Risk:** Very Low

## Acceptance Criteria

- [ ] Only one delete function exists
- [ ] Keyboard shortcut still works
- [ ] Context menu still works
- [ ] Trash view permanent delete still works

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Code Simplicity Reviewer identified |

## Resources

- PR: #1
