import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-shell";
import {
  X,
  Sun,
  Moon,
  Monitor,
  Folder,
  FolderOpen,
  Grid3X3,
  List,
  LayoutGrid,
  HardDrive,
  Trash2,
  ExternalLink,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { ViewMode, LibraryStats } from "@/types";

type Theme = "light" | "dark" | "system";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  libraryPath: string | null;
  stats: LibraryStats;
  // View preferences
  defaultViewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  defaultSortBy: string;
  defaultSortOrder: "ASC" | "DESC";
  onSortChange: (sortBy: string, sortOrder: "ASC" | "DESC") => void;
  // Library actions
  onChangeLibrary: () => void;
  onCloseLibrary: () => void;
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-subtle px-1">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

interface SettingRowProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  action?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

function SettingRow({ icon, label, description, action, onClick, danger }: SettingRowProps) {
  const content = (
    <>
      {icon && (
        <div className={cn("text-text-muted", danger && "text-danger")}>{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium", danger && "text-danger")}>{label}</div>
        {description && (
          <div className="text-xs text-text-subtle truncate">{description}</div>
        )}
      </div>
      {action}
      {onClick && !action && <ChevronRight size={16} className="text-text-subtle" />}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
          "hover:bg-surface-hover",
          danger && "hover:bg-danger/10"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
      {content}
    </div>
  );
}

interface ToggleGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}

function ToggleGroup<T extends string>({ value, onChange, options }: ToggleGroupProps<T>) {
  return (
    <div className="flex bg-surface rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
            value === option.value
              ? "bg-primary text-white shadow-sm"
              : "text-text-muted hover:text-text hover:bg-surface-hover"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({
  isOpen,
  onClose,
  libraryPath,
  stats,
  defaultViewMode,
  onViewModeChange,
  defaultSortBy,
  defaultSortOrder,
  onSortChange,
  onChangeLibrary,
  onCloseLibrary,
}: SettingsPanelProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem("inspo:theme");
    return (saved as Theme) || "system";
  });

  // Apply theme to document and persist
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("inspo:theme", theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleViewOnGitHub = async () => {
    await open("https://github.com/skylarkitchen/inspo-app");
  };

  const handleClearCache = async () => {
    // Clear thumbnail cache would require a Tauri command
    // For now, just show feedback
    alert("Cache clearing not yet implemented");
  };

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
          "fixed top-0 right-0 h-full w-[380px] bg-background border-l border-border z-50",
          "transform transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-3.5rem)]">
          <div className="p-4 space-y-6">
            {/* Appearance */}
            <SettingSection title="Appearance">
              <div className="px-3 py-2">
                <div className="text-sm font-medium mb-2">Theme</div>
                <ToggleGroup
                  value={theme}
                  onChange={handleThemeChange}
                  options={[
                    { value: "light", label: "Light", icon: <Sun size={14} /> },
                    { value: "dark", label: "Dark", icon: <Moon size={14} /> },
                    { value: "system", label: "System", icon: <Monitor size={14} /> },
                  ]}
                />
              </div>
            </SettingSection>

            <Separator />

            {/* View Preferences */}
            <SettingSection title="View Preferences">
              <div className="px-3 py-2">
                <div className="text-sm font-medium mb-2">Default View</div>
                <ToggleGroup
                  value={defaultViewMode}
                  onChange={onViewModeChange}
                  options={[
                    { value: "grid", label: "Grid", icon: <Grid3X3 size={14} /> },
                    { value: "list", label: "List", icon: <List size={14} /> },
                    { value: "masonry", label: "Masonry", icon: <LayoutGrid size={14} /> },
                  ]}
                />
              </div>
              <div className="px-3 py-2">
                <div className="text-sm font-medium mb-2">Sort Order</div>
                <div className="flex gap-2">
                  <select
                    value={defaultSortBy}
                    onChange={(e) => onSortChange(e.target.value, defaultSortOrder)}
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="created_at">Date Added</option>
                    <option value="updated_at">Date Modified</option>
                    <option value="title">Title</option>
                  </select>
                  <select
                    value={defaultSortOrder}
                    onChange={(e) => onSortChange(defaultSortBy, e.target.value as "ASC" | "DESC")}
                    className="bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="DESC">Newest</option>
                    <option value="ASC">Oldest</option>
                  </select>
                </div>
              </div>
            </SettingSection>

            <Separator />

            {/* Library */}
            <SettingSection title="Library">
              <SettingRow
                icon={<Folder size={18} />}
                label="Current Library"
                description={libraryPath || "No library open"}
              />
              <div className="grid grid-cols-3 gap-2 px-3 py-1">
                <div className="bg-surface rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-text">{stats.totalItems}</div>
                  <div className="text-xs text-text-subtle">Items</div>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-text">{stats.totalFolders}</div>
                  <div className="text-xs text-text-subtle">Folders</div>
                </div>
                <div className="bg-surface rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-text">{stats.totalTags}</div>
                  <div className="text-xs text-text-subtle">Tags</div>
                </div>
              </div>
              <SettingRow
                icon={<FolderOpen size={18} />}
                label="Change Library"
                description="Open a different library"
                onClick={onChangeLibrary}
              />
              <SettingRow
                icon={<Trash2 size={18} />}
                label="Close Library"
                description="Close the current library"
                onClick={onCloseLibrary}
                danger
              />
            </SettingSection>

            <Separator />

            {/* Storage */}
            <SettingSection title="Storage">
              <SettingRow
                icon={<HardDrive size={18} />}
                label="Cache"
                description="Thumbnail cache and temporary files"
                action={
                  <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearCache}>
                    Clear
                  </Button>
                }
              />
            </SettingSection>

            <Separator />

            {/* About */}
            <SettingSection title="About">
              <SettingRow
                icon={<Info size={18} />}
                label="Inspo"
                description="Version 0.1.0"
              />
              <SettingRow
                icon={<ExternalLink size={18} />}
                label="View on GitHub"
                onClick={handleViewOnGitHub}
              />
            </SettingSection>

            {/* Keyboard Shortcuts */}
            <Separator />
            <SettingSection title="Keyboard Shortcuts">
              <div className="px-3 py-2 space-y-2">
                <ShortcutRow keys={["⌘", "F"]} description="Search" />
                <ShortcutRow keys={["⌘", "N"]} description="New folder" />
                <ShortcutRow keys={["⌘", "⇧", "N"]} description="New tag" />
                <ShortcutRow keys={["⌘", "B"]} description="Add bookmark" />
                <ShortcutRow keys={["⌘", "I"]} description="Import files" />
                <ShortcutRow keys={["⌘", "1-4"]} description="Switch views" />
                <ShortcutRow keys={["⌘", ","]} description="Settings" />
                <ShortcutRow keys={["Esc"]} description="Close panel / Clear selection" />
              </div>
            </SettingSection>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-1.5 py-0.5 bg-surface border border-border rounded text-xs font-mono"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
