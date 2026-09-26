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
 *
 * `listDetenusNonLoges` est plafonnée à 100 lignes (voir son commentaire) : en
 * fonctionnement normal ça n'arrive jamais, mais si `total` (le vrai compte,
 * sans plafond) dépasse `donnees.length`, on le dit plutôt que de laisser croire
 * que la liste est complète.
 */
export function DetenusNonLoges({ donnees, total }: { donnees: DetenuResume[]; total: number }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(donnees.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = donnees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);
  const plafonne = total > donnees.length;

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
      {plafonne && (
        <p className="border-t border-hairline px-4 py-2.5 text-xs text-faint">
          {donnees.length} affichés sur {total} au total — cherchez un détenu précis dans le formulaire ci-contre.
        </p>
      )}
    </>
  );
}
