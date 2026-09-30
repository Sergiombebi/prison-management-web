"use client";

import { useState } from "react";
import type { Cellule, Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, ouVide } from "@/lib/format";
import { DataTable } from "@/components/data/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, Ecrou } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";
import { AvisCessationModal } from "@/components/detenus/avis-cessation-recherches";
import { BoutonAvisEvasion } from "@/components/detenus/avis-evasion";
import { BoutonReintegrer } from "@/components/detenus/reintegrer-evasion";

const CHEMIN = "/detenus/liberation/evasion";

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
  statutActif,
}: {
  sorties: SortieDetenu[];
  cellules: Cellule[];
  parametres: Parametres;
  /** Filtre porté par l'URL (`?statut=`) : absent = toutes. */
  statutActif?: string;
}) {
  const enFuite = sorties.filter((s) => !s.dateReintegration);
  const reintegres = sorties.filter((s) => s.dateReintegration);
  const lignes = statutActif === "en-fuite" ? enFuite : statutActif === "reintegres" ? reintegres : sorties;

  return (
    <>
      <TabsNav
        label="Statut de l’évasion"
        className="px-4 pt-3"
        items={[
          { href: CHEMIN, label: "Toutes", compte: sorties.length, actif: !statutActif },
          { href: `${CHEMIN}?statut=en-fuite`, label: "En fuite", compte: enFuite.length, actif: statutActif === "en-fuite" },
          { href: `${CHEMIN}?statut=reintegres`, label: "Réintégration", compte: reintegres.length, actif: statutActif === "reintegres" },
        ]}
      />
      <DataTable<SortieDetenu>
        legende="Historique : Évasion"
        lignes={lignes}
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
        vide={
          <EmptyState
            icone="door"
            titre={statutActif ? "Aucune évasion dans cet état" : "Aucune sortie de ce type"}
            texte={
              statutActif === "en-fuite"
                ? "Aucun détenu n’est actuellement en fuite."
                : statutActif === "reintegres"
                  ? "Aucune réintégration n’a encore été consignée."
                  : "Aucun incident de cette nature n’a été enregistré."
            }
          />
        }
      />
    </>
  );
}
