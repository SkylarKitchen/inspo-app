---
status: pending
priority: p1
issue_id: "003"
tags: [code-review, performance]
dependencies: []
---

# N+1 Query Pattern in get_items()

## Problem Statement

The `get_items()` function executes a separate query for each item to fetch its tags, causing severe performance degradation as library size grows.

**Why it matters:**
- 100 items = 101 queries (~200ms)
- 1,000 items = 1,001 queries (~2+ seconds, UI freezes)
- 10,000 items = completely unusable

## Findings

**Location:** `src-tauri/src/commands/items.rs:131-136`
```rust
// Load tags for each item
let mut items_with_tags = items;
for item in &mut items_with_tags {
    item.tags = get_item_tags_internal(&conn, &item.id)?;  // Query per item!
}
```

**Same pattern in:**
- `get_trashed_items()` (lines 427-431)
- `get_item()` (line 181)

## Proposed Solutions

### Option A: Batch load tags with single query (Recommended)
```rust
// Fetch all tags for returned items in one query
let item_ids: Vec<&str> = items.iter().map(|i| i.id.as_str()).collect();
let placeholders = item_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");

let tags_sql = format!(
    "SELECT it.item_id, t.id, t.name, t.color
     FROM item_tags it
     INNER JOIN tags t ON t.id = it.tag_id
     WHERE it.item_id IN ({})",
    placeholders
);

// Build HashMap and distribute to items
let mut tags_by_item: HashMap<String, Vec<Tag>> = HashMap::new();
for (item_id, tag) in tag_rows {
    tags_by_item.entry(item_id).or_default().push(tag);
}

for item in &mut items {
    item.tags = tags_by_item.remove(&item.id).unwrap_or_default();
}
```
- **Pros:** Reduces queries from N+1 to 2, massive performance gain
- **Cons:** More complex code
- **Effort:** Medium
- **Risk:** Low

### Option B: Use JOIN and post-process
- Single query with LEFT JOIN on item_tags and tags
- Parse grouped results in Rust
- **Pros:** Single query
- **Cons:** More data transfer, complex parsing
- **Effort:** Medium-High
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/src/commands/items.rs`

**Performance impact:**
| Library Size | Current | After Fix |
|--------------|---------|-----------|
| 100 items | ~200ms | ~50ms |
| 1,000 items | ~2s | ~100ms |
| 10,000 items | ~20s+ | ~500ms |

## Acceptance Criteria

- [ ] `get_items()` uses batch tag loading
- [ ] `get_trashed_items()` uses batch tag loading
- [ ] Load time for 1000 items < 500ms
- [ ] Tags display correctly on all items

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified as critical bottleneck |

## Resources

- PR: #1
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm)
