"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { Cellule, Parametres, SortieDetenu } from "@/lib/domain/types";
import { reintegrerEvasion, type EtatSortie } from "@/app/(app)/detenus/liberation/actions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";
import { RetourAction } from "@/components/ui/retour-action";
import { AvisCessationModal } from "@/components/detenus/avis-cessation-recherches";

const libelleCellule = (c: Cellule) => (c.bloc ? `${c.bloc} · ${c.numero}` : c.numero);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

function FormulaireReintegration({
  sortie,
  cellules,
  onClose,
  onReintegre,
}: {
  sortie: SortieDetenu;
  cellules: Cellule[];
  onClose: () => void;
  onReintegre: (sortie: SortieDetenu) => void;
}) {
  const titleId = useId();
  const [etat, envoyer, enCours] = useActionState<EtatSortie, FormData>(reintegrerEvasion.bind(null, sortie.id), {});
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  useEffect(() => {
    if (etat.ok && etat.sortie) {
      onReintegre(etat.sortie);
      onClose();
    }
    // onClose/onReintegre sont recréés à chaque rendu du parent : ne réagir qu'aux
    // changements de `etat`, seul déclencheur réel de cet effet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-success-soft text-success">
          <Icon name="check" size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            Réintégrer ce détenu
          </h2>
          <p className="mt-1 text-sm text-muted">
            {sortie.detenuNom} · {sortie.numeroEcrou} — évadé le {formatDate(sortie.dateSortie)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <form action={envoyer} className="flex flex-col gap-4 overflow-y-auto">
        <RetourAction etat={etat} />

        <p className="rounded-md bg-accent-soft px-3 py-2.5 text-sm text-ink">
          Ses mandats en cours à l’évasion rouvrent avec le reliquat de peine reporté depuis la date de reprise, et il
          est placé en cellule disciplinaire.
        </p>

        <Field label="Date de la reprise" requis erreur={err("date_reintegration")}>
          {(p) => <Input {...p} type="date" name="date_reintegration" required defaultValue={aujourdhui()} />}
        </Field>
        <Field label="Lieu de la reprise" erreur={err("lieu_reintegration")}>
          {(p) => <Input {...p} name="lieu_reintegration" placeholder="Ex. Contrôle routier, Mfoundi" />}
        </Field>
        <Field label="Autorité ayant procédé à l’arrestation" erreur={err("autorite_reintegration")}>
          {(p) => <Input {...p} name="autorite_reintegration" placeholder="Ex. Gendarmerie de Yaoundé" />}
        </Field>
        <Field
          label="Cellule disciplinaire"
          requis
          aide="Le détenu y est placé dès la réintégration."
          erreur={err("cellule_disciplinaire_id")}
        >
          {(p) => (
            <Select {...p} name="cellule_disciplinaire_id" required placeholder="Sélectionner une cellule…">
              {cellules.map((c) => (
                <option key={c.id} value={c.id}>
                  {libelleCellule(c)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Observations" erreur={err("observations_reintegration")}>
          {(p) => <Textarea {...p} name="observations_reintegration" rows={3} />}
        </Field>

        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
            Réintégrer
          </Button>
        </div>
      </form>
    </>
  );
}

/** Icône du listing : réintègre un détenu évadé et repris, puis propose l'avis de cessation. */
export function BoutonReintegrer({
  sortie,
  cellules,
  parametres,
}: {
  sortie: SortieDetenu;
  cellules: Cellule[];
  parametres: Parametres;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [sortieReintegree, setSortieReintegree] = useState<SortieDetenu | null>(null);
  const [avisOuvert, setAvisOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="check"
        title="Réintégrer ce détenu"
        aria-label="Réintégrer ce détenu"
        className="w-8 rounded-full border-0 !bg-success-soft px-0 !text-success shadow-none hover:!bg-success/20"
        onClick={() => setOuvert(true)}
      />
      <Modale open={ouvert} onClose={() => setOuvert(false)} className="max-w-md">
        <FormulaireReintegration
          sortie={sortie}
          cellules={cellules}
          onClose={() => setOuvert(false)}
          onReintegre={(s) => {
            setSortieReintegree(s);
            setAvisOuvert(true);
          }}
        />
      </Modale>
      <AvisCessationModal open={avisOuvert} sortie={sortieReintegree} parametres={parametres} onClose={() => setAvisOuvert(false)} />
    </>
  );
}
