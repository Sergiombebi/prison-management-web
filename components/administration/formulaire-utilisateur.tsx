"use client";

import { useActionState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { Utilisateur } from "@/lib/domain/types";
import { LIBELLE_ROLE, ROLES_UTILISATEUR } from "@/lib/domain/referentiels";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

/*
 * Les champs portent les noms de l'API : une erreur 422 se replace directement
 * sous le bon champ. Après une erreur, les saisies reviennent du serveur ; après
 * un succès, React vide le formulaire pour la saisie suivante.
 */

function useFormulaire(action: (p: EtatAction, f: FormData) => Promise<EtatAction>) {
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, {});
  return {
    etat,
    envoyer,
    enCours,
    v: (champ: string) => etat.valeurs?.[champ],
    err: (champ: string) => etat.erreurs?.[champ]?.[0],
  };
}

/**
 * Création, ou modification quand `utilisateur` est fourni. La page remonte le
 * composant (`key`) en changeant de compte, pour repartir d'un état propre.
 */
export function FormulaireUtilisateur({
  utilisateur,
  action,
}: {
  utilisateur?: Utilisateur;
  action: (p: EtatAction, f: FormData) => Promise<EtatAction>;
}) {
  const { etat, envoyer, enCours, v: saisie, err } = useFormulaire(action);
  const actuelles: Record<string, string | undefined> = utilisateur
    ? {
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        username: utilisateur.username,
        email: utilisateur.email ?? undefined,
        role: utilisateur.role,
      }
    : {};
  // Après une erreur, les saisies ; sinon, en modification, les valeurs enregistrées
  const v = (champ: string) => (etat.valeurs ? saisie(champ) : actuelles[champ]);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" requis erreur={err("nom")}>
          {(p) => <Input {...p} name="nom" defaultValue={v("nom")} required />}
        </Field>
        <Field label="Prénom" requis erreur={err("prenom")}>
          {(p) => <Input {...p} name="prenom" defaultValue={v("prenom")} required />}
        </Field>
      </div>
      <Field label="Nom d’utilisateur" requis aide="Sert à la connexion, avec l’email" erreur={err("username")}>
        {(p) => <Input {...p} name="username" defaultValue={v("username")} required className="font-mono" />}
      </Field>
      <Field label="Email" requis erreur={err("email")}>
        {(p) => <Input {...p} type="email" name="email" defaultValue={v("email")} required />}
      </Field>
      <Field label="Rôle" requis erreur={err("role")}>
        {(p) => (
          <Select {...p} name="role" defaultValue={v("role") ?? ""} placeholder={utilisateur ? undefined : "Choisir…"}>
            {ROLES_UTILISATEUR.map((r) => (
              <option key={r} value={r}>
                {LIBELLE_ROLE[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {!utilisateur && (
        <Field label="Mot de passe" requis aide="8 caractères minimum" erreur={err("password")}>
          {(p) => <Input {...p} type="password" name="password" required minLength={8} />}
        </Field>
      )}
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone={utilisateur ? "check" : "plus"} chargement={enCours}>
          {utilisateur ? "Enregistrer" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}
