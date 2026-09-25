"use client";

import { useState } from "react";
import type { DetenuResume } from "@/lib/domain/types";
import { formatDate, initiales } from "@/lib/format";
import { PaginationLocale } from "@/components/data/pagination-locale";
import { Avatar, Ecrou } from "@/components/ui/surface";

const PAR_PAGE = 10;

/**
 * Liste des détenus sans cellule, paginée côté client : elle arrive déjà entière
 * du serveur (`listDetenusNonLoges`), inutile de redemander une page à l'API.
 */
export function DetenusNonLoges({ donnees }: { donnees: DetenuResume[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(donnees.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = donnees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  return (
    <>
      <ul className="stagger divide-y divide-hairline">
        {visibles.map((d, i) => (
          <li key={d.id} style={{ ["--i" as string]: i }} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar initiales={initiales(d.nom)} taille="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{d.nom}</p>
              <p className="text-xs text-muted">
                <Ecrou className="text-xs text-muted">{d.numeroEcrou}</Ecrou> · {d.sexe}
              </p>
            </div>
            <p className="hidden text-xs text-faint sm:block">écroué le {formatDate(d.mandatCourant?.dateIncarceration)}</p>
          </li>
        ))}
      </ul>

      {donnees.length > PAR_PAGE && (
        <PaginationLocale page={pageCourante} parPage={PAR_PAGE} total={donnees.length} onChange={setPage} />
      )}
    </>
  );
}
