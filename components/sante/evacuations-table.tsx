"use client";

import { useState } from "react";
import type { EvacuationSanitaire } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { PaginationLocale } from "@/components/data/pagination-locale";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonRetourEvacuation } from "@/components/sante/retour-evacuation";

const PAR_PAGE = 10;

/**
 * Registre des évacuations sanitaires, paginé côté client (10 par page) — même
 * patron que le registre des visites.
 */
export function EvacuationsTable({ evacuations }: { evacuations: EvacuationSanitaire[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(evacuations.length / PAR_PAGE));
  const pageCourante = Math.min(page, pages);
  const visibles = evacuations.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  return (
    <>
      <DataTable<EvacuationSanitaire>
        legende="Registre des évacuations sanitaires"
        lignes={visibles}
        cleLigne={(e) => e.id}
        lienLigne={(e) => `/sante/dossier-medical/${e.detenuId}`}
        colonnes={[
          {
            cle: "date",
            titre: "Départ",
            rendu: (e) => <span className="font-medium">{formatDate(e.dateDepart)}</span>,
          },
          {
            cle: "detenu",
            titre: "Détenu",
            rendu: (e) => (
              <div>
                <p className="max-w-[20ch] truncate">{e.detenuNom}</p>
                <Ecrou className="text-xs text-muted">{e.numeroEcrou}</Ecrou>
              </div>
            ),
          },
          {
            cle: "structure",
            titre: "Structure",
            masquerSous: "md",
            rendu: (e) => <span className="text-muted">{e.structureDestination}</span>,
          },
          {
            cle: "statut",
            titre: "Statut",
            rendu: (e) =>
              e.dateRetour ? (
                <Badge ton="succes">Rentré le {formatDate(e.dateRetour)}</Badge>
              ) : (
                <Badge ton="alerte">En évacuation</Badge>
              ),
          },
          {
            cle: "motif",
            titre: "Motif",
            masquerSous: "lg",
            rendu: (e) => <span className="text-muted">{ouVide(e.motif)}</span>,
          },
          {
            cle: "actions",
            titre: "",
            align: "droite",
            rendu: (e) => (!e.dateRetour ? <BoutonRetourEvacuation evacuation={e} /> : null),
          },
        ]}
        vide={<EmptyState icone="pulse" titre="Aucune évacuation enregistrée" texte="Aucune évacuation sanitaire n’a encore été consignée." />}
      />

      {evacuations.length > 0 && (
        <PaginationLocale page={pageCourante} parPage={PAR_PAGE} total={evacuations.length} onChange={setPage} />
      )}
    </>
  );
}
