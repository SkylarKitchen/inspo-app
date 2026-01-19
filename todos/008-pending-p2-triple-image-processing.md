---
status: pending
priority: p2
issue_id: "008"
tags: [code-review, performance]
dependencies: []
---

# Synchronous Triple Image Processing on Import

## Problem Statement

Each image import opens and decodes the image THREE times: once for dimensions, once for thumbnail generation, and once for dominant color extraction. This blocks the IPC thread.

**Why it matters:**
- 5MB image takes 300-500ms per import
- Batch importing 50 images blocks UI for 15-25 seconds
- Poor user experience during imports

## Findings

**Location:** `src-tauri/src/commands/import.rs:94-114`
```rust
// 1. Get image dimensions (opens image)
let (width, height) = match image::open(&dest_path) { ... };

// 2. Generate thumbnail (opens image AGAIN)
let thumbnail_result = generate_thumbnail(&library_path, &dest_path, &id);

// 3. Extract dominant color (opens image THIRD time)
let color_hex = extract_dominant_color(&dest_path);
```

**Also:** `import_images` processes files sequentially (lines 172-178), no parallelization.

## Proposed Solutions

### Option A: Process image once, reuse (Recommended)
```rust
// Open image ONCE
let img = image::open(&dest_path)?;
let (width, height) = img.dimensions();

// Generate thumbnail from already-loaded image
let thumbnail_path = generate_thumbnail_from_image(&library_path, &img, &id)?;

// Extract color from already-loaded image
let color_hex = extract_dominant_color_from_image(&img);
```
- **Pros:** 3x faster single imports
- **Cons:** Requires refactoring thumbnail/color functions
- **Effort:** Medium
- **Risk:** Low

### Option B: Parallelize batch imports
```rust
use tokio::sync::Semaphore;
const MAX_CONCURRENT: usize = 4;

let semaphore = Arc::new(Semaphore::new(MAX_CONCURRENT));
let handles: Vec<_> = paths.iter().map(|p| {
    let permit = semaphore.clone().acquire_owned();
    tokio::spawn(async move { import_image(...).await })
}).collect();
```
- **Pros:** Better utilization of multi-core CPUs
- **Cons:** More complex, doesn't fix per-image inefficiency
- **Effort:** Medium
- **Risk:** Low

### Option C: Both (Ideal)
- Single decode per image AND parallel processing
- **Pros:** Maximum performance
- **Cons:** Most work
- **Effort:** Medium-High
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src-tauri/src/commands/import.rs`
- `src-tauri/src/commands/thumbnails.rs`

**Also consider:** Use `FilterType::Triangle` instead of `Lanczos3` for 2-3x faster thumbnail generation.

## Acceptance Criteria

- [ ] Image decoded only once during import
- [ ] Batch imports process in parallel
- [ ] 50 image import completes in <5 seconds
- [ ] UI remains responsive during import

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified triple decode |

## Resources

- PR: #1
- [image crate docs](https://docs.rs/image/latest/image/)
