import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, IconTile, type NomIcone } from "./icon";
import type { Messages } from "@/lib/i18n/fr";

type VarianteSurface = "plat" | "eleve" | "verre";

const SURFACES: Record<VarianteSurface, string> = {
  plat: "bg-surface border border-hairline shadow-e1",
  eleve: "bg-surface border border-hairline shadow-e2",
  verre: "verre border border-hairline shadow-e2",
};

/**
 * Panneau — la brique de mise en page.
 *
 * L'élévation se choisit avec `variante` : `plat` pour un contenu de fond,
 * `eleve` pour ce qui doit se détacher, `verre` pour les surfaces collantes.
 * `accent` ajoute un liseré dégradé sur le bord supérieur : à réserver au
 * panneau le plus important de l'écran.
 */
export function Panel({
  titre,
  sousTitre,
  actions,
  variante = "plat",
  accent,
  className,
  corpsClassName,
  style,
  children,
  flush,
}: {
  titre?: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  variante?: VarianteSurface;
  accent?: boolean;
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
      className={cn(
        "relative overflow-hidden rounded-lg",
        SURFACES[variante],
        accent && "filet-accent",
        className,
      )}
    >
      {(titre || actions) && (
        <header className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-4 py-2.5">
          <div className="min-w-0">
            {titre && <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink">{titre}</h2>}
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
        compact ? "gap-2 px-4 py-9" : "gap-3.5 px-6 py-16",
        className,
      )}
    >
      <div className="relative grid place-items-center">
        {/* Halo : donne une profondeur à l'icône sans ajouter de couleur */}
        <span
          aria-hidden
          className="absolute size-16 rounded-full bg-accent-soft blur-xl"
          style={{ animation: "sgp-halo 4s ease-in-out infinite" }}
        />
        <IconTile name={icone} size={22} className="relative size-14 rounded-2xl shadow-e1" />
      </div>
      <div className="max-w-sm">
        <p className="text-md font-medium tracking-[-0.01em] text-ink">{titre}</p>
        {texte && <p className="mt-1.5 text-sm leading-relaxed text-muted">{texte}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Bandeau signalant un écran dont la structure existe mais pas encore les données. */
export function ChantierNotice({ points, t }: { points: string[]; t: Pick<Messages, "etats"> }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-rule bg-raised px-4 py-3.5 shadow-e1">
      <div className="flex items-start gap-3">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{t.etats.bientot}</p>
          <p className="mt-0.5 text-sm text-muted">{t.etats.bientotTexte}</p>
          {points.length > 0 && (
            <ul className="mt-2.5 grid gap-1.5 text-xs text-muted sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 shrink-0 rounded-full bg-rule-strong" />
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
    sm: "size-7 text-2xs rounded-md",
    md: "size-9 text-xs rounded-md",
    lg: "size-14 text-base rounded-lg",
    xl: "size-24 text-xl rounded-xl",
  }[taille];

  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-hairline font-semibold tracking-wide text-muted shadow-e1",
        "bg-gradient-to-br from-raised to-sunken",
        dims,
        className,
      )}
    >
      {initiales}
    </span>
  );
}
