import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImportToastState {
  type: "importing" | "success" | "error" | "warning";
  message: string;
  details?: string;
}

interface ImportToastProps {
  toast: ImportToastState | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function ImportToast({ toast, onDismiss, autoDismissMs = 3000 }: ImportToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (toast) {
      setIsVisible(true);
      // Auto-dismiss for success/warning/error (not for importing state)
      if (toast.type !== "importing" && autoDismissMs > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onDismiss, 200); // Wait for animation
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [toast, autoDismissMs, onDismiss]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!toast) return null;

  const icons = {
    importing: <Loader2 className="w-5 h-5 animate-spin text-primary" />,
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-danger" />,
    warning: <XCircle className="w-5 h-5 text-amber-500" />,
  };

  const bgColors = {
    importing: "bg-surface border-primary/30",
    success: "bg-surface border-green-500/30",
    error: "bg-surface border-danger/30",
    warning: "bg-surface border-amber-500/30",
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
          bgColors[toast.type]
        )}
      >
        {icons[toast.type]}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">{toast.message}</span>
          {toast.details && (
            <span className="text-xs text-text-muted">{toast.details}</span>
          )}
        </div>
        {toast.type !== "importing" && (
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="ml-2 p-1 hover:bg-surface-hover rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>
    </div>
  );
}
