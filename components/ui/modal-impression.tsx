"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/client-actions";
import { Icon } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";

/**
 * Aperçu d'un document avant impression : en-tête et boutons exclus du papier,
 * seul le contenu est imprimé.
 */
export function ModalImpression({
  open,
  onClose,
  titre,
  description,
  libelleImprimer = "Imprimer",
  className = "max-w-sm",
  children,
}: {
  open: boolean;
  onClose: () => void;
  titre: string;
  description: string;
  libelleImprimer?: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <Modale open={open} onClose={onClose} labelId={titleId} className={className} imprimable>
      <div data-print-hide className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-success/30 bg-success-soft text-success">
          <Icon name="check" size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {titre}
          </h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="overflow-y-auto print:overflow-visible">{children}</div>

      <div data-print-hide className="flex justify-end gap-2 border-t border-hairline pt-4">
        <Button type="button" variante="secondaire" onClick={onClose}>
          Fermer
        </Button>
        <PrintButton>{libelleImprimer}</PrintButton>
      </div>
    </Modale>
  );
}
