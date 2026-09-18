"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "./icon";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

export type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_STYLES: Record<ToastType, { accent: string; surface: string; icon: NomIcone }> = {
  success: {
    accent: "text-success bg-success-soft border-success/20",
    surface: "border-success/20 bg-success-soft/60",
    icon: "check",
  },
  error: {
    accent: "text-danger bg-danger-soft border-danger/20",
    surface: "border-danger/20 bg-danger-soft/60",
    icon: "alert",
  },
  info: {
    accent: "text-info bg-info-soft border-info/20",
    surface: "border-info/20 bg-info-soft/60",
    icon: "info",
  },
  warning: {
    accent: "text-warning bg-warning-soft border-warning/20",
    surface: "border-warning/20 bg-warning-soft/60",
    icon: "alert",
  },
};

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
      {toasts.map((toast) => {
        const tone = TYPE_STYLES[toast.type ?? "info"];

        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto animate-rise overflow-hidden rounded-xl border bg-surface/95 text-ink shadow-e3 backdrop-blur-sm",
              tone.surface,
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3 p-3.5">
              <div className={cn("grid size-8 shrink-0 place-items-center rounded-lg border border-current/10", tone.accent)}>
                <Icon name={tone.icon} size={15} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-ink">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-5 text-muted">{toast.description}</p>
                )}

                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    onClick={toast.onAction}
                    className="mt-2 inline-flex items-center rounded-md border border-current/10 bg-white/25 px-2.5 py-1 text-[11px] font-medium text-ink transition hover:bg-white/40"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>

              <button
                type="button"
                aria-label="Fermer la notification"
                onClick={() => onDismiss(toast.id)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-black/5 hover:text-ink"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRef = useRef<Record<string, number>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    if (timeoutRef.current[id]) {
      window.clearTimeout(timeoutRef.current[id]);
      delete timeoutRef.current[id];
    }
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const next = { ...toast, id, type: toast.type ?? "info" };

      setToasts((current) => [next, ...current].slice(0, 4));

      const duration = toast.duration ?? 4200;
      if (duration > 0) {
        timeoutRef.current[id] = window.setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss],
  );

  const dismissAll = useCallback(() => {
    Object.keys(timeoutRef.current).forEach((id) => {
      window.clearTimeout(timeoutRef.current[id]);
      delete timeoutRef.current[id];
    });
    setToasts([]);
  }, []);

  useEffect(() => {
    return () => {
      Object.keys(timeoutRef.current).forEach((id) => {
        window.clearTimeout(timeoutRef.current[id]);
        delete timeoutRef.current[id];
      });
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss, dismissAll }), [dismiss, dismissAll, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast doit être utilisé à l’intérieur de <ToastProvider />");
  }

  return context;
}
