import type { ReactNode } from "react";
import type { Parametres } from "@/lib/domain/types";
import { cn } from "@/lib/cn";
import { formatDateLongue } from "@/lib/format";
import { LogoEtablissement } from "@/components/etats/logo-etablissement";

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
  className,
}: {
  parametres: Parametres;
  titre: string;
  reference?: string;
  children: ReactNode;
  signataire?: string;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "mx-auto w-full max-w-[210mm] rounded-sm bg-white px-8 py-10 text-[13px] leading-relaxed text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 animate-rise sm:px-14 print:max-w-none print:shadow-none print:ring-0",
        className,
      )}
      style={{ colorScheme: "light" }}
    >
      <header className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 text-center text-[10px] font-semibold uppercase leading-snug tracking-wide">
        <p className="whitespace-pre-line">{parametres.enteteGauche}</p>
        <LogoEtablissement url={parametres.logoUrl} className="size-16" />
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

/**
 * Attestation solennelle, présentée comme un diplôme : format portrait, double
 * cadre, ornements d'angle, typographie à empattements, sceau et signature.
 */
export function AttestationOfficielle({
  parametres,
  reference,
  children,
  signataire = "Le Régisseur",
}: {
  parametres: Parametres;
  reference?: string;
  children: ReactNode;
  signataire?: string;
}) {
  const coins = [
    "left-2 top-2",
    "right-2 top-2 rotate-90",
    "bottom-2 right-2 rotate-180",
    "bottom-2 left-2 -rotate-90",
  ];
  return (
    <article
      className="relative mx-auto flex min-h-[620px] w-full max-w-[210mm] bg-[#fffdf7] p-3 font-serif text-neutral-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 animate-rise print:h-[297mm] print:min-h-0 print:w-[210mm] print:max-w-none print:overflow-hidden print:break-inside-avoid print:shadow-none print:ring-0"
      style={{ colorScheme: "light" }}
    >
      <style>{"@media print { @page { size: A4 portrait; margin: 0 } }"}</style>
      <div className="relative flex flex-1 flex-col border-[5px] border-double border-[#8a6d2f] p-2">
        <div className="relative flex flex-1 flex-col items-center border border-[#8a6d2f] px-[7%] py-[5%] text-center">
          {coins.map((c) => (
            <span key={c} aria-hidden className={`absolute size-7 border-l-2 border-t-2 border-[#8a6d2f] ${c}`} />
          ))}

          <header className="grid w-full grid-cols-[1fr_auto_1fr] items-start gap-4 text-[10px] font-semibold uppercase leading-snug tracking-wide">
            <p className="whitespace-pre-line">{parametres.enteteGauche}</p>
            <LogoEtablissement url={parametres.logoUrl} className="size-[72px]" sizes="72px" />
            <p className="whitespace-pre-line">{parametres.enteteDroite}</p>
          </header>

          <p className="mt-3 text-[13px] uppercase tracking-[0.25em] text-[#8a6d2f]">{parametres.nomPrison}</p>

          <h2 className="mt-4 text-[clamp(24px,4.2vw,36px)] print:text-[34px] font-bold uppercase tracking-[0.12em] text-[#5b4514]">
            Attestation de détention
          </h2>
          <div className="mt-3 flex items-center gap-3 text-[#8a6d2f]" aria-hidden>
            <span className="h-px w-24 bg-[#8a6d2f]" />
            <span>◆</span>
            <span className="h-px w-24 bg-[#8a6d2f]" />
          </div>
          {reference && <p className="mt-2 font-mono text-[11px] text-neutral-500">N° {reference}</p>}

          <div className="mt-6 flex flex-1 items-center text-[clamp(15px,2.2vw,19px)] leading-[1.8] print:text-[19px]">{children}</div>

          <footer className="mt-4 flex w-full items-end justify-between text-[14px]">
            <div
              aria-hidden
              className="grid size-20 place-items-center rounded-full border-2 border-double border-[#8a6d2f] text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-[#8a6d2f]"
            >
              Sceau de
              <br />
              l’établissement
            </div>
            <div className="text-center">
              <p className="italic">
                Fait à {parametres.ville}, le {formatDateLongue(new Date())}
              </p>
              <p className="mt-1 font-semibold uppercase tracking-[0.15em]">{signataire}</p>
              <div className="mt-8 h-px w-48 bg-neutral-500" />
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
}
