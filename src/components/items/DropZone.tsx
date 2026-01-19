import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (disabled) return;

    let unlistenDrop: (() => void) | undefined;
    let unlistenEnter: (() => void) | undefined;
    let unlistenLeave: (() => void) | undefined;

    const setupListeners = async () => {
      // Listen for file drops (Tauri v2 event)
      unlistenDrop = await listen<DragPayload>("tauri://drag-drop", (event) => {
        setIsDragOver(false);
        const paths = event.payload.paths;

        // Filter for images
        const imagePaths = paths.filter(path =>
          /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(path)
        );

        const skippedCount = paths.length - imagePaths.length;

        // Always report result even if empty
        if (paths.length > 0) {
          onFilesDropped(imagePaths, skippedCount);
        }
      });

      unlistenEnter = await listen<DragPayload>("tauri://drag-enter", () => {
        setIsDragOver(true);
      });

      unlistenLeave = await listen<null>("tauri://drag-leave", () => {
        setIsDragOver(false);
      });
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
      if (unlistenDrop) unlistenDrop();
      if (unlistenEnter) unlistenEnter();
      if (unlistenLeave) unlistenLeave();
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, [disabled, onFilesDropped]);

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
