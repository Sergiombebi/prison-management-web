/**
 * Jeu d'icônes SVG inline — trait 1.75px, grille 20×20, avec un remplissage teinté
 * (bicolore) sur les formes fermées pour donner du corps aux icônes.
 * Aucune dépendance : chaque icône est quelques chemins lisibles.
 */

import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

const CHEMINS = {
  dashboard: "M3 3h6v8H3zM11 3h6v5h-6zM11 10h6v7h-6zM3 13h6v4H3z",
  detenus:
    "M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 8.5a2.5 2.5 0 1 0 0-5M15.5 12c2 .4 3.5 2.2 3.5 4.5",
  discipline:
    "M10 2v16M5 18h10M3 6h14M3 6l-2 6a3 3 0 0 0 4 0L3 6zM17 6l-2 6a3 3 0 0 0 4 0l-2-6z",
  sante: "M10 17s-7-4.3-7-9.5A3.8 3.8 0 0 1 10 5a3.8 3.8 0 0 1 7 2.5C17 12.7 10 17 10 17zM7 9.5h1.5l1-2 1.5 4 1-2H14",
  etats: "M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 13h5M8 7h2",
  administration:
    "M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16.2 12a1.3 1.3 0 0 0 .3 1.4l.1.1a1.6 1.6 0 1 1-2.3 2.3l-.1-.1a1.3 1.3 0 0 0-2.2.9v.2a1.6 1.6 0 0 1-3.2 0v-.1a1.3 1.3 0 0 0-2.2-.9l-.1.1a1.6 1.6 0 1 1-2.3-2.3l.1-.1A1.3 1.3 0 0 0 3.4 11H3.2a1.6 1.6 0 0 1 0-3.2h.1a1.3 1.3 0 0 0 .9-2.2l-.1-.1a1.6 1.6 0 1 1 2.3-2.3l.1.1a1.3 1.3 0 0 0 1.4.3H8a1.3 1.3 0 0 0 .8-1.2v-.2a1.6 1.6 0 0 1 3.2 0v.1a1.3 1.3 0 0 0 2.2.9l.1-.1a1.6 1.6 0 1 1 2.3 2.3l-.1.1a1.3 1.3 0 0 0-.3 1.4V8a1.3 1.3 0 0 0 1.2.8h.2a1.6 1.6 0 0 1 0 3.2h-.1a1.3 1.3 0 0 0-1.2.8z",
  search: "M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zM17 17l-3.8-3.8",
  plus: "M10 4v12M4 10h12",
  chevronRight: "M8 5l5 5-5 5",
  chevronLeft: "M12 5l-5 5 5 5",
  chevronDown: "M5 8l5 5 5-5",
  arrowUp: "M10 16V4M5 9l5-5 5 5",
  arrowDown: "M10 4v12M5 11l5 5 5-5",
  arrowLeft: "M16 10H4M9 5l-5 5 5 5",
  arrowRight: "M4 10h12M11 5l5 5-5 5",
  sort: "M7 4v12M4 7l3-3 3 3M13 16V4M10 13l3 3 3-3",
  close: "M5 5l10 10M15 5L5 15",
  menu: "M3 6h14M3 10h14M3 14h14",
  logout: "M8 17H4V3h4M13 14l4-4-4-4M17 10H8",
  sun: "M10 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM10 1.5v2M10 16.5v2M3.5 10h-2M18.5 10h-2M5.4 5.4 4 4M16 16l-1.4-1.4M5.4 14.6 4 16M16 4l-1.4 1.4",
  moon: "M17 12.5A7 7 0 0 1 7.5 3a7 7 0 1 0 9.5 9.5z",
  monitor: "M2.5 3.5h15v10h-15zM7 17h6M10 13.5V17",
  alert: "M10 3 1.5 17h17L10 3zM10 8v4M10 14.5v.5",
  info: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 9v5M10 6.5v.5",
  check: "M4 10.5l4 4 8-9",
  clock: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 5.5V10l3 2",
  calendar: "M3 5h14v12H3zM3 9h14M7 3v4M13 3v4",
  door: "M4 18V2h9v16M13 4h3v14M10 10v.5M2 18h16",
  cell: "M3 3h14v14H3zM7 3v14M10 3v14M13 3v14",
  file: "M5 2h7l4 4v12H5zM12 2v4h4",
  printer: "M5 7V2h10v5M5 15H3V8h14v7h-2M5 12h10v6H5z",
  download: "M10 3v10M6 9l4 4 4-4M3 15v2h14v-2",
  filter: "M2.5 4h15l-6 7v5l-3 1.5V11z",
  user: "M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 18c0-3.5 3-6 7-6s7 2.5 7 6",
  shield: "M10 2 3 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5l-7-3z",
  lock: "M5 9h10v9H5zM7 9V6a3 3 0 0 1 6 0v3",
  eye: "M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6zM10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  eyeOff: "M3 3l14 14M8.2 5.2A8 8 0 0 1 10 5c5.5 0 8.5 5 8.5 5a14 14 0 0 1-2.2 2.8M5.4 6.7A13.6 13.6 0 0 0 1.5 10S4.5 15 10 15a8 8 0 0 0 3.2-.7M8.2 8.3a2.5 2.5 0 0 0 3.5 3.5",
  external: "M11 3h6v6M17 3l-8 8M14 11v6H3V6h6",
  pulse: "M1.5 10h4l2-5 4 10 2-5h5",
  scale: "M10 3v14M6 17h8M4 7h12M4 7l-2.5 5h5L4 7zM16 7l-2.5 5h5L16 7z",
  exit: "M11 3H4v14h7M14 13l3-3-3-3M17 10H8",
  more: "M4 10h.01M10 10h.01M16 10h.01",
  edit: "M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z",
  trash: "M3.5 5.5h13M8 5.5V3h4v2.5M5 5.5l.8 11.5h8.4L15 5.5",
} as const;

export type NomIcone = keyof typeof CHEMINS;

/** Icônes dont la forme fermée reçoit un aplat teinté. */
const BICOLORES = new Set<NomIcone>([
  "dashboard",
  "cell",
  "file",
  "etats",
  "calendar",
  "shield",
  "lock",
  "monitor",
  "user",
  "scale",
  "alert",
  "info",
  "clock",
]);

export type TonIcone = "accent" | "info" | "success" | "warning" | "danger" | "rose" | "teal";

const TONS: Record<TonIcone, string> = {
  accent: "bg-accent-soft text-accent ring-accent/20",
  info: "bg-info-soft text-info ring-info/25",
  success: "bg-success-soft text-success ring-success/25",
  warning: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/25",
  rose: "bg-[var(--sgp-viz-5-soft)] text-[var(--sgp-viz-5)] ring-[var(--sgp-viz-5)]/25",
  teal: "bg-[var(--sgp-viz-4-soft)] text-[var(--sgp-viz-4)] ring-[var(--sgp-viz-4)]/25",
};

/** Couleur propre à chaque domaine : un repère visuel constant d'un écran à l'autre. */
export const TON_PAR_ICONE: Partial<Record<NomIcone, TonIcone>> = {
  dashboard: "accent",
  detenus: "info",
  discipline: "warning",
  sante: "rose",
  door: "teal",
  etats: "accent",
  administration: "info",
  user: "info",
  cell: "warning",
  file: "accent",
  calendar: "info",
  pulse: "rose",
  scale: "warning",
  shield: "success",
  alert: "danger",
  printer: "accent",
  edit: "warning",
  eye: "info",
  trash: "danger",
  check: "success",
};

export const tonDe = (name: NomIcone): TonIcone => TON_PAR_ICONE[name] ?? "accent";

/** Icône sur pastille colorée, pour les repères visuels (navigation, indicateurs, états vides). */
export function IconTile({
  name,
  ton,
  size = 16,
  className,
}: {
  name: NomIcone;
  ton?: TonIcone;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-lg ring-1 ring-inset", TONS[ton ?? tonDe(name)], className)}
      style={{ width: size + 14, height: size + 14 }}
    >
      <Icon name={name} size={size} />
    </span>
  );
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: NomIcone;
  size?: number;
  /** Fournir un libellé rend l'icône signifiante ; sinon elle est décorative. */
  label?: string;
}

export function Icon({ name, size = 16, label, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      {BICOLORES.has(name) && <path d={CHEMINS[name]} fill="currentColor" fillOpacity={0.16} />}
      <path d={CHEMINS[name]} />
    </svg>
  );
}
