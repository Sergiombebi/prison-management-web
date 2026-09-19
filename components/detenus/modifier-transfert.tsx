"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { SortieDetenu } from "@/lib/domain/types";
import type { EtatAction } from "@/lib/api/actions";
import { modifierTransfert } from "@/app/(app)/detenus/liberation/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";
import { RetourAction } from "@/components/ui/retour-action";

function FormulaireModification({ sortie, onClose }: { sortie: SortieDetenu; onClose: () => void }) {
  const titleId = useId();
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(modifierTransfert.bind(null, sortie.id), {});
  const v = (champ: string, defaut: string | null) => etat.valeurs?.[champ] ?? defaut ?? "";
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  // Succès : la modale se referme, le toast de RetourAction confirme (il vit dans le parent)
  useEffect(() => {
    if (etat.ok) onClose();
  }, [etat, onClose]);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-accent-soft text-accent">
          <Icon name="edit" size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            Modifier le transfert
          </h2>
          <p className="mt-1 text-sm text-muted">
            {sortie.detenuNom} · {sortie.numeroEcrou}
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
        <Field label="Date du transfert" requis erreur={err("date_sortie")}>
          {(p) => <Input {...p} type="date" name="date_sortie" required defaultValue={v("date_sortie", sortie.dateSortie)} />}
        </Field>
        <Field label="Établissement de destination" requis erreur={err("destination")}>
          {(p) => <Input {...p} name="destination" required defaultValue={v("destination", sortie.destination)} />}
        </Field>
        <Field label="Motif du transfert" erreur={err("motif")}>
          {(p) => <Input {...p} name="motif" defaultValue={v("motif", sortie.motif)} />}
        </Field>
        <Field label="Observations" erreur={err("observation")}>
          {(p) => <Textarea {...p} name="observation" rows={3} defaultValue={v("observation", sortie.observation)} />}
        </Field>
        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
            Enregistrer
          </Button>
        </div>
      </form>
    </>
  );
}

/** Icône de modification du listing : corrige la destination, la date, le motif ou les observations. */
export function BoutonModifierTransfert({ sortie }: { sortie: SortieDetenu }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="edit"
        title="Modifier le transfert"
        aria-label="Modifier le transfert"
        className="w-8 rounded-full border-0 !bg-warning-soft px-0 !text-warning shadow-none hover:!bg-warning/20"
        onClick={() => setOuvert(true)}
      />
      <Modale open={ouvert} onClose={() => setOuvert(false)} className="max-w-md">
        <FormulaireModification sortie={sortie} onClose={() => setOuvert(false)} />
      </Modale>
    </>
  );
}
