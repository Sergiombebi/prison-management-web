import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "./icon";
import { t } from "@/lib/i18n/fr";

/** Panneau délimité par un filet. Pas d'ombre : le filet suffit. */
export function Panel({
  titre,
  sousTitre,
  actions,
  className,
  corpsClassName,
  style,
  children,
  flush,
}: {
  titre?: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  className?: string;
  corpsClassName?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Retire la marge intérieure — pour un tableau qui touche les bords. */
  flush?: boolean;
}) {
  return (
    <section
      style={style}
      className={cn("rounded-lg border border-hairline bg-surface", className)}
    >
      {(titre || actions) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-2.5">
          <div className="min-w-0">
            {titre && <h2 className="text-sm font-semibold text-ink">{titre}</h2>}
            {sousTitre && <p className="text-xs text-muted">{sousTitre}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && "p-4", corpsClassName)}>{children}</div>
    </section>
  );
}

/** Sur-titre en petites capitales espacées — le marqueur typographique du registre. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-2xs font-semibold uppercase tracking-[0.12em] text-faint",
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * État vide. Deux cas distincts, jamais une boîte blanche muette :
 * - « rien encore » : explique et propose l'action qui remplit ;
 * - « aucun résultat » : dit ce qui est filtré et propose d'effacer.
 */
export function EmptyState({
  icone = "file",
  titre,
  texte,
  action,
  className,
  compact,
}: {
  icone?: NomIcone;
  titre: string;
  texte?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <div className="grid size-10 place-items-center rounded-full border border-dashed border-rule text-faint">
        <Icon name={icone} size={18} />
      </div>
      <div className="max-w-sm">
        <p className="text-base font-medium text-ink">{titre}</p>
        {texte && <p className="mt-1 text-sm text-muted">{texte}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Bandeau signalant un écran dont la structure existe mais pas encore les données. */
export function ChantierNotice({ points }: { points: string[] }) {
  return (
    <div className="rounded-lg border border-dashed border-rule bg-raised px-4 py-3">
      <div className="flex items-start gap-3">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{t.etats.bientot}</p>
          <p className="mt-0.5 text-sm text-muted">{t.etats.bientotTexte}</p>
          {points.length > 0 && (
            <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-faint" aria-hidden>
                    —
                  </span>
                  <code className="font-mono text-2xs text-accent-ink">{p}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Paire libellé / valeur pour les fiches. */
export function DataPair({
  label,
  children,
  mono,
  className,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-2xs font-medium uppercase tracking-[0.08em] text-faint">{label}</dt>
      <dd className={cn("mt-0.5 break-words text-base text-ink", mono && "font-mono text-sm")}>
        {children}
      </dd>
    </div>
  );
}

/** Numéro d'écrou — typographie monospace, il se lit caractère par caractère. */
export function Ecrou({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-sm tracking-tight text-ink", className)}>
      {children}
    </span>
  );
}

/** Pastille d'identité à initiales (les photos ne sont pas encore servies par l'API). */
export function Avatar({
  initiales,
  taille = "md",
  className,
}: {
  initiales: string;
  taille?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dims = {
    sm: "size-7 text-2xs",
    md: "size-9 text-xs",
    lg: "size-14 text-base",
    xl: "size-24 text-xl",
  }[taille];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-md border border-hairline bg-sunken font-semibold tracking-wide text-muted",
        dims,
        className,
      )}
    >
      {initiales}
    </span>
  );
}
