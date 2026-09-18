"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import type { EtatAction } from "@/lib/api/actions";
import type { Parametres } from "@/lib/domain/types";
import { modifierParametres } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormSection, Pleine } from "@/components/ui/form-section";
import { Icon } from "@/components/ui/icon";
import { RetourAction } from "@/components/ui/retour-action";

/** Formulaire des paramètres avec aperçu en direct de l'en-tête des états. */
export function ParametresForm({ initial }: { initial: Parametres }) {
  const [valeurs, setValeurs] = useState(initial);
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(modifierParametres, {});
  const err = (champ: string) => etat.erreurs?.[champ]?.[0];
  const maj = (cle: keyof Parametres) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValeurs((v) => ({ ...v, [cle]: e.target.value }));

  const [apercuLogo, setApercuLogo] = useState<string | null>(null);
  useEffect(() => () => {
    if (apercuLogo) URL.revokeObjectURL(apercuLogo);
  }, [apercuLogo]);
  const logoAffiche = apercuLogo ?? valeurs.logoUrl;

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <form action={envoyer} className="rounded-lg border border-hairline bg-surface px-5 py-7 sm:px-8">
        <RetourAction etat={etat} className="mb-5" />
        <FormSection numero="01" titre="Établissement" description="Identification de la prison de céans.">
          <Pleine>
            <Field label="Nom de la prison" requis erreur={err("nomPrison")}>
              {(p) => <Input {...p} name="nomPrison" value={valeurs.nomPrison} onChange={maj("nomPrison")} required />}
            </Field>
          </Pleine>
          <Field label="Ville" requis erreur={err("ville")}>
            {(p) => <Input {...p} name="ville" value={valeurs.ville} onChange={maj("ville")} required />}
          </Field>
          <Field label="Téléphone" erreur={err("telephone")}>
            {(p) => <Input {...p} type="tel" name="telephone" value={valeurs.telephone} onChange={maj("telephone")} />}
          </Field>
          <Field label="Fax" erreur={err("fax")}>
            {(p) => <Input {...p} type="tel" name="fax" value={valeurs.fax} onChange={maj("fax")} />}
          </Field>
          <Field label="Logo" aide="PNG ou JPG, fond transparent de préférence, 8 Mo maximum">
            {(p) => (
              <Input
                {...p}
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp"
                className="pt-1.5 text-sm"
                onChange={(e) => {
                  const fichier = e.target.files?.[0];
                  setApercuLogo(fichier ? URL.createObjectURL(fichier) : null);
                }}
              />
            )}
          </Field>
          <input type="hidden" name="logoUrl" value={valeurs.logoUrl ?? ""} />
          <input type="hidden" name="logoPublicId" value={valeurs.logoPublicId ?? ""} />
        </FormSection>

        <FormSection numero="02" titre="En-tête des états" description="Une ligne par ligne imprimée. L’aperçu se met à jour pendant la saisie.">
          <Field label="Colonne de gauche" requis erreur={err("enteteGauche")}>
            {(p) => <Textarea {...p} name="enteteGauche" rows={6} value={valeurs.enteteGauche} onChange={maj("enteteGauche")} className="font-mono text-xs" required />}
          </Field>
          <Field label="Colonne de droite" requis erreur={err("enteteDroite")}>
            {(p) => <Textarea {...p} name="enteteDroite" rows={6} value={valeurs.enteteDroite} onChange={maj("enteteDroite")} className="font-mono text-xs" required />}
          </Field>
        </FormSection>

        <FormSection numero="03" titre="Paramètres légaux">
          <Field label="Âge de la majorité pénale" requis aide="En années. Détermine l’affectation au quartier des mineurs." erreur={err("ageMajorite")}>
            {(p) => (
              <Input
                {...p}
                type="number"
                name="ageMajorite"
                min={10}
                max={25}
                inputMode="numeric"
                value={valeurs.ageMajorite}
                onChange={(e) => setValeurs((v) => ({ ...v, ageMajorite: Number(e.target.value) }))}
                required
              />
            )}
          </Field>
          <Pleine>
            <Field label="Autorités ampliataires (évasion)" aide="Destinataires de l’avis d’évasion, une autorité par ligne." erreur={err("autoritesAmpliataires")}>
              {(p) => <Textarea {...p} name="autoritesAmpliataires" rows={6} value={valeurs.autoritesAmpliataires} onChange={maj("autoritesAmpliataires")} className="font-mono text-xs" />}
            </Field>
          </Pleine>
        </FormSection>

        <div className="flex justify-end border-t border-rule pt-6">
          <Button type="submit" variante="primaire" icone="check" chargement={enCours}>
            Enregistrer les paramètres
          </Button>
        </div>
      </form>

      <aside className="2xl:sticky 2xl:top-20" aria-label="Aperçu de l’en-tête">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
          <Icon name="eye" size={13} /> Aperçu de l’en-tête imprimé
        </p>
        <div className="rounded-sm bg-white px-6 py-6 text-neutral-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5" style={{ colorScheme: "light" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center text-[9px] font-semibold uppercase leading-snug tracking-wide">
            <p className="whitespace-pre-line">{valeurs.enteteGauche || "—"}</p>
            <div className="relative grid size-11 place-items-center overflow-hidden rounded-full border border-neutral-400 font-mono text-[8px] text-neutral-500">
              {logoAffiche ? (
                <Image src={logoAffiche} alt="" fill unoptimized sizes="44px" className="object-contain" />
              ) : (
                "LOGO"
              )}
            </div>
            <p className="whitespace-pre-line">{valeurs.enteteDroite || "—"}</p>
          </div>
          <div className="mt-4 flex justify-between border-t border-neutral-300 pt-2 text-[10px] text-neutral-600">
            <span>{valeurs.nomPrison || "Nom de la prison"}</span>
            <span>
              Tél. {valeurs.telephone || "—"} · Fax {valeurs.fax || "—"}
            </span>
          </div>
          <div className="mt-6 space-y-2" aria-hidden>
            {[92, 100, 84, 96, 60].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-neutral-100" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
