# Finalize Inspo v1.0

**Type:** Enhancement
**Priority:** High
**Estimate:** Large (5 remaining features + polish + release prep)

---

## Overview

Inspo is 67% complete (10 of 15 stories done). This plan covers completing the remaining features, fixing technical debt, and preparing for a polished v1.0 release on macOS.

### Current State

| Status | Count | Stories |
|--------|-------|---------|
| **Done** | 15 | Setup Wizard, Sidebar, Grid View, Selection, Drag Import, Bookmark Import, Detail Panel, Context Menu, Search, Folder CRUD, Filter by Type/Tags, Sort Options, Keyboard Shortcuts, Tag Management, Trash Management |
| **Todo** | 0 | All Phase 1 features complete |

### Technical Debt

- [ ] `src/App.tsx:947` - "TODO: Implement change library flow"
- [ ] Theme switching not wired up (`src/components/settings/SettingsPanel.tsx:147-153`)
- [ ] "View on GitHub" button has empty onClick
- [ ] Cache clearing button has no handler
- [ ] 18 uncommitted files with improvements

---

## Phase 1: Complete Remaining Features

### INSPO-014: Tag Management UI (Priority 5, Medium)

**Acceptance Criteria:**
- [x] Tags section in sidebar (below Folders)
- [x] Click tag to filter items
- [x] Create new tag dialog
- [x] Edit tag (name, color)
- [x] Delete tag (removes from all items)
- [x] Tag color picker

**Implementation:**

```
src/components/layout/Sidebar.tsx
├── Add "Tags" collapsible section after Folders
├── List tags with color dots
└── Click filters to tag

src/components/dialogs/TagDialog.tsx (new)
├── Name input
├── Color picker (preset palette matching warm aesthetic)
└── Create/Edit/Delete actions

src/lib/tauri.ts
├── getTags() - already exists
├── createTag(name, color) - needs color support
├── updateTag(id, name, color)
└── deleteTag(id)
```

**References:**
- Existing tag display in `src/components/detail/ItemDetailPanel.tsx:280-320`
- Color palette in `src/index.css` (terracotta, chartreuse accent)

---

### INSPO-010: Filter by Type and Tags (Priority 6, Small)

**Acceptance Criteria:**
- [x] Type filter dropdown (All, Images, Bookmarks)
- [x] Tag filter with multi-select
- [x] Filters combine with AND logic
- [x] Active filter indicator
- [x] Clear filters button
- [x] Persists filter state during session

**Implementation:**

```
src/components/layout/Toolbar.tsx
├── Add FilterDropdown component
├── Type select: All | Images | Bookmarks
├── Tag multi-select popover
└── Active filter badge/indicator

src/App.tsx
├── Add filterType state: "all" | "image" | "bookmark"
├── Add filterTags state: string[]
├── Filter items before passing to ItemGrid
└── Persist to sessionStorage
```

**Pattern Reference:**
- Dropdown style matches search input in Toolbar
- Use Radix `Select` for type, `Popover` with checkboxes for tags

---

### INSPO-011: Sort Options (Priority 6, Small)

**Acceptance Criteria:**
- [x] Sort by: Date Added, Name, Type
- [x] Ascending/descending toggle
- [x] Persists sort preference
- [x] Visual indicator of current sort

**Implementation:**

```
src/components/layout/Toolbar.tsx
├── Add SortDropdown component
├── Options: Date Added, Name, Type
├── Arrow icon for direction
└── Persist to localStorage

src/App.tsx
├── Add sortBy state: "date" | "name" | "type"
├── Add sortDirection state: "asc" | "desc"
├── Sort items before filtering
└── Load from localStorage on init
```

---

### INSPO-012: Keyboard Shortcuts (Priority 7, Medium)

**Acceptance Criteria:**
- [x] Arrow keys navigate grid
- [x] Enter opens selected item
- [x] Delete/Backspace moves to trash
- [x] Cmd+A selects all
- [x] Cmd+F focuses search (already done)
- [x] Cmd+N new folder dialog
- [x] Escape clears selection/closes dialogs

**Implementation:**

```
src/hooks/useKeyboardShortcuts.ts (exists, extend)
├── Add arrow key navigation logic
├── Track grid position from selection
└── Calculate next item based on grid columns

src/App.tsx
├── Wire up remaining shortcuts
├── Pass gridColumns to hook for navigation
└── Handle Enter to open detail/URL
```

**Note:** `useKeyboardShortcuts.ts` already exists with some shortcuts. Extend it.

---

### INSPO-015: Trash Management (Priority 7, Small)

**Acceptance Criteria:**
- [x] Trash section shows deleted items
- [x] Restore button moves back to original folder
- [x] Empty trash button (with confirmation)
- [ ] Auto-empty after 30 days (optional setting)

**Implementation:**

```
src/components/layout/Sidebar.tsx
├── Trash section already exists
├── Show count badge when items in trash
└── Click navigates to trash view

src/App.tsx
├── Add trash-specific toolbar actions
├── "Restore" and "Delete Permanently" buttons
├── Empty Trash confirmation dialog
└── Backend: items table has deleted_at column

src-tauri/src/commands/items.rs
├── restore_item(id) - sets deleted_at to NULL
├── permanent_delete(id) - removes from DB + files
└── empty_trash() - deletes all trashed items
```

---

## Phase 2: Fix Technical Debt

### 2.1 Change Library Flow

**File:** `src/App.tsx:947`

```typescript
// Current: TODO comment
// Fix: Add handler to switch libraries

const handleChangeLibrary = () => {
  // Clear current state
  setItems([]);
  setFolders([]);
  setTags([]);
  setSelectedItemIds([]);
  // Return to setup wizard
  setLibraryPath(null);
};
```

- [x] Implement `handleChangeLibrary` function
- [x] Wire to Settings panel button
- [x] Clear all state before showing wizard
- [ ] Update localStorage recent libraries

---

### 2.2 Theme Switching

**File:** `src/components/settings/SettingsPanel.tsx:147-153`

```typescript
// Current: State stored but not applied
const handleThemeChange = (newTheme: Theme) => {
  setTheme(newTheme);
  // Add: Apply theme to document
  document.documentElement.dataset.theme = newTheme;
  localStorage.setItem('inspo:theme', newTheme);
};
```

- [x] Add `data-theme` CSS variables to `index.css`
- [x] Create dark mode color palette (warm, not pure black)
- [x] Respect `prefers-color-scheme` media query
- [x] Persist preference to localStorage

---

### 2.3 Wire Up Empty Handlers

**Settings Panel buttons that need handlers:**

- [x] "View on GitHub" - `shell.open('https://github.com/...')`
- [x] "Clear Cache" - Clear thumbnails folder, regenerate on demand

---

### 2.4 Commit Uncommitted Changes

Currently 18 modified files including significant improvements. Should be committed.

- [ ] Review changes with `git diff`
- [ ] Create logical commits for grouped changes
- [ ] Push to main branch

---

## Phase 3: Polish & UX

### 3.1 Empty States

Ensure all views have helpful empty states:

- [x] Empty library: "Drop files or save a bookmark to get started"
- [x] Empty folder: "This folder is empty"
- [x] Empty search: "No items match your search"
- [x] Empty trash: "Trash is empty"

---

### 3.2 Loading States

- [ ] Skeleton cards while thumbnails generate
- [ ] Progress indicator for bulk imports
- [ ] Loading spinner for bookmark metadata fetch

---

### 3.3 Error Boundaries

- [ ] Add React ErrorBoundary at app root
- [ ] Graceful degradation for failed thumbnail loads
- [ ] Toast notifications for Tauri command errors

---

### 3.4 Accessibility

- [ ] Focus indicators on all interactive elements
- [ ] aria-labels on icon-only buttons
- [ ] Keyboard navigation through grid (Phase 1)
- [ ] Screen reader support for item selection state

---

## Phase 4: Performance Optimization

### 4.1 SQLite Pragmas

**File:** `src-tauri/src/db/mod.rs`

Add performance pragmas on connection open:

```rust
conn.execute_batch(r#"
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 268435456;
"#)?;
```

- [x] Enable WAL mode for concurrent reads
- [x] Increase cache size for better query performance
- [ ] Add periodic `PRAGMA optimize` call

---

### 4.2 Virtual Scrolling (Optional)

For libraries with 1000+ items, consider react-window or similar.

- [ ] Evaluate if current grid performance is acceptable
- [ ] Implement virtual scrolling if needed

---

## Phase 5: Release Preparation

### 5.1 Bundle Configuration

**File:** `src-tauri/tauri.conf.json`

```json
{
  "bundle": {
    "publisher": "Your Name",
    "shortDescription": "Design inspiration organizer for macOS",
    "longDescription": "Store design inspiration, bookmarks, and files...",
    "category": "public.app-category.productivity",
    "copyright": "Copyright 2026 Your Name"
  }
}
```

- [ ] Set publisher name
- [ ] Add descriptions
- [ ] Set category
- [ ] Add copyright

---

### 5.2 App Icon

Current icons exist in `src-tauri/icons/`. Verify:

- [ ] All required sizes present (32, 128, 128@2x, icon.icns)
- [ ] Icon matches warm studio aesthetic
- [ ] No text in icon

---

### 5.3 Code Signing (macOS)

For distribution outside App Store:

- [ ] Obtain Apple Developer ID certificate
- [ ] Configure signing identity in tauri.conf.json or env
- [ ] Set up notarization with App Store Connect API
- [ ] Test signed build on clean machine

**Environment Variables:**
```bash
APPLE_SIGNING_IDENTITY="Developer ID Application: ..."
APPLE_API_ISSUER="..."
APPLE_API_KEY="..."
APPLE_API_KEY_PATH="..."
```

---

### 5.4 Entitlements

**Create:** `src-tauri/Entitlements.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

- [ ] Create entitlements file
- [ ] Reference in tauri.conf.json

---

### 5.5 Auto-Updates (Optional)

- [ ] Generate signing keys: `bunx tauri signer generate`
- [ ] Add tauri-plugin-updater
- [ ] Configure update endpoint (GitHub releases)
- [ ] Add update check UI in settings

---

### 5.6 CI/CD (Optional)

- [ ] GitHub Actions workflow for automated builds
- [ ] Build for both Intel and Apple Silicon
- [ ] Automated notarization on tag push
- [ ] Release drafts with DMG artifacts

---

## Implementation Order

**Recommended sequence for shipping v1.0:**

1. **Commit existing changes** - Get current state locked in
2. **INSPO-014 Tag Management** - Enables tag filtering
3. **INSPO-010 Filters** - Core UX feature
4. **INSPO-011 Sort** - Quick win, small scope
5. **Fix technical debt** - Change library, theme, empty handlers
6. **INSPO-015 Trash** - Complete core workflow
7. **INSPO-012 Keyboard Shortcuts** - Polish
8. **Performance & Polish** - SQLite pragmas, empty states, accessibility
9. **Release prep** - Bundle config, signing, entitlements
10. **Build & Test** - Final production build

---

## Success Metrics

- [ ] All 15 stories marked "done" in prd.json
- [ ] No TODO comments in codebase
- [ ] `bun run lint` passes
- [ ] `bun run build` passes
- [ ] `bun tauri build` produces signed DMG
- [ ] App launches on clean macOS machine without security warnings

---

## References

### Internal
- PRD: `/Users/skylarkitchen/Documents/code/inspo-app/prd.json`
- Learnings: `/Users/skylarkitchen/Documents/code/inspo-app/.agent/learnings.md`
- Keyboard hooks: `/Users/skylarkitchen/Documents/code/inspo-app/src/hooks/useKeyboardShortcuts.ts`
- Tag display: `/Users/skylarkitchen/Documents/code/inspo-app/src/components/detail/ItemDetailPanel.tsx:280-320`

### External
- [Tauri macOS Signing](https://v2.tauri.app/distribute/sign/macos/)
- [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/)
- [SQLite Pragma Cheatsheet](https://cj.rs/blog/sqlite-pragma-cheatsheet-for-performance-and-consistency/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
