import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatNombre, formatPourcent } from "@/lib/format";

/*
 * Graphiques SVG écrits à la main — rendus côté serveur, animés en CSS pur.
 * Pas de bibliothèque : ces deux formes suffisent au tableau de bord, et chaque
 * trait reste lisible et modifiable par n'importe qui dans l'équipe.
 */

interface Point {
  label: string;
  valeur: number;
}

/** Courbe d'évolution avec aire, grille légère et dernière valeur mise en évidence. */
export function AreaChart({
  points,
  hauteur = 180,
  legende,
}: {
  points: Point[];
  hauteur?: number;
  legende: string;
}) {
  const largeur = 560;
  const marge = { haut: 16, droite: 16, bas: 26, gauche: 36 };
  const w = largeur - marge.gauche - marge.droite;
  const h = hauteur - marge.haut - marge.bas;

  const valeurs = points.map((p) => p.valeur);
  const max = Math.max(...valeurs, 1);
  const min = Math.min(...valeurs, 0);
  // Échelle arrondie à une graduation lisible
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
            <stop offset="0%" stopColor="var(--sgp-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--sgp-accent)" stopOpacity="0" />
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
              strokeDasharray={v === plancher ? undefined : "2 4"}
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

        <path
          d={aire}
          fill="url(#sgp-aire)"
          style={{ animation: "sgp-fade 600ms var(--ease-out) 300ms both" }}
        />
        <path
          d={ligne}
          fill="none"
          stroke="var(--sgp-accent)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1200}
          strokeDasharray={1200}
          style={{ animation: "sgp-draw 900ms var(--ease-out) both" }}
        />

        {points.map((p, i) => (
          <g key={p.label}>
            <text
              x={x(i)}
              y={hauteur - 6}
              textAnchor="middle"
              className={cn(i === points.length - 1 ? "fill-ink" : "fill-faint")}
              style={{ fontSize: 10, fontWeight: i === points.length - 1 ? 600 : 400 }}
            >
              {p.label}
            </text>
            <circle
              cx={x(i)}
              cy={y(p.valeur)}
              r={i === points.length - 1 ? 3.5 : 2}
              fill={i === points.length - 1 ? "var(--sgp-accent)" : "var(--sgp-surface)"}
              stroke="var(--sgp-accent)"
              strokeWidth={1.5}
              style={{ animation: `sgp-fade 240ms var(--ease-out) ${500 + i * 70}ms both` }}
            >
              <title>{`${p.label} : ${formatNombre(p.valeur)}`}</title>
            </circle>
          </g>
        ))}

        {dernier && (
          <text
            x={x(points.length - 1)}
            y={y(dernier.valeur) - 10}
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

/**
 * Répartition en barres horizontales. Préférée au camembert : les longueurs se
 * comparent d'un coup d'œil, les angles non.
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
    <ul className="stagger flex flex-col gap-3" style={{ ["--stagger-step" as string]: "60ms" }}>
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
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
              <div
                className={cn("h-full origin-left rounded-full", item.accent ? "bg-warning" : "bg-accent")}
                style={{
                  width: `${(item.valeur / max) * 100}%`,
                  animation: `sgp-grow-x 700ms var(--ease-out) ${150 + index * 60}ms both`,
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
                className="-mx-2 block rounded-md px-2 py-1 transition-colors hover:bg-raised"
              >
                {ligne}
              </Link>
            ) : (
              <div className="py-1">{ligne}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Jauge d'occupation compacte, pour les cellules. */
export function Jauge({ valeur, max }: { valeur: number; max: number }) {
  const ratio = max > 0 ? valeur / max : 0;
  const ton = ratio > 1 ? "bg-danger" : ratio >= 0.9 ? "bg-warning" : "bg-accent";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <div
          className={cn("h-full origin-left rounded-full", ton)}
          style={{
            width: `${Math.min(ratio, 1) * 100}%`,
            animation: "sgp-grow-x 600ms var(--ease-out) 120ms both",
          }}
        />
      </div>
      <span className={cn("tnum whitespace-nowrap text-xs", ratio > 1 ? "font-semibold text-danger" : "text-muted")}>
        {formatPourcent(ratio * 100, 0)}
      </span>
    </div>
  );
}
