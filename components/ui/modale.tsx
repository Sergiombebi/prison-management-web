"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

// La modale se porte sur `document.body`, absent côté serveur. Détecté avec
// useSyncExternalStore (jamais notifié : il force juste un second rendu côté client,
// une fois l'hydratation passée) plutôt qu'un useState recopié dans un effet.
function useMonte(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Fenêtre modale portée sur `document.body` : elle échappe ainsi à tout conteneur
 * masqué à l'impression. Avec `imprimable`, fond et cadre s'effacent sur papier pour
 * ne laisser que le contenu (les zones à exclure portent `data-print-hide`).
 */
export function Modale({
  open,
  onClose,
  labelId,
  className,
  imprimable = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelId?: string;
  /** Largeur maximale du panneau, ex. `max-w-sm`. */
  className?: string;
  imprimable?: boolean;
  children: ReactNode;
}) {
  const monte = useMonte();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!monte || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[130] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]",
        imprimable && "print:static print:block print:h-auto print:min-h-0 print:bg-transparent print:p-0 print:backdrop-blur-none",
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className={cn(
          "flex max-h-[90vh] w-full flex-col gap-4 overflow-hidden rounded-2xl border border-hairline bg-surface p-5 shadow-e4",
          className,
          imprimable &&
            "print:max-h-none print:w-auto print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
