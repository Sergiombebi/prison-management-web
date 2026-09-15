import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

type Signal = "neutre" | "attention" | "critique" | "positif";

const SIGNAL_TEXTE: Record<Signal, string> = {
  neutre: "text-muted",
  attention: "text-warning",
  critique: "text-danger",
  positif: "text-success",
};

const SIGNAL_FILET: Record<Signal, string> = {
  neutre: "bg-transparent",
  attention: "bg-warning",
  critique: "bg-danger",
  positif: "bg-transparent",
};

/**
 * Indicateur chiffré. Un chiffre seul ne dit rien : chaque indicateur porte une
 * comparaison ou un contexte, et mène aux enregistrements qui le composent.
 */
export function Stat({
  label,
  valeur,
  unite,
  contexte,
  signal = "neutre",
  href,
  style,
  className,
}: {
  label: string;
  valeur: ReactNode;
  unite?: string;
  contexte?: ReactNode;
  signal?: Signal;
  href?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const contenu = (
    <>
      {/* Filet vertical : seul marqueur coloré, et seulement quand il y a lieu d'agir */}
      <span
        aria-hidden
        className={cn("absolute inset-y-3 left-0 w-0.5 rounded-full", SIGNAL_FILET[signal])}
      />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {href && (
          <Icon
            name="arrowRight"
            size={14}
            className="-translate-x-1 text-faint opacity-0 transition-all duration-[var(--dur-base)] ease-out group-hover:translate-x-0 group-hover:opacity-100"
          />
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-1 tnum">
        <span className="text-2xl font-semibold tracking-tight text-ink">{valeur}</span>
        {unite && <span className="text-base text-muted">{unite}</span>}
      </p>
      {contexte && <p className={cn("mt-1 text-xs", SIGNAL_TEXTE[signal])}>{contexte}</p>}
    </>
  );

  const classes = cn(
    "group relative block bg-surface px-4 py-3.5 transition-colors duration-[var(--dur-fast)]",
    href && "hover:bg-raised",
    className,
  );

  return href ? (
    <Link href={href} transitionTypes={["nav-forward"]} className={classes} style={style}>
      {contenu}
    </Link>
  ) : (
    <div className={classes} style={style}>
      {contenu}
    </div>
  );
}

/** Grille d'indicateurs séparés par des filets, comme les colonnes d'un registre. */
const COLONNES = {
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

export function StatGrid({
  children,
  colonnes = 6,
  className,
}: {
  children: ReactNode;
  colonnes?: keyof typeof COLONNES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "stagger grid overflow-hidden rounded-lg border border-hairline bg-hairline gap-px",
        COLONNES[colonnes],
        className,
      )}
    >
      {children}
    </div>
  );
}
