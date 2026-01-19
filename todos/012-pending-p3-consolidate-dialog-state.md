---
status: pending
priority: p3
issue_id: "012"
tags: [code-review, simplicity]
dependencies: []
---

# Consolidate Dialog State in App.tsx

## Problem Statement

App.tsx has 6+ separate useState pairs for managing dialog open states. This adds complexity and ~20 lines of boilerplate.

**Current state:**
- `newFolderDialogOpen` + `newFolderParentId`
- `bookmarkDialogOpen`
- `tagDialogOpen` + `editingTag`
- `tagPickerOpen` + `tagPickerItemId`
- `deleteFolderDialogOpen` + `deletingFolderId`
- `deleteTagDialogOpen` + `deletingTagId`

## Proposed Solutions

### Option A: Single activeDialog state (Recommended)
```typescript
type ActiveDialog =
  | { type: 'newFolder'; parentId?: string }
  | { type: 'tag'; editing?: Tag }
  | { type: 'bookmark' }
  | { type: 'tagPicker'; itemId: string }
  | { type: 'deleteFolder'; folderId: string }
  | { type: 'deleteTag'; tagId: string }
  | null;

const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

// Usage
const openNewFolderDialog = (parentId?: string) =>
  setActiveDialog({ type: 'newFolder', parentId });

const closeDialog = () => setActiveDialog(null);
```
- **Pros:** ~20 LOC saved, cleaner mental model, type-safe
- **Cons:** Small refactor to all dialog consumers
- **Effort:** Low-Medium
- **Risk:** Low

## Acceptance Criteria

- [ ] Single dialog state variable
- [ ] All dialogs still work correctly
- [ ] Type safety preserved/improved
- [ ] ~15-20 LOC reduced

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Code Simplicity Reviewer identified |

## Resources

- PR: #1
