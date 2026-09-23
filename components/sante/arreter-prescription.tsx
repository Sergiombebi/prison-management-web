"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { Prescription } from "@/lib/domain/types";
import type { EtatAction } from "@/lib/api/actions";
import { arreterPrescription } from "@/app/(app)/sante/traitements/actions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";
import { RetourAction } from "@/components/ui/retour-action";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

function FormulaireArret({ prescription, onClose }: { prescription: Prescription; onClose: () => void }) {
  const titleId = useId();
  const action = arreterPrescription.bind(null, prescription.id, prescription.detenuId);
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, {});
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  useEffect(() => {
    if (etat.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-danger-soft text-danger">
          <Icon name="close" size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            Arrêter le traitement
          </h2>
          <p className="mt-1 text-sm text-muted">
            {prescription.medicament} — {prescription.detenuNom} · {prescription.numeroEcrou}, débuté le{" "}
            {formatDate(prescription.dateDebut)}
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
        <Field label="Date d'arrêt" requis erreur={err("arrete_le")}>
          {(p) => <Input {...p} type="date" name="arrete_le" required defaultValue={aujourdhui()} />}
        </Field>
        <Field label="Motif" erreur={err("motif_arret")}>
          {(p) => <Textarea {...p} name="motif_arret" rows={3} placeholder="Ex. Effet indésirable (nausées)" />}
        </Field>
        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variante="danger" icone="close" chargement={enCours}>
            Arrêter le traitement
          </Button>
        </div>
      </form>
    </>
  );
}

/** Icône du listing : arrête un traitement encore en cours avant son terme. */
export function BoutonArreterPrescription({ prescription }: { prescription: Prescription }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="close"
        title="Arrêter le traitement"
        aria-label="Arrêter le traitement"
        className="w-8 rounded-full border-0 !bg-danger-soft px-0 !text-danger shadow-none hover:!bg-danger/20"
        onClick={() => setOuvert(true)}
      />
      <Modale open={ouvert} onClose={() => setOuvert(false)} className="max-w-md">
        <FormulaireArret prescription={prescription} onClose={() => setOuvert(false)} />
      </Modale>
    </>
  );
}
