import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export interface Colonne<T> {
  cle: string;
  titre: string;
  rendu: (ligne: T) => ReactNode;
  align?: "gauche" | "droite" | "centre";
  /** Colonne triable côté serveur via l'URL. */
  triable?: boolean;
  /** Masque la colonne sous ce point de rupture. */
  masquerSous?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface Tri {
  cle: string;
  sens: "asc" | "desc";
  /** Construit l'URL qui applique le tri demandé en conservant les autres filtres. */
  href: (cle: string, sens: "asc" | "desc") => string;
}

const MASQUE = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

const ALIGN = {
  gauche: "text-left",
  droite: "text-right",
  centre: "text-center",
} as const;

/**
 * Tableau de registre.
 *
 * - En-tête collant translucide, qui reste lisible quand les lignes défilent dessous.
 * - Chiffres alignés (tabular-nums hérité de `table`).
 * - Ligne entière cliquable via un lien étiré sur la première cellule, avec un
 *   repère qui se révèle au survol : la ligne survolée est sans ambiguïté.
 * - Apparition en cascade, plafonnée pour ne pas ralentir les longues listes.
 */
export function DataTable<T>({
  colonnes,
  lignes,
  cleLigne,
  lienLigne,
  libelleLien,
  tri,
  vide,
  legende,
  dense,
  className,
}: {
  colonnes: Colonne<T>[];
  lignes: T[];
  cleLigne: (ligne: T) => string | number;
  lienLigne?: (ligne: T) => string;
  libelleLien?: (ligne: T) => string;
  tri?: Tri;
  vide?: ReactNode;
  legende: string;
  dense?: boolean;
  className?: string;
}) {
  if (lignes.length === 0 && vide) return <>{vide}</>;

  return (
    <div className={cn("relative overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{legende}</caption>
        <thead className="sticky top-0 z-10 verre">
          <tr className="border-b border-hairline">
            {colonnes.map((c) => {
              const actif = tri?.cle === c.cle;
              const prochain = actif && tri?.sens === "asc" ? "desc" : "asc";
              return (
                <th
                  key={c.cle}
                  scope="col"
                  aria-sort={
                    actif ? (tri?.sens === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "h-10 px-3 text-2xs font-semibold uppercase tracking-[0.08em] text-faint whitespace-nowrap first:pl-4 last:pr-4",
                    ALIGN[c.align ?? "gauche"],
                    c.masquerSous && MASQUE[c.masquerSous],
                  )}
                >
                  {c.triable && tri ? (
                    <Link
                      href={tri.href(c.cle, prochain)}
                      scroll={false}
                      className={cn(
                        "group inline-flex items-center gap-1 rounded-xs transition-colors hover:text-ink",
                        actif && "text-accent-ink",
                      )}
                    >
                      {c.titre}
                      <Icon
                        name={actif ? (tri.sens === "asc" ? "arrowUp" : "arrowDown") : "sort"}
                        size={11}
                        className={cn(
                          "transition-opacity",
                          actif ? "opacity-100" : "opacity-0 group-hover:opacity-60",
                        )}
                      />
                      <span className="sr-only">
                        {`, trier ${prochain === "asc" ? "par ordre croissant" : "par ordre décroissant"}`}
                      </span>
                    </Link>
                  ) : (
                    c.titre
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="stagger" style={{ ["--stagger-step" as string]: "16ms" }}>
          {lignes.map((ligne, index) => {
            const href = lienLigne?.(ligne);
            return (
              <tr
                key={cleLigne(ligne)}
                style={{ ["--i" as string]: Math.min(index, 18) }}
                className={cn(
                  "group/ligne relative border-b border-hairline last:border-b-0",
                  "transition-colors duration-[var(--dur-fast)]",
                  href && "hover:bg-raised focus-within:bg-raised",
                )}
              >
                {colonnes.map((c, ci) => (
                  <td
                    key={c.cle}
                    className={cn(
                      "relative px-3 align-middle text-ink first:pl-4 last:pr-4",
                      dense ? "h-11" : "h-13",
                      ALIGN[c.align ?? "gauche"],
                      c.masquerSous && MASQUE[c.masquerSous],
                      c.className,
                    )}
                  >
                    {/* Repère vertical révélé au survol, sur la première cellule */}
                    {ci === 0 && href && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-0.5 origin-center scale-y-0 rounded-full bg-accent transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover/ligne:scale-y-100"
                      />
                    )}
                    {ci === 0 && href ? (
                      <Link
                        href={href}
                        transitionTypes={["nav-forward"]}
                        className="rounded-xs after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-4"
                        aria-label={libelleLien?.(ligne)}
                      >
                        {c.rendu(ligne)}
                      </Link>
                    ) : (
                      c.rendu(ligne)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Squelette de tableau — même géométrie que le vrai, pour que rien ne saute. */
export function DataTableSkeleton({ colonnes = 6, lignes = 8 }: { colonnes?: number; lignes?: number }) {
  return (
    <div aria-hidden className="overflow-hidden">
      <div className="flex h-10 items-center gap-6 border-b border-hairline bg-raised px-4">
        {Array.from({ length: colonnes }, (_, i) => (
          <div key={i} className="skeleton h-2 flex-1 rounded-xs" />
        ))}
      </div>
      {Array.from({ length: lignes }, (_, r) => (
        <div key={r} className="flex h-13 items-center gap-6 border-b border-hairline px-4 last:border-b-0">
          {Array.from({ length: colonnes }, (_, i) => (
            <div
              key={i}
              className="skeleton h-2.5 flex-1 rounded-xs"
              style={{ maxWidth: `${55 + ((r * 7 + i * 13) % 45)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
