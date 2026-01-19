import { useState, useEffect, useCallback } from "react";
import {
  X,
  Heart,
  Trash2,
  ExternalLink,
  Link,
  Calendar,
  Image as ImageIcon,
  FileText,
  Tag,
  Folder,
  MoreHorizontal,
  Copy,
  Edit2,
  Check,
} from "lucide-react";
import { cn, formatDate, formatFileSize, getDomainFromUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { convertToLocalSrc } from "@/lib/utils";
import type { Item, Tag as TagType } from "@/types";

interface ItemDetailPanelProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  onUpdateTitle: (itemId: string, title: string) => void;
  onUpdateDescription: (itemId: string, description: string) => void;
  onOpenExternal: (item: Item) => void;
  libraryPath: string | null;
  allTags: TagType[];
  onAddTag: (itemId: string, tagId: string) => void;
  onRemoveTag: (itemId: string, tagId: string) => void;
}

type DetailState = "viewing" | "editing_title" | "editing_description";

export function ItemDetailPanel({
  item,
  isOpen,
  onClose,
  onToggleFavorite,
  onDelete,
  onUpdateTitle,
  onUpdateDescription,
  onOpenExternal,
  libraryPath,
  allTags,
  onAddTag,
  onRemoveTag,
}: ItemDetailPanelProps) {
  const [state, setState] = useState<DetailState>("viewing");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state when item changes - intentional effect-based reset
  const itemId = item?.id;
  const itemTitle = item?.title;
  const itemDescription = item?.description;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setState("viewing");
    setImageLoaded(false);
    setEditTitle(itemTitle || "");
    setEditDescription(itemDescription || "");
  }, [itemId, itemTitle, itemDescription]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !item) return;

      if (e.key === "Escape") {
        if (state !== "viewing") {
          setState("viewing");
        } else {
          onClose();
        }
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, item, state, onClose]);

  const handleSaveTitle = useCallback(() => {
    if (item && editTitle !== item.title) {
      onUpdateTitle(item.id, editTitle);
    }
    setState("viewing");
  }, [item, editTitle, onUpdateTitle]);

  const handleSaveDescription = useCallback(() => {
    if (item && editDescription !== item.description) {
      onUpdateDescription(item.id, editDescription);
    }
    setState("viewing");
  }, [item, editDescription, onUpdateDescription]);

  const getImageUrl = () => {
    if (!libraryPath || !item?.filePath) return null;
    return convertToLocalSrc(`${libraryPath}/${item.filePath}`);
  };

  const getThumbnailUrl = () => {
    if (!libraryPath || !item?.thumbnailPath) return null;
    return convertToLocalSrc(`${libraryPath}/${item.thumbnailPath}`);
  };

  const handleCopyUrl = async () => {
    if (item?.url) {
      await navigator.clipboard.writeText(item.url);
    }
  };

  if (!item) return null;

  const imageUrl = getImageUrl();
  const thumbnailUrl = getThumbnailUrl();
  const displayUrl = imageUrl || thumbnailUrl;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[420px] bg-surface z-50 shadow-lg",
          "flex flex-col transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {item.type === "image" && <ImageIcon className="w-4 h-4 text-text-muted" />}
            {item.type === "bookmark" && <Link className="w-4 h-4 text-text-muted" />}
            {item.type === "file" && <FileText className="w-4 h-4 text-text-muted" />}
            <span className="text-sm text-text-muted capitalize">{item.type}</span>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenExternal(item)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Externally
                </DropdownMenuItem>
                {item.url && (
                  <DropdownMenuItem onClick={handleCopyUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(item.id)}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Preview */}
            <div className="relative rounded-lg overflow-hidden bg-surface-hover">
              {item.type === "image" && displayUrl ? (
                <div className="relative">
                  {!imageLoaded && (
                    <div className="aspect-video animate-pulse bg-surface-hover" />
                  )}
                  <img
                    src={displayUrl}
                    alt={item.title || "Preview"}
                    className={cn(
                      "w-full h-auto max-h-[300px] object-contain",
                      imageLoaded ? "block" : "hidden"
                    )}
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              ) : item.type === "bookmark" ? (
                <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-surface to-surface-hover">
                  <div className="text-center p-6">
                    <Link className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p className="text-sm text-text-subtle">
                      {item.url ? getDomainFromUrl(item.url) : "Bookmark"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center">
                  <FileText className="w-12 h-12 text-text-muted" />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-xs text-text-subtle uppercase tracking-wide">Title</label>
              {state === "editing_title" ? (
                <div className="flex gap-2 mt-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setState("viewing");
                    }}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="icon-sm" onClick={handleSaveTitle}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="group flex items-center gap-2 mt-1 cursor-pointer"
                  onClick={() => setState("editing_title")}
                >
                  <p className="text-base text-text">{item.title || "Untitled"}</p>
                  <Edit2 className="w-3.5 h-3.5 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-text-subtle uppercase tracking-wide">Description</label>
              {state === "editing_description" ? (
                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setState("viewing");
                    }}
                    autoFocus
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveDescription}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="group flex items-start gap-2 mt-1 cursor-pointer min-h-[40px]"
                  onClick={() => setState("editing_description")}
                >
                  <p className="text-sm text-text-muted flex-1">
                    {item.description || "No description"}
                  </p>
                  <Edit2 className="w-3.5 h-3.5 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
              )}
            </div>

            {/* URL (for bookmarks) */}
            {item.url && (
              <div>
                <label className="text-xs text-text-subtle uppercase tracking-wide">URL</label>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-1 text-sm text-primary hover:underline truncate"
                >
                  {item.url}
                </a>
              </div>
            )}

            {/* Tags */}
            <div>
              <label className="text-xs text-text-subtle uppercase tracking-wide">Tags</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-surface-hover"
                    style={{
                      backgroundColor: tag.color ? `${tag.color}20` : undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => onRemoveTag(item.id, tag.id)}
                      className="hover:text-danger"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {allTags
                      .filter((t) => !item.tags.some((it) => it.id === t.id))
                      .map((tag) => (
                        <DropdownMenuItem
                          key={tag.id}
                          onClick={() => onAddTag(item.id, tag.id)}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: tag.color || "#888" }}
                          />
                          {tag.name}
                        </DropdownMenuItem>
                      ))}
                    {allTags.filter((t) => !item.tags.some((it) => it.id === t.id)).length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-text-subtle">No more tags</div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              <label className="text-xs text-text-subtle uppercase tracking-wide">Details</label>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Dimensions */}
                {item.width && item.height && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <ImageIcon className="w-4 h-4 text-text-subtle" />
                    <span>{item.width} × {item.height}</span>
                  </div>
                )}

                {/* File size */}
                {item.fileSize && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <FileText className="w-4 h-4 text-text-subtle" />
                    <span>{formatFileSize(item.fileSize)}</span>
                  </div>
                )}

                {/* Created date */}
                <div className="flex items-center gap-2 text-text-muted">
                  <Calendar className="w-4 h-4 text-text-subtle" />
                  <span>{formatDate(item.createdAt)}</span>
                </div>

                {/* Folder */}
                {item.folderId && (
                  <div className="flex items-center gap-2 text-text-muted">
                    <Folder className="w-4 h-4 text-text-subtle" />
                    <span>In folder</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-border">
          <Button
            variant={item.isFavorited ? "default" : "secondary"}
            size="sm"
            onClick={() => onToggleFavorite(item.id)}
            className="flex-1"
          >
            <Heart
              className={cn("w-4 h-4 mr-2", item.isFavorited && "fill-current")}
            />
            {item.isFavorited ? "Favorited" : "Favorite"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenExternal(item)}
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </div>
    </>
  );
}
