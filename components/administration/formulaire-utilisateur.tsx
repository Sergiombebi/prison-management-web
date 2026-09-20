"use client";

import { useActionState, useId, useState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { Utilisateur } from "@/lib/domain/types";
import {
  MODULES_METIER,
  PERMISSION_SOCLE,
  TOUTES_PERMISSIONS,
  modulesAccordes,
  estAdministrateur,
  type CleModule,
} from "@/lib/domain/modules";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
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
 *
 * On n'attribue plus de rôle : l'administrateur ouvre des modules. Le rôle exigé
 * par l'API est déduit côté serveur (`roleImplicite`), sans passer par un champ.
 */
export function FormulaireUtilisateur({
  utilisateur,
  action,
  permissionsAccordables,
}: {
  utilisateur?: Utilisateur;
  action: (p: EtatAction, f: FormData) => Promise<EtatAction>;
  /** Permissions du compte connecté : on ne peut ouvrir que ce qu'on détient déjà. */
  permissionsAccordables: string[];
}) {
  const { etat, envoyer, enCours, v: saisie, err } = useFormulaire(action);
  const idAdmin = useId();
  const actuelles: Record<string, string | undefined> = utilisateur
    ? {
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        username: utilisateur.username,
        email: utilisateur.email ?? undefined,
      }
    : {};
  // Après une erreur, les saisies ; sinon, en modification, les valeurs enregistrées
  const v = (champ: string) => (etat.valeurs ? saisie(champ) : actuelles[champ]);

  // Cases gérées en état local : un champ répété (`modules[]`) ne survit pas à
  // `valeursSaisies`, qui ne garde qu'une valeur par nom de champ.
  const [modules, setModules] = useState<Set<CleModule>>(
    new Set(modulesAccordes(utilisateur?.permissions ?? [])),
  );
  const [administrateur, setAdministrateur] = useState(
    estAdministrateur(utilisateur?.permissions ?? []),
  );

  const basculer = (cle: CleModule) =>
    setModules((courants) => {
      const suivants = new Set(courants);
      if (suivants.has(cle)) suivants.delete(cle);
      else suivants.add(cle);
      return suivants;
    });

  // On ne peut ouvrir un module que si on en détient soi-même tous les droits :
  // l'API refuse (422) d'accorder une permission que l'on n'a pas.
  const peutAccorder = (permissions: string[]) =>
    permissions.every((p) => permissionsAccordables.includes(p));
  const peutAccorderAdmin = peutAccorder(TOUTES_PERMISSIONS);
  const socleDisponible = permissionsAccordables.includes(PERMISSION_SOCLE);

  const aucunAcces = !administrateur && modules.size === 0;

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
      {!utilisateur && (
        <Field label="Mot de passe" requis aide="8 caractères minimum" erreur={err("password")}>
          {(p) => <Input {...p} type="password" name="password" required minLength={8} />}
        </Field>
      )}

      <fieldset className="flex flex-col gap-2 border-t border-hairline pt-4">
        <legend className="sr-only">Accès aux modules</legend>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Accès aux modules</p>
          <p className="text-2xs text-muted">
            {administrateur
              ? "Tous les modules"
              : modules.size > 0
                ? `${modules.size} sur ${MODULES_METIER.length}`
                : "Aucun"}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Chaque module s’ouvre en entier : consultation et saisie. Un compte peut en
          cumuler plusieurs.
        </p>

        <div className="mt-1 grid gap-2">
          {MODULES_METIER.map((m) => {
            const coche = administrateur || modules.has(m.cle);
            const accordable = peutAccorder(m.permissions) && socleDisponible;
            return (
              <CarteAcces
                key={m.cle}
                cle={m.cle}
                label={m.label}
                resume={m.resume}
                capacites={m.capacites}
                icone={m.icone}
                teinte={m.teinte}
                coche={coche}
                /* Administrateur : tout est ouvert d'office, la case devient un simple témoin. */
                verrouille={administrateur}
                accordable={accordable}
                onChange={() => basculer(m.cle)}
              />
            );
          })}
        </div>

        {/* Les modules réellement soumis : `modules[]`. Quand l'administrateur est
            coché, le serveur ouvre tout et ignore cette liste — mais on la conserve
            pour retrouver la sélection si la case est décochée avant l'envoi. */}
        {[...modules].map((cle) => (
          <input key={cle} type="hidden" name="modules[]" value={cle} />
        ))}

        <label
          htmlFor={idAdmin}
          className={cn(
            "mt-2 flex items-start gap-3 rounded-lg border p-3 transition-colors",
            administrateur
              ? "border-accent/35 bg-accent-soft"
              : "border-hairline bg-sunken/50 hover:border-rule",
            !peutAccorderAdmin && "opacity-60",
          )}
          title={
            peutAccorderAdmin
              ? undefined
              : "Vous ne détenez pas tous les droits : vous ne pouvez pas créer d’administrateur."
          }
        >
          <input
            id={idAdmin}
            type="checkbox"
            name="administrateur"
            value="1"
            checked={administrateur}
            disabled={!peutAccorderAdmin}
            onChange={(e) => setAdministrateur(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--sgp-accent)] disabled:opacity-40"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Icon name="shield" size={14} className="text-accent" />
              Administrateur
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
              Ouvre en plus le tableau de bord général, l’édition d’états et
              l’administration — comptes du personnel et paramètres de l’établissement.
            </span>
          </span>
        </label>

        {aucunAcces && (
          <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-soft px-3 py-2 text-xs text-warning">
            <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
            Sans aucun module, la personne pourra se connecter mais n’ouvrira aucun écran.
          </p>
        )}
        {err("permissions") && (
          <p className="text-xs text-danger">{err("permissions")}</p>
        )}
      </fieldset>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone={utilisateur ? "check" : "plus"} chargement={enCours}>
          {utilisateur ? "Enregistrer" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Une case à cocher qui ressemble à ce qu'elle ouvre : la teinte du module, son
 * icône, et ce que la personne pourra faire — pour décider sans deviner.
 */
function CarteAcces({
  cle,
  label,
  resume,
  capacites,
  icone,
  teinte,
  coche,
  verrouille,
  accordable,
  onChange,
}: {
  cle: string;
  label: string;
  resume: string;
  capacites: string[];
  icone: string;
  teinte: { trait: string; voile: string };
  coche: boolean;
  verrouille: boolean;
  accordable: boolean;
  onChange: () => void;
}) {
  const id = `acces-${cle}`;
  return (
    <label
      htmlFor={id}
      style={{ ["--teinte" as string]: teinte.trait, ["--voile" as string]: teinte.voile }}
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 overflow-hidden rounded-lg border p-3",
        "transition-[border-color,background-color,box-shadow] duration-[var(--dur-base)]",
        coche
          ? "border-[color:var(--teinte)]/40 bg-[color:var(--voile)] shadow-e1"
          : "border-hairline bg-surface hover:border-rule",
        (!accordable || verrouille) && "cursor-default opacity-70",
      )}
      title={accordable ? undefined : "Vous ne détenez pas tous les droits de ce module."}
    >
      {/* Filet de teinte : il se déroule depuis le haut quand le module s'ouvre */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] origin-top bg-[color:var(--teinte)]",
          "transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spring)]",
          coche ? "scale-y-100" : "scale-y-0",
        )}
      />
      <input
        id={id}
        type="checkbox"
        checked={coche}
        disabled={!accordable || verrouille}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-[color:var(--teinte)] disabled:opacity-50"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-6 shrink-0 place-items-center rounded-md text-[color:var(--teinte)] ring-1 ring-inset ring-[color:var(--teinte)]/25"
            style={{ backgroundColor: "var(--voile)" }}
          >
            <Icon name={icone as never} size={13} />
          </span>
          <span className="text-sm font-medium text-ink">{label}</span>
        </span>
        <span className="mt-1 block text-xs text-muted">{resume}</span>
        {/* Le détail n'apparaît qu'une fois le module ouvert : la liste reste lisible */}
        <span
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
            coche ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <span className="overflow-hidden">
            <span className="flex flex-col gap-1">
              {capacites.map((c) => (
                <span key={c} className="flex items-start gap-1.5 text-2xs text-muted">
                  <Icon name="check" size={11} className="mt-0.5 shrink-0 text-[color:var(--teinte)]" />
                  {c}
                </span>
              ))}
            </span>
          </span>
        </span>
      </span>
    </label>
  );
}
