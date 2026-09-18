"use client";

import { useActionState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { ProfilSession } from "@/lib/session";
import { modifierProfil } from "@/app/(app)/profil/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

/** Identité du compte connecté — jamais le rôle ni les permissions, réservés à qui gère le personnel. */
export function FormulaireProfil({
  profil,
  email,
  username,
}: {
  profil: ProfilSession;
  email: string | null;
  username: string;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(modifierProfil, {});
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];
  const v = (champ: string, defaut: string) => etat.valeurs?.[champ] ?? defaut;

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom" requis erreur={err("nom")}>
          {(p) => <Input {...p} name="nom" defaultValue={v("nom", profil.nom)} required />}
        </Field>
        <Field label="Prénom" requis erreur={err("prenom")}>
          {(p) => <Input {...p} name="prenom" defaultValue={v("prenom", profil.prenom)} required />}
        </Field>
      </div>
      <Field label="Nom d’utilisateur" requis aide="Sert à la connexion, avec l’email" erreur={err("username")}>
        {(p) => <Input {...p} name="username" defaultValue={v("username", username)} required className="font-mono" />}
      </Field>
      <Field label="Email" requis erreur={err("email")}>
        {(p) => <Input {...p} type="email" name="email" defaultValue={v("email", email ?? "")} required />}
      </Field>
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
