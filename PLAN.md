# Inspo

A macOS desktop app for storing design inspiration, web development content, and read-later items. Local-first with optional iCloud/Google Drive sync.

**Inspired by:** [Eagle.cool](https://eagle.cool) + [Raindrop.io](https://raindrop.io)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Tauri 2.0 (Rust) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| UI | Radix UI primitives |
| Database | SQLite (via rusqlite) |
| Search | SQLite FTS5 |
| Icons | Lucide React |

---

## Current Status

### Backend (Rust) - Done
- [x] Library management (init, open, stats)
- [x] Items CRUD (create, read, update, delete)
- [x] Folders CRUD with hierarchy
- [x] Tags CRUD with item associations
- [x] Image import with thumbnail generation
- [x] Bookmark import
- [x] SQLite database with full-text search
- [x] File system permissions configured

### Frontend (React) - Not Started
- [ ] Main application shell
- [ ] Library selector/creator
- [ ] Sidebar navigation
- [ ] Grid/list views
- [ ] Item detail panel
- [ ] Drag & drop import
- [ ] Search interface
- [ ] Settings

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Tauri Window                            │
│  ┌────────────────────────────────────────────────────────┐│
│  │                 React Frontend                          ││
│  │  ┌──────────┐  ┌───────────────────┐  ┌─────────────┐ ││
│  │  │ Sidebar  │  │    Main View      │  │   Detail    │ ││
│  │  │          │  │                   │  │   Panel     │ ││
│  │  │ - All    │  │  ┌─────┐ ┌─────┐  │  │             │ ││
│  │  │ - Folders│  │  │     │ │     │  │  │  - Preview  │ ││
│  │  │ - Tags   │  │  │ Item│ │ Item│  │  │  - Metadata │ ││
│  │  │ - Trash  │  │  │     │ │     │  │  │  - Tags     │ ││
│  │  │          │  │  └─────┘ └─────┘  │  │             │ ││
│  │  └──────────┘  └───────────────────┘  └─────────────┘ ││
│  └────────────────────────────────────────────────────────┘│
│                            │                                │
│  ┌────────────────────────────────────────────────────────┐│
│  │                  Tauri Commands (IPC)                   ││
│  │  library:: | items:: | folders:: | tags:: | import::   ││
│  └────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼─────┐              ┌────────▼────────┐
        │  SQLite   │              │   File System   │
        │ library.db│              │ /assets/        │
        └───────────┘              │ /thumbnails/    │
                                   └─────────────────┘
```

---

## Library Structure

When a user creates or opens a library, it creates this folder structure:

```
MyInspo.inspo/
├── library.db          # SQLite database
├── assets/             # Original files
│   ├── images/
│   │   ├── 2025-01/
│   │   │   ├── abc123.png
│   │   │   └── def456.jpg
│   │   └── 2025-02/
│   └── files/
├── thumbnails/         # Generated previews
│   ├── abc123_thumb.webp
│   └── def456_thumb.webp
└── inbox/              # Watch folder for auto-import
```

---

## Database Schema

```sql
-- Folders
folders (id, name, parent_id, path, sort_order, created_at, updated_at)

-- Items
items (id, type, title, file_path, url, description, folder_id,
       is_favorited, color_hex, width, height, file_size,
       thumbnail_path, created_at, updated_at)

-- Tags
tags (id, name, color)
item_tags (item_id, tag_id)

-- Settings
settings (key, value)

-- Full-text search
items_fts (title, description)
```

---

## Features Roadmap

### Phase 1: Core UI
- [ ] Welcome screen with library create/open
- [ ] Main layout with resizable sidebar
- [ ] Folder tree in sidebar
- [ ] Grid view with thumbnails
- [ ] List view option
- [ ] Item selection (single, multi, range)
- [ ] Context menus

### Phase 2: Import & Organization
- [ ] Drag & drop files from Finder
- [ ] Drag & drop URLs from browser
- [ ] Paste from clipboard (images, URLs)
- [ ] Move items between folders
- [ ] Tag assignment UI
- [ ] Bulk operations

### Phase 3: Detail & Preview
- [ ] Item detail sidebar/panel
- [ ] Image preview with zoom
- [ ] Bookmark preview (screenshot + metadata)
- [ ] Edit title, description, tags
- [ ] Color extraction for images

### Phase 4: Search & Filter
- [ ] Search bar with FTS
- [ ] Filter by type (image, bookmark, file)
- [ ] Filter by tag
- [ ] Filter by date range
- [ ] Sort options

### Phase 5: Quick Capture
- [ ] Global hotkey for quick add
- [ ] Menu bar icon with dropdown
- [ ] Watch folder auto-import (for phone sync)

### Phase 6: Cloud Sync
- [ ] Library location picker (local, iCloud, Google Drive)
- [ ] File watcher for external changes
- [ ] Conflict handling

### Phase 7: Polish
- [ ] Dark/light mode
- [ ] Keyboard navigation
- [ ] Animations & transitions
- [ ] Onboarding flow
- [ ] App icon

---

## Phone to Desktop Workflow

Since the app uses local files with optional cloud storage, phone sharing works via the file system:

```
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│    iPhone    │      │  iCloud Drive   │      │   Desktop    │
│              │      │  or Google      │      │     App      │
│  Share Sheet │─────▶│  Drive          │─────▶│              │
│      │       │      │                 │      │ Watch folder │
│      ▼       │      │ MyInspo.inspo/  │      │ auto-imports │
│  Save to     │      │   inbox/        │      │              │
│  Files       │      │                 │      │              │
└──────────────┘      └─────────────────┘      └──────────────┘
```

**Steps:**
1. Set library location to iCloud Drive or Google Drive folder
2. On iPhone, use Share Sheet → Save to Files
3. Navigate to `MyInspo.inspo/inbox/`
4. Desktop app watches this folder and auto-imports new items
5. Imported files are moved to the proper `assets/` folder

---

## UI Layout Reference

```
┌─────────────────────────────────────────────────────────────────┐
│  ← →  │                    Inspo                          ─ □ x │
├───────┴─────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌───────────────────────────────────────────────┤
│ │ 🔍 Search   │ │ ☰ All Items          ⊞ ≡  Sort: Date ▼  + Add │
│ ├─────────────┤ ├───────────────────────────────────────────────┤
│ │             │ │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│ │ 📁 All      │ │ │       │ │       │ │       │ │       │       │
│ │ ⭐ Favorites│ │ │  IMG  │ │  IMG  │ │  URL  │ │  IMG  │       │
│ │ 🗑️ Trash    │ │ │       │ │       │ │       │ │       │       │
│ │             │ │ └───────┘ └───────┘ └───────┘ └───────┘       │
│ ├─────────────┤ │ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐       │
│ │ FOLDERS     │ │ │       │ │       │ │       │ │       │       │
│ │  📂 UI      │ │ │  URL  │ │  IMG  │ │  IMG  │ │  URL  │       │
│ │  📂 Code    │ │ │       │ │       │ │       │ │       │       │
│ │  📂 Read    │ │ └───────┘ └───────┘ └───────┘ └───────┘       │
│ │             │ │                                               │
│ ├─────────────┤ │                                               │
│ │ TAGS        │ │                                               │
│ │  🏷️ design  │ │                                               │
│ │  🏷️ react   │ │                                               │
│ │  🏷️ css     │ │                                               │
│ └─────────────┘ │                                               │
└─────────────────┴───────────────────────────────────────────────┘
```

---

## Key Interactions

| Action | Behavior |
|--------|----------|
| Drag file from Finder | Import to current folder |
| Drag URL from browser | Create bookmark with metadata fetch |
| ⌘V | Import from clipboard |
| ⌘F | Focus search |
| ⌘N | New folder |
| Delete | Move to trash |
| Double-click image | Open in preview/external app |
| Double-click bookmark | Open URL in browser |
| Right-click | Context menu |
| ⌘+click | Multi-select |
| Shift+click | Range select |

---

## Development Commands

```bash
# Install dependencies
bun install

# Run in development
bun run tauri dev

# Build for production
bun run tauri build

# Lint
bun run lint
```

---

## File Structure

```
inspo-app/
├── src/                    # React frontend
│   ├── components/
│   │   ├── ui/             # Radix primitives
│   │   ├── layout/         # Shell, sidebar, toolbar
│   │   ├── library/        # Grid, list, item cards
│   │   ├── detail/         # Preview, metadata panel
│   │   └── dialogs/        # Modals, sheets
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, Tauri API wrappers
│   ├── types/              # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC commands
│   │   ├── db/             # SQLite operations
│   │   └── lib.rs
│   └── Cargo.toml
├── package.json
├── vite.config.ts
└── PLAN.md
```
