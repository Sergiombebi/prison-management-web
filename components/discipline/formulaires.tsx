"use client";

import { useActionState } from "react";
import type { EtatAction } from "@/lib/api/actions";
import type { Cellule, DetenuOption, DetenuResume, TypeSanction } from "@/lib/domain/types";
import { pluriel } from "@/lib/format";
import { affecterDetenu, creerCellule, prononcerSanction } from "@/app/(app)/discipline/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
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

const libelleCellule = (c: Pick<Cellule, "bloc" | "numero">) =>
  c.bloc ? `${c.bloc} · ${c.numero}` : c.numero;

// ---------------------------------------------------------------------------

/**
 * Création, ou modification quand `cellule` est fourni. La page remonte le
 * composant (`key`) en changeant de cellule, pour repartir d'un état propre.
 */
export function FormulaireCellule({
  quartiers,
  types,
  cellule,
  action = creerCellule,
}: {
  quartiers: string[];
  types: string[];
  cellule?: Cellule;
  action?: (p: EtatAction, f: FormData) => Promise<EtatAction>;
}) {
  const { etat, envoyer, enCours, v: saisie, err } = useFormulaire(action);
  const actuelles: Record<string, string | undefined> = cellule
    ? {
        numero: cellule.numero,
        bloc: cellule.bloc ?? undefined,
        type_cellule: cellule.typeCellule ?? undefined,
        capacite_max: String(cellule.capaciteMax),
      }
    : {};
  // Après une erreur, les saisies ; sinon, en modification, les valeurs enregistrées
  const v = (champ: string) => (etat.valeurs ? saisie(champ) : actuelles[champ]);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <Field label="Numéro de la cellule" requis aide="Unique au sein du quartier" erreur={err("numero")}>
        {(p) => <Input {...p} name="numero" defaultValue={v("numero")} required className="font-mono uppercase" placeholder="Ex. C5" />}
      </Field>
      <Field label="Quartier" erreur={err("bloc")}>
        {(p) => <Input {...p} name="bloc" list="quartiers" defaultValue={v("bloc")} placeholder="Ex. B" />}
      </Field>
      <datalist id="quartiers">
        {quartiers.map((q) => (
          <option key={q} value={q} />
        ))}
      </datalist>
      <Field label="Type de cellule" aide="Choisir un type existant ou en saisir un nouveau" erreur={err("type_cellule")}>
        {(p) => <Input {...p} name="type_cellule" list="types-cellule" defaultValue={v("type_cellule")} />}
      </Field>
      <datalist id="types-cellule">
        {types.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <Field
        label="Capacité maximale"
        requis
        aide={
          cellule && cellule.effectifReel > 0
            ? `Au moins ${pluriel(cellule.effectifReel, "place")} : ${pluriel(cellule.effectifReel, "détenu occupe", "détenus occupent")} la cellule`
            : "Nombre de places réglementaires"
        }
        erreur={err("capacite_max")}
      >
        {(p) => (
          <Input
            {...p}
            name="capacite_max"
            type="number"
            min={Math.max(1, cellule?.effectifReel ?? 1)}
            max={200}
            inputMode="numeric"
            required
            defaultValue={v("capacite_max")}
          />
        )}
      </Field>
      <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
        {cellule && (
          <ButtonLink href="/discipline/cellules" variante="discret" transitionTypes={["nav-back"]}>
            Terminer
          </ButtonLink>
        )}
        <Button type="submit" variante="primaire" icone={cellule ? "check" : "plus"} chargement={enCours}>
          {cellule ? "Enregistrer" : "Créer la cellule"}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormulaireAffectation({
  detenus,
  nonLoges,
  cellules,
  detenuInitial,
  celluleInitiale,
}: {
  detenus: DetenuOption[];
  /** `null` : la source ne sait pas dire qui est logé — liste unique. */
  nonLoges: DetenuResume[] | null;
  cellules: Cellule[];
  detenuInitial?: number;
  celluleInitiale?: number;
}) {
  const { etat, envoyer, enCours, v, err } = useFormulaire(affecterDetenu);
  const idsNonLoges = new Set(nonLoges?.map((d) => d.id));
  const option = (d: DetenuOption | DetenuResume) => (
    <option key={d.id} value={d.id}>
      {d.nom} — {d.numeroEcrou}
      {d.cellule ? ` (actuellement ${libelleCellule(d.cellule)})` : ""}
    </option>
  );

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <Field
        label="Détenu"
        requis
        aide={nonLoges?.length ? "Les détenus non logés apparaissent en premier." : undefined}
        erreur={err("detenu_id")}
      >
        {(p) => (
          <Select
            {...p}
            name="detenu_id"
            required
            defaultValue={v("detenu_id") ?? (detenuInitial ? String(detenuInitial) : "")}
            placeholder="Sélectionner un détenu…"
          >
            {nonLoges && nonLoges.length > 0 ? (
              <>
                <optgroup label="Non logés">{nonLoges.map(option)}</optgroup>
                <optgroup label="Réaffectation">{detenus.filter((d) => !idsNonLoges.has(d.id)).map(option)}</optgroup>
              </>
            ) : (
              detenus.map(option)
            )}
          </Select>
        )}
      </Field>
      <Field label="Cellule" requis erreur={err("cellule_id")}>
        {(p) => (
          <Select {...p} name="cellule_id" required defaultValue={v("cellule_id") ?? (celluleInitiale ? String(celluleInitiale) : "")} placeholder="Sélectionner une cellule…">
            {cellules.map((c) => {
              const libres = c.capaciteMax - c.effectifReel;
              return (
                <option key={c.id} value={c.id} disabled={libres <= 0}>
                  {libelleCellule(c)}
                  {c.typeCellule ? ` (${c.typeCellule})` : ""} — {libres > 0 ? pluriel(libres, "place") : "pleine"}
                </option>
              );
            })}
          </Select>
        )}
      </Field>
      <Field label="Date d’affectation" aide="Aujourd’hui si laissée vide" erreur={err("date_affectation")}>
        {(p) => <Input {...p} type="date" name="date_affectation" defaultValue={v("date_affectation")} />}
      </Field>
      <Field label="Motif de l’affectation" erreur={err("motif_affectation")}>
        {(p) => <Input {...p} name="motif_affectation" maxLength={200} defaultValue={v("motif_affectation")} placeholder="Ex. Affectation initiale" />}
      </Field>
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="arrowRight" chargement={enCours}>
          Affecter le détenu
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function FormulaireSanction({
  detenus,
  types,
  cellules,
  detenuInitial,
}: {
  detenus: DetenuOption[];
  types: TypeSanction[];
  cellules: Cellule[];
  detenuInitial?: number;
}) {
  const { etat, envoyer, enCours, v, err } = useFormulaire(prononcerSanction);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  // Les cellules disciplinaires d'abord : c'est presque toujours là qu'on isole
  const triees = [...cellules].sort(
    (a, b) =>
      Number(/disciplin|isol/i.test(b.typeCellule ?? "")) - Number(/disciplin|isol/i.test(a.typeCellule ?? "")),
  );

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />
      <Field label="Détenu" requis erreur={err("detenu_id")}>
        {(p) => (
          <Select
            {...p}
            name="detenu_id"
            required
            defaultValue={v("detenu_id") ?? (detenuInitial ? String(detenuInitial) : "")}
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
      <Field label="Type de sanction" requis erreur={err("type_sanction_id")}>
        {(p) => (
          <Select {...p} name="type_sanction_id" required defaultValue={v("type_sanction_id") ?? ""} placeholder="Sélectionner…">
            {types
              .filter((t) => t.estActif)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.libelle}
                </option>
              ))}
          </Select>
        )}
      </Field>
      <Field label="Faute commise" requis erreur={err("motif")}>
        {(p) => <Textarea {...p} name="motif" rows={3} required defaultValue={v("motif")} placeholder="Décrire les faits constatés" />}
      </Field>
      <Field label="Date de la faute" requis erreur={err("date_faute")}>
        {(p) => <Input {...p} type="date" name="date_faute" required max={aujourdhui} defaultValue={v("date_faute")} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Début" requis erreur={err("date_debut")}>
          {(p) => <Input {...p} type="date" name="date_debut" required defaultValue={v("date_debut") ?? aujourdhui} />}
        </Field>
        <Field label="Fin" erreur={err("date_fin")}>
          {(p) => <Input {...p} type="date" name="date_fin" defaultValue={v("date_fin")} />}
        </Field>
      </div>
      <Field
        label="Cellule disciplinaire"
        aide="Si renseignée, le détenu y est réellement déplacé et sa cellule d’origine est mémorisée."
        erreur={err("cellule_disciplinaire_id")}
      >
        {(p) => (
          <Select {...p} name="cellule_disciplinaire_id" defaultValue={v("cellule_disciplinaire_id") ?? ""}>
            <option value="">Aucune — le détenu reste dans sa cellule</option>
            {triees.map((c) => {
              const libres = c.capaciteMax - c.effectifReel;
              return (
                <option key={c.id} value={c.id} disabled={libres <= 0}>
                  {libelleCellule(c)}
                  {c.typeCellule ? ` (${c.typeCellule})` : ""} — {libres > 0 ? pluriel(libres, "place") : "pleine"}
                </option>
              );
            })}
          </Select>
        )}
      </Field>
      <div className="flex justify-end border-t border-hairline pt-4">
        <Button type="submit" variante="primaire" icone="scale" chargement={enCours}>
          Prononcer la sanction
        </Button>
      </div>
    </form>
  );
}
