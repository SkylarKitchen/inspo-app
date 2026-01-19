# Agent Learnings Log

This file captures insights and patterns discovered during autonomous development.

---

## 2026-01-18: ESLint Configuration Quirks

**Issue:** Strict ESLint rules require explicit disable comments for certain patterns.

**Patterns that need `eslint-disable`:**
- `react-hooks/set-state-in-effect` - When calling setState inside useEffect (common for derived state)
- `react-refresh/only-export-components` - When exporting helper functions alongside components

**Solution:** Use block comments for multiple violations:
```typescript
/* eslint-disable react-hooks/set-state-in-effect */
useEffect(() => {
  if (condition) setIsVisible(true);
}, [dep]);
/* eslint-enable react-hooks/set-state-in-effect */
```

---

## 2026-01-18: Selection Modifiers Pattern

**Issue:** Handling click, Cmd+click, and Shift+click requires clean separation.

**Solution:** Pass modifiers as an object instead of separate boolean params:
```typescript
// Component
onClick={(e) => onSelect(item.id, { meta: e.metaKey, shift: e.shiftKey })}

// Handler signature
onSelect: (id: string, modifiers: { meta: boolean; shift: boolean }) => void
```

This scales better if more modifiers are needed later (alt, ctrl).

---

## 2026-01-18: Tauri Command Addition Workflow

**Full workflow for adding a new Tauri command:**

1. **Rust handler** in `src-tauri/src/commands/*.rs`:
   ```rust
   #[tauri::command]
   pub async fn my_command(state: State<'_, AppState>, arg: String) -> Result<Response, String> { }
   ```

2. **Register** in `src-tauri/src/lib.rs` invoke_handler array

3. **TypeScript wrapper** in `src/lib/tauri.ts`:
   ```typescript
   export async function myCommand(arg: string): Promise<Response> {
     return invoke("my_command", { arg });
   }
   ```

4. **Types** - If new struct, add to both `commands/mod.rs` and `src/types/index.ts`

---

## 2026-01-18: Folder Drag-Drop State Management

**Issue:** Need visual feedback when dragging items over folders.

**Solution:** Track drag target at App level, pass to Sidebar:
```typescript
const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);

// Sidebar receives:
dragTargetFolderId={dragTargetFolderId}
onFolderDragOver={(id) => setDragTargetFolderId(id)}
onFolderDrop={(id) => { moveItems(id); setDragTargetFolderId(null); }}
```

---

## 2026-01-18: Confirmation Dialogs Pattern

**Issue:** Delete operations need user confirmation.

**Solution:** Store the ID of item pending deletion, show dialog when non-null:
```typescript
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

// Trigger: setDeleteConfirmId(itemId)
// Dialog: open={deleteConfirmId !== null}
// Confirm: performDelete(); setDeleteConfirmId(null);
// Cancel: setDeleteConfirmId(null)
```

---

## 2026-01-18: Bookmark Metadata Preview

**Issue:** Need to fetch page metadata before importing to allow user edits.

**Solution:** Added separate `fetch_bookmark_metadata` command that fetches without saving:
- User enters URL → clicks "Fetch" → sees title/description preview
- User can edit before clicking "Import"
- Import uses the edited values (or fetches again if empty)

