import { useState, useMemo } from "react";
import { Check, Plus, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Tag as TagType } from "@/types";

interface TagPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  allTags: TagType[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onCreateTag: (name: string) => Promise<void>;
  title?: string;
}

// Available tag colors for future color picker feature
const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
] as const;
void TAG_COLORS; // Reserved for future color picker

export function TagPickerDialog({
  isOpen,
  onClose,
  allTags,
  selectedTagIds,
  onToggleTag,
  onCreateTag,
  title = "Manage Tags",
}: TagPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allTags;
    const query = searchQuery.toLowerCase();
    return allTags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

  const canCreateTag =
    searchQuery.trim() &&
    !allTags.some((t) => t.name.toLowerCase() === searchQuery.toLowerCase());

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setIsCreating(true);
    try {
      await onCreateTag(newTagName.trim());
      setNewTagName("");
      setSearchQuery("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!canCreateTag) return;
    setIsCreating(true);
    try {
      await onCreateTag(searchQuery.trim());
      setSearchQuery("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or create tags..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Tag List */}
        <ScrollArea className="h-[240px] -mx-4 px-4">
          <div className="space-y-1">
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                    "hover:bg-surface-hover",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color || "#6366f1" }}
                  />
                  <span className="flex-1 text-left text-sm truncate">{tag.name}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}

            {/* Quick create option */}
            {canCreateTag && (
              <button
                onClick={handleQuickCreate}
                disabled={isCreating}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-surface-hover text-primary"
              >
                <Plus className="w-4 h-4" />
                <span className="flex-1 text-left text-sm">
                  Create "{searchQuery.trim()}"
                </span>
              </button>
            )}

            {filteredTags.length === 0 && !canCreateTag && (
              <div className="text-center py-8 text-text-muted text-sm">
                No tags found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Create new tag section */}
        <div className="border-t border-border pt-4 -mx-4 px-4">
          <div className="text-xs font-medium text-text-subtle uppercase tracking-wider mb-2">
            Create New Tag
          </div>
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
            />
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
              size="sm"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
