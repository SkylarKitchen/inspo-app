# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Inspo is a macOS desktop app for storing design inspiration, web development content, and read-later items. It's built with Tauri 2.0 (Rust backend) and React 19 (TypeScript frontend). Inspired by Eagle.cool + Raindrop.io.

## Commands

```bash
# Development (starts both Vite + Tauri)
bun run tauri dev

# Frontend only (no Tauri)
bun run dev

# Lint & Build (used by agent system for validation)
bun run lint
bun run build        # TypeScript check + Vite build

# Production
bun run tauri build
```

Note: Uses bun as the package manager, not npm.

## Architecture

### Frontend → Backend Communication

All data flows through Tauri's IPC system. The frontend calls typed wrapper functions in `src/lib/tauri.ts`, which invoke Rust commands.

```
React Components
       ↓
src/lib/tauri.ts (typed invoke wrappers)
       ↓
Tauri IPC (invoke)
       ↓
src-tauri/src/commands/*.rs (command handlers)
       ↓
src-tauri/src/db/ (SQLite via rusqlite)
```

### Key Rust Modules

| Module | Purpose |
|--------|---------|
| `commands/library.rs` | Library init/open, stats |
| `commands/items.rs` | Items CRUD, filtering |
| `commands/folders.rs` | Folder hierarchy management |
| `commands/tags.rs` | Tags and item-tag associations |
| `commands/import.rs` | Image/bookmark import |
| `commands/thumbnails.rs` | WebP thumbnail generation |
| `db/schema.rs` | SQLite schema with FTS5 triggers |

### Application State

**Rust side** (`lib.rs`): `AppState` holds a `Mutex<Option<Database>>` and library path.

**React side** (`App.tsx`): Root component manages all application state including items, folders, tags, view state, and dialog state. No external state management library.

### Library Structure

User libraries are self-contained `.inspo` directories:
```
MyInspo.inspo/
├── library.db        # SQLite (items, folders, tags, FTS)
├── assets/images/    # Original files (organized by YYYY-MM/)
├── thumbnails/       # WebP previews
└── inbox/            # Watch folder for auto-import
```

## Tech Stack

- **Desktop:** Tauri 2.0 with macOS-specific features (overlay titlebar)
- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS 4
- **UI:** Radix UI primitives (dialog, dropdown, tooltip, scroll-area, context-menu)
- **Backend:** Rust with rusqlite, image crate for thumbnails, reqwest/scraper for bookmarks
- **Icons:** Lucide React
- **Typography:** Fraunces (display) + Instrument Sans (body)

## Visual Design

The app uses a "Warm Studio" aesthetic defined in `src/index.css`:

- **Light mode** with warm cream background (`#FAF8F5`)
- **Terracotta primary** (`#C75B3F`) - earthy, handmade feel
- **Chartreuse accent** (`#BFFF00`) - intentional "color that feels wrong"
- **Warm charcoal text** - never pure black (`#2D2A26`)
- **Warm-tinted shadows** - rgb(45 42 38 / opacity) not pure black
- **Film grain overlay** - subtle texture via SVG turbulence filter
- **No gradients** - solid colors only

## Conventions

### TypeScript Types

Core types in `src/types/index.ts` mirror Rust structs with camelCase conversion. When adding new data structures, update both:
- Rust: `src-tauri/src/commands/mod.rs` (with `#[serde(rename_all = "camelCase")]`)
- TypeScript: `src/types/index.ts`

### Path Alias

Use `@/` for imports from `src/`:
```typescript
import { Button } from "@/components/ui/button";
import * as tauri from "@/lib/tauri";
```

### Component Organization

```
src/components/
├── ui/           # Radix primitives (button, dialog, input, toast, etc.)
├── layout/       # Sidebar, Toolbar
├── items/        # ItemGrid, ItemCard, DropZone
├── dialogs/      # TagPickerDialog, BookmarkImportDialog
├── detail/       # ItemDetailPanel
└── settings/     # SettingsPanel
```

### Tauri Commands

When adding a new command:
1. Create/update handler in `src-tauri/src/commands/`
2. Register in `lib.rs` invoke_handler
3. Add typed wrapper in `src/lib/tauri.ts`

## Patterns & Conventions

### Selection Handling

Item selection uses a modifiers object pattern for clean multi-select and range-select:
```typescript
const handleSelectItem = (itemId: string, modifiers: { meta: boolean; shift: boolean }) => {
  if (modifiers.shift && lastSelectedIndex !== null) {
    // Range select
  } else if (modifiers.meta) {
    // Toggle select
  } else {
    // Single select
  }
};
```

### Toast Notifications

Import feedback uses `ImportToast` component (`src/components/ui/import-toast.tsx`) with states: `importing`, `success`, `error`, `warning`. Toast state is managed in App.tsx:

```typescript
const [importToast, setImportToast] = useState<{
  status: "importing" | "success" | "error" | "warning";
  message: string;
  count?: number;
} | null>(null);
```

### Dialog Components

Dialogs follow a consistent pattern using Radix primitives:
```typescript
// In App.tsx - state
const [dialogOpen, setDialogOpen] = useState(false);

// Component usage
<SomeDialog
  isOpen={dialogOpen}
  onClose={() => setDialogOpen(false)}
  onComplete={handleComplete}
/>
```

### Drag & Drop to Folders

Folder drop targets track hover state for visual feedback:
```typescript
const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);
// onDragOver sets target, onDrop moves items, onDragLeave clears
```

### localStorage Persistence

UI preferences persist to localStorage with keys prefixed `inspo:`:
- `inspo:sidebar-width` - Sidebar width (180-400px)
- `inspo:recent-libraries` - Recent library paths

## Recursive Development System

The `.agent/` directory contains an autonomous development loop system.

### Quick Start

```bash
# Check status
./.agent/status.sh

# Run single story
./.agent/run-one.sh

# Run full loop (continuous until done)
./.agent/loop.sh
```

### Files

| File | Purpose |
|------|---------|
| `prd.json` | Product backlog with stories |
| `.agent/loop.sh` | Main autonomous loop |
| `.agent/run-one.sh` | Single story runner |
| `.agent/status.sh` | Progress viewer |
| `.agent/learnings.md` | Insights log |

### How It Works

1. Loop picks next `todo` story from `prd.json` (by priority)
2. Claude agent implements the story
3. Runs `bun run lint` and `bun run build`
4. If passing → commits and marks done
5. If failing → marks failed with reason
6. Logs any learnings
7. Repeats until all stories complete

### Agent Output Protocol

```
SUCCESS: <what was implemented>
FAILED: <why it failed>
LEARNING: <insight discovered>
```
