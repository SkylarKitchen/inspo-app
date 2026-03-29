import { useState, useCallback, useEffect } from "react";
import { Link2, Clipboard, Loader2, ExternalLink, FolderTree, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as tauri from "@/lib/tauri";
import type { Item, Folder, Tag } from "@/types";

interface BookmarkImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (item: Item) => void;
  folders: Folder[];
  tags: Tag[];
  currentFolderId: string | null;
}

type FetchState = "idle" | "fetching" | "success" | "error";

export function BookmarkImportDialog({
  isOpen,
  onClose,
  onImported,
  folders,
  currentFolderId,
}: BookmarkImportDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [domain, setDomain] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setUrl("");
      setTitle("");
      setDescription("");
      setFolderId(currentFolderId);
      setFetchState("idle");
      setFetchError(null);
      setIsImporting(false);
      setDomain(null);
    }
  }, [isOpen, currentFolderId]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        setUrl(text);
      }
    } catch {
      // Clipboard permission denied or empty
    }
  }, []);

  const handleFetchMetadata = useCallback(async () => {
    if (!url.trim()) return;

    setFetchState("fetching");
    setFetchError(null);

    try {
      const metadata = await tauri.fetchBookmarkMetadata(url.trim());
      setTitle(metadata.title || "");
      setDescription(metadata.description || "");
      setDomain(metadata.domain);
      setFetchState("success");
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch metadata");
      setFetchState("error");
    }
  }, [url]);

  const handleImport = useCallback(async () => {
    if (!url.trim()) return;

    setIsImporting(true);

    try {
      const item = await tauri.importBookmark(
        url.trim(),
        title.trim() || undefined,
        description.trim() || undefined,
        folderId || undefined
      );
      onImported(item);
      onClose();
    } catch (err) {
      console.error("Failed to import bookmark:", err);
      setFetchError(err instanceof Error ? err.message : "Failed to import bookmark");
    } finally {
      setIsImporting(false);
    }
  }, [url, title, description, folderId, onImported, onClose]);

  const isValidUrl = useCallback((urlStr: string) => {
    try {
      new URL(urlStr);
      return true;
    } catch {
      return false;
    }
  }, []);

  const canFetch = url.trim() && isValidUrl(url.trim()) && fetchState !== "fetching";
  const canImport = url.trim() && isValidUrl(url.trim()) && !isImporting;

  // Flatten folders for dropdown
  const flattenFolders = (folders: Folder[], depth = 0): { folder: Folder; depth: number }[] => {
    const result: { folder: Folder; depth: number }[] = [];
    for (const folder of folders) {
      result.push({ folder, depth });
      result.push(...flattenFolders(folder.children, depth + 1));
    }
    return result;
  };

  const flatFolders = flattenFolders(folders);
  const selectedFolder = flatFolders.find((f) => f.folder.id === folderId)?.folder;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Import Bookmark
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              URL
            </label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handlePasteFromClipboard}
                title="Paste from clipboard"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Fetch Button */}
          <Button
            variant="outline"
            onClick={handleFetchMetadata}
            disabled={!canFetch}
            className="w-full"
          >
            {fetchState === "fetching" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching metadata...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Fetch Page Metadata
              </>
            )}
          </Button>

          {/* Domain Preview */}
          {domain && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <div className="w-4 h-4 rounded bg-surface-hover flex items-center justify-center">
                <Link2 className="w-3 h-3" />
              </div>
              {domain}
            </div>
          )}

          {/* Error Message */}
          {fetchError && (
            <div className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
              {fetchError}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={fetchState === "success" ? "(fetched from page)" : "Optional title"}
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={fetchState === "success" ? "(fetched from page)" : "Optional description"}
              className={cn(
                "w-full min-h-[80px] px-3 py-2 rounded-md border border-border bg-transparent",
                "text-sm text-text placeholder:text-text-muted",
                "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
                "resize-none"
              )}
            />
          </div>

          {/* Folder Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Folder
            </label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4" />
                    {selectedFolder?.name || "No folder (root)"}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full min-w-[300px] max-h-[300px] overflow-y-auto">
                <DropdownMenuItem onClick={() => setFolderId(null)}>
                  <span className="text-text-muted">No folder (root)</span>
                </DropdownMenuItem>
                {flatFolders.map(({ folder, depth }) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => setFolderId(folder.id)}
                    className={cn(folderId === folder.id && "bg-primary/10")}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Bookmark"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
