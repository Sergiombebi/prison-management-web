"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Parametres } from "@/lib/domain/types";
import type { DonneesTicket } from "@/lib/domain/ticket";
import { formatDate, formatDateLongue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PrintButton } from "@/components/ui/client-actions";

// La modale se porte sur `document.body`, absent côté serveur. Détecté avec
// useSyncExternalStore (jamais notifié : sa seule utilité est de forcer un
// second rendu, côté client, une fois l'hydratation passée) plutôt qu'un
// useState recopié dans un effet.
function useMonte(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Ligne « libellé / valeur » compacte, comme sur un billet imprimé. */
function LigneTicket({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="truncate text-right text-[11px] font-semibold text-neutral-900">{valeur || "—"}</span>
    </div>
  );
}

/**
 * Le ticket lui-même — format billet, pas feuille A4 : c'est ce que le visiteur
 * garde en main pour franchir les postes de contrôle suivants. Rendu en blanc et
 * noir quel que soit le thème, comme les autres documents officiels de l'app.
 */
export function TicketVisite({ ticket, parametres }: { ticket: DonneesTicket; parametres: Parametres }) {
  return (
    <article
      data-ticket
      className="mx-auto w-full max-w-[78mm] rounded-md bg-white p-4 text-neutral-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 print:max-w-none print:rounded-none print:shadow-none print:ring-0"
      style={{ colorScheme: "light" }}
    >
      <header className="text-center">
        <p className="text-[8px] font-semibold uppercase leading-snug tracking-wide text-neutral-600">
          {parametres.nomPrison || "Établissement pénitentiaire"}
        </p>
        <div className="mx-auto mt-1.5 grid size-8 place-items-center rounded-full border border-neutral-400 font-mono text-[7px] text-neutral-500">
          LOGO
        </div>
        <h2 className="mt-1.5 text-[13px] font-bold uppercase tracking-[0.14em]">Ticket de visite</h2>
      </header>

      <div className="my-3 border-t border-dashed border-neutral-300" />

      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wide text-neutral-500">N°</span>
        <span className="font-mono text-[13px] font-bold tracking-wide">VIS-{String(ticket.id).padStart(5, "0")}</span>
      </div>

      <div className="my-3 border-t border-dashed border-neutral-300" />

      <div className="flex flex-col">
        <LigneTicket label="Détenu" valeur={ticket.detenuNom} />
        <LigneTicket label="Écrou" valeur={ticket.detenuNumeroEcrou} />
        <LigneTicket label="Visiteur" valeur={ticket.nomVisiteur} />
        <LigneTicket label="Lien de parenté" valeur={ticket.lienParente} />
        <LigneTicket label="Pièce d’identité" valeur={`${ticket.typePieceIdentite} · ${ticket.numeroPieceIdentite}`} />
      </div>

      <div className="my-3 border-t border-dashed border-neutral-300" />

      <div className="flex flex-col">
        <LigneTicket label="Date" valeur={formatDate(ticket.dateVisite)} />
        <LigneTicket label="Arrivée" valeur={ticket.heureArrivee} />
        <LigneTicket label="Durée prévue" valeur={`${ticket.dureePrevueMinutes} min`} />
        <LigneTicket label="Parloir" valeur={ticket.typeVisite} />
        {ticket.lieuVisite && <LigneTicket label="Lieu" valeur={ticket.lieuVisite} />}
        <LigneTicket label="Agent de contrôle" valeur={ticket.agentControle} />
      </div>

      <div className="my-3 border-t border-dashed border-neutral-300" />

      <p className="text-center text-[8px] leading-relaxed text-neutral-500">
        À présenter à chaque poste de contrôle jusqu’à la sortie.
        <br />
        Émis le {formatDateLongue(new Date())}
      </p>
    </article>
  );
}

/**
 * Aperçu du ticket dans une fenêtre modale, portée directement sur `document.body` :
 * ainsi elle échappe à tout conteneur masqué à l'impression (page, panneau…) et seul
 * le ticket sort sur papier — l'en-tête et les boutons de la modale sont eux-mêmes
 * exclus de l'impression via `data-print-hide`.
 */
export function TicketModal({
  open,
  ticket,
  parametres,
  onClose,
}: {
  open: boolean;
  ticket: DonneesTicket | null;
  parametres: Parametres;
  onClose: () => void;
}) {
  const titleId = useId();
  const monte = useMonte();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!monte || !open || !ticket) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px] print:static print:block print:h-auto print:min-h-0 print:bg-transparent print:p-0 print:backdrop-blur-none"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-sm flex-col gap-4 overflow-hidden rounded-2xl border border-hairline bg-surface p-5 shadow-e4 print:max-h-none print:w-auto print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div data-print-hide className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-success/30 bg-success-soft text-success">
            <Icon name="check" size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-semibold text-ink">
              Visite enregistrée
            </h2>
            <p className="mt-1 text-sm text-muted">Vérifiez le ticket avant de l’imprimer.</p>
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

        <div className="overflow-y-auto print:overflow-visible">
          <TicketVisite ticket={ticket} parametres={parametres} />
        </div>

        <div data-print-hide className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={onClose}>
            Fermer
          </Button>
          <PrintButton>Imprimer le ticket</PrintButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Bouton « Ticket » du registre : rouvre l'aperçu si l'agent a oublié d'imprimer. */
export function BoutonTicket({ ticket, parametres }: { ticket: DonneesTicket; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="printer"
        onClick={() => setOuvert(true)}
      >
        Ticket
      </Button>
      <TicketModal open={ouvert} ticket={ticket} parametres={parametres} onClose={() => setOuvert(false)} />
    </>
  );
}
