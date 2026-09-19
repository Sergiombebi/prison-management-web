"use client";

import type { Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { BoutonBulletin } from "@/components/detenus/bulletin-transferement";
import { BoutonModifierTransfert } from "@/components/detenus/modifier-transfert";

/** Historique des transferts, avec l'impression du bulletin et la modification en icônes. */
export function TransfertsTable({ sorties, parametres }: { sorties: SortieDetenu[]; parametres: Parametres }) {
  return (
    <DataTable<SortieDetenu>
      legende="Historique : Transfert"
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
          cle: "destination",
          titre: "Destination",
          masquerSous: "md",
          rendu: (s) => <span className="text-muted">{ouVide(s.destination)}</span>,
        },
        {
          cle: "actions",
          titre: "",
          align: "droite",
          rendu: (s) => (
            <div className="flex justify-end gap-1.5">
              <BoutonBulletin sortie={s} parametres={parametres} />
              <BoutonModifierTransfert sortie={s} />
            </div>
          ),
        },
      ]}
      vide={<EmptyState icone="door" titre="Aucune sortie de ce type" texte="Aucune sortie n’a encore été consignée." />}
    />
  );
}
