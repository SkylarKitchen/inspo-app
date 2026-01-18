import { useState, useEffect, useRef, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";

// Lazy-load Tauri plugins to prevent errors when Tauri isn't available
const openDialog = async (options: Parameters<typeof import("@tauri-apps/plugin-dialog").open>[0]) => {
  const { open } = await import("@tauri-apps/plugin-dialog");
  return open(options);
};

const openShell = async (path: string) => {
  const { open } = await import("@tauri-apps/plugin-shell");
  return open(path);
};
import { Sidebar, getSavedSidebarWidth } from "@/components/layout/Sidebar";
import { Toolbar } from "@/components/layout/Toolbar";
import { ItemGrid } from "@/components/items/ItemGrid";
import { DropZone } from "@/components/items/DropZone";
import { SetupWizard } from "@/components/SetupWizard";
import { ItemDetailPanel } from "@/components/detail/ItemDetailPanel";
import { TagPickerDialog } from "@/components/dialogs/TagPickerDialog";
import { BookmarkImportDialog } from "@/components/dialogs/BookmarkImportDialog";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ImportToast, type ImportToastState } from "@/components/ui/import-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as tauri from "@/lib/tauri";
import type { Item, Folder, Tag, ViewMode, LibraryStats } from "@/types";

type CurrentView = "all" | "inbox" | "favorites" | "images" | "bookmarks" | "folder" | "tag";

function App() {
  // Library state
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(true);

  // Data state
  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<LibraryStats>({
    totalItems: 0,
    totalImages: 0,
    totalBookmarks: 0,
    totalFolders: 0,
    totalTags: 0,
    favoritesCount: 0,
  });

  // UI state
  const [currentView, setCurrentView] = useState<CurrentView>("all");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentTagId, setCurrentTagId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(getSavedSidebarWidth);

  // Detail panel state
  const [detailItem, setDetailItem] = useState<Item | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dialog state
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>();
  const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [tagPickerItemId, setTagPickerItemId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [importToast, setImportToast] = useState<ImportToastState | null>(null);

  // Focus search callback
  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      // ⌘F - Focus search
      { key: "f", meta: true, handler: focusSearch, preventDefault: true },
      // ⌘N - New folder
      { key: "n", meta: true, handler: () => handleCreateFolder(), preventDefault: true },
      // ⌘⇧N - New tag
      { key: "n", meta: true, shift: true, handler: () => handleCreateTag(), preventDefault: true },
      // ⌘B - Add bookmark
      { key: "b", meta: true, handler: () => handleAddBookmark(), preventDefault: true },
      // ⌘I - Import files
      { key: "i", meta: true, handler: () => handleImportFiles(), preventDefault: true },
      // Escape - Close detail panel or clear selection
      {
        key: "Escape",
        handler: () => {
          if (isDetailOpen) {
            handleCloseDetail();
          } else if (selectedIds.size > 0) {
            setSelectedIds(new Set());
          }
        },
        allowInInput: true,
      },
      // ⌘1-4 - Switch views
      { key: "1", meta: true, handler: () => handleSelectView("all"), preventDefault: true },
      { key: "2", meta: true, handler: () => handleSelectView("favorites"), preventDefault: true },
      { key: "3", meta: true, handler: () => handleSelectView("images"), preventDefault: true },
      { key: "4", meta: true, handler: () => handleSelectView("bookmarks"), preventDefault: true },
      // ⌘, - Open settings
      { key: ",", meta: true, handler: () => setIsSettingsOpen(true), preventDefault: true },
    ],
    enabled: isLibraryOpen,
  });

  // Check for existing library on mount
  useEffect(() => {
    const checkLibrary = async () => {
      try {
        const isOpen = await tauri.isLibraryOpen();
        if (isOpen) {
          const path = await tauri.getLibraryPath();
          setLibraryPath(path);
          setIsLibraryOpen(true);
        }
      } catch (err) {
        console.error("Failed to check library:", err);
      } finally {
        setIsCheckingLibrary(false);
      }
    };
    checkLibrary();
  }, []);

  // Load data when library is open
  useEffect(() => {
    if (!isLibraryOpen) return;

    const loadData = async () => {
      try {
        const [foldersData, tagsData, statsData] = await Promise.all([
          tauri.getFolders(),
          tauri.getTags(),
          tauri.getLibraryStats(),
        ]);
        setFolders(foldersData);
        setTags(tagsData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };

    loadData();
  }, [isLibraryOpen]);

  // Load items when filter changes
  useEffect(() => {
    if (!isLibraryOpen) return;

    const loadItems = async () => {
      setIsLoading(true);
      try {
        const filter: Parameters<typeof tauri.getItems>[0] = {
          sortBy: sortBy as "created_at" | "updated_at" | "title",
          sortOrder,
          searchQuery: searchQuery || undefined,
        };

        if (currentView === "favorites") {
          filter.isFavorited = true;
        } else if (currentView === "images") {
          filter.itemType = "image";
        } else if (currentView === "bookmarks") {
          filter.itemType = "bookmark";
        } else if (currentView === "folder" && currentFolderId) {
          filter.folderId = currentFolderId;
        } else if (currentView === "tag" && currentTagId) {
          filter.tagIds = [currentTagId];
        }

        const itemsData = await tauri.getItems(filter);
        setItems(itemsData);
      } catch (err) {
        console.error("Failed to load items:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, [isLibraryOpen, currentView, currentFolderId, currentTagId, sortBy, sortOrder, searchQuery]);

  const handleLibrarySetup = (path: string) => {
    setLibraryPath(path);
    setIsLibraryOpen(true);
  };

  const handleSelectView = (view: "all" | "inbox" | "favorites" | "images" | "bookmarks") => {
    setCurrentView(view);
    setCurrentFolderId(null);
    setCurrentTagId(null);
    setSelectedIds(new Set());
  };

  const handleSelectFolder = (folderId: string) => {
    setCurrentView("folder");
    setCurrentFolderId(folderId);
    setCurrentTagId(null);
    setSelectedIds(new Set());
  };

  const handleSelectTag = (tagId: string) => {
    setCurrentView("tag");
    setCurrentTagId(tagId);
    setCurrentFolderId(null);
    setSelectedIds(new Set());
  };

  const handleSelectItem = (itemId: string, modifiers: { meta: boolean; shift: boolean }) => {
    const currentIndex = items.findIndex((item) => item.id === itemId);

    // Shift+click: select range from last selected to current
    if (modifiers.shift && lastSelectedIndex !== null && lastSelectedIndex !== currentIndex) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = items.slice(start, end + 1).map((item) => item.id);

      setSelectedIds((prev) => {
        const newSet = new Set(modifiers.meta ? prev : []);
        rangeIds.forEach((id) => newSet.add(id));
        return newSet;
      });
      // Don't update lastSelectedIndex on shift+click to allow extending the range
      return;
    }

    // Single click or Cmd+click
    setSelectedIds((prev) => {
      const newSet = new Set(modifiers.meta ? prev : []);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });

    // Track last selected for shift+click range
    setLastSelectedIndex(currentIndex);
  };

  const handleOpenItem = (item: Item) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  const handleOpenExternal = async (item: Item) => {
    try {
      if (item.type === "bookmark" && item.url) {
        await openShell(item.url);
      } else if (item.filePath && libraryPath) {
        const fullPath = `${libraryPath}/${item.filePath}`;
        await openShell(fullPath);
      }
    } catch (err) {
      console.error("Failed to open externally:", err);
    }
  };

  const handleUpdateItemTitle = async (itemId: string, title: string) => {
    try {
      const updated = await tauri.updateItem(itemId, { title });
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, title: updated.title } : item))
      );
      if (detailItem?.id === itemId) {
        setDetailItem((prev) => (prev ? { ...prev, title: updated.title } : null));
      }
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  const handleUpdateItemDescription = async (itemId: string, description: string) => {
    try {
      const updated = await tauri.updateItem(itemId, { description });
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, description: updated.description } : item))
      );
      if (detailItem?.id === itemId) {
        setDetailItem((prev) => (prev ? { ...prev, description: updated.description } : null));
      }
    } catch (err) {
      console.error("Failed to update description:", err);
    }
  };

  const handleAddTagToItem = async (itemId: string, tagId: string) => {
    try {
      await tauri.addTagsToItem(itemId, [tagId]);
      const tag = tags.find((t) => t.id === tagId);
      if (tag) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, tags: [...item.tags, tag] } : item
          )
        );
        if (detailItem?.id === itemId) {
          setDetailItem((prev) =>
            prev ? { ...prev, tags: [...prev.tags, tag] } : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  };

  const handleRemoveTagFromItem = async (itemId: string, tagId: string) => {
    try {
      await tauri.removeTagsFromItem(itemId, [tagId]);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, tags: item.tags.filter((t) => t.id !== tagId) }
            : item
        )
      );
      if (detailItem?.id === itemId) {
        setDetailItem((prev) =>
          prev ? { ...prev, tags: prev.tags.filter((t) => t.id !== tagId) } : null
        );
      }
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const handleToggleFavorite = async (itemId: string) => {
    try {
      await tauri.toggleFavorite(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, isFavorited: !item.isFavorited } : item
        )
      );
      if (detailItem?.id === itemId) {
        setDetailItem((prev) =>
          prev ? { ...prev, isFavorited: !prev.isFavorited } : null
        );
      }
      const statsData = await tauri.getLibraryStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await tauri.deleteItem(itemId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
      if (detailItem?.id === itemId) {
        setIsDetailOpen(false);
        setDetailItem(null);
      }
      const statsData = await tauri.getLibraryStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  };

  const handleMoveToFolder = async (itemId: string, folderId: string | null) => {
    try {
      await tauri.moveItemsToFolder([itemId], folderId);
      // Refresh items
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, folderId } : item
        )
      );
    } catch (err) {
      console.error("Failed to move item:", err);
    }
  };

  const handleAddTag = (itemId: string) => {
    setTagPickerItemId(itemId);
  };

  const handleCloseTagPicker = () => {
    setTagPickerItemId(null);
  };

  const handleTagPickerToggle = async (tagId: string) => {
    if (!tagPickerItemId) return;
    const item = items.find((i) => i.id === tagPickerItemId);
    if (!item) return;

    const hasTag = item.tags.some((t) => t.id === tagId);
    if (hasTag) {
      await handleRemoveTagFromItem(tagPickerItemId, tagId);
    } else {
      await handleAddTagToItem(tagPickerItemId, tagId);
    }
  };

  const handleTagPickerCreate = async (name: string) => {
    const newTag = await tauri.createTag(name);
    const tagsData = await tauri.getTags();
    setTags(tagsData);
    // Auto-add to the current item
    if (tagPickerItemId) {
      await handleAddTagToItem(tagPickerItemId, newTag.id);
    }
  };

  const handleCreateFolder = (parentId?: string) => {
    setNewFolderParentId(parentId);
    setNewFolderName("");
    setNewFolderDialogOpen(true);
  };

  const handleSubmitNewFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await tauri.createFolder(newFolderName.trim(), newFolderParentId);
      const foldersData = await tauri.getFolders();
      setFolders(foldersData);
      setNewFolderDialogOpen(false);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await tauri.renameFolder(folderId, newName);
      const foldersData = await tauri.getFolders();
      setFolders(foldersData);
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const [deleteConfirmFolderId, setDeleteConfirmFolderId] = useState<string | null>(null);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);

  const handleDeleteFolder = (folderId: string) => {
    setDeleteConfirmFolderId(folderId);
  };

  const confirmDeleteFolder = async () => {
    if (!deleteConfirmFolderId) return;
    try {
      await tauri.deleteFolder(deleteConfirmFolderId);
      const foldersData = await tauri.getFolders();
      setFolders(foldersData);
      if (currentFolderId === deleteConfirmFolderId) {
        setCurrentView("all");
        setCurrentFolderId(null);
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
    } finally {
      setDeleteConfirmFolderId(null);
    }
  };

  const handleFolderDragOver = (folderId: string) => {
    setDragTargetFolderId(folderId);
  };

  const handleFolderDrop = async (folderId: string) => {
    if (selectedIds.size === 0) {
      setDragTargetFolderId(null);
      return;
    }
    try {
      const itemIds = Array.from(selectedIds) as string[];
      await tauri.moveItemsToFolder(itemIds, folderId);
      const itemsData = await tauri.getItems();
      setItems(itemsData);
      const foldersData = await tauri.getFolders();
      setFolders(foldersData);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to move items to folder:", err);
    } finally {
      setDragTargetFolderId(null);
    }
  };

  const handleCreateTag = () => {
    setNewTagName("");
    setNewTagDialogOpen(true);
  };

  const handleSubmitNewTag = async () => {
    if (!newTagName.trim()) return;

    try {
      await tauri.createTag(newTagName.trim());
      const tagsData = await tauri.getTags();
      setTags(tagsData);
      setNewTagDialogOpen(false);
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleFilesDropped = async (paths: string[], skippedCount: number = 0) => {
    if (paths.length === 0) {
      if (skippedCount > 0) {
        setImportToast({
          type: "warning",
          message: "No images to import",
          details: `${skippedCount} unsupported file${skippedCount > 1 ? "s" : ""} skipped`,
        });
      }
      return;
    }

    setImportToast({
      type: "importing",
      message: `Importing ${paths.length} image${paths.length > 1 ? "s" : ""}...`,
    });

    try {
      const imported = await tauri.importImages(paths, currentFolderId || undefined);
      setItems((prev) => [...imported, ...prev]);
      const statsData = await tauri.getLibraryStats();
      setStats(statsData);

      const successMessage = `Imported ${imported.length} image${imported.length > 1 ? "s" : ""}`;
      const details = skippedCount > 0
        ? `${skippedCount} unsupported file${skippedCount > 1 ? "s" : ""} skipped`
        : undefined;

      setImportToast({
        type: "success",
        message: successMessage,
        details,
      });
    } catch (err) {
      console.error("Failed to import files:", err);
      setImportToast({
        type: "error",
        message: "Failed to import images",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleImportFiles = async () => {
    try {
      const selected = await openDialog({
        multiple: true,
        filters: [
          {
            name: "Images",
            extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await handleFilesDropped(paths);
      }
    } catch (err) {
      console.error("Failed to open file picker:", err);
    }
  };

  const handleAddBookmark = () => {
    setBookmarkDialogOpen(true);
  };

  const handleBookmarkImported = async (item: Item) => {
    setItems((prev) => [item, ...prev]);
    const statsData = await tauri.getLibraryStats();
    setStats(statsData);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case "all":
        return "All Items";
      case "inbox":
        return "Inbox";
      case "favorites":
        return "Favorites";
      case "images":
        return "Images";
      case "bookmarks":
        return "Bookmarks";
      case "folder": {
        const folder = findFolder(folders, currentFolderId);
        return folder?.name || "Folder";
      }
      case "tag": {
        const tag = tags.find((t) => t.id === currentTagId);
        return tag?.name || "Tag";
      }
      default:
        return "Inspo";
    }
  };

  const findFolder = (folders: Folder[], id: string | null): Folder | null => {
    if (!id) return null;
    for (const folder of folders) {
      if (folder.id === id) return folder;
      const found = findFolder(folder.children, id);
      if (found) return found;
    }
    return null;
  };

  // Loading state
  if (isCheckingLibrary) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  // Setup wizard
  if (!isLibraryOpen) {
    return <SetupWizard onComplete={handleLibrarySetup} />;
  }

  // Main app
  return (
    <TooltipProvider>
      <div className="h-full flex bg-background">
        {/* Sidebar */}
        <Sidebar
          folders={folders}
          tags={tags}
          currentFolderId={currentFolderId}
          currentView={currentView}
          currentTagId={currentTagId}
          onSelectView={handleSelectView}
          onSelectFolder={handleSelectFolder}
          onSelectTag={handleSelectTag}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onCreateTag={handleCreateTag}
          onOpenSettings={() => setIsSettingsOpen(true)}
          stats={stats}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          dragTargetFolderId={dragTargetFolderId}
          onFolderDragOver={handleFolderDragOver}
          onFolderDrop={handleFolderDrop}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Titlebar drag region */}
          <div className="h-8 titlebar-drag-region flex-shrink-0 bg-surface" />

          {/* Toolbar */}
          <Toolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(by, order) => {
              setSortBy(by);
              setSortOrder(order);
            }}
            onAddBookmark={handleAddBookmark}
            onImportFiles={handleImportFiles}
            title={getViewTitle()}
            searchInputRef={searchInputRef}
            selectionCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
          />

          {/* Item Grid with Drop Zone */}
          <DropZone onFilesDropped={handleFilesDropped}>
            <ItemGrid
              items={items}
              viewMode={viewMode}
              selectedIds={selectedIds}
              onSelect={handleSelectItem}
              onOpen={handleOpenItem}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteItem}
              onMoveToFolder={handleMoveToFolder}
              onAddTag={handleAddTag}
              folders={folders}
              libraryPath={libraryPath}
              isLoading={isLoading}
            />
          </DropZone>
        </div>

        {/* New Folder Dialog */}
        <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
            </DialogHeader>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => e.key === "Enter" && handleSubmitNewFolder()}
              autoFocus
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNewFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitNewFolder} disabled={!newFolderName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Tag Dialog */}
        <Dialog open={newTagDialogOpen} onOpenChange={setNewTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === "Enter" && handleSubmitNewTag()}
              autoFocus
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNewTagDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitNewTag} disabled={!newTagName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Folder Confirmation */}
        <Dialog open={deleteConfirmFolderId !== null} onOpenChange={() => setDeleteConfirmFolderId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Folder</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-muted">
              Are you sure you want to delete this folder? Items inside will be moved to the root level.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeleteConfirmFolderId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteFolder}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bookmark Dialog */}
        <BookmarkImportDialog
          isOpen={bookmarkDialogOpen}
          onClose={() => setBookmarkDialogOpen(false)}
          onImported={handleBookmarkImported}
          folders={folders}
          tags={tags}
          currentFolderId={currentFolderId}
        />

        {/* Item Detail Panel */}
        <ItemDetailPanel
          item={detailItem}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onToggleFavorite={handleToggleFavorite}
          onDelete={handleDeleteItem}
          onUpdateTitle={handleUpdateItemTitle}
          onUpdateDescription={handleUpdateItemDescription}
          onOpenExternal={handleOpenExternal}
          libraryPath={libraryPath}
          allTags={tags}
          onAddTag={handleAddTagToItem}
          onRemoveTag={handleRemoveTagFromItem}
        />

        {/* Tag Picker Dialog */}
        <TagPickerDialog
          isOpen={tagPickerItemId !== null}
          onClose={handleCloseTagPicker}
          allTags={tags}
          selectedTagIds={
            tagPickerItemId
              ? items.find((i) => i.id === tagPickerItemId)?.tags.map((t) => t.id) || []
              : []
          }
          onToggleTag={handleTagPickerToggle}
          onCreateTag={handleTagPickerCreate}
          title="Add Tags"
        />

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          libraryPath={libraryPath}
          stats={stats}
          defaultViewMode={viewMode}
          onViewModeChange={setViewMode}
          defaultSortBy={sortBy}
          defaultSortOrder={sortOrder}
          onSortChange={(by, order) => {
            setSortBy(by);
            setSortOrder(order);
          }}
          onChangeLibrary={() => {
            setIsSettingsOpen(false);
            // TODO: Implement change library flow
          }}
          onCloseLibrary={() => {
            setIsSettingsOpen(false);
            setIsLibraryOpen(false);
            setLibraryPath(null);
          }}
        />

        {/* Import Toast */}
        <ImportToast
          toast={importToast}
          onDismiss={() => setImportToast(null)}
        />
      </div>
    </TooltipProvider>
  );
}

export default App;
