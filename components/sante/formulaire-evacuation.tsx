"use client";

import { useActionState } from "react";
import type { DetenuOption } from "@/lib/domain/types";
import { enregistrerEvacuation, type EtatEvacuation } from "@/app/(app)/sante/evacuations/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Enregistre le départ d'un détenu en évacuation sanitaire. */
export function FormulaireEvacuation({
  detenus,
  detenuInitial,
}: {
  detenus: DetenuOption[];
  detenuInitial?: number;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatEvacuation, FormData>(enregistrerEvacuation, {});
  // Le formulaire redémarre vierge après un enregistrement réussi : la saisie
  // précédente n'a plus lieu d'être reproposée pour la prochaine évacuation.
  const v = (champ: string) => (etat.ok ? undefined : etat.valeurs?.[champ]);
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  return (
    <form key={etat.evacuationId ?? "form"} action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />

      <Field label="Détenu concerné" requis erreur={err("detenu_id")}>
        {(p) => (
          <Select
            {...p}
            name="detenu_id"
            required
            defaultValue={v("detenu_id") ?? (detenuInitial ? String(detenuInitial) : "")}
            placeholder="Sélectionner un détenu…"
          >
            {detenus.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom} — {d.numeroEcrou}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Date de départ" requis erreur={err("date_depart")}>
        {(p) => <Input {...p} type="date" name="date_depart" required defaultValue={v("date_depart") ?? aujourdhui()} />}
      </Field>

      <Field label="Structure hospitalière de destination" requis erreur={err("structure_destination")}>
        {(p) => <Input {...p} name="structure_destination" required defaultValue={v("structure_destination")} placeholder="Ex. Hôpital Central de Yaoundé" />}
      </Field>

      <Field label="Motif" erreur={err("motif")}>
        {(p) => <Textarea {...p} name="motif" rows={2} defaultValue={v("motif")} placeholder="Ex. Douleurs abdominales aiguës" />}
      </Field>

      <Field label="Escorte" erreur={err("escorte")}>
        {(p) => <Input {...p} name="escorte" defaultValue={v("escorte")} placeholder="Ex. Brigadier Nkolo" />}
      </Field>

      <Field label="Observations" erreur={err("observations_depart")}>
        {(p) => <Textarea {...p} name="observations_depart" rows={2} defaultValue={v("observations_depart")} />}
      </Field>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="pulse" chargement={enCours}>
          Enregistrer l’évacuation
        </Button>
      </div>
    </form>
  );
}
