---
status: pending
priority: p2
issue_id: "006"
tags: [code-review, performance]
dependencies: []
---

# No List Virtualization for Item Grid

## Problem Statement

The ItemGrid renders all items in the array, causing performance degradation with large libraries. Every item creates a full ItemCard with images, context menus, and event handlers.

**Why it matters:**
- 500 items: Noticeable scroll lag
- 2,000 items: Janky scrolling, 16ms+ frame times
- 10,000 items: Initial render >1 second, memory bloat

## Findings

**Location:** `src/components/items/ItemGrid.tsx:127-156`
```tsx
return (
  <ScrollArea className="flex-1">
    <div className={cn(gridClasses[viewMode])}>
      {items.map((item) => (  // All items rendered!
        <ItemCard ... />
      ))}
    </div>
  </ScrollArea>
);
```

**Memory impact:**
| Library Size | Current Est. | With Virtualization |
|--------------|--------------|---------------------|
| 100 items | ~50MB | ~20MB |
| 1,000 items | ~300MB | ~25MB |
| 10,000 items | ~2GB+ (crash) | ~50MB |

## Proposed Solutions

### Option A: @tanstack/react-virtual (Recommended)
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: Math.ceil(items.length / COLUMNS),
  getScrollElement: () => parentRef.current,
  estimateSize: () => ITEM_HEIGHT,
  overscan: 5,
});
```
- **Pros:** Modern API, good TypeScript support, handles variable sizing
- **Cons:** Learning curve for grid virtualization
- **Effort:** Medium-High
- **Risk:** Low

### Option B: react-window
- Simpler API, well-established
- Fixed-size grid component available
- **Pros:** Simpler implementation
- **Cons:** Less flexible for masonry layouts
- **Effort:** Medium
- **Risk:** Low

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src/components/items/ItemGrid.tsx`

**Dependencies to add:**
- `@tanstack/react-virtual` or `react-window`

## Acceptance Criteria

- [ ] Only visible items + overscan are rendered
- [ ] Smooth 60fps scrolling with 10,000+ items
- [ ] Memory usage stays under 100MB for large libraries
- [ ] Grid and list view modes work correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Performance Oracle identified as essential for scale |

## Resources

- PR: #1
- [@tanstack/react-virtual](https://tanstack.com/virtual/latest)
- [react-window](https://github.com/bvaughn/react-window)
