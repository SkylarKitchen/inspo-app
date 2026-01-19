import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/types";

// Warm color palette matching the app aesthetic
const TAG_COLORS = [
  { name: "Terracotta", value: "#C75B3F" },
  { name: "Coral", value: "#E07A5F" },
  { name: "Sage", value: "#81B29A" },
  { name: "Sand", value: "#D4B483" },
  { name: "Lavender", value: "#9B8EC2" },
  { name: "Sky", value: "#7EB6D6" },
  { name: "Rose", value: "#D4A5A5" },
  { name: "Olive", value: "#8B9A6B" },
  { name: "Slate", value: "#6B7B8C" },
  { name: "Plum", value: "#9B6B8C" },
];

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  /** If provided, dialog is in edit mode */
  editTag?: Tag | null;
  title?: string;
}

// Inner form component that re-mounts when dialog opens, resetting state
function TagDialogForm({
  editTag,
  title,
  onSubmit,
  onClose,
}: {
  editTag?: Tag | null;
  title?: string;
  onSubmit: (name: string, color: string) => void;
  onClose: () => void;
}) {
  // Initialize state from editTag - this works because component remounts when dialog opens
  const [name, setName] = useState(editTag?.name || "");
  const [color, setColor] = useState(editTag?.color || TAG_COLORS[0].value);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), color);
    onClose();
  };

  const dialogTitle = title || (editTag ? "Edit Tag" : "Create New Tag");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dialogTitle}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tag name"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Color</label>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={cn(
                  "w-7 h-7 rounded-full transition-all duration-150",
                  "ring-offset-2 ring-offset-background",
                  "hover:scale-110",
                  color === c.value && "ring-2 ring-primary"
                )}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-muted">Preview</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-sidebar rounded-lg">
            <div
              className="w-2.5 h-2.5 rounded-full ring-1 ring-black/5"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">{name || "Tag name"}</span>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim()}>
          {editTag ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </>
  );
}

// Outer wrapper that controls the Dialog and conditionally renders form
export function TagDialog({
  isOpen,
  onClose,
  onSubmit,
  editTag,
  title,
}: TagDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px]">
        {isOpen && (
          <TagDialogForm
            editTag={editTag}
            title={title}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export { TAG_COLORS };
