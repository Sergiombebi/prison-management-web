"use client";

import { useActionState, useEffect, useId, useState } from "react";
import type { EvacuationSanitaire } from "@/lib/domain/types";
import type { EtatAction } from "@/lib/api/actions";
import { enregistrerRetourEvacuation } from "@/app/(app)/sante/evacuations/actions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";
import { RetourAction } from "@/components/ui/retour-action";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

function FormulaireRetour({ evacuation, onClose }: { evacuation: EvacuationSanitaire; onClose: () => void }) {
  const titleId = useId();
  const action = enregistrerRetourEvacuation.bind(null, evacuation.id, evacuation.detenuId);
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, {});
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  useEffect(() => {
    if (etat.ok) onClose();
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
            Marquer le retour
          </h2>
          <p className="mt-1 text-sm text-muted">
            {evacuation.detenuNom} · {evacuation.numeroEcrou} — parti le {formatDate(evacuation.dateDepart)}
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
        <Field label="Date de retour" requis erreur={err("date_retour")}>
          {(p) => <Input {...p} type="date" name="date_retour" required defaultValue={aujourdhui()} />}
        </Field>
        <Field label="Observations" erreur={err("observations_retour")}>
          {(p) => <Textarea {...p} name="observations_retour" rows={3} placeholder="Ex. Sortie autorisée par le médecin traitant" />}
        </Field>
        <div className="flex justify-end gap-2 border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
            Marquer le retour
          </Button>
        </div>
      </form>
    </>
  );
}

/** Icône du listing : enregistre le retour d'un détenu encore en évacuation. */
export function BoutonRetourEvacuation({ evacuation }: { evacuation: EvacuationSanitaire }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="check"
        title="Marquer le retour"
        aria-label="Marquer le retour"
        className="w-8 rounded-full border-0 !bg-success-soft px-0 !text-success shadow-none hover:!bg-success/20"
        onClick={() => setOuvert(true)}
      />
      <Modale open={ouvert} onClose={() => setOuvert(false)} className="max-w-md">
        <FormulaireRetour evacuation={evacuation} onClose={() => setOuvert(false)} />
      </Modale>
    </>
  );
}
