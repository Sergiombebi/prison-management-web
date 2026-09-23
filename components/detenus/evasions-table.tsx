"use client";

import { useState } from "react";
import type { Cellule, Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { AvisCessationModal } from "@/components/detenus/avis-cessation-recherches";
import { BoutonAvisEvasion } from "@/components/detenus/avis-evasion";
import { BoutonReintegrer } from "@/components/detenus/reintegrer-evasion";

/** Icône du listing : rouvre l'avis de cessation d'une évasion déjà réintégrée. */
function BoutonAvisCessation({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="printer"
        title="Imprimer l’avis de cessation de recherches"
        aria-label="Imprimer l’avis de cessation de recherches"
        className="w-8 rounded-full border-0 !bg-accent-soft px-0 !text-accent shadow-none hover:!bg-accent/20"
        onClick={() => setOuvert(true)}
      />
      <AvisCessationModal open={ouvert} sortie={sortie} parametres={parametres} onClose={() => setOuvert(false)} />
    </>
  );
}

/** Historique des évasions, avec le suivi de la réintégration et l'impression des avis en icônes. */
export function EvasionsTable({
  sorties,
  cellules,
  parametres,
}: {
  sorties: SortieDetenu[];
  cellules: Cellule[];
  parametres: Parametres;
}) {
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
          cle: "statut",
          titre: "Statut",
          rendu: (s) =>
            s.dateReintegration ? (
              <Badge ton="succes">Réintégré le {formatDate(s.dateReintegration)}</Badge>
            ) : (
              <Badge ton="danger">En fuite</Badge>
            ),
        },
        {
          cle: "actions",
          titre: "",
          align: "droite",
          rendu: (s) => (
            <div className="flex justify-end gap-1.5">
              {s.dateReintegration ? (
                <BoutonAvisCessation sortie={s} parametres={parametres} />
              ) : (
                <BoutonReintegrer sortie={s} cellules={cellules} parametres={parametres} />
              )}
              <BoutonAvisEvasion sortie={s} parametres={parametres} />
            </div>
          ),
        },
      ]}
      vide={<EmptyState icone="door" titre="Aucune sortie de ce type" texte="Aucun incident de cette nature n’a été enregistré." />}
    />
  );
}
