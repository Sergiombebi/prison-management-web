import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatNombre, formatPourcent } from "@/lib/format";

/*
 * Graphiques SVG écrits à la main — rendus côté serveur, animés en CSS pur.
 * Pas de bibliothèque : chaque trait reste lisible et modifiable par n'importe
 * qui dans l'équipe.
 *
 * Règle apprise à nos dépens : ne jamais animer `opacity` sur un élément qui
 * porte déjà un attribut `opacity` — l'animation l'emporte sur l'attribut.
 * L'opacité vit donc dans les dégradés et les couleurs.
 */

interface Point {
  label: string;
  valeur: number;
}

/** Courbe d'évolution avec aire dégradée, grille légère et dernière valeur mise en avant. */
export function AreaChart({
  points,
  hauteur = 190,
  legende,
}: {
  points: Point[];
  hauteur?: number;
  legende: string;
}) {
  const largeur = 560;
  const marge = { haut: 18, droite: 18, bas: 28, gauche: 38 };
  const w = largeur - marge.gauche - marge.droite;
  const h = hauteur - marge.haut - marge.bas;

  const valeurs = points.map((p) => p.valeur);
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs, 0);
  const pas = Math.max(1, Math.ceil((max - min) / 4 / 5) * 5);
  const plafond = Math.ceil(max / pas) * pas;
  const plancher = Math.max(0, Math.floor(min / pas) * pas - pas);

  const x = (i: number) => marge.gauche + (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => marge.haut + h - ((v - plancher) / (plafond - plancher || 1)) * h;

  const ligne = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(" ");
  const aire = `${ligne} L${x(points.length - 1).toFixed(1)},${marge.haut + h} L${x(0).toFixed(1)},${marge.haut + h} Z`;

  const graduations: number[] = [];
  for (let v = plancher; v <= plafond; v += pas) graduations.push(v);

  const dernier = points.at(-1);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={legende}
      >
        <defs>
          <linearGradient id="sgp-aire" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--sgp-viz-1)" stopOpacity="0.3" />
            <stop offset="55%" stopColor="var(--sgp-viz-1)" stopOpacity="0.09" />
            <stop offset="100%" stopColor="var(--sgp-viz-1)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sgp-trait" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--sgp-viz-2)" />
            <stop offset="100%" stopColor="var(--sgp-viz-1)" />
          </linearGradient>
        </defs>

        {graduations.map((v) => (
          <g key={v}>
            <line
              x1={marge.gauche}
              x2={largeur - marge.droite}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--sgp-hairline)"
              strokeDasharray={v === plancher ? undefined : "2 5"}
            />
            <text
              x={marge.gauche - 8}
              y={y(v)}
              dy="0.32em"
              textAnchor="end"
              className="fill-faint"
              style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
            >
              {formatNombre(v)}
            </text>
          </g>
        ))}

        <path d={aire} fill="url(#sgp-aire)" />
        <path
          d={ligne}
          fill="none"
          stroke="url(#sgp-trait)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1200}
          strokeDasharray={1200}
          style={{ animation: "sgp-draw 1s var(--ease-out) both" }}
        />

        {points.map((p, i) => {
          const dernierPoint = i === points.length - 1;
          return (
            <g key={p.label}>
              <text
                x={x(i)}
                y={hauteur - 6}
                textAnchor="middle"
                className={cn(dernierPoint ? "fill-ink" : "fill-faint")}
                style={{ fontSize: 10, fontWeight: dernierPoint ? 600 : 400 }}
              >
                {p.label}
              </text>
              {dernierPoint && (
                <circle
                  cx={x(i)}
                  cy={y(p.valeur)}
                  r={7}
                  fill="var(--sgp-viz-1)"
                  opacity={0.2}
                  style={{ animation: "sgp-pouls 3s ease-in-out infinite" }}
                />
              )}
              <circle
                cx={x(i)}
                cy={y(p.valeur)}
                r={dernierPoint ? 4.5 : 3}
                fill={dernierPoint ? "var(--sgp-viz-1)" : "var(--sgp-surface)"}
                stroke="var(--sgp-viz-1)"
                strokeWidth={2}
                style={{ animation: `sgp-pop 320ms var(--ease-spring) ${500 + i * 70}ms both` }}
              >
                <title>{`${p.label} : ${formatNombre(p.valeur)}`}</title>
              </circle>
            </g>
          );
        })}

        {dernier && (
          <text
            x={x(points.length - 1)}
            y={y(dernier.valeur) - 14}
            textAnchor="end"
            className="fill-ink"
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              animation: "sgp-fade 300ms var(--ease-out) 900ms both",
            }}
          >
            {formatNombre(dernier.valeur)}
          </text>
        )}
      </svg>

      {/* Équivalent textuel pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>{legende}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{p.label}</th>
              <td>{p.valeur}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface BarreItem {
  label: string;
  valeur: number;
  href?: string;
  aide?: string;
  /** Met la barre en hachures : la catégorie qui demande de l'attention. */
  accent?: boolean;
}

/**
 * Histogramme vertical. Les barres poussent depuis leur base, et la plus haute
 * porte une étiquette flottante — c'est elle qu'on vient lire en premier.
 */
export function BarChart({
  items,
  legende,
  hauteur = 210,
}: {
  items: BarreItem[];
  legende: string;
  hauteur?: number;
}) {
  const max = Math.max(...items.map((i) => i.valeur), 1);
  const total = items.reduce((s, i) => s + i.valeur, 0);
  const sommet = items.reduce((a, b) => (b.valeur > a.valeur ? b : a), items[0]);

  return (
    <figure className="w-full">
      {/* pt-11 : l'étiquette flottante se déploie au-dessus de la barre la plus haute */}
      <div
        className="flex items-end gap-2 pt-11 sm:gap-3"
        style={{ height: hauteur + 44 }}
        role="img"
        aria-label={legende}
      >
        {items.map((item, i) => {
          const part = max > 0 ? item.valeur / max : 0;
          const pointe = item.label === sommet?.label && item.valeur > 0;

          const barre = (
            <>
              {/* Étiquette flottante sur la barre la plus haute */}
              {pointe && (
                <div
                  className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-center shadow-e3"
                  style={{ animation: "sgp-pop 340ms var(--ease-spring) 900ms both" }}
                >
                  <p className="tnum text-md font-semibold leading-none text-ink">
                    {formatNombre(item.valeur)}
                  </p>
                  <p className="mt-1 text-2xs text-success">
                    {formatPourcent(total > 0 ? (item.valeur / total) * 100 : 0, 0)} du total
                  </p>
                </div>
              )}
              <div
                className={cn(
                  "w-full origin-bottom rounded-t-lg transition-[filter] duration-[var(--dur-base)]",
                  item.accent ? "hachure" : "bg-gradient-to-t from-[var(--sgp-viz-1)] to-[color-mix(in_oklab,var(--sgp-viz-1)_70%,white)]",
                  item.href && "group-hover/barre:brightness-110",
                )}
                style={{
                  height: `${Math.max(part * 100, 2)}%`,
                  animation: `sgp-grow-y 700ms var(--ease-soft) ${120 + i * 90}ms both`,
                }}
              />
            </>
          );

          return (
            <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              {item.href ? (
                <Link
                  href={item.href}
                  transitionTypes={["nav-forward"]}
                  title={item.aide}
                  className="group/barre relative flex h-full flex-col justify-end rounded-t-lg"
                >
                  {barre}
                </Link>
              ) : (
                <div className="relative flex h-full flex-col justify-end" title={item.aide}>
                  {barre}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2 sm:gap-3">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 flex-1 text-center">
            <p className="truncate text-2xs text-muted" title={item.label}>
              {item.label}
            </p>
            <p className="tnum text-xs font-semibold text-ink">{formatNombre(item.valeur)}</p>
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>{legende}</caption>
        <tbody>
          {items.map((i) => (
            <tr key={i.label}>
              <th scope="row">{i.label}</th>
              <td>{i.valeur}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Répartition en bulles translucides. Les aires se comparent d'un coup d'œil et
 * les recouvrements montrent les ordres de grandeur sans grille ni axe.
 */
export function BubbleChart({
  items,
  legende,
}: {
  items: Array<{ label: string; valeur: number; href?: string; aide?: string }>;
  legende: string;
}) {
  const total = items.reduce((s, i) => s + i.valeur, 0);
  const classes = [...items]
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => b.valeur - a.valeur)
    .slice(0, 5);

  const maxValeur = Math.max(...classes.map((c) => c.valeur), 1);
  // Positions fixes : lisibles, et surtout stables d'un rendu à l'autre
  const ancres = [
    { cx: 118, cy: 92, rMax: 62 },
    { cx: 58, cy: 108, rMax: 42 },
    { cx: 78, cy: 44, rMax: 32 },
    { cx: 160, cy: 26, rMax: 24 },
    { cx: 176, cy: 140, rMax: 22 },
  ];

  return (
    <figure className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <svg viewBox="0 0 220 180" className="h-44 w-full max-w-56 shrink-0" role="img" aria-label={legende}>
        {classes.map((c, rang) => {
          const ancre = ancres[rang];
          const r = Math.max(ancre.rMax * Math.sqrt(c.valeur / maxValeur), 12);
          const part = total > 0 ? (c.valeur / total) * 100 : 0;
          const couleur = `var(--sgp-viz-${(c.index % 5) + 1})`;

          return (
            <g
              key={c.label}
              style={{
                animation: `sgp-gonfle 520ms var(--ease-spring) ${180 + rang * 110}ms both`,
                transformOrigin: `${ancre.cx}px ${ancre.cy}px`,
              }}
            >
              <circle
                cx={ancre.cx}
                cy={ancre.cy}
                r={r}
                fill={couleur}
                fillOpacity={0.22}
                stroke={couleur}
                strokeOpacity={0.35}
              />
              {r > 20 && (
                <text
                  x={ancre.cx}
                  y={ancre.cy}
                  dy="0.35em"
                  textAnchor="middle"
                  className="fill-ink"
                  style={{ fontSize: r > 40 ? 20 : 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                >
                  {formatPourcent(part, 0)}
                </text>
              )}
              <title>{`${c.label} : ${formatNombre(c.valeur)}`}</title>
            </g>
          );
        })}
      </svg>

      <ul className="stagger min-w-0 flex-1 space-y-1.5" style={{ ["--stagger-step" as string]: "50ms" }}>
        {items.map((item, i) => {
          const part = total > 0 ? (item.valeur / total) * 100 : 0;
          const contenu = (
            <>
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--sgp-viz-${(i % 5) + 1})` }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-ink" title={item.aide}>
                {item.label}
              </span>
              <span className="tnum shrink-0 text-sm font-semibold text-ink">
                {formatNombre(item.valeur)}
              </span>
              <span className="tnum w-11 shrink-0 text-right text-xs text-muted">
                {formatPourcent(part, 0)}
              </span>
            </>
          );

          return (
            <li key={item.label} style={{ ["--i" as string]: i }}>
              {item.href ? (
                <Link
                  href={item.href}
                  transitionTypes={["nav-forward"]}
                  className="-mx-2 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-raised"
                >
                  {contenu}
                </Link>
              ) : (
                <div className="flex items-center gap-2.5 py-1.5">{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/**
 * Répartition en barres horizontales. Reste utile quand les libellés comptent
 * autant que les proportions.
 */
export function BarList({
  items,
  total,
}: {
  items: Array<{ label: string; valeur: number; href?: string; aide?: string; accent?: boolean }>;
  total: number;
}) {
  const max = Math.max(...items.map((i) => i.valeur), 1);

  return (
    <ul className="stagger flex flex-col gap-2.5" style={{ ["--stagger-step" as string]: "55ms" }}>
      {items.map((item, index) => {
        const part = total > 0 ? (item.valeur / total) * 100 : 0;
        const ligne = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink" title={item.aide}>
                {item.label}
              </span>
              <span className="tnum shrink-0 text-muted">
                <span className="font-semibold text-ink">{formatNombre(item.valeur)}</span>
                <span className="ml-2 inline-block w-12 text-right text-xs">
                  {formatPourcent(part, 0)}
                </span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
              <div
                className={cn(
                  "h-full origin-left rounded-full",
                  item.accent
                    ? "hachure"
                    : "bg-gradient-to-r from-[var(--sgp-viz-2)] to-[var(--sgp-viz-1)]",
                )}
                style={{
                  width: `${(item.valeur / max) * 100}%`,
                  animation: `sgp-grow-x 800ms var(--ease-soft) ${150 + index * 55}ms both`,
                }}
              />
            </div>
          </>
        );

        return (
          <li key={item.label} style={{ ["--i" as string]: index }}>
            {item.href ? (
              <Link
                href={item.href}
                transitionTypes={["nav-forward"]}
                className="-mx-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-raised"
              >
                {ligne}
              </Link>
            ) : (
              <div className="py-1.5">{ligne}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Jauge circulaire — occupation d'une cellule d'un coup d'œil.
 * L'arc se dessine à l'arrivée ; le chiffre reste lisible au centre.
 */
export function JaugeRadiale({
  valeur,
  max,
  taille = 92,
}: {
  valeur: number;
  max: number;
  taille?: number;
}) {
  const ratio = max > 0 ? Math.min(valeur / max, 1) : 0;
  const sature = max > 0 && valeur >= max;
  const rayon = 34;
  const circonference = 2 * Math.PI * rayon;

  const couleur = sature
    ? "var(--sgp-danger)"
    : ratio >= 0.8
      ? "var(--sgp-warning)"
      : "var(--sgp-viz-1)";

  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={rayon} fill="none" stroke="var(--sgp-sunken)" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={rayon}
          fill="none"
          stroke={couleur}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - ratio)}
          style={{
            animation: "sgp-draw 900ms var(--ease-soft) 150ms both",
            ["--draw-length" as string]: circonference,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="tnum text-md font-semibold leading-none text-ink">
          {valeur}
          <span className="text-xs font-normal text-faint">/{max}</span>
        </p>
        <p className="mt-1 text-2xs text-muted">{formatPourcent(ratio * 100, 0)}</p>
      </div>
    </div>
  );
}

/** Jauge d'occupation compacte, pour les listes denses. */
export function Jauge({ valeur, max }: { valeur: number; max: number }) {
  const ratio = max > 0 ? valeur / max : 0;
  const ton =
    ratio > 1
      ? "from-danger/70 to-danger"
      : ratio >= 0.9
        ? "from-warning/70 to-warning"
        : "from-[var(--sgp-viz-2)] to-[var(--sgp-viz-1)]";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div
          className={cn("h-full origin-left rounded-full bg-gradient-to-r", ton)}
          style={{
            width: `${Math.min(ratio, 1) * 100}%`,
            animation: "sgp-grow-x 700ms var(--ease-soft) 120ms both",
          }}
        />
      </div>
      <span
        className={cn(
          "tnum whitespace-nowrap text-xs",
          ratio > 1 ? "font-semibold text-danger" : "text-muted",
        )}
      >
        {formatPourcent(ratio * 100, 0)}
      </span>
    </div>
  );
}
