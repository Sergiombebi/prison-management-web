"use client";

import { cn } from "@/lib/cn";
import { formatNombre } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { t } from "@/lib/i18n/fr";

/**
 * Pagination pilotée en mémoire (`onChange`), pour une liste déjà entièrement chargée
 * côté client — contrairement à `Pagination`, l'état ne vit pas dans l'URL.
 */
export function PaginationLocale({
  page,
  parPage,
  total,
  onChange,
}: {
  page: number;
  parPage: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / parPage));
  const debut = total === 0 ? 0 : (page - 1) * parPage + 1;
  const fin = Math.min(total, page * parPage);
  const progression = total === 0 ? 0 : (fin / total) * 100;

  const bouton = (cible: number, actif: boolean, contenu: React.ReactNode, label: string) => (
    <button
      type="button"
      disabled={!actif}
      onClick={() => onChange(cible)}
      aria-label={label}
      className={cn(
        "grid size-8 place-items-center rounded-md border transition-all duration-[var(--dur-fast)]",
        actif
          ? "border-hairline bg-surface text-muted shadow-e1 hover:-translate-y-px hover:border-rule hover:text-ink hover:shadow-e2"
          : "border-transparent text-faint/40",
      )}
    >
      {contenu}
    </button>
  );

  return (
    <nav
      aria-label="Pagination"
      className="relative flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 text-xs text-muted"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-sunken">
        <span
          className="block h-full origin-left bg-accent/60 transition-[width] duration-[var(--dur-slow)]"
          style={{ width: `${progression}%` }}
        />
      </span>

      <p className="tnum">
        <span className="font-medium text-ink">
          {formatNombre(debut)}–{formatNombre(fin)}
        </span>{" "}
        {t.tableau.surTotal} {formatNombre(total)} {t.tableau.resultats}
      </p>
      <div className="flex items-center gap-1.5">
        {bouton(page - 1, page > 1, <Icon name="chevronLeft" size={14} />, t.actions.precedent)}
        <span className="tnum px-2">
          {t.tableau.page} <span className="font-medium text-ink">{page}</span> / {pages}
        </span>
        {bouton(page + 1, page < pages, <Icon name="chevronRight" size={14} />, t.actions.suivant)}
      </div>
    </nav>
  );
}
