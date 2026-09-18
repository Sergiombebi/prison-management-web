"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Icon, type NomIcone } from "./icon";

export type ConfirmationVariant = "danger" | "primaire" | "secondaire";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  icon = "alert",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  icon?: NomIcone;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const panelTone =
    variant === "danger"
      ? "bg-danger-soft text-danger border-danger/20"
      : variant === "primaire"
        ? "bg-accent-soft text-accent border-accent/20"
        : "bg-surface text-ink border-hairline";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-0 text-ink shadow-e4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5">
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border text-lg", panelTone)}>
            <Icon name={icon} size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold leading-6 text-ink">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-6 text-muted">{description}</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-hairline bg-raised px-5 py-4">
          <Button type="button" variante="secondaire" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variante={variant === "danger" ? "danger" : variant === "primaire" ? "primaire" : "secondaire"}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  icon = "alert",
  onConfirm,
  className,
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  icon?: NomIcone;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante={variant === "danger" ? "danger" : variant === "primaire" ? "primaire" : "secondaire"}
        className={className}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <ConfirmationDialog
        open={open}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        variant={variant}
        icon={icon}
        onConfirm={async () => {
          await onConfirm();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
