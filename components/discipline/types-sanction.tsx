"use client";

import { useActionState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { TypeSanction } from "@/lib/domain/types";
import { creerTypeSanction } from "@/app/(app)/discipline/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

type Action = (precedent: EtatAction, formulaire: FormData) => Promise<EtatAction>;

export function FormulaireTypeSanction() {
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(creerTypeSanction, {});

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <Field label="Libellé" requis aide="Tel qu’il apparaîtra dans la liste des sanctions" erreur={etat.erreurs?.libelle?.[0]}>
        {(p) => <Input {...p} name="libelle" required maxLength={150} defaultValue={etat.valeurs?.libelle} placeholder="Ex. Privation de promenade" />}
      </Field>
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="plus" chargement={enCours}>
          Ajouter le type
        </Button>
      </div>
    </form>
  );
}

/**
 * Une ligne = deux formulaires frères qui partagent la même action, liée à
 * l'identifiant par la page : renommer (état inchangé) et basculer (état inversé,
 * avec le libellé enregistré plutôt que la saisie en cours).
 */
export function LigneTypeSanction({ type, action }: { type: TypeSanction; action: Action }) {
  const [renommage, renommer, renommageEnCours] = useActionState<EtatAction, FormData>(action, {});
  const [bascule, basculer, basculeEnCours] = useActionState<EtatAction, FormData>(action, {});

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <form action={renommer} className="flex min-w-0 flex-1 items-start gap-2">
          <input type="hidden" name="est_actif" value={type.estActif ? "1" : "0"} />
          <div className="min-w-0 flex-1">
            <Input
              name="libelle"
              aria-label={`Libellé du type « ${type.libelle} »`}
              required
              maxLength={150}
              defaultValue={renommage.valeurs?.libelle ?? type.libelle}
              aria-invalid={Boolean(renommage.erreurs?.libelle) || undefined}
              className={type.estActif ? undefined : "text-muted"}
            />
          </div>
          <Button type="submit" chargement={renommageEnCours}>
            Renommer
          </Button>
        </form>

        <form action={basculer} className="flex items-center justify-between gap-2 sm:justify-end">
          <input type="hidden" name="libelle" value={type.libelle} />
          <input type="hidden" name="est_actif" value={type.estActif ? "0" : "1"} />
          <Badge ton={type.estActif ? "succes" : "neutre"}>{type.estActif ? "Actif" : "Désactivé"}</Badge>
          <Button type="submit" variante={type.estActif ? "discret" : "secondaire"} chargement={basculeEnCours}>
            {type.estActif ? "Désactiver" : "Réactiver"}
          </Button>
        </form>
      </div>
      <RetourAction etat={renommage} />
      <RetourAction etat={bascule} />
    </li>
  );
}
