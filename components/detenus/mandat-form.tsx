"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import {
  AUTORITES_PENITENTIAIRES,
  ETATS_PHYSIQUES_ARRIVEE,
  TYPES_MANDAT,
  TYPES_STATUT_PENAL,
} from "@/lib/domain/referentiels";
import type { MandatDetaille } from "@/lib/api";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormSection, Pleine } from "@/components/ui/form-section";
import { Icon } from "@/components/ui/icon";
import {
  faireEvoluerMandat,
  type EtatMandat,
} from "@/app/(app)/detenus/[id]/mandats/[mandatId]/actions";

/** Ce que devient le détenu une fois le mandat enregistré sous ce statut. */
const EFFET: Record<string, string> = {
  "Détention provisoire": "Le détenu reste prévenu tant que tous ses mandats actifs sont provisoires.",
  "Exécution de peine":
    "Le détenu devient condamné — ou DPAC s’il a plusieurs mandats actifs en parallèle.",
  Appellant: "Le détenu passe en appel, sauf s’il a par ailleurs une exécution de peine active.",
  Cassationnaire:
    "Le détenu passe en cassation, sauf s’il a par ailleurs une exécution de peine active.",
};

/**
 * Évolution d'un mandat.
 *
 * Mêmes rubriques conditionnelles que la fiche d'enregistrement : le statut pénal
 * choisi commande les champs devenus obligatoires.
 */
export function MandatForm({ mandat }: { mandat: MandatDetaille }) {
  const [etat, action, enCours] = useActionState<EtatMandat, FormData>(faireEvoluerMandat, {});
  const [statutPenal, setStatutPenal] = useState(mandat.typeStatutPenal ?? "");

  const avecJugement = ["Exécution de peine", "Appellant", "Cassationnaire"].includes(statutPenal);
  const avecAppel = statutPenal === "Appellant";
  const avecCassation = statutPenal === "Cassationnaire";

  const v = (champ: string, initial: string | null | undefined) =>
    etat.valeurs?.[champ] ?? initial ?? "";
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="mandat_id" value={mandat.id} />
      <input type="hidden" name="detenu_id" value={mandat.detenuId} />

      {etat.message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3.5 text-sm text-danger animate-rise"
        >
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {etat.message}
        </div>
      )}

      <FormSection
        numero="01"
        titre="Statut pénal"
        description="Changer le statut fait basculer le détenu de catégorie : le classement est recalculé par le serveur."
      >
        <Pleine>
          <Field label="Statut pénal" requis erreur={err("type_statut_penal")}>
            {(p) => (
              <Select
                {...p}
                name="type_statut_penal"
                value={statutPenal}
                onChange={(e) => setStatutPenal(e.target.value)}
                placeholder="Sélectionner le statut…"
              >
                {TYPES_STATUT_PENAL.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
        </Pleine>
        {statutPenal && EFFET[statutPenal] && (
          <Pleine>
            <p className="flex items-start gap-2 rounded-lg border border-hairline bg-raised px-3 py-2.5 text-sm text-muted">
              <Icon name="info" size={15} className="mt-0.5 shrink-0 text-accent" />
              {EFFET[statutPenal]}
            </p>
          </Pleine>
        )}
      </FormSection>

      <FormSection numero="02" titre="Titre de détention" description="Les informations du mandat lui-même.">
        <Field label="Date d’incarcération" requis erreur={err("date_incarceration")}>
          {(p) => (
            <Input {...p} type="date" name="date_incarceration" defaultValue={v("date_incarceration", mandat.dateIncarceration?.slice(0, 10))} />
          )}
        </Field>
        <Field label="Type de mandat" requis erreur={err("type_mandat")}>
          {(p) => (
            <Select {...p} name="type_mandat" defaultValue={v("type_mandat", mandat.typeMandat)} placeholder="Sélectionner…">
              {TYPES_MANDAT.map((s) => (
                <option key={s}>{s}</option>
              ))}
              {mandat.typeMandat && !TYPES_MANDAT.includes(mandat.typeMandat as (typeof TYPES_MANDAT)[number]) && (
                <option>{mandat.typeMandat}</option>
              )}
            </Select>
          )}
        </Field>
        <Field label="Référence du mandat" requis erreur={err("reference_mandat")}>
          {(p) => <Input {...p} name="reference_mandat" defaultValue={v("reference_mandat", mandat.referenceMandat)} className="font-mono" />}
        </Field>
        <Field label="Autorité ayant signé" requis erreur={err("autorite_signataire")}>
          {(p) => <Input {...p} name="autorite_signataire" defaultValue={v("autorite_signataire", mandat.autoriteSignataire)} />}
        </Field>
        <Field label="Date de signature" requis erreur={err("date_signature_mandat")}>
          {(p) => <Input {...p} type="date" name="date_signature_mandat" defaultValue={v("date_signature_mandat", mandat.dateSignatureMandat?.slice(0, 10))} />}
        </Field>
        <Field label="Date d’expiration" requis erreur={err("date_expiration_mandat")}>
          {(p) => <Input {...p} type="date" name="date_expiration_mandat" defaultValue={v("date_expiration_mandat", mandat.dateSortieMandat?.slice(0, 10))} />}
        </Field>
        <Pleine>
          <Field label="Motif de détention" requis erreur={err("motif_detention")}>
            {(p) => <Input {...p} name="motif_detention" defaultValue={v("motif_detention", mandat.motifDetention)} />}
          </Field>
        </Pleine>
        <Field label="Autorité pénitentiaire" erreur={err("autorite_penitentiaire")}>
          {(p) => (
            <Select {...p} name="autorite_penitentiaire" defaultValue={v("autorite_penitentiaire", mandat.autoritePenitentiaire)}>
              <option value="">Non renseignée</option>
              {AUTORITES_PENITENTIAIRES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="État physique à l’arrivée" erreur={err("etat_physique_arrivee")}>
          {(p) => (
            <Select {...p} name="etat_physique_arrivee" defaultValue={v("etat_physique_arrivee", mandat.etatPhysiqueArrivee)}>
              <option value="">Non renseigné</option>
              {ETATS_PHYSIQUES_ARRIVEE.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          )}
        </Field>
        <Pleine>
          <Field label="Objets personnels" erreur={err("objets_personnels")}>
            {(p) => <Textarea {...p} name="objets_personnels" rows={2} defaultValue={v("objets_personnels", mandat.objetsPersonnels)} />}
          </Field>
        </Pleine>
      </FormSection>

      <FormSection numero="03" titre="Procédure judiciaire" description="Ces rubriques s’ouvrent selon le statut choisi.">
        <Rubrique ouverte={avecJugement} titre="Jugement">
          <Field label="Date du jugement" requis={avecJugement} erreur={err("date_jugement")}>
            {(p) => <Input {...p} type="date" name="date_jugement" defaultValue={v("date_jugement", mandat.dateJugement?.slice(0, 10))} disabled={!avecJugement} />}
          </Field>
          <Field label="Référence du jugement" requis={avecJugement} erreur={err("reference_jugement")}>
            {(p) => <Input {...p} name="reference_jugement" defaultValue={v("reference_jugement", mandat.referenceJugement)} className="font-mono" disabled={!avecJugement} />}
          </Field>
          <Field label="Tribunal" requis={avecJugement} erreur={err("tribunal_jugement")}>
            {(p) => <Input {...p} name="tribunal_jugement" defaultValue={v("tribunal_jugement", mandat.tribunalJugement)} disabled={!avecJugement} />}
          </Field>
          <Field label="Motif du jugement" requis={avecJugement} erreur={err("motif_jugement")}>
            {(p) => <Input {...p} name="motif_jugement" defaultValue={v("motif_jugement", mandat.motifJugement)} disabled={!avecJugement} />}
          </Field>
          <Pleine>
            <Field label="Peine prononcée" requis={avecJugement} erreur={err("peine_prononcee")}>
              {(p) => <Textarea {...p} name="peine_prononcee" rows={2} defaultValue={v("peine_prononcee", mandat.peinePrononcee)} disabled={!avecJugement} />}
            </Field>
          </Pleine>
        </Rubrique>

        <Rubrique ouverte={avecAppel} titre="Appel">
          <Field label="Date de l’appel" requis={avecAppel} erreur={err("date_appel")}>
            {(p) => <Input {...p} type="date" name="date_appel" defaultValue={v("date_appel", mandat.dateAppel?.slice(0, 10))} disabled={!avecAppel} />}
          </Field>
          <Field label="Juridiction d’appel" requis={avecAppel} erreur={err("tribunal_appel")}>
            {(p) => <Input {...p} name="tribunal_appel" defaultValue={v("tribunal_appel", mandat.tribunalAppel ?? "Cour d’Appel du Centre")} disabled={!avecAppel} />}
          </Field>
          <Pleine>
            <Field label="Décision en appel" requis={avecAppel} erreur={err("decision_appel")}>
              {(p) => <Input {...p} name="decision_appel" defaultValue={v("decision_appel", mandat.decisionAppel)} disabled={!avecAppel} />}
            </Field>
          </Pleine>
        </Rubrique>

        <Rubrique ouverte={avecCassation} titre="Cassation">
          <Field label="Date du pourvoi" requis={avecCassation} erreur={err("date_cassation")}>
            {(p) => <Input {...p} type="date" name="date_cassation" defaultValue={v("date_cassation", mandat.dateCassation?.slice(0, 10))} disabled={!avecCassation} />}
          </Field>
          <Field label="Juridiction" requis={avecCassation} erreur={err("tribunal_cassation")}>
            {(p) => <Input {...p} name="tribunal_cassation" defaultValue={v("tribunal_cassation", mandat.tribunalCassation ?? "Cour Suprême")} disabled={!avecCassation} />}
          </Field>
          <Pleine>
            <Field label="Décision de cassation" requis={avecCassation} erreur={err("decision_cassation")}>
              {(p) => <Input {...p} name="decision_cassation" defaultValue={v("decision_cassation", mandat.decisionCassation)} disabled={!avecCassation} />}
            </Field>
          </Pleine>
        </Rubrique>

        <Pleine>
          <Field label="Observations" erreur={err("observations_statut")}>
            {(p) => <Textarea {...p} name="observations_statut" rows={2} defaultValue={v("observations_statut", mandat.observationsStatut)} />}
          </Field>
        </Pleine>
      </FormSection>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 rounded-lg border border-hairline bg-surface p-5 shadow-e1 sm:flex-row sm:items-center">
        <ButtonLink href={`/detenus/${mandat.detenuId}?onglet=mandats`} variante="discret" icone="arrowLeft" transitionTypes={["nav-back"]}>
          Annuler
        </ButtonLink>
        <Button type="submit" variante="primaire" icone="check" chargement={enCours} taille="lg">
          {enCours ? "Enregistrement…" : "Enregistrer l’évolution"}
        </Button>
      </div>
    </form>
  );
}

function Rubrique({
  ouverte,
  titre,
  children,
}: {
  ouverte: boolean;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden={!ouverte}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)] sm:col-span-2",
        ouverte ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">
        <fieldset disabled={!ouverte} className="rounded-lg border border-hairline bg-raised p-4">
          <legend className="px-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">
            {titre}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
      </div>
    </div>
  );
}
