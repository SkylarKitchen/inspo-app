import { useState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { listen } from "@tauri-apps/api/event";

interface DropZoneProps {
  onFilesDropped: (paths: string[], skippedCount: number) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

interface DragPayload {
  paths: string[];
  position: { x: number; y: number };
}

export function DropZone({ onFilesDropped, children, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  // Use ref to store callback so listener doesn't need to be re-registered
  const onFilesDroppedRef = useRef(onFilesDropped);

  // Update ref in effect to avoid lint warning about ref access during render
  useEffect(() => {
    onFilesDroppedRef.current = onFilesDropped;
  }, [onFilesDropped]);

  useEffect(() => {
    if (disabled) return;

    let isCancelled = false;
    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    const setupListeners = async () => {
      // Listen for file drops (Tauri v2 event)
      const dropUnlisten = await listen<DragPayload>("tauri://drag-drop", (event) => {
        if (isCancelled) return;
        setIsDragOver(false);
        const paths = event.payload.paths;

        // Filter for images
        const imagePaths = paths.filter(path =>
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(path)
        );

        const skippedCount = paths.length - imagePaths.length;

        // Always report result even if empty
        if (paths.length > 0) {
          onFilesDroppedRef.current(imagePaths, skippedCount);
        }
      });
      if (isCancelled) { dropUnlisten(); return; }
      unlistenDrop = dropUnlisten;

      const enterUnlisten = await listen<DragPayload>("tauri://drag-enter", () => {
        if (isCancelled) return;
        setIsDragOver(true);
      });
      if (isCancelled) { enterUnlisten(); return; }
      unlistenEnter = enterUnlisten;

      const leaveUnlisten = await listen<null>("tauri://drag-leave", () => {
        if (isCancelled) return;
        setIsDragOver(false);
      });
      if (isCancelled) { leaveUnlisten(); return; }
      unlistenLeave = leaveUnlisten;
    };

    setupListeners();

    // Prevent default browser behavior for drag/drop
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    return () => {
      isCancelled = true;
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, [disabled]); // Remove onFilesDropped from deps - use ref instead

  return (
    <div className="relative flex-1 flex flex-col">
      {children}

      {/* Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-primary animate-bounce" />
            <p className="text-lg font-medium text-primary">Drop images here</p>
            <p className="text-sm text-text-muted mt-1">
              Release to import into library
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
