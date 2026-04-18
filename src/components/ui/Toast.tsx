import { useEffect } from "react";
import { Avatar } from "./Avatar";

export interface ToastData {
  id: string;
  type: "mention" | "dm";
  senderName: string;
  senderAvatar: string | null;
  preview: string;
  onClick?: () => void;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      onClick={() => { toast.onClick?.(); onDismiss(toast.id); }}
      className="flex items-start gap-3 bg-overlay border border-divider rounded-lg p-3 shadow-xl cursor-pointer hover:bg-msg-hover transition-colors w-80 max-w-full"
    >
      <Avatar src={toast.senderAvatar} name={toast.senderName} size={36} className="shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-text-primary text-sm font-semibold">{toast.senderName}</p>
        <p className="text-text-muted text-xs truncate mt-0.5">
          {toast.type === "mention" ? "Mentioned you: " : ""}{toast.preview}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        className="text-text-muted hover:text-text-primary text-sm leading-none shrink-0 mt-0.5"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
