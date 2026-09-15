"use client";

import { useState } from "react";
import type { Parametres } from "@/lib/domain/types";
import { DemoSubmit } from "@/components/ui/client-actions";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormSection, Pleine } from "@/components/ui/form-section";
import { Icon } from "@/components/ui/icon";

/** Formulaire des paramètres avec aperçu en direct de l'en-tête des états. */
export function ParametresForm({ initial }: { initial: Parametres }) {
  const [valeurs, setValeurs] = useState(initial);
  const maj = (cle: keyof Parametres) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValeurs((v) => ({ ...v, [cle]: e.target.value }));

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      <form className="rounded-lg border border-hairline bg-surface px-5 py-7 sm:px-8">
        <FormSection numero="01" titre="Établissement" description="Identification de la prison de céans.">
          <Pleine>
            <Field label="Nom de la prison" requis>
              {(p) => <Input {...p} value={valeurs.nomPrison} onChange={maj("nomPrison")} />}
            </Field>
          </Pleine>
          <Field label="Ville" requis>
            {(p) => <Input {...p} value={valeurs.ville} onChange={maj("ville")} />}
          </Field>
          <Field label="Téléphone">
            {(p) => <Input {...p} type="tel" value={valeurs.telephone} onChange={maj("telephone")} />}
          </Field>
          <Field label="Fax">
            {(p) => <Input {...p} type="tel" value={valeurs.fax} onChange={maj("fax")} />}
          </Field>
          <Field label="Logo" aide="PNG ou JPG, fond transparent de préférence">
            {(p) => <Input {...p} type="file" accept="image/png,image/jpeg" className="pt-1.5 text-sm" />}
          </Field>
        </FormSection>

        <FormSection numero="02" titre="En-tête des états" description="Une ligne par ligne imprimée. L’aperçu se met à jour pendant la saisie.">
          <Field label="Colonne de gauche" requis>
            {(p) => <Textarea {...p} rows={6} value={valeurs.enteteGauche} onChange={maj("enteteGauche")} className="font-mono text-xs" />}
          </Field>
          <Field label="Colonne de droite" requis>
            {(p) => <Textarea {...p} rows={6} value={valeurs.enteteDroite} onChange={maj("enteteDroite")} className="font-mono text-xs" />}
          </Field>
        </FormSection>

        <FormSection numero="03" titre="Paramètres légaux">
          <Field label="Âge de la majorité pénale" requis aide="En années. Détermine l’affectation au quartier des mineurs.">
            {(p) => (
              <Input
                {...p}
                type="number"
                min={10}
                max={25}
                inputMode="numeric"
                value={valeurs.ageMajorite}
                onChange={(e) => setValeurs((v) => ({ ...v, ageMajorite: Number(e.target.value) }))}
              />
            )}
          </Field>
          <Pleine>
            <Field label="Autorités ampliataires (évasion)" aide="Destinataires de l’avis d’évasion, une autorité par ligne.">
              {(p) => <Textarea {...p} rows={6} value={valeurs.autoritesAmpliataires} onChange={maj("autoritesAmpliataires")} className="font-mono text-xs" />}
            </Field>
          </Pleine>
        </FormSection>

        <div className="flex justify-end border-t border-rule pt-6">
          <DemoSubmit endpoint="PUT /parametres">Enregistrer les paramètres</DemoSubmit>
        </div>
      </form>

      <aside className="2xl:sticky 2xl:top-20" aria-label="Aperçu de l’en-tête">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted">
          <Icon name="eye" size={13} /> Aperçu de l’en-tête imprimé
        </p>
        <div className="rounded-sm bg-white px-6 py-6 text-neutral-900 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5" style={{ colorScheme: "light" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-center text-[9px] font-semibold uppercase leading-snug tracking-wide">
            <p className="whitespace-pre-line">{valeurs.enteteGauche || "—"}</p>
            <div className="grid size-11 place-items-center rounded-full border border-neutral-400 font-mono text-[8px] text-neutral-500">LOGO</div>
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
