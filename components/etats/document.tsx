import type { ReactNode } from "react";
import type { Parametres } from "@/lib/domain/types";
import { formatDateLongue } from "@/lib/format";

/**
 * Feuille d'état officielle, fidèle à la mise en page des documents imprimés du
 * desktop : double en-tête bilingue, titre centré, corps, lieu et date, signature.
 * Rendue en blanc et noir quel que soit le thème : c'est du papier.
 */
export function DocumentOfficiel({
  parametres,
  titre,
  reference,
  children,
  signataire = "Le Régisseur",
}: {
  parametres: Parametres;
  titre: string;
  reference?: string;
  children: ReactNode;
  signataire?: string;
}) {
  return (
    <article
      className="mx-auto w-full max-w-[210mm] rounded-sm bg-white px-8 py-10 text-[13px] leading-relaxed text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 animate-rise sm:px-14 print:max-w-none print:shadow-none print:ring-0"
      style={{ colorScheme: "light" }}
    >
      <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 text-center text-[10px] font-semibold uppercase leading-snug tracking-wide">
        <p className="whitespace-pre-line">{parametres.enteteGauche}</p>
        <div className="grid size-14 place-items-center rounded-full border border-neutral-400 font-mono text-[10px] text-neutral-500">
          LOGO
        </div>
        <p className="whitespace-pre-line">{parametres.enteteDroite}</p>
      </header>

      <div className="mt-6 flex items-center justify-between text-[11px] text-neutral-600">
        <span>{parametres.nomPrison}</span>
        {reference && <span className="font-mono">N° {reference}</span>}
      </div>

      <h2 className="mt-8 border-y-2 border-double border-neutral-800 py-2 text-center text-[15px] font-bold uppercase tracking-[0.18em]">
        {titre}
      </h2>

      <div className="mt-8">{children}</div>

      <footer className="mt-12 flex justify-end">
        <div className="text-center">
          <p>
            Fait à {parametres.ville}, le {formatDateLongue(new Date())}
          </p>
          <p className="mt-2 font-semibold uppercase tracking-wide">{signataire}</p>
          <div className="mt-16 h-px w-44 bg-neutral-400" />
        </div>
      </footer>
    </article>
  );
}

/** Ligne « libellé : valeur » en pointillés, comme sur un formulaire papier. */
export function LigneDocument({ label, valeur }: { label: string; valeur: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 py-1">
      <span className="shrink-0 text-neutral-600">{label}</span>
      <span className="min-w-6 flex-1 translate-y-[-3px] border-b border-dotted border-neutral-400" />
      <span className="max-w-[60%] text-right font-medium">{valeur}</span>
    </div>
  );
}
