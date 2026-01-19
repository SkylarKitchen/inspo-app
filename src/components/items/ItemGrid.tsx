import { cn } from "@/lib/utils";
import { ItemCard } from "./ItemCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, FolderOpen, Heart, Image, Bookmark, Tag, Trash2, Search } from "lucide-react";
import type { Item, Folder, ViewMode } from "@/types";

type EmptyStateContext = "all" | "inbox" | "favorites" | "images" | "bookmarks" | "folder" | "tag" | "trash" | "search";

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

  const gridClasses = {
    grid: "grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3",
    masonry: "columns-[160px] gap-3 space-y-3",
    list: "flex flex-col gap-1",
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <div className={cn(gridClasses[viewMode])}>
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(viewMode === "masonry" && "break-inside-avoid")}
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
    </ScrollArea>
  );
}
