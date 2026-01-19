import { useState, useEffect } from "react";
import { Folder, Sparkles, Clock, X, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { open } from "@tauri-apps/plugin-dialog";
import { initLibrary, openLibrary } from "@/lib/tauri";

interface RecentLibrary {
  path: string;
  name: string;
  lastOpened: number;
}

const RECENT_LIBRARIES_KEY = "inspo:recent-libraries";
const MAX_RECENT_LIBRARIES = 5;

function getRecentLibraries(): RecentLibrary[] {
  try {
    const stored = localStorage.getItem(RECENT_LIBRARIES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentLibrary[];
  } catch {
    return [];
  }
}

function saveRecentLibrary(path: string): void {
  const recent = getRecentLibraries();
  const name = path.split("/").pop() || path;

  // Remove if already exists
  const filtered = recent.filter((lib) => lib.path !== path);

  // Add to front
  const updated: RecentLibrary[] = [
    { path, name, lastOpened: Date.now() },
    ...filtered,
  ].slice(0, MAX_RECENT_LIBRARIES);

  localStorage.setItem(RECENT_LIBRARIES_KEY, JSON.stringify(updated));
}

function removeRecentLibrary(path: string): RecentLibrary[] {
  const recent = getRecentLibraries();
  const updated = recent.filter((lib) => lib.path !== path);
  localStorage.setItem(RECENT_LIBRARIES_KEY, JSON.stringify(updated));
  return updated;
}

interface SetupWizardProps {
  onComplete: (libraryPath: string) => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentLibraries, setRecentLibraries] = useState<RecentLibrary[]>([]);

  useEffect(() => {
    setRecentLibraries(getRecentLibraries());
  }, []);

  const handleCreateNew = async () => {
    setIsLoading(true);
    setError(null);

    // Check if running in Tauri context by checking for the invoke function
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    const hasTauri = typeof window.__TAURI_INTERNALS__?.invoke === "function";
    if (!hasTauri) {
      setError("Not running in Tauri context. Please use the native desktop app window, not the browser preview at localhost:5173.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Opening directory picker...");
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose location for your Inspo library",
      });

      console.log("Directory picker returned:", selected);

      if (selected && typeof selected === "string") {
        const libraryPath = `${selected}/Inspo Library.inspo`;
        console.log("Creating library at:", libraryPath);
        await initLibrary(libraryPath);
        console.log("Library created successfully!");
        saveRecentLibrary(libraryPath);
        onComplete(libraryPath);
      } else {
        console.log("No directory selected (user cancelled)");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Log full error details for debugging
      console.error("Create library error:", err);
      console.error("Error type:", typeof err);
      console.error("Error JSON:", JSON.stringify(err, null, 2));
      setError(`Failed to create library: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenExisting = async () => {
    setIsLoading(true);
    setError(null);

    // Check if running in Tauri context
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    const hasTauri = typeof window.__TAURI_INTERNALS__?.invoke === "function";
    if (!hasTauri) {
      setError("Not running in Tauri context. Please use the native desktop app window, not the browser preview at localhost:5173.");
      setIsLoading(false);
      return;
    }

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Open existing Inspo library",
      });

      if (selected && typeof selected === "string") {
        await openLibrary(selected);
        saveRecentLibrary(selected);
        onComplete(selected);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open library");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenRecent = async (path: string) => {
    setLoadingPath(path);
    setError(null);

    try {
      await openLibrary(path);
      saveRecentLibrary(path);
      onComplete(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("not found") || message.includes("No such file")) {
        setError(`Library not found at "${path}". It may have been moved or deleted.`);
      } else {
        setError(`Failed to open library: ${message}`);
      }
    } finally {
      setLoadingPath(null);
    }
  };

  const handleRemoveRecent = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = removeRecentLibrary(path);
    setRecentLibraries(updated);
  };

  const anyLoading = isLoading || loadingPath !== null;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Titlebar drag region */}
      <div className="h-8 titlebar-drag-region flex-shrink-0" />

      <div className="flex-1 flex items-center justify-center overflow-auto">
        <div className="max-w-md w-full p-8">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text mb-2">Welcome to Inspo</h1>
          <p className="text-text-muted">
            Your local-first design inspiration library
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button
            onClick={handleCreateNew}
            disabled={anyLoading}
            className="w-full h-14 text-base justify-start px-4"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mr-3">
              <Folder className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium">Create New Library</div>
              <div className="text-xs opacity-70">Start fresh with a new collection</div>
            </div>
          </Button>

          <Button
            onClick={handleOpenExisting}
            disabled={anyLoading}
            variant="secondary"
            className="w-full h-14 text-base justify-start px-4"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center mr-3">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-medium">Open Existing Library</div>
              <div className="text-xs opacity-70">
                Open a library you've created before
              </div>
            </div>
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Recent Libraries */}
        {recentLibraries.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-text-muted" />
              <h3 className="text-sm font-medium text-text-muted">Recent Libraries</h3>
            </div>
            <div className="space-y-2">
              {recentLibraries.map((lib) => {
                const isLoadingThis = loadingPath === lib.path;
                return (
                  <div
                    key={lib.path}
                    role="button"
                    tabIndex={anyLoading ? -1 : 0}
                    onClick={() => !anyLoading && handleOpenRecent(lib.path)}
                    onKeyDown={(e) => {
                      if (!anyLoading && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleOpenRecent(lib.path);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg bg-surface hover:bg-surface-hover transition-colors text-left group cursor-pointer ${anyLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {isLoadingThis ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FolderOpen className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-text truncate">
                        {lib.name}
                      </div>
                      <div className="text-xs text-text-subtle truncate">
                        {lib.path}
                      </div>
                    </div>
                    {!isLoadingThis && (
                      <button
                        onClick={(e) => handleRemoveRecent(lib.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-active transition-opacity"
                        title="Remove from recent"
                      >
                        <X className="w-4 h-4 text-text-muted" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-border">
          <h3 className="text-sm font-medium text-text-muted mb-4 text-center">
            What you can do with Inspo
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              <span className="text-text-muted">Save design inspiration</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              <span className="text-text-muted">Organize with folders</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              <span className="text-text-muted">Save bookmarks & URLs</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
              <span className="text-text-muted">Tag and search</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
