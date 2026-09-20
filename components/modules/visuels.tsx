import Link from "next/link";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { formatNombre, formatPourcent } from "@/lib/format";

/**
 * Les visuels propres à chaque module — ce qui fait qu'on reconnaît l'écran sans
 * lire son titre. Chacun n'existe qu'à un seul endroit et raconte une seule chose.
 */

// ---------------------------------------------------------------------------
// Détenus — la bande des catégories pénales
// ---------------------------------------------------------------------------

/**
 * Une seule barre, découpée en catégories pénales.
 *
 * Une bande plutôt que cinq barres séparées : ce qui compte est la composition de
 * la population, pas la comparaison de cinq valeurs. Chaque segment se déplie à sa
 * largeur, de gauche à droite.
 */
export function BandeCategories({
  segments,
  total,
}: {
  segments: { label: string; valeur: number; couleur: string; href: string; aide?: string }[];
  total: number;
}) {
  const visibles = segments.filter((s) => s.valeur > 0);

  return (
    <div>
      <div
        role="img"
        aria-label={`Répartition de ${formatNombre(total)} détenus par catégorie pénale`}
        className="flex h-9 w-full gap-0.5 overflow-hidden rounded-lg bg-sunken"
      >
        {visibles.length === 0 ? (
          <span className="grid w-full place-items-center text-2xs text-muted">
            Aucun mandat actif
          </span>
        ) : (
          visibles.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              title={`${s.label} — ${formatNombre(s.valeur)} (${formatPourcent((s.valeur / total) * 100, 0)})`}
              className="group relative min-w-[3px] first:rounded-l-lg last:rounded-r-lg"
              style={
                {
                  flexGrow: s.valeur,
                  backgroundColor: s.couleur,
                  "--part": 1,
                  "--i": i,
                } as CSSProperties
              }
            >
              <span
                aria-hidden
                className="jauge absolute inset-0 origin-left rounded-[inherit] bg-[inherit]"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-[inherit] bg-white/0 transition-colors duration-[var(--dur-fast)] group-hover:bg-white/20"
              />
            </Link>
          ))
        )}
      </div>

      <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {segments.map((s, i) => (
          <li key={s.label} style={{ ["--i" as string]: i }}>
            <Link
              href={s.href}
              className="group flex items-baseline gap-2 rounded-sm py-0.5 text-sm"
              title={s.aide}
            >
              <span
                aria-hidden
                className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                style={{ backgroundColor: s.couleur }}
              />
              <span className="min-w-0 flex-1 truncate text-muted transition-colors group-hover:text-ink">
                {s.label}
              </span>
              <span className="tnum shrink-0 font-semibold text-ink">{s.valeur}</span>
              <span className="tnum w-11 shrink-0 text-right text-2xs text-faint">
                {total > 0 ? formatPourcent((s.valeur / total) * 100, 0) : "—"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Discipline — le plan des cellules
// ---------------------------------------------------------------------------

export interface TuileCellule {
  id: number;
  numero: string;
  bloc: string | null;
  effectif: number;
  capacite: number;
}

/**
 * Plan de l'établissement : une tuile par cellule, colorée par son remplissage.
 *
 * C'est la forme qui répond le plus vite à « où reste-t-il de la place ? » — un
 * tableau de huit lignes obligerait à comparer des nombres. Les tuiles s'allument
 * en cascade, dans l'ordre du plan.
 */
export function PlanCellules({ cellules }: { cellules: TuileCellule[] }) {
  return (
    <div className="allume grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
      {cellules.map((c, i) => {
        const ratio = c.capacite > 0 ? c.effectif / c.capacite : 0;
        const pleine = ratio >= 1;
        const tendue = ratio >= 0.8;
        const libres = c.capacite - c.effectif;

        return (
          <Link
            key={c.id}
            href={`/discipline/cellules/${c.id}`}
            style={{ ["--i" as string]: i }}
            title={`Cellule ${c.numero}${c.bloc ? ` · bloc ${c.bloc}` : ""} — ${c.effectif} sur ${c.capacite}`}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-lg border p-2.5",
              "transition-[border-color,transform] duration-[var(--dur-base)] hover:-translate-y-0.5",
              pleine
                ? "border-danger/30 hover:border-danger/60"
                : tendue
                  ? "border-warning/30 hover:border-warning/60"
                  : "border-hairline hover:border-[color:var(--teinte)]/50",
            )}
          >
            {/* Le remplissage monte depuis le bas, à la hauteur du taux d'occupation */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 origin-bottom transition-[height] duration-[var(--dur-move)]"
              style={{
                height: `${Math.min(ratio, 1) * 100}%`,
                backgroundColor: pleine
                  ? "var(--sgp-danger-soft)"
                  : tendue
                    ? "var(--sgp-warning-soft)"
                    : "var(--voile)",
              }}
            />
            <span className="relative flex items-baseline justify-between gap-1">
              <span className="truncate font-mono text-xs font-semibold text-ink">{c.numero}</span>
              {c.bloc && <span className="shrink-0 text-2xs text-faint">{c.bloc}</span>}
            </span>
            <span className="relative mt-2 flex items-baseline gap-1">
              <span
                className={cn(
                  "tnum text-lg font-semibold leading-none",
                  pleine ? "text-danger" : tendue ? "text-warning" : "text-ink",
                )}
              >
                {c.effectif}
              </span>
              <span className="text-2xs text-muted">/ {c.capacite}</span>
            </span>
            <span
              className={cn(
                "relative mt-0.5 text-2xs",
                pleine ? "text-danger" : libres <= 1 ? "text-warning" : "text-muted",
              )}
            >
              {pleine ? "complète" : `${libres} libre${libres > 1 ? "s" : ""}`}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suivi médical — la courbe d'activité de l'infirmerie
// ---------------------------------------------------------------------------

/**
 * Activité des derniers jours, tracée comme un relevé : la ligne se dessine de
 * gauche à droite et le dernier point bat, parce que c'est aujourd'hui.
 */
export function Impulsions({
  points,
  legende,
}: {
  points: { label: string; valeur: number }[];
  legende: string;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.valeur), 1);
  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => 34 - (v / max) * 28;

  const trace = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.valeur).toFixed(2)}`)
    .join(" ");
  const dernier = points[points.length - 1];
  const total = points.reduce((s, p) => s + p.valeur, 0);

  return (
    <figure className="relative m-0">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={legende}
        className="h-28 w-full"
      >
        <defs>
          <linearGradient id="sgp-impulsions" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--teinte)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--teinte)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Trois repères horizontaux, assez pâles pour ne pas concurrencer la ligne */}
        {[0, 0.5, 1].map((r) => (
          <line
            key={r}
            x1="0"
            x2="100"
            y1={34 - r * 28}
            y2={34 - r * 28}
            stroke="var(--sgp-hairline)"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={`${trace} L100,40 L0,40 Z`} fill="url(#sgp-impulsions)" />
        <path
          d={trace}
          fill="none"
          stroke="var(--teinte)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={100}
          strokeDasharray={100}
          style={{
            animation: "sgp-draw 1100ms var(--ease-soft) both",
            ["--draw-length" as string]: 100,
          }}
        />
      </svg>

      {/*
        Le point du jour vit hors du SVG : avec preserveAspectRatio="none", la grille
        est étirée horizontalement et un <circle> y deviendrait une ellipse large.
        Positionné en pourcentages, il reste rond quelle que soit la largeur.
      */}
      <span
        aria-hidden
        className="pointer-events-none absolute grid size-2.5 -translate-x-1/2 -translate-y-1/2 place-items-center"
        style={{ left: "100%", top: `${(y(dernier.valeur) / 40) * 100}%` }}
      >
        <span
          className="onde absolute size-2.5 rounded-full"
          style={{ backgroundColor: "var(--teinte)" }}
        />
        <span
          className="size-2.5 rounded-full ring-2 ring-[var(--sgp-surface)]"
          style={{ backgroundColor: "var(--teinte)" }}
        />
      </span>

      <figcaption className="mt-2 flex justify-between text-2xs text-faint">
        <span>{points[0].label}</span>
        {total === 0 ? (
          <span className="text-muted">Aucune consultation sur la période</span>
        ) : (
          <span className="font-medium text-muted">
            {dernier.label} · {dernier.valeur}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Visites — le rythme de la semaine
// ---------------------------------------------------------------------------

/**
 * Sept colonnes, une par jour. Le jour courant est marqué : c'est la question
 * qu'on se pose devant un planning de parloirs — « et aujourd'hui ? ».
 */
export function RythmeSemaine({
  jours,
}: {
  jours: { label: string; date: string; valeur: number; aujourdhui: boolean }[];
}) {
  const max = Math.max(...jours.map((j) => j.valeur), 1);

  return (
    <div className="flex items-end justify-between gap-1.5">
      {jours.map((j, i) => {
        const hauteur = (j.valeur / max) * 100;
        return (
          <div key={j.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "tnum text-xs font-semibold",
                j.aujourdhui ? "text-ink" : j.valeur > 0 ? "text-muted" : "text-faint",
              )}
            >
              {j.valeur}
            </span>
            <span
              aria-hidden
              className="flex h-24 w-full items-end overflow-hidden rounded-md bg-sunken"
            >
              <span
                className="w-full origin-bottom rounded-md"
                style={{
                  height: `${Math.max(hauteur, j.valeur > 0 ? 6 : 0)}%`,
                  backgroundColor: j.aujourdhui ? "var(--teinte)" : "var(--voile)",
                  animation: "sgp-grow-y var(--dur-move) var(--ease-spring) both",
                  animationDelay: `${i * 55}ms`,
                }}
              />
            </span>
            <span
              className={cn(
                "text-2xs capitalize",
                j.aujourdhui ? "font-semibold text-[color:var(--teinte)]" : "text-faint",
              )}
            >
              {j.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
