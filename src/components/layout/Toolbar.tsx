import {
  Grid3X3,
  LayoutGrid,
  List,
  Search,
  SortAsc,
  SortDesc,
  Link,
  Plus,
  X,
  Filter,
  Image,
  Bookmark,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import type { ViewMode, Tag } from "@/types";

type ItemTypeFilter = "all" | "image" | "bookmark";

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  onSortChange: (sortBy: string, order: "ASC" | "DESC") => void;
  // Filter props
  filterType: ItemTypeFilter;
  onFilterTypeChange: (type: ItemTypeFilter) => void;
  filterTagIds: string[];
  onFilterTagsChange: (tagIds: string[]) => void;
  allTags: Tag[];
  onClearFilters: () => void;
  // Actions
  onAddBookmark: () => void;
  onImportFiles: () => void;
  title?: string;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  selectionCount?: number;
  onClearSelection?: () => void;
  // Trash-specific props
  isTrashView?: boolean;
  onRestoreSelected?: () => void;
  onDeleteSelectedPermanently?: () => void;
  onEmptyTrash?: () => void;
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  filterType,
  onFilterTypeChange,
  filterTagIds,
  onFilterTagsChange,
  allTags,
  onClearFilters,
  onAddBookmark,
  onImportFiles,
  title,
  searchInputRef,
  selectionCount = 0,
  onClearSelection,
  isTrashView = false,
  onRestoreSelected,
  onDeleteSelectedPermanently,
  onEmptyTrash,
}: ToolbarProps) {
  const hasActiveFilters = filterType !== "all" || filterTagIds.length > 0;
  const activeFilterCount = (filterType !== "all" ? 1 : 0) + filterTagIds.length;

  const handleToggleTagFilter = (tagId: string) => {
    if (filterTagIds.includes(tagId)) {
      onFilterTagsChange(filterTagIds.filter((id) => id !== tagId));
    } else {
      onFilterTagsChange([...filterTagIds, tagId]);
    }
  };
  const viewModes: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
    { mode: "grid", icon: Grid3X3, label: "Grid" },
    { mode: "masonry", icon: LayoutGrid, label: "Masonry" },
    { mode: "list", icon: List, label: "List" },
  ];

  const sortOptions = [
    { value: "created_at", label: "Date Added" },
    { value: "updated_at", label: "Date Modified" },
    { value: "title", label: "Name" },
  ];

  return (
    <div data-tauri-drag-region className="h-14 border-b border-border bg-surface flex items-center px-5 gap-4">
      {/* Title or Selection Count */}
      {selectionCount > 0 ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-primary">
            {selectionCount} selected
          </span>
          {onClearSelection && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClearSelection}
              className="h-6 w-6 text-text-muted hover:text-text"
              title="Clear selection (Esc)"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ) : (
        title && (
          <h1 className="text-lg font-display font-semibold text-text truncate min-w-0 flex-shrink-0 tracking-tight">
            {title}
          </h1>
        )
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search items... (⌘F)"
          className={cn(
            "pl-9 h-9 bg-background border-border rounded-lg focus:ring-2 focus:ring-primary-subtle focus:border-primary transition-all",
            searchQuery && "pr-9"
          )}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-hover transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4 text-text-muted hover:text-text" />
          </button>
        )}
      </div>

      <div data-tauri-drag-region className="flex-1" />

      {/* Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={hasActiveFilters ? "default" : "ghost"}
            size="sm"
            className={cn(
              "gap-1.5 rounded-lg",
              hasActiveFilters && "bg-primary-subtle text-primary hover:bg-primary-subtle/80"
            )}
          >
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium">
              {hasActiveFilters ? `Filter (${activeFilterCount})` : "Filter"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-56">
          {/* Type Filter */}
          <DropdownMenuLabel className="text-text-subtle">Type</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={filterType}>
            <DropdownMenuRadioItem
              value="all"
              onClick={() => onFilterTypeChange("all")}
              className="rounded-lg"
            >
              All Types
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="image"
              onClick={() => onFilterTypeChange("image")}
              className="rounded-lg"
            >
              <Image className="w-4 h-4 mr-2" />
              Images Only
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="bookmark"
              onClick={() => onFilterTypeChange("bookmark")}
              className="rounded-lg"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Bookmarks Only
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-text-subtle">Tags</DropdownMenuLabel>
              {allTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={filterTagIds.includes(tag.id)}
                  onCheckedChange={() => handleToggleTagFilter(tag.id)}
                  className="rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5"
                      style={{ backgroundColor: tag.color || "#C75B3F" }}
                    />
                    <span>{tag.name}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onClearFilters}
                className="rounded-lg text-primary"
              >
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Trash Actions (shown when in trash view with selection) */}
      {isTrashView && selectionCount > 0 && (
        <>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={onRestoreSelected}
          >
            <RotateCcw className="w-4 h-4" />
            Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg text-danger hover:text-danger"
            onClick={onDeleteSelectedPermanently}
          >
            <Trash2 className="w-4 h-4" />
            Delete Forever
          </Button>
        </>
      )}

      {/* Empty Trash (shown when in trash view without selection) */}
      {isTrashView && selectionCount === 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-lg text-danger hover:text-danger"
          onClick={onEmptyTrash}
        >
          <Trash2 className="w-4 h-4" />
          Empty Trash
        </Button>
      )}

      {/* Add Actions (hidden in trash view) */}
      {!isTrashView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-1.5 rounded-lg">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onImportFiles} className="rounded-lg">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Import Images
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onAddBookmark} className="rounded-lg">
              <Link className="w-4 h-4 mr-2" />
              Add Bookmark
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* View Mode Toggle */}
      <div className="flex items-center border border-border rounded-lg bg-background p-0.5">
        {viewModes.map(({ mode, icon: Icon, label }) => (
          <Button
            key={mode}
            variant="ghost"
            size="icon-sm"
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "rounded-md h-7 w-7",
              viewMode === mode && "bg-surface shadow-sm"
            )}
            title={label}
          >
            <Icon className={cn("w-4 h-4", viewMode === mode ? "text-primary" : "text-text-muted")} />
          </Button>
        ))}
      </div>

      {/* Sort */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
            {sortOrder === "DESC" ? (
              <SortDesc className="w-4 h-4" />
            ) : (
              <SortAsc className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">
              {sortOptions.find((o) => o.value === sortBy)?.label || "Sort"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuLabel className="text-text-subtle">Sort by</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortBy}>
            {sortOptions.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                onClick={() => onSortChange(option.value, sortOrder)}
                className="rounded-lg"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-text-subtle">Order</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sortOrder}>
            <DropdownMenuRadioItem
              value="DESC"
              onClick={() => onSortChange(sortBy, "DESC")}
              className="rounded-lg"
            >
              <SortDesc className="w-4 h-4 mr-2" />
              Newest First
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="ASC"
              onClick={() => onSortChange(sortBy, "ASC")}
              className="rounded-lg"
            >
              <SortAsc className="w-4 h-4 mr-2" />
              Oldest First
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
