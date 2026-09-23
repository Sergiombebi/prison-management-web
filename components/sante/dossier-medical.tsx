"use client";

import { useActionState } from "react";
import type { EvacuationSanitaire } from "@/lib/domain/types";
import type { EtatAction } from "@/lib/api/actions";
import { modifierDossierMedical } from "@/app/(app)/detenus/[id]/actions";
import { formatDate, ouVide } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { DataPair } from "@/components/ui/surface";
import { RetourAction } from "@/components/ui/retour-action";

/** Ce dont `EtatSante` a besoin — satisfait aussi bien par `Detenu` que par `FicheMedicale`. */
interface SanteDetenu {
  id: number;
  groupeSanguin: string | null;
  allergies: string | null;
  maladiesChroniques: string | null;
  traitementEnCours: string | null;
}

/**
 * État de santé persistant — indépendant de toute consultation, contrairement à
 * l'historique en dessous. `modifiable` bascule entre le formulaire d'édition et
 * une simple lecture, selon que l'utilisateur détient `sante.dossier_medical.gerer`.
 * Utilisé aussi bien depuis la fiche détenu que depuis le dossier médical dédié.
 */
export function EtatSante({ detenu, modifiable }: { detenu: SanteDetenu; modifiable: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <DataPair label="Traitement en cours">
        {detenu.traitementEnCours ?? <span className="text-faint">Aucun traitement actif</span>}
      </DataPair>

      {modifiable ? (
        <FormulaireEtatSante detenu={detenu} />
      ) : (
        <dl className="grid gap-x-6 gap-y-4 border-t border-hairline pt-5 sm:grid-cols-2">
          <DataPair label="Groupe sanguin" mono>{ouVide(detenu.groupeSanguin)}</DataPair>
          <DataPair label="Allergies connues">{ouVide(detenu.allergies)}</DataPair>
          <DataPair label="Maladies chroniques">{ouVide(detenu.maladiesChroniques)}</DataPair>
        </dl>
      )}
    </div>
  );
}

function FormulaireEtatSante({ detenu }: { detenu: SanteDetenu }) {
  const action = modifierDossierMedical.bind(null, detenu.id);
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, {});
  const v = (champ: string, defaut: string | null) => etat.valeurs?.[champ] ?? defaut ?? "";
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  return (
    <form action={envoyer} className="flex flex-col gap-4 border-t border-hairline pt-5">
      <RetourAction etat={etat} />
      <Field label="Groupe sanguin" erreur={err("groupe_sanguin")}>
        {(p) => (
          <Input
            {...p}
            name="groupe_sanguin"
            className="max-w-32 font-mono"
            defaultValue={v("groupe_sanguin", detenu.groupeSanguin)}
            placeholder="Ex. O+"
          />
        )}
      </Field>
      <Field label="Allergies connues" erreur={err("allergies")}>
        {(p) => <Textarea {...p} name="allergies" rows={2} defaultValue={v("allergies", detenu.allergies)} placeholder="Ex. Pénicilline" />}
      </Field>
      <Field label="Maladies chroniques" erreur={err("maladies_chroniques")}>
        {(p) => <Textarea {...p} name="maladies_chroniques" rows={2} defaultValue={v("maladies_chroniques", detenu.maladiesChroniques)} placeholder="Ex. Asthme, diabète" />}
      </Field>
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/** Bandeau visible depuis n'importe quel onglet ou page du dossier : le détenu est hors de l'établissement. */
export function AlerteEvacuation({
  evacuation,
}: {
  evacuation: Pick<EvacuationSanitaire, "dateDepart" | "structureDestination" | "motif">;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3.5 animate-rise">
      <Icon name="pulse" size={17} className="mt-0.5 shrink-0 text-warning" />
      <div>
        <p className="text-sm font-medium text-ink">En évacuation sanitaire</p>
        <p className="mt-0.5 text-sm text-muted">
          Parti le {formatDate(evacuation.dateDepart)} vers {evacuation.structureDestination}
          {evacuation.motif ? ` — ${evacuation.motif}` : ""}. Le détenu garde sa cellule et reste présent dans
          l’effectif.
        </p>
      </div>
    </div>
  );
}
