import { useRef, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ItemCard } from "./ItemCard";
import { Inbox, FolderOpen, Heart, Image, Bookmark, Tag, Trash2, Search } from "lucide-react";
import type { Item, Folder, ViewMode } from "@/types";

type EmptyStateContext = "all" | "inbox" | "favorites" | "images" | "bookmarks" | "folder" | "tag" | "trash" | "search";

// Grid configuration
const ITEM_MIN_WIDTH = 160;
const ITEM_HEIGHT_GRID = 180; // Height for grid view items
const ITEM_HEIGHT_LIST = 48;  // Height for list view items
const GAP = 12; // Gap between items
const PADDING = 16; // Container padding

interface ItemGridProps {
  items: Item[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  searchQuery?: string;
  emptyStateContext?: EmptyStateContext;
  onSelect: (itemId: string, modifiers: { meta: boolean; shift: boolean }) => void;
  onOpen: (item: Item) => void;
  onToggleFavorite: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onDeleteSelected?: () => void;
  onMoveToFolder: (itemId: string, folderId: string | null) => void;
  onMoveSelectedToFolder?: (folderId: string | null) => void;
  onAddTag: (itemId: string) => void;
  folders: Folder[];
  libraryPath: string | null;
  isLoading?: boolean;
}

const emptyStates: Record<EmptyStateContext, { icon: React.ElementType; title: string; description: string }> = {
  all: {
    icon: Inbox,
    title: "No items yet",
    description: "Drop files or save a bookmark to get started",
  },
  inbox: {
    icon: Inbox,
    title: "Inbox is empty",
    description: "New items will appear here before you organize them",
  },
  favorites: {
    icon: Heart,
    title: "No favorites",
    description: "Click the heart icon on items to add them to favorites",
  },
  images: {
    icon: Image,
    title: "No images",
    description: "Drag and drop images to add them to your library",
  },
  bookmarks: {
    icon: Bookmark,
    title: "No bookmarks",
    description: "Use the Add button to save web pages",
  },
  folder: {
    icon: FolderOpen,
    title: "This folder is empty",
    description: "Drag items here or create new ones",
  },
  tag: {
    icon: Tag,
    title: "No items with this tag",
    description: "Add this tag to items to see them here",
  },
  trash: {
    icon: Trash2,
    title: "Trash is empty",
    description: "Deleted items will appear here",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try a different search term",
  },
};

export function ItemGrid({
  items,
  viewMode,
  selectedIds,
  searchQuery,
  emptyStateContext = "all",
  onSelect,
  onOpen,
  onToggleFavorite,
  onDelete,
  onDeleteSelected,
  onMoveToFolder,
  onMoveSelectedToFolder,
  onAddTag,
  folders,
  libraryPath,
  isLoading,
}: ItemGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate columns based on container width
  const columns = viewMode === "list"
    ? 1
    : Math.max(1, Math.floor((containerWidth - PADDING * 2 + GAP) / (ITEM_MIN_WIDTH + GAP)));

  // Calculate row count
  const rowCount = Math.ceil(items.length / columns);

  // Item height based on view mode
  const itemHeight = viewMode === "list" ? ITEM_HEIGHT_LIST : ITEM_HEIGHT_GRID;

  // Track container width with ResizeObserver
  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(parent);
    // Initial measurement
    setContainerWidth(parent.clientWidth);

    return () => observer.disconnect();
  }, []);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => itemHeight + GAP, [itemHeight]),
    overscan: 3, // Render 3 extra rows above/below viewport
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    const context = searchQuery ? "search" : emptyStateContext;
    const { icon: Icon, title, description } = emptyStates[context];

    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            <Icon className="w-6 h-6 text-text-subtle" />
          </div>
          <p className="text-text-muted mb-2 font-medium">{title}</p>
          <p className="text-sm text-text-subtle max-w-[240px]">
            {description}
          </p>
        </div>
      </div>
    );
  }

  // For masonry view, fall back to non-virtualized (complex to virtualize due to variable heights)
  if (viewMode === "masonry") {
    return (
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
      >
        <div className="p-4">
          <div className="columns-[160px] gap-3 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <ItemCard
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  selectedCount={selectedIds.size}
                  searchQuery={searchQuery}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onToggleFavorite={onToggleFavorite}
                  onDelete={onDelete}
                  onDeleteSelected={onDeleteSelected}
                  onMoveToFolder={onMoveToFolder}
                  onMoveSelectedToFolder={onMoveSelectedToFolder}
                  onAddTag={onAddTag}
                  folders={folders}
                  libraryPath={libraryPath}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate item width for grid view (distribute space evenly)
  const availableWidth = containerWidth - PADDING * 2 - (columns - 1) * GAP;
  const itemWidth = columns > 0 ? Math.floor(availableWidth / columns) : ITEM_MIN_WIDTH;

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto"
    >
      {/* Total height container for proper scrollbar */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize() + PADDING * 2}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {/* Render only visible rows */}
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns;
          const rowItems = items.slice(rowStartIndex, rowStartIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start + PADDING}px)`,
              }}
            >
              <div
                className={cn(
                  viewMode === "list"
                    ? "flex flex-col gap-1 px-4"
                    : "flex gap-3 px-4"
                )}
              >
                {rowItems.map((item) => (
                  <div
                    key={item.id}
                    style={viewMode === "grid" ? { width: itemWidth } : undefined}
                    className={cn(viewMode === "list" && "w-full")}
                  >
                    <ItemCard
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      selectedCount={selectedIds.size}
                      searchQuery={searchQuery}
                      onSelect={onSelect}
                      onOpen={onOpen}
                      onToggleFavorite={onToggleFavorite}
                      onDelete={onDelete}
                      onDeleteSelected={onDeleteSelected}
                      onMoveToFolder={onMoveToFolder}
                      onMoveSelectedToFolder={onMoveSelectedToFolder}
                      onAddTag={onAddTag}
                      folders={folders}
                      libraryPath={libraryPath}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
