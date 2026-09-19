import Link from "next/link";
import type { Parametres } from "@/lib/domain/types";
import { formatDate, formatDateLongue } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { PrintButton } from "@/components/ui/client-actions";

export interface DonneesTicket {
  id: number;
  detenuNom: string;
  detenuNumeroEcrou: string;
  nomVisiteur: string;
  lienParente: string;
  typePieceIdentite: string;
  numeroPieceIdentite: string;
  dateVisite: string;
  heureArrivee: string;
  dureePrevueMinutes: string;
  typeVisite: string;
  lieuVisite: string;
  agentControle: string;
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
 * Écran affiché à la place du formulaire une fois la visite enregistrée : aperçu
 * du ticket avant impression, puis raccourci pour en saisir une autre.
 */
export function ConfirmationVisite({
  ticket,
  parametres,
}: {
  ticket: DonneesTicket;
  parametres: Parametres;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div data-print-hide className="flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-3.5 animate-rise">
        <Icon name="check" size={17} className="mt-0.5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Visite enregistrée</p>
          <p className="mt-1 text-sm text-muted">
            Voici l’aperçu du ticket à remettre au visiteur — vérifiez-le avant de l’imprimer.
          </p>
        </div>
      </div>

      <TicketVisite ticket={ticket} parametres={parametres} />

      <div data-print-hide className="flex flex-wrap justify-end gap-2 border-t border-hairline pt-4">
        <Link
          href="/sante/visites"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-hairline bg-surface px-4 text-sm text-ink shadow-e1 transition-colors hover:bg-raised"
        >
          <Icon name="plus" size={15} />
          Enregistrer une autre visite
        </Link>
        <PrintButton>Imprimer le ticket</PrintButton>
      </div>
    </div>
  );
}
