import { useState } from "react";
import { Heart, Link, ExternalLink, Trash2, FolderInput, Tag, Copy, Clipboard } from "lucide-react";
import { cn, getDomainFromUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Item, Folder } from "@/types";

interface ItemCardProps {
  item: Item;
  isSelected: boolean;
  selectedCount: number;
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
}

export function ItemCard({
  item,
  isSelected,
  selectedCount,
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
}: ItemCardProps) {
  // When item is selected and there are multiple selections, actions should apply to all
  const isMultiSelection = isSelected && selectedCount > 1;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    onSelect(item.id, {
      meta: e.metaKey || e.ctrlKey,
      shift: e.shiftKey,
    });
  };

  const handleDoubleClick = () => {
    onOpen(item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "move";
    // Select this item if not already selected (for single item drag)
    if (!isSelected) {
      onSelect(item.id, { meta: false, shift: false });
    }
  };

  const getThumbnailUrl = () => {
    if (!libraryPath || !item.thumbnailPath) return null;
    // Convert to Tauri asset protocol URL
    return `asset://localhost/${encodeURIComponent(libraryPath + "/" + item.thumbnailPath)}`;
  };

  const getFileUrl = () => {
    if (!libraryPath || !item.filePath) return null;
    return `asset://localhost/${encodeURIComponent(libraryPath + "/" + item.filePath)}`;
  };

  const imageUrl = getThumbnailUrl() || getFileUrl();

  const handleCopyUrl = async () => {
    if (item.url) {
      await navigator.clipboard.writeText(item.url);
    }
  };

  const handleCopyTitle = async () => {
    await navigator.clipboard.writeText(item.title || "Untitled");
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onDragStart={handleDragStart}
          draggable
          className={cn(
            "group relative bg-surface rounded-xl overflow-hidden cursor-pointer card-hover",
            "shadow-card",
            isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          {/* Thumbnail Area */}
          <div
            className="relative aspect-square bg-surface-hover overflow-hidden rounded-t-xl"
            style={{
              backgroundColor: item.colorHex || undefined,
            }}
          >
            {item.type === "image" && imageUrl && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-surface-hover" />
                )}
                <img
                  src={imageUrl}
                  alt={item.title || "Image"}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    imageLoaded ? "opacity-100" : "opacity-0",
                    "group-hover:scale-[1.02]"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  draggable={false}
                />
              </>
            ) : item.type === "bookmark" ? (
              <div className="w-full h-full flex items-center justify-center bg-surface-hover">
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary-subtle flex items-center justify-center">
                    <Link className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-xs text-text-muted truncate font-medium">
                    {item.url ? getDomainFromUrl(item.url) : "Bookmark"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-text-subtle text-sm">No preview</div>
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
              <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  className="h-8 w-8 bg-surface/95 hover:bg-surface shadow-md backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.id);
                  }}
                >
                  <Heart
                    className={cn(
                      "w-4 h-4",
                      item.isFavorited && "fill-primary text-primary"
                    )}
                  />
                </Button>
              </div>

              {/* Favorite indicator always visible if favorited */}
              {item.isFavorited && (
                <div className="absolute top-2.5 left-2.5 group-hover:opacity-0 transition-opacity duration-200">
                  <div className="w-7 h-7 rounded-full bg-surface/95 shadow-md flex items-center justify-center backdrop-blur-sm">
                    <Heart className="w-4 h-4 fill-primary text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Type badge */}
            {item.type === "bookmark" && (
              <div className="absolute bottom-2.5 left-2.5">
                <div className="px-2 py-1 rounded-md bg-surface/95 text-xs text-text-muted flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
                  <Link className="w-3 h-3" />
                  <span>Link</span>
                </div>
              </div>
            )}
          </div>

          {/* Title Area */}
          <div className="p-3">
            <p className="text-sm text-text truncate font-medium">
              {item.title || "Untitled"}
            </p>
            {item.tags && item.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.id}
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}15` : "var(--color-surface-hover)",
                      color: tag.color || "var(--color-text-muted)",
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {item.tags.length > 3 && (
                  <span className="text-[10px] text-text-subtle px-1">
                    +{item.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpen(item)}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onToggleFavorite(item.id)}>
          <Heart className="w-4 h-4 mr-2" />
          {item.isFavorited ? "Remove from Favorites" : "Add to Favorites"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderInput className="w-4 h-4 mr-2" />
            {isMultiSelection ? `Move ${selectedCount} Items` : "Move to Folder"}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => isMultiSelection && onMoveSelectedToFolder ? onMoveSelectedToFolder(null) : onMoveToFolder(item.id, null)}>
              No Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
            {folders.map((folder) => (
              <ContextMenuItem
                key={folder.id}
                onClick={() => isMultiSelection && onMoveSelectedToFolder ? onMoveSelectedToFolder(folder.id) : onMoveToFolder(item.id, folder.id)}
              >
                {folder.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={() => onAddTag(item.id)}>
          <Tag className="w-4 h-4 mr-2" />
          Add Tags
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={handleCopyTitle}>
              <Clipboard className="w-4 h-4 mr-2" />
              Copy Title
            </ContextMenuItem>
            {item.url && (
              <ContextMenuItem onClick={handleCopyUrl}>
                <Link className="w-4 h-4 mr-2" />
                Copy URL
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => isMultiSelection && onDeleteSelected ? onDeleteSelected() : onDelete(item.id)}
          className="text-danger focus:text-danger"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {isMultiSelection ? `Delete ${selectedCount} Items` : "Move to Trash"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
