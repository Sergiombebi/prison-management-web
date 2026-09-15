import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatNombre } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import { t } from "@/lib/i18n/fr";

/** Pagination par liens : l'état vit dans l'URL, il survit au rafraîchissement et se partage. */
export function Pagination({
  page,
  parPage,
  total,
  href,
}: {
  page: number;
  parPage: number;
  total: number;
  href: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / parPage));
  const debut = total === 0 ? 0 : (page - 1) * parPage + 1;
  const fin = Math.min(total, page * parPage);

  const lien = (cible: number, actif: boolean, contenu: React.ReactNode, label: string) =>
    actif ? (
      <Link
        href={href(cible)}
        scroll={false}
        aria-label={label}
        className="grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-sunken hover:text-ink"
      >
        {contenu}
      </Link>
    ) : (
      <span aria-hidden className="grid size-8 place-items-center text-faint/50">
        {contenu}
      </span>
    );

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-2.5 text-xs text-muted"
    >
      <p className="tnum">
        <span className="font-medium text-ink">
          {formatNombre(debut)}–{formatNombre(fin)}
        </span>{" "}
        {t.tableau.surTotal} {formatNombre(total)} {t.tableau.resultats}
      </p>
      <div className="flex items-center gap-1">
        {lien(page - 1, page > 1, <Icon name="chevronLeft" size={14} />, t.actions.precedent)}
        <span className={cn("tnum px-2")}>
          {t.tableau.page} <span className="font-medium text-ink">{page}</span> / {pages}
        </span>
        {lien(page + 1, page < pages, <Icon name="chevronRight" size={14} />, t.actions.suivant)}
      </div>
    </nav>
  );
}
