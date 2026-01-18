import { cn } from "@/lib/utils";
import { ItemCard } from "./ItemCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Item, Folder, ViewMode } from "@/types";

interface ItemGridProps {
  items: Item[];
  viewMode: ViewMode;
  selectedIds: Set<string>;
  searchQuery?: string;
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

export function ItemGrid({
  items,
  viewMode,
  selectedIds,
  searchQuery,
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
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          {searchQuery ? (
            <>
              <p className="text-text-muted mb-2">No results found</p>
              <p className="text-sm text-text-subtle">
                Try a different search term
              </p>
            </>
          ) : (
            <>
              <p className="text-text-muted mb-2">No items yet</p>
              <p className="text-sm text-text-subtle">
                Drag and drop images here or use the Add button
              </p>
            </>
          )}
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
