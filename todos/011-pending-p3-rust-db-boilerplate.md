---
status: pending
priority: p3
issue_id: "011"
tags: [code-review, patterns]
dependencies: []
---

# Rust Database Lock Boilerplate (30 occurrences)

## Problem Statement

Every Rust command repeats the same 3-line database access boilerplate:
```rust
let db_lock = state.db.lock().unwrap();
let db = db_lock.as_ref().ok_or("No library open")?;
let conn = db.conn.lock().unwrap();
```

**Why it matters:**
- 30 occurrences across 5 files
- Inconsistent if someone forgets a line
- Verbose and repetitive

## Findings

**Locations:** All files in `src-tauri/src/commands/`
- `items.rs` - 12 occurrences
- `folders.rs` - 6 occurrences
- `tags.rs` - 7 occurrences
- `import.rs` - 3 occurrences
- `library.rs` - 2 occurrences

## Proposed Solutions

### Option A: Helper function (Recommended)
```rust
// In src-tauri/src/db/mod.rs or new utils.rs
pub fn with_connection<T, F>(state: &AppState, f: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String>,
{
    let db_lock = state.db.lock().unwrap();
    let db = db_lock.as_ref().ok_or("No library open")?;
    let conn = db.conn.lock().unwrap();
    f(&conn)
}

// Usage:
pub fn get_items(state: State<'_, AppState>) -> Result<Vec<Item>, String> {
    with_connection(&state, |conn| {
        // query logic here
    })
}
```
- **Pros:** Single source of truth, cleaner commands
- **Cons:** Slightly more indirection
- **Effort:** Medium
- **Risk:** Low

### Option B: Macro
```rust
macro_rules! with_db {
    ($state:expr, $conn:ident => $body:expr) => {{
        let db_lock = $state.db.lock().unwrap();
        let db = db_lock.as_ref().ok_or("No library open")?;
        let $conn = db.conn.lock().unwrap();
        $body
    }};
}
```
- **Pros:** Zero runtime overhead
- **Cons:** Macros can be harder to debug
- **Effort:** Low
- **Risk:** Low

## Acceptance Criteria

- [ ] Boilerplate extracted to helper
- [ ] All commands use the helper
- [ ] Error message consistent

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Pattern Recognition identified 30 occurrences |

## Resources

- PR: #1
