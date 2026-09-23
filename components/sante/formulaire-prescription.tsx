"use client";

import { useActionState } from "react";
import type { DetenuResume } from "@/lib/domain/types";
import { enregistrerPrescription, type EtatPrescription } from "@/app/(app)/sante/traitements/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Prescrit un traitement à un détenu. */
export function FormulairePrescription({
  detenus,
  detenuInitial,
}: {
  detenus: DetenuResume[];
  detenuInitial?: number;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatPrescription, FormData>(enregistrerPrescription, {});
  // Le formulaire redémarre vierge après un enregistrement réussi : la saisie
  // précédente n'a plus lieu d'être reproposée pour la prochaine prescription.
  const v = (champ: string) => (etat.ok ? undefined : etat.valeurs?.[champ]);
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  return (
    <form key={etat.prescriptionId ?? "form"} action={envoyer} className="flex flex-col gap-4">
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

      <Field label="Médicament" requis erreur={err("medicament")}>
        {(p) => <Input {...p} name="medicament" required defaultValue={v("medicament")} placeholder="Ex. Paracétamol" />}
      </Field>

      <Field label="Posologie" requis erreur={err("posologie")}>
        {(p) => <Input {...p} name="posologie" required defaultValue={v("posologie")} placeholder="Ex. 500mg, 2 fois par jour" />}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date de début" requis erreur={err("date_debut")}>
          {(p) => <Input {...p} type="date" name="date_debut" required defaultValue={v("date_debut") ?? aujourdhui()} />}
        </Field>
        <Field label="Date de fin" erreur={err("date_fin")}>
          {(p) => <Input {...p} type="date" name="date_fin" defaultValue={v("date_fin")} />}
        </Field>
      </div>

      <Field label="Prescripteur" requis erreur={err("prescripteur")}>
        {(p) => <Input {...p} name="prescripteur" required defaultValue={v("prescripteur")} placeholder="Ex. Dr Ekotto" />}
      </Field>

      <Field label="Observations" erreur={err("observations")}>
        {(p) => <Textarea {...p} name="observations" rows={2} defaultValue={v("observations")} />}
      </Field>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="sante" chargement={enCours}>
          Prescrire
        </Button>
      </div>
    </form>
  );
}
