import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFilesDropped: (paths: string[], skippedCount: number) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DropZone({ onFilesDropped, children, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setDragCounter] = useState(0);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((c) => c + 1);
      if (e.dataTransfer.types.includes("Files")) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setDragCounter((c) => {
        const newCount = c - 1;
        if (newCount === 0) {
          setIsDragOver(false);
        }
        return newCount;
      });
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setIsDragOver(false);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);

      // Filter for image files
      const imageFiles = files.filter((file) =>
        file.type.startsWith("image/") ||
        /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name)
      );

      const skippedCount = files.length - imageFiles.length;

      // In Tauri, we need to get the file paths
      // The File objects from drag-drop have a path property in Tauri
      const paths = imageFiles.map((file) => {
        // @ts-expect-error - Tauri adds path property to File objects
        return file.path || file.name;
      });

      // Always call onFilesDropped to report results (including when no valid images)
      onFilesDropped(paths, skippedCount);
    },
    [disabled, onFilesDropped]
  );

  return (
    <div
      className="relative flex-1 flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-primary" />
            <p className="text-lg font-medium text-primary">Drop images here</p>
            <p className="text-sm text-text-muted mt-1">
              Release to import images into your library
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
