"use client";

import { useActionState, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MandatDetaille } from "@/lib/api";
import type { DetenuOption, Parametres, TypeSortie } from "@/lib/domain/types";
import { formatDate } from "@/lib/format";
import type { EtatSortie } from "@/app/(app)/detenus/liberation/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RetourAction } from "@/components/ui/retour-action";
import { AvisEvasionModal } from "@/components/detenus/avis-evasion";
import { BulletinModal } from "@/components/detenus/bulletin-transferement";

/** Champs propres à chaque type de sortie, conformes à ce que l'API exige. */
const CHAMPS: Record<TypeSortie, Array<{ nom: string; label: string; requis: boolean; aide?: string; long?: boolean }>> = {
  LiberationNormale: [
    { nom: "motif", label: "Fondement de la libération", requis: true, aide: "Ex. Fin de peine, ordonnance de mise en liberté", long: true },
  ],
  Transfert: [
    { nom: "destination", label: "Établissement de destination", requis: true, aide: "Ex. Prison Principale de Douala" },
    { nom: "motif", label: "Motif du transfert", requis: false },
  ],
  Evasion: [{ nom: "cause", label: "Circonstances de l’évasion", requis: false, long: true }],
  Deces: [{ nom: "cause", label: "Cause du décès", requis: true, aide: "Telle qu’établie par le médecin", long: true }],
};

export function FormulaireSortie({
  type,
  action,
  detenus,
  detenuId,
  mandats,
  grave,
  parametres,
}: {
  type: TypeSortie;
  action: (p: EtatSortie, f: FormData) => Promise<EtatSortie>;
  detenus: DetenuOption[];
  /** Détenu choisi dans l'URL — nécessaire pour proposer ses mandats. */
  detenuId?: number;
  /** Mandats non levés du détenu choisi, échus compris (libération normale uniquement). */
  mandats: MandatDetaille[] | null;
  grave: boolean;
  /** Pour le bulletin de transfèrement proposé après un transfert. */
  parametres: Parametres;
}) {
  const router = useRouter();
  const chemin = usePathname();
  const [etat, envoyer, enCours] = useActionState<EtatSortie, FormData>(action, {});
  const [bulletinOuvert, setBulletinOuvert] = useState(false);
  const [dernierEtat, setDernierEtat] = useState(etat);
  // Un transfert consigné ouvre aussitôt son bulletin (ajusté pendant le rendu : `etat`
  // ne change qu'au retour d'une soumission).
  if (etat !== dernierEtat) {
    setDernierEtat(etat);
    if (etat.ok && etat.sortie) setBulletinOuvert(true);
  }
  const v = (champ: string) => etat.valeurs?.[champ];
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];
  const liberation = type === "LiberationNormale";
  // Après un succès, le détenu choisi a pu quitter l'effectif : on ne le présélectionne plus
  const choisi = etat.ok ? undefined : (v("detenu_id") ?? (detenuId ? String(detenuId) : undefined));

  return (
    <>
    <form action={envoyer} className="flex flex-col gap-4">
      <RetourAction etat={etat} />

      <Field
        label="Détenu concerné"
        requis
        aide={liberation ? "Ses mandats actifs s’affichent une fois le détenu choisi." : undefined}
        erreur={err("detenu_id")}
      >
        {(p) => (
          <Select
            {...p}
            // Remonter le champ quand la sélection change par l'URL
            key={choisi ?? "aucun"}
            name="detenu_id"
            required
            defaultValue={choisi ?? ""}
            placeholder="Sélectionner un détenu…"
            onChange={(e) => {
              // La libération porte sur un mandat précis : il faut charger ceux du détenu
              if (liberation) router.replace(`${chemin}?detenu=${e.target.value}`, { scroll: false });
            }}
          >
            {detenus.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nom} — {d.numeroEcrou}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {liberation && choisi && choisi === String(detenuId) && mandats && (
        <Field
          label="Mandat qui prend fin"
          requis
          aide={
            mandats.length > 1
              ? `${mandats.length} mandats ouverts : le détenu ne sortira qu’à la levée du dernier.`
              : undefined
          }
          erreur={err("mandas_id")}
        >
          {(p) =>
            mandats.length === 0 ? (
              <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
                Aucun mandat ouvert : rien à lever pour ce détenu.
              </p>
            ) : (
              <Select
                {...p}
                name="mandas_id"
                required
                defaultValue={v("mandas_id") ?? (mandats.length === 1 ? String(mandats[0].id) : "")}
                placeholder="Sélectionner le mandat…"
              >
                {mandats.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.referenceMandat ?? m.typeMandat} — ${m.typeStatutPenal ?? "statut inconnu"}${
                      m.actif ? `, écroué le ${formatDate(m.dateIncarceration)}` : ` — échu le ${formatDate(m.dateSortieMandat)}`
                    }`}
                  </option>
                ))}
              </Select>
            )
          }
        </Field>
      )}

      <Field label="Date de sortie" requis erreur={err("date_sortie")}>
        {(p) => (
          <Input
            {...p}
            type="date"
            name="date_sortie"
            required
            defaultValue={v("date_sortie") ?? new Date().toISOString().slice(0, 10)}
          />
        )}
      </Field>

      {CHAMPS[type].map((c) => (
        <Field key={c.nom} label={c.label} requis={c.requis} aide={c.aide} erreur={err(c.nom)}>
          {(p) =>
            c.long ? (
              <Textarea {...p} name={c.nom} rows={2} required={c.requis} defaultValue={v(c.nom)} />
            ) : (
              <Input {...p} name={c.nom} required={c.requis} defaultValue={v(c.nom)} />
            )
          }
        </Field>
      ))}

      <Field label="Observations" erreur={err("observation")}>
        {(p) => <Textarea {...p} name="observation" rows={3} defaultValue={v("observation")} />}
      </Field>

      <div className="flex justify-end border-t border-hairline pt-4">
        <Button
          type="submit"
          variante={grave ? "danger" : "primaire"}
          icone="exit"
          chargement={enCours}
          disabled={liberation && (!choisi || mandats?.length === 0)}
        >
          Consigner la sortie
        </Button>
      </div>
    </form>
    {type === "Evasion" ? (
      <AvisEvasionModal open={bulletinOuvert} sortie={etat.sortie ?? null} parametres={parametres} onClose={() => setBulletinOuvert(false)} />
    ) : (
      <BulletinModal open={bulletinOuvert} sortie={etat.sortie ?? null} parametres={parametres} onClose={() => setBulletinOuvert(false)} />
    )}
    </>
  );
}
