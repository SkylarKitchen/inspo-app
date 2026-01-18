import { useState, useCallback, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Heart,
  Inbox,
  Images,
  Link,
  Tag,
  Settings,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Folder as FolderType, Tag as TagType } from "@/types";

const SIDEBAR_WIDTH_KEY = "inspo:sidebar-width";
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 224; // 14rem = 224px

// eslint-disable-next-line react-refresh/only-export-components
export function getSavedSidebarWidth(): number {
  try {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      const width = parseInt(saved, 10);
      if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
        return width;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_SIDEBAR_WIDTH;
}

function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  } catch {
    // Ignore localStorage errors
  }
}

interface SidebarProps {
  folders: FolderType[];
  tags: TagType[];
  currentFolderId: string | null;
  currentView: "all" | "inbox" | "favorites" | "images" | "bookmarks" | "folder" | "tag";
  currentTagId: string | null;
  onSelectView: (view: "all" | "inbox" | "favorites" | "images" | "bookmarks") => void;
  onSelectFolder: (folderId: string) => void;
  onSelectTag: (tagId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateTag: () => void;
  onOpenSettings: () => void;
  stats: {
    totalItems: number;
    totalImages: number;
    totalBookmarks: number;
    favoritesCount: number;
  };
  width: number;
  onWidthChange: (width: number) => void;
  dragTargetFolderId?: string | null;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDrop?: (folderId: string) => void;
}

interface FolderItemProps {
  folder: FolderType;
  level: number;
  currentFolderId: string | null;
  onSelect: (folderId: string) => void;
  onCreateFolder: (parentId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDragOver?: (folderId: string) => void;
  onDrop?: (folderId: string) => void;
  isDragTarget?: boolean;
  dragTargetFolderId?: string | null;
}

function FolderItem({
  folder,
  level,
  currentFolderId,
  onSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDragOver,
  onDrop,
  dragTargetFolderId,
}: FolderItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = currentFolderId === folder.id;
  const isDragTarget = dragTargetFolderId === folder.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditName(folder.name);
    setIsEditing(true);
  };

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameFolder(folder.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(folder.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(folder.id);
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            onClick={() => !isEditing && onSelect(folder.id)}
            onDoubleClick={handleDoubleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg transition-all duration-150",
              "hover:bg-sidebar-hover",
              isSelected && "bg-primary-subtle text-primary font-medium",
              isDragTarget && "bg-primary/20 ring-2 ring-primary ring-inset"
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-0.5 hover:bg-surface-active rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 text-text-subtle" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-text-subtle" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <Folder className={cn("w-4 h-4", isSelected ? "text-primary" : "text-text-muted")} />
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-1 py-0 text-sm bg-background border border-primary rounded outline-none"
              />
            ) : (
              <span className="flex-1 text-left truncate">{folder.name}</span>
            )}
            {!isEditing && folder.itemCount > 0 && (
              <span className={cn("text-xs tabular-nums", isSelected ? "text-primary-muted" : "text-text-subtle")}>{folder.itemCount}</span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onCreateFolder(folder.id)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            New Subfolder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => {
            setEditName(folder.name);
            setIsEditing(true);
          }}>
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDeleteFolder(folder.id)}
            className="text-danger focus:text-danger"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {hasChildren && isExpanded && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onDragOver={onDragOver}
              onDrop={onDrop}
              dragTargetFolderId={dragTargetFolderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  folders,
  tags,
  currentFolderId,
  currentView,
  currentTagId,
  onSelectView,
  onSelectFolder,
  onSelectTag,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateTag,
  onOpenSettings,
  stats,
  width,
  onWidthChange,
  dragTargetFolderId,
  onFolderDragOver,
  onFolderDrop,
}: SidebarProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      saveSidebarWidth(width);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Prevent text selection while resizing
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, onWidthChange, width]);

  const libraryItems = [
    { id: "all", label: "All Items", icon: Images, count: stats.totalItems },
    { id: "inbox", label: "Inbox", icon: Inbox, count: 0 },
    { id: "favorites", label: "Favorites", icon: Heart, count: stats.favoritesCount },
    { id: "images", label: "Images", icon: Images, count: stats.totalImages },
    { id: "bookmarks", label: "Bookmarks", icon: Link, count: stats.totalBookmarks },
  ] as const;

  return (
    <div
      ref={sidebarRef}
      className="h-full bg-sidebar border-r border-border flex flex-col relative"
      style={{ width: `${width}px`, minWidth: `${MIN_SIDEBAR_WIDTH}px`, maxWidth: `${MAX_SIDEBAR_WIDTH}px` }}
    >
      {/* Titlebar drag region */}
      <div className="h-8 titlebar-drag-region flex-shrink-0" />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* Library Section */}
          <div>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-text-subtle uppercase tracking-widest flex items-center section-header">
              Library
            </div>
            <div className="space-y-0.5 mt-1">
              {libraryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all duration-150",
                    "hover:bg-sidebar-hover",
                    currentView === item.id && "bg-primary-subtle text-primary font-medium"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", currentView === item.id ? "text-primary" : "text-text-muted")} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <span className={cn("text-xs tabular-nums", currentView === item.id ? "text-primary-muted" : "text-text-subtle")}>{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Folders Section */}
          <div>
            <button
              onClick={() => setFoldersExpanded(!foldersExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-text-subtle uppercase tracking-widest hover:text-text transition-colors"
            >
              <span className="flex items-center flex-1 section-header">Folders</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5 hover:bg-accent-subtle hover:text-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFolder();
                  }}
                >
                  <FolderPlus className="w-3 h-3" />
                </Button>
                {foldersExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            </button>
            {foldersExpanded && (
              <div className="space-y-0.5">
                {folders.map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    level={0}
                    currentFolderId={currentFolderId}
                    onSelect={onSelectFolder}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    onDragOver={onFolderDragOver}
                    onDrop={onFolderDrop}
                    dragTargetFolderId={dragTargetFolderId}
                  />
                ))}
                {folders.length === 0 && (
                  <p className="px-2 py-2 text-xs text-text-subtle">No folders yet</p>
                )}
              </div>
            )}
          </div>

          {/* Tags Section */}
          <div>
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold text-text-subtle uppercase tracking-widest hover:text-text transition-colors"
            >
              <span className="flex items-center flex-1 section-header">Tags</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-5 w-5 hover:bg-accent-subtle hover:text-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTag();
                  }}
                >
                  <Tag className="w-3 h-3" />
                </Button>
                {tagsExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            </button>
            {tagsExpanded && (
              <div className="space-y-0.5 mt-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onSelectTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all duration-150",
                      "hover:bg-sidebar-hover",
                      currentTagId === tag.id && "bg-primary-subtle text-primary font-medium"
                    )}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: tag.color || "#C75B3F" }}
                    />
                    <span className="flex-1 text-left truncate">{tag.name}</span>
                    {tag.itemCount > 0 && (
                      <span className={cn("text-xs tabular-nums", currentTagId === tag.id ? "text-primary-muted" : "text-text-subtle")}>{tag.itemCount}</span>
                    )}
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="px-2.5 py-2 text-xs text-text-subtle italic">No tags yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Settings Button */}
      <div className="p-2 border-t border-border">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all duration-150 hover:bg-sidebar-hover text-text-muted hover:text-text"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 right-0 w-1 h-full cursor-col-resize group",
          "hover:bg-primary-muted/40 transition-colors",
          isResizing && "bg-primary/60"
        )}
      >
        <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-text-subtle" />
        </div>
      </div>
    </div>
  );
}
