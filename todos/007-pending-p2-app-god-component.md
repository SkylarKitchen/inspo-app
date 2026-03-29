---
status: pending
priority: p2
issue_id: "007"
tags: [code-review, architecture]
dependencies: []
---

# App.tsx God Component (1200+ lines)

## Problem Statement

App.tsx manages 40+ state variables and 50+ handler functions, making it difficult to maintain, test, and refactor. All state and logic is centralized in one component.

**Why it matters:**
- Hard to find related code
- Any state change re-renders entire tree
- Difficult to write unit tests
- Props drill 3-4 levels deep

## Findings

**Location:** `src/App.tsx` (Lines 1-1208)

**State count:** 40+ useState hooks (lines 43-93)
**Handlers:** 50+ functions defined in component body

**Prop drilling examples:**
- `App.tsx` → `Sidebar` (26 props)
- `App.tsx` → `Toolbar` (21 props)
- `App.tsx` → `ItemGrid` → `ItemCard` (12 props)

## Proposed Solutions

### Option A: Extract custom hooks (Recommended)
```typescript
// src/hooks/useLibrary.ts
export function useLibrary() {
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // ... library-specific state and handlers
  return { libraryPath, isOpen, openLibrary, closeLibrary, ... };
}

// src/hooks/useItems.ts
export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // ... item-specific state and handlers
  return { items, selectedIds, selectItem, deleteSelected, ... };
}
```
- **Pros:** Logical grouping, testable, reusable
- **Cons:** Requires careful dependency management
- **Effort:** High
- **Risk:** Medium (many touchpoints)

### Option B: React Context for actions
```typescript
const ActionsContext = createContext<Actions>(null);

// Reduces prop drilling for callbacks
<ActionsContext.Provider value={{ deleteItem, moveToFolder, toggleFavorite }}>
  <ItemGrid />
</ActionsContext.Provider>
```
- **Pros:** Reduces prop drilling immediately
- **Cons:** Doesn't reduce App.tsx size
- **Effort:** Medium
- **Risk:** Low

### Option C: State management library (Zustand/Jotai)
- External state with fine-grained subscriptions
- Components only re-render when their slice changes
- **Pros:** Performance benefits, clean API
- **Cons:** Added dependency, migration effort
- **Effort:** High
- **Risk:** Medium

## Recommended Action

_To be filled during triage_

## Technical Details

**Affected files:**
- `src/App.tsx`

**New files to create:**
- `src/hooks/useLibrary.ts`
- `src/hooks/useItems.ts`
- `src/hooks/useFolders.ts`
- `src/hooks/useTags.ts`
- `src/hooks/useDialogs.ts`

## Acceptance Criteria

- [ ] App.tsx reduced to <400 lines
- [ ] State grouped logically in custom hooks
- [ ] Props drilling reduced to 2 levels max
- [ ] All functionality preserved

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Architecture Strategist + Pattern Recognition identified |

## Resources

- PR: #1
- [React Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
