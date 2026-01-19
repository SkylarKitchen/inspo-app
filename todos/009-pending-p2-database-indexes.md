---
status: pending
priority: p2
issue_id: "009"
tags: [code-review, performance]
dependencies: []
---

# Missing Composite Database Indexes

## Problem Statement

Current indexes are on single columns, but common queries filter on multiple columns (e.g., folder + created_at). Missing composite indexes cause full table scans.

**Why it matters:** Query performance degrades significantly as library grows beyond a few thousand items.

## Findings

**Location:** `src-tauri/src/db/schema.rs:80-86`

**Current indexes:**
```sql
CREATE INDEX idx_items_folder ON items(folder_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_created ON items(created_at DESC);
CREATE INDEX idx_items_favorited ON items(is_favorited);
CREATE INDEX idx_items_deleted ON items(deleted_at);
```

**Missing indexes for common queries:**

1. **Folder view** (most common): `WHERE folder_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
2. **Type filter**: `WHERE type = ? AND deleted_at IS NULL ORDER BY created_at DESC`
3. **Favorites**: `WHERE is_favorited = 1 AND deleted_at IS NULL ORDER BY created_at DESC`
4. **Tag lookup**: `item_tags(tag_id, item_id)` for efficient tag filtering

## Proposed Solutions

### Option A: Add composite indexes (Recommended)
```sql
-- Folder + date (most common query pattern)
CREATE INDEX idx_items_folder_created
    ON items(folder_id, created_at DESC) WHERE deleted_at IS NULL;

-- Type + date (images/bookmarks views)
CREATE INDEX idx_items_type_created
    ON items(type, created_at DESC) WHERE deleted_at IS NULL;

-- Favorites + date
CREATE INDEX idx_items_fav_created
    ON items(is_favorited, created_at DESC) WHERE deleted_at IS NULL;

-- Efficient tag queries
CREATE INDEX idx_item_tags_covering
    ON item_tags(tag_id, item_id);
```
- **Pros:** Significant query speedup
- **Cons:** Slightly slower writes, more storage
- **Effort:** Low (just add to schema.rs)
- **Risk:** Very Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/src/db/schema.rs`

**Note:** SQLite partial indexes (`WHERE deleted_at IS NULL`) only include non-trashed items, making them smaller and faster.

## Acceptance Criteria

- [ ] Composite indexes added for common query patterns
- [ ] No regression in write performance
- [ ] Query time for folder view reduced measurably

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified missing indexes |

## Resources

- PR: #1
- [SQLite Query Planning](https://www.sqlite.org/queryplanner.html)
