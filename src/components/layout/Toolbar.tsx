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
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "@/types";

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
  onSortChange: (sortBy: string, order: "ASC" | "DESC") => void;
  onAddBookmark: () => void;
  onImportFiles: () => void;
  title?: string;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  selectionCount?: number;
  onClearSelection?: () => void;
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onAddBookmark,
  onImportFiles,
  title,
  searchInputRef,
  selectionCount = 0,
  onClearSelection,
}: ToolbarProps) {
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
    <div className="h-14 border-b border-border bg-surface flex items-center px-5 gap-4">
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
          className="pl-9 h-9 bg-background border-border rounded-lg focus:ring-2 focus:ring-primary-subtle focus:border-primary transition-all"
        />
      </div>

      <div className="flex-1" />

      {/* Add Actions */}
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
