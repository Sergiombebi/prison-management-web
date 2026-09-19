"use client";

import type { Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonAvisEvasion } from "@/components/detenus/avis-evasion";

/** Historique des évasions, avec l'impression de l'avis de recherche en icône. */
export function EvasionsTable({ sorties, parametres }: { sorties: SortieDetenu[]; parametres: Parametres }) {
  return (
    <DataTable<SortieDetenu>
      legende="Historique : Évasion"
      lignes={sorties}
      cleLigne={(s) => s.id}
      lienLigne={(s) => `/detenus/${s.detenuId}?onglet=detention`}
      colonnes={[
        { cle: "date", titre: "Date", rendu: (s) => <span className="font-medium">{formatDate(s.dateSortie)}</span> },
        {
          cle: "detenu",
          titre: "Détenu",
          rendu: (s) => (
            <div>
              <p className="font-medium">{s.detenuNom}</p>
              <Ecrou className="text-xs text-muted">{s.numeroEcrou}</Ecrou>
            </div>
          ),
        },
        {
          cle: "circonstances",
          titre: "Circonstances",
          masquerSous: "md",
          rendu: (s) => <span className="text-muted">{ouVide(s.cause)}</span>,
        },
        {
          cle: "actions",
          titre: "",
          align: "droite",
          rendu: (s) => <BoutonAvisEvasion sortie={s} parametres={parametres} />,
        },
      ]}
      vide={<EmptyState icone="door" titre="Aucune sortie de ce type" texte="Aucun incident de cette nature n’a été enregistré." />}
    />
  );
}
