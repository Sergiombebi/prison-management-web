"use client";

import { useMemo, useState } from "react";
import type { Affectation, Cellule } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { PaginationLocale } from "@/components/data/pagination-locale";
import { Select } from "@/components/ui/field";
import { Ecrou, EmptyState } from "@/components/ui/surface";

const PAR_PAGE = 10;

const libelleCellule = (c: Cellule) => (c.bloc ? `${c.bloc} · ${c.numero}` : c.numero);

/**
 * Fil global des affectations, filtrable par cellule et paginé côté client : la
 * liste complète est déjà chargée (`toutesLesPages` côté API), inutile de la
 * redemander au serveur à chaque changement de page ou de filtre.
 */
export function AffectationsRecentes({
  affectations,
  cellules,
}: {
  affectations: Affectation[];
  cellules: Cellule[];
}) {
  const [celluleId, setCelluleId] = useState("");
  const [page, setPage] = useState(1);

  const filtrees = useMemo(
    () => (celluleId ? affectations.filter((a) => a.celluleId === Number(celluleId)) : affectations),
    [affectations, celluleId],
  );

  const pages = Math.max(1, Math.ceil(filtrees.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = filtrees.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
        <p className="text-xs text-muted">
          {filtrees.length} affectation{filtrees.length > 1 ? "s" : ""}
        </p>
        <Select
          value={celluleId}
          onChange={(e) => {
            setCelluleId(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrer par cellule"
          className="w-48"
        >
          <option value="">Toutes les cellules</option>
          {cellules.map((c) => (
            <option key={c.id} value={c.id}>
              {libelleCellule(c)}
            </option>
          ))}
        </Select>
      </div>

      <DataTable<Affectation>
        legende="Historique des affectations"
        lignes={visibles}
        cleLigne={(a) => a.id}
        lienLigne={(a) => `/detenus/${a.detenuId}?onglet=detention`}
        colonnes={[
          {
            cle: "detenu",
            titre: "Détenu",
            rendu: (a) => (
              <div>
                <p className="font-medium">{a.detenuNom}</p>
                <Ecrou className="text-xs text-muted">{a.numeroEcrou}</Ecrou>
              </div>
            ),
          },
          { cle: "cellule", titre: "Cellule", rendu: (a) => a.celluleLibelle },
          { cle: "motif", titre: "Motif", masquerSous: "md", rendu: (a) => <span className="text-muted">{ouVide(a.motifAffectation)}</span> },
          { cle: "date", titre: "Date", align: "droite", rendu: (a) => formatDate(a.dateAffectation) },
        ]}
        vide={<EmptyState icone="cell" titre="Aucune affectation enregistrée" />}
      />

      {filtrees.length > 0 && (
        <PaginationLocale page={pageCourante} parPage={PAR_PAGE} total={filtrees.length} onChange={setPage} />
      )}
    </>
  );
}
