"use client";

import { useState } from "react";
import type { Parametres } from "@/lib/domain/types";
import type { DonneesTicket } from "@/lib/domain/ticket";
import { formatDate, formatDateLongue } from "@/lib/format";
import { LogoEtablissement } from "@/components/etats/logo-etablissement";
import { Button } from "@/components/ui/button";
import { ModalImpression } from "@/components/ui/modal-impression";

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
      className="mx-auto w-full max-w-[78mm] rounded-md bg-white p-4 text-neutral-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 print:rounded-none print:shadow-none print:ring-0"
      style={{ colorScheme: "light" }}
    >
      {/* Page à la taille du ticket lui-même : sans ça, l'impression (ou le PDF
          généré) part sur une feuille A4/Letter entière avec le ticket flottant
          dans un coin. `auto` en hauteur laisse la page s'ajuster au contenu. */}
      <style>{"@media print { @page { size: 80mm auto; margin: 0 } }"}</style>

      <header className="text-center">
        <p className="text-[8px] font-semibold uppercase leading-snug tracking-wide text-neutral-600">
          {parametres.nomPrison || "Établissement pénitentiaire"}
        </p>
        <LogoEtablissement url={parametres.logoUrl} className="mx-auto mt-1.5 size-10" sizes="40px" />
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
        <LigneTicket label="Cellule" valeur={ticket.detenuCellule} />
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

/** Aperçu du ticket avant impression, en fenêtre modale. */
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
  if (!ticket) return null;

  return (
    <ModalImpression
      open={open}
      onClose={onClose}
      titre="Visite enregistrée"
      description="Vérifiez le ticket avant de l’imprimer."
      libelleImprimer="Imprimer le ticket"
    >
      <TicketVisite ticket={ticket} parametres={parametres} />
    </ModalImpression>
  );
}

/** Bouton « Ticket » du registre, réduit à l'icône : rouvre l'aperçu si l'agent a oublié d'imprimer. */
export function BoutonTicket({ ticket, parametres }: { ticket: DonneesTicket; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="printer"
        title="Voir le ticket"
        aria-label="Voir le ticket"
        className="w-8 rounded-full border-0 !bg-accent-soft px-0 !text-accent shadow-none hover:!bg-accent/20"
        onClick={() => setOuvert(true)}
      />
      <TicketModal open={ouvert} ticket={ticket} parametres={parametres} onClose={() => setOuvert(false)} />
    </>
  );
}
