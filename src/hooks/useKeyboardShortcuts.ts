import { useEffect, useCallback, useRef } from "react";

interface KeyboardShortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  handler: () => void;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Allow the shortcut even when focused on an input */
  allowInInput?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook for handling global keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     { key: "f", meta: true, handler: focusSearch, preventDefault: true },
 *     { key: "n", meta: true, handler: createFolder, preventDefault: true },
 *     { key: "Escape", handler: closePanel },
 *   ],
 * });
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if we're in an input element
      const isInInput =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        const { key, meta, shift, ctrl, alt, handler, preventDefault, allowInInput } =
          shortcut;

        // Skip if we're in an input and the shortcut doesn't allow it
        if (isInInput && !allowInInput) continue;

        // Check if the key matches (case-insensitive for letters)
        const keyMatches =
          event.key.toLowerCase() === key.toLowerCase() || event.key === key;

        // Check modifiers
        const metaMatches = meta ? event.metaKey : !event.metaKey;
        const shiftMatches = shift ? event.shiftKey : !event.shiftKey;
        const ctrlMatches = ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatches = alt ? event.altKey : !event.altKey;

        if (keyMatches && metaMatches && shiftMatches && ctrlMatches && altMatches) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Platform-aware modifier key helper
 * Returns "⌘" on macOS, "Ctrl" on other platforms
 */
export function getModifierKey(): string {
  return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl";
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toLowerCase().includes("mac");

  if (shortcut.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (shortcut.key) {
    // Format special keys
    const keyMap: Record<string, string> = {
      Escape: "Esc",
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
      Backspace: "⌫",
      Delete: "⌦",
      Enter: "↵",
      Tab: "⇥",
    };
    parts.push(keyMap[shortcut.key] || shortcut.key.toUpperCase());
  }

  return parts.join(isMac ? "" : "+");
}
