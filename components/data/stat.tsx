import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, IconTile, tonDe, type NomIcone } from "@/components/ui/icon";
import { formatPourcent } from "@/lib/format";
import { Compteur } from "./compteur";

type Signal = "neutre" | "attention" | "critique" | "positif";

const SIGNAL_TEXTE: Record<Signal, string> = {
  neutre: "text-muted",
  attention: "text-warning",
  critique: "text-danger",
  positif: "text-success",
};

const SIGNAL_PASTILLE: Record<Signal, string> = {
  neutre: "bg-[var(--sgp-viz-1)]",
  attention: "bg-warning",
  critique: "bg-danger",
  positif: "bg-success",
};

/**
 * Courbe de tendance miniature, sans axe ni échelle : une forme, pas une lecture.
 *
 * L'opacité vit dans le dégradé, jamais dans un attribut `opacity` : une animation
 * CSS l'emporterait sur l'attribut et l'aire virerait à l'aplat opaque.
 */
function Sparkline({
  points,
  couleur,
  identifiant,
}: {
  points: number[];
  couleur: string;
  identifiant: string;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const amplitude = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => 26 - ((v - min) / amplitude) * 21;

  const trace = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      aria-hidden
      className="h-9 w-full"
    >
      <defs>
        <linearGradient id={identifiant} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={couleur} stopOpacity="0.25" />
          <stop offset="100%" stopColor={couleur} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${trace} L100,30 L0,30 Z`} fill={`url(#${identifiant})`} />
      <path
        d={trace}
        fill="none"
        stroke={couleur}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pathLength={100}
        strokeDasharray={100}
        style={{ animation: "sgp-draw 900ms var(--ease-out) both", ["--draw-length" as string]: 100 }}
      />
    </svg>
  );
}

/** Puce d'évolution : une flèche, un pourcentage, et la période de comparaison. */
function Delta({ valeur, libelle }: { valeur: number; libelle?: string }) {
  const hausse = valeur >= 0;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-2xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
          hausse ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
        )}
      >
        <Icon name={hausse ? "arrowUp" : "arrowDown"} size={10} />
        {formatPourcent(Math.abs(valeur), 1)}
      </span>
      {libelle && <span className="text-muted">{libelle}</span>}
    </p>
  );
}

/**
 * Indicateur chiffré.
 *
 * Un chiffre seul ne dit rien : chaque indicateur porte une comparaison ou un
 * contexte, et mène aux enregistrements qui le composent. `nombre` fait
 * apparaître le chiffre en le composant ; `valeur` reste possible pour du texte
 * déjà mis en forme.
 */
export function Stat({
  label,
  icone,
  valeur,
  nombre,
  decimales = 0,
  unite,
  contexte,
  delta,
  deltaLibelle,
  signal = "neutre",
  sparkline,
  taille = "normale",
  href,
  style,
  className,
}: {
  label: string;
  icone?: NomIcone;
  valeur?: ReactNode;
  nombre?: number;
  decimales?: number;
  unite?: string;
  contexte?: ReactNode;
  /** Évolution en pourcentage par rapport à la période précédente. */
  delta?: number;
  deltaLibelle?: string;
  signal?: Signal;
  sparkline?: number[];
  taille?: "normale" | "grande";
  href?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const couleurCourbe =
    signal === "critique"
      ? "var(--sgp-danger)"
      : signal === "attention"
        ? "var(--sgp-warning)"
        : delta !== undefined && delta < 0
          ? "var(--sgp-danger)"
          : "var(--sgp-success)";

  const contenu = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-muted">
          {icone ? (
            <IconTile
              name={icone}
              size={14}
              ton={signal === "critique" ? "danger" : signal === "attention" ? "warning" : tonDe(icone)}
            />
          ) : (
            <span aria-hidden className={cn("size-1.5 rounded-full", SIGNAL_PASTILLE[signal])} />
          )}
          {label}
        </p>
        {href && (
          <Icon
            name="arrowRight"
            size={14}
            className="-translate-x-1 text-faint opacity-0 transition-all duration-[var(--dur-base)] ease-out group-hover:translate-x-0 group-hover:opacity-100"
          />
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-1 tnum">
        <span
          className={cn(
            "font-semibold tracking-[-0.035em] text-ink",
            taille === "grande" ? "text-3xl" : "text-2xl",
          )}
        >
          {nombre !== undefined ? <Compteur valeur={nombre} decimales={decimales} /> : valeur}
        </span>
        {unite && <span className="text-md font-medium text-muted">{unite}</span>}
      </p>

      {delta !== undefined && <Delta valeur={delta} libelle={deltaLibelle} />}

      {contexte && (
        <p className={cn("mt-1.5 text-xs", SIGNAL_TEXTE[signal])}>{contexte}</p>
      )}

      {sparkline && (
        <div className="mt-3">
          <Sparkline
            points={sparkline}
            couleur={couleurCourbe}
            identifiant={`spark-${label.replace(/[^a-zA-Z0-9]/g, "")}`}
          />
        </div>
      )}
    </>
  );

  const classes = cn(
    "group relative flex flex-col overflow-hidden rounded-lg border border-hairline bg-surface shadow-e1",
    taille === "grande" ? "px-5 py-5" : "px-4 py-4",
    href && "lift hover:border-accent/30",
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

const COLONNES = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
} as const;

/** Grille d'indicateurs — cartes détachées, chacune posée sur le fond. */
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
    <div className={cn("stagger grid gap-3", COLONNES[colonnes], className)}>{children}</div>
  );
}
