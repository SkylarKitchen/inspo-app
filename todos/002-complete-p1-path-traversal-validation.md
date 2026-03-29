---
status: pending
priority: p1
issue_id: "002"
tags: [code-review, security]
dependencies: []
---

# Path Traversal Vulnerabilities in Rust Commands

## Problem Statement

Multiple file operations in Rust commands join user-provided paths without validating for path traversal attacks. An attacker could create folders with names like `../../../.ssh/authorized_keys` to write outside the library directory.

**Why it matters:** Could allow reading/writing files outside the library directory, potentially compromising user system.

## Findings

**Location 1:** `src-tauri/src/commands/import.rs:54`
```rust
let folder_path: String = conn.query_row(...)?;
library_path.join(folder_path)  // No validation that folder_path doesn't escape
```

**Location 2:** `src-tauri/src/commands/folders.rs:113-120`
```rust
let path = if let Some(ref pid) = parent_id {
    let parent_path: String = conn.query_row(...)?;
    format!("{}/{}", parent_path, name)  // User-controlled `name` not sanitized
} else {
    name.clone()  // User-controlled name directly used as path
};
let full_path = library_path.join(&path);
fs::create_dir_all(&full_path)?;  // Creates arbitrary directories
```

**Also affects:**
- `src-tauri/src/commands/thumbnails.rs`
- Any file path construction from user input

## Proposed Solutions

### Option A: Path canonicalization helper (Recommended)
```rust
fn validate_path_within_library(library_path: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let full_path = library_path.join(relative_path).canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    if !full_path.starts_with(library_path) {
        return Err("Path escapes library directory".to_string());
    }
    Ok(full_path)
}
```
- **Pros:** Centralized validation, catches all traversal attempts
- **Cons:** Requires calling on all path operations
- **Effort:** Medium
- **Risk:** Low

### Option B: Sanitize folder names at input
- Strip `..`, `/`, `\` from folder names before storage
- Validate on create/rename only
- **Pros:** Simpler implementation
- **Cons:** Doesn't protect against database corruption or existing bad data
- **Effort:** Low
- **Risk:** Medium (incomplete protection)

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/src/commands/import.rs`
- `src-tauri/src/commands/folders.rs`
- `src-tauri/src/commands/thumbnails.rs`

**New file needed:**
- `src-tauri/src/utils/path.rs` (validation helper)

## Acceptance Criteria

- [ ] All file path operations validate against library root
- [ ] Folder names cannot contain path separators or `..`
- [ ] Attempting path traversal returns clear error
- [ ] Existing library data doesn't break

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Security Sentinel identified path traversal in 3 files |

## Resources

- PR: #1
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
