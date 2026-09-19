"use client";

import { useActionState, useRef, useState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { DetenuResume } from "@/lib/domain/types";
import {
  DUREES_VISITE,
  LIENS_PARENTE,
  PIECES_IDENTITE,
  SEXES,
  TYPES_CONSULTATION,
  TYPES_VISITE,
} from "@/lib/domain/referentiels";
import { enregistrerConsultation, enregistrerVisite } from "@/app/(app)/sante/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";

/*
 * Champs nommés comme ceux de l'API : une erreur 422 se replace directement sous
 * le bon champ. Les listes viennent des référentiels partagés avec l'API, qui les
 * valide strictement (`Rule::in`).
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

function ChampDetenu({
  detenus,
  valeur,
  erreur,
  initial,
  label,
}: {
  detenus: DetenuResume[];
  valeur?: string;
  erreur?: string;
  initial?: number;
  label: string;
}) {
  return (
    <Field label={label} requis erreur={erreur}>
      {(p) => (
        <Select
          {...p}
          name="detenu_id"
          required
          defaultValue={valeur ?? (initial ? String(initial) : "")}
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
  );
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Champs du premier écran de `FormulaireVisite` : y renvoyer si une erreur les concerne. */
const CHAMPS_ETAPE_VISITE = new Set([
  "detenu_id",
  "date_visite",
  "heure_arrivee",
  "duree_prevue_minutes",
  "type_visite",
  "lieu_visite",
  "nom_visiteur",
  "sexe_visiteur",
  "lien_parente",
  "type_piece_identite",
  "numero_piece_identite",
  "telephone_visiteur",
  "adresse_visiteur",
]);

function Etapes({ actuelle, total }: { actuelle: number; total: number }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted">
      Étape {actuelle} sur {total}
    </p>
  );
}

// ---------------------------------------------------------------------------

export function FormulaireConsultation({
  detenus,
  detenuInitial,
}: {
  detenus: DetenuResume[];
  detenuInitial?: number;
}) {
  const { etat, envoyer, enCours, v, err } = useFormulaire(enregistrerConsultation);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <ChampDetenu label="Détenu" detenus={detenus} valeur={v("detenu_id")} erreur={err("detenu_id")} initial={detenuInitial} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" requis erreur={err("date_consultation")}>
          {(p) => (
            <Input {...p} type="date" name="date_consultation" required defaultValue={v("date_consultation") ?? aujourdhui()} />
          )}
        </Field>
        <Field label="Type" requis erreur={err("type_consultation")}>
          {(p) => (
            <Select {...p} name="type_consultation" required defaultValue={v("type_consultation") ?? ""} placeholder="Choisir…">
              {TYPES_CONSULTATION.map((ty) => (
                <option key={ty}>{ty}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Médecin" requis erreur={err("nom_medecin")}>
        {(p) => <Input {...p} name="nom_medecin" required defaultValue={v("nom_medecin")} placeholder="Dr …" />}
      </Field>

      <fieldset className="grid grid-cols-3 gap-3">
        <legend className="sr-only">Constantes</legend>
        <Field label="Temp. (°C)" erreur={err("temperature")}>
          {(p) => <Input {...p} name="temperature" inputMode="decimal" defaultValue={v("temperature")} placeholder="37,0" />}
        </Field>
        <Field label="Tension" erreur={err("tension_arterielle")}>
          {(p) => <Input {...p} name="tension_arterielle" defaultValue={v("tension_arterielle")} placeholder="12/8" />}
        </Field>
        <Field label="Poids (kg)" erreur={err("poids")}>
          {(p) => <Input {...p} name="poids" inputMode="decimal" defaultValue={v("poids")} />}
        </Field>
      </fieldset>

      <Field label="Symptômes" requis erreur={err("symptomes")}>
        {(p) => <Textarea {...p} name="symptomes" rows={2} required defaultValue={v("symptomes")} />}
      </Field>
      <Field label="Diagnostic" requis erreur={err("diagnostic")}>
        {(p) => <Input {...p} name="diagnostic" required maxLength={255} defaultValue={v("diagnostic")} />}
      </Field>
      <Field label="Médicaments prescrits" erreur={err("medicaments_prescrits")}>
        {(p) => <Textarea {...p} name="medicaments_prescrits" rows={2} defaultValue={v("medicaments_prescrits")} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Durée du traitement" erreur={err("duree_traitement")}>
          {(p) => <Input {...p} name="duree_traitement" defaultValue={v("duree_traitement")} placeholder="7 jours" />}
        </Field>
        <Field label="Date de suivi" aide="Prochaine visite médicale" erreur={err("date_suivi")}>
          {(p) => <Input {...p} type="date" name="date_suivi" defaultValue={v("date_suivi")} />}
        </Field>
      </div>

      <Field label="Observations" erreur={err("observations")}>
        {(p) => <Textarea {...p} name="observations" rows={2} defaultValue={v("observations")} />}
      </Field>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="pulse" chargement={enCours}>
          Enregistrer la consultation
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormulaireVisite({
  detenus,
  detenuInitial,
}: {
  detenus: DetenuResume[];
  detenuInitial?: number;
}) {
  const { etat, envoyer, enCours, v, err } = useFormulaire(enregistrerVisite);
  const forme = useRef<HTMLFormElement>(null);
  const [etape, setEtape] = useState<1 | 2>(1);

  // Une erreur sur un champ de l'étape 1 (ex. numéro de pièce déjà pris) doit
  // ramener dessus, sinon le message apparaît sans que le champ soit visible.
  // Ajustée pendant le rendu plutôt que dans un effet : `etat` ne change qu'au
  // retour d'une soumission, jamais en continu.
  const [dernierEtat, setDernierEtat] = useState(etat);
  if (etat !== dernierEtat) {
    setDernierEtat(etat);
    if (etat.erreurs && Object.keys(etat.erreurs).some((champ) => CHAMPS_ETAPE_VISITE.has(champ))) {
      setEtape(1);
    }
  }

  return (
    <form ref={forme} action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <Etapes actuelle={etape} total={2} />

      <div className={etape === 1 ? "flex flex-col gap-4" : "hidden"}>
      <ChampDetenu label="Détenu visité" detenus={detenus} valeur={v("detenu_id")} erreur={err("detenu_id")} initial={detenuInitial} />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Date" requis erreur={err("date_visite")}>
          {(p) => <Input {...p} type="date" name="date_visite" required defaultValue={v("date_visite") ?? aujourdhui()} />}
        </Field>
        <Field label="Arrivée" requis erreur={err("heure_arrivee")}>
          {(p) => <Input {...p} type="time" name="heure_arrivee" required defaultValue={v("heure_arrivee")} />}
        </Field>
        <Field label="Durée" requis erreur={err("duree_prevue_minutes")}>
          {(p) => (
            <Select {...p} name="duree_prevue_minutes" required defaultValue={v("duree_prevue_minutes") ?? "30"}>
              {DUREES_VISITE.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type de visite" requis erreur={err("type_visite")}>
          {(p) => (
            <Select {...p} name="type_visite" required defaultValue={v("type_visite") ?? ""} placeholder="Choisir…">
              {TYPES_VISITE.map((ty) => (
                <option key={ty}>{ty}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Lieu" erreur={err("lieu_visite")}>
          {(p) => <Input {...p} name="lieu_visite" defaultValue={v("lieu_visite")} placeholder="Ex. Parloir 2" />}
        </Field>
      </div>

      <fieldset className="grid gap-3 rounded-lg border border-hairline bg-raised p-3">
        <legend className="px-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">Visiteur</legend>
        <Field label="Nom du visiteur" requis erreur={err("nom_visiteur")}>
          {(p) => <Input {...p} name="nom_visiteur" required defaultValue={v("nom_visiteur")} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexe" requis erreur={err("sexe_visiteur")}>
            {(p) => (
              <Select {...p} name="sexe_visiteur" required defaultValue={v("sexe_visiteur") ?? "Masculin"}>
                {SEXES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Lien de parenté" requis erreur={err("lien_parente")}>
            {(p) => (
              <Select {...p} name="lien_parente" required defaultValue={v("lien_parente") ?? ""} placeholder="Choisir…">
                {LIENS_PARENTE.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pièce d’identité" requis erreur={err("type_piece_identite")}>
            {(p) => (
              <Select {...p} name="type_piece_identite" required defaultValue={v("type_piece_identite") ?? ""} placeholder="Choisir…">
                {PIECES_IDENTITE.map((pi) => (
                  <option key={pi}>{pi}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Numéro" requis erreur={err("numero_piece_identite")}>
            {(p) => (
              <Input {...p} name="numero_piece_identite" required className="font-mono" defaultValue={v("numero_piece_identite")} />
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone" erreur={err("telephone_visiteur")}>
            {(p) => <Input {...p} type="tel" inputMode="tel" name="telephone_visiteur" defaultValue={v("telephone_visiteur")} />}
          </Field>
          <Field label="Adresse" erreur={err("adresse_visiteur")}>
            {(p) => <Input {...p} name="adresse_visiteur" defaultValue={v("adresse_visiteur")} />}
          </Field>
        </div>
      </fieldset>
      </div>

      <div className={etape === 1 ? "flex justify-end border-t border-hairline pt-4" : "hidden"}>
        <Button
          type="button"
          variante="primaire"
          icone="arrowRight"
          onClick={() => {
            if (forme.current?.reportValidity()) setEtape(2);
          }}
        >
          Continuer
        </Button>
      </div>

      {/* disabled tant qu'on est à l'étape 1 : sinon "Agent de contrôle" (obligatoire,
          masqué) bloque silencieusement le reportValidity() du clic sur "Continuer"
          — un champ cascade `display:none` n'est pas exempté de la validation native,
          contrairement à un champ désactivé. */}
      <fieldset disabled={etape === 1} className={etape === 2 ? "flex flex-col gap-4" : "hidden"}>
      <fieldset className="grid gap-3 rounded-lg border border-hairline bg-raised p-3">
        <legend className="px-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-accent">Contrôle</legend>
        <Field label="Agent de contrôle" requis erreur={err("agent_controle")}>
          {(p) => <Input {...p} name="agent_controle" required defaultValue={v("agent_controle")} />}
        </Field>
        <Field label="Objets déposés" erreur={err("objets_deposes")}>
          {(p) => <Textarea {...p} name="objets_deposes" rows={2} defaultValue={v("objets_deposes")} />}
        </Field>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="autorisation_prealable"
              defaultChecked={v("autorisation_prealable") !== undefined}
              className="size-4 accent-[var(--sgp-accent)]"
            />
            Autorisation préalable délivrée
          </label>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="fouille_corporelle"
              defaultChecked={v("fouille_corporelle") !== undefined}
              className="size-4 accent-[var(--sgp-accent)]"
            />
            Fouille corporelle effectuée
          </label>
        </div>
        <Field label="Observations de sécurité" erreur={err("observations_securite")}>
          {(p) => <Textarea {...p} name="observations_securite" rows={2} defaultValue={v("observations_securite")} />}
        </Field>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Début réel" erreur={err("heure_debut")}>
          {(p) => <Input {...p} type="time" name="heure_debut" defaultValue={v("heure_debut")} />}
        </Field>
        <Field label="Fin réelle" erreur={err("heure_fin")}>
          {(p) => <Input {...p} type="time" name="heure_fin" defaultValue={v("heure_fin")} />}
        </Field>
      </div>

      <Field label="Observations" erreur={err("observations_visite")}>
        {(p) => <Textarea {...p} name="observations_visite" rows={2} defaultValue={v("observations_visite")} />}
      </Field>

      <div className="flex justify-between border-t border-hairline pt-4">
        <Button type="button" icone="arrowLeft" onClick={() => setEtape(1)}>
          Retour
        </Button>
        <Button type="submit" variante="primaire" icone="user" chargement={enCours}>
          Enregistrer la visite
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
