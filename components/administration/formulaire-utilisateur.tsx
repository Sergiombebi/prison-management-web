"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { Utilisateur } from "@/lib/domain/types";
import { LIBELLE_ROLE, PERMISSIONS, ROLES_UTILISATEUR } from "@/lib/domain/referentiels";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  permissionsAccordables,
}: {
  utilisateur?: Utilisateur;
  action: (p: EtatAction, f: FormData) => Promise<EtatAction>;
  /** Permissions du compte connecté : on ne peut cocher que celles qu'on détient déjà. */
  permissionsAccordables: string[];
}) {
  const { etat, envoyer, enCours, v: saisie, err } = useFormulaire(action);
  const dialoguePermissions = useRef<HTMLDialogElement>(null);
  const idTitrePermissions = useId();
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

  // Cases à cocher gérées en état local : un champ répété (`permissions[]`) ne survit
  // pas tel quel à `valeursSaisies` (qui ne garde qu'une valeur par nom de champ), et
  // l'état local traverse de toute façon les allers-retours de l'action sans y perdre
  // la sélection en cours.
  const [permissionsCochees, setPermissionsCochees] = useState<Set<string>>(
    new Set(utilisateur?.permissions ?? []),
  );
  const basculer = (cle: string) =>
    setPermissionsCochees((courantes) => {
      const suivantes = new Set(courantes);
      if (suivantes.has(cle)) suivantes.delete(cle);
      else suivantes.add(cle);
      return suivantes;
    });

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

      <Field label="Permissions" erreur={err("permissions")}>
        {() => (
          <div className="flex flex-col gap-2">
            {permissionsCochees.size > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...permissionsCochees].slice(0, 4).map((cle) => (
                  <Badge key={cle} ton="neutre">
                    {PERMISSIONS.flatMap((g) => g.permissions).find((p) => p.cle === cle)?.label ?? cle}
                  </Badge>
                ))}
                {permissionsCochees.size > 4 && <Badge ton="neutre">+{permissionsCochees.size - 4}</Badge>}
              </div>
            ) : (
              <p className="text-sm text-muted">Aucune permission accordée.</p>
            )}
            <Button
              type="button"
              variante="secondaire"
              taille="sm"
              icone="shield"
              className="self-start"
              onClick={() => dialoguePermissions.current?.showModal()}
            >
              Gérer les permissions
            </Button>
          </div>
        )}
      </Field>

      <dialog
        ref={dialoguePermissions}
        aria-labelledby={idTitrePermissions}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-hairline bg-surface p-0 text-ink shadow-e4 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 id={idTitrePermissions} className="text-md font-semibold">
            Permissions accordées
          </h2>
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {PERMISSIONS.map((groupe) => (
              <div key={groupe.module} className="flex flex-col gap-1.5">
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{groupe.module}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {groupe.permissions.map(({ cle, label }) => {
                    const accordable = permissionsAccordables.includes(cle);
                    const cochee = permissionsCochees.has(cle);
                    return (
                      <label
                        key={cle}
                        className="flex items-start gap-2 text-sm text-ink"
                        title={accordable ? undefined : "Vous ne détenez pas cette permission : vous ne pouvez pas l’accorder ni la retirer."}
                      >
                        <input
                          type="checkbox"
                          name={accordable ? "permissions[]" : undefined}
                          value={cle}
                          checked={cochee}
                          onChange={() => basculer(cle)}
                          disabled={!accordable}
                          className="mt-0.5 size-4 accent-[var(--sgp-accent)] disabled:opacity-40"
                        />
                        {/* Un champ désactivé ne part pas dans le formulaire : si la personne
                            détenait déjà une permission que je n'ai pas moi-même, on la
                            reconduit telle quelle plutôt que de la lui retirer sans le vouloir. */}
                        {!accordable && cochee && <input type="hidden" name="permissions[]" value={cle} />}
                        <span className={accordable ? undefined : "text-faint"}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-hairline pt-4">
            <Button type="button" variante="primaire" onClick={() => dialoguePermissions.current?.close()}>
              Terminé
            </Button>
          </div>
        </div>
      </dialog>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone={utilisateur ? "check" : "plus"} chargement={enCours}>
          {utilisateur ? "Enregistrer" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}
