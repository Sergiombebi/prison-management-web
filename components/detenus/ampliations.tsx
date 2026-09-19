"use client";

import { useId, useState } from "react";
import { Icon, IconTile } from "@/components/ui/icon";
import { Modale } from "@/components/ui/modale";
import { Button } from "@/components/ui/button";

/**
 * Ampliations d'un avis d'évasion : une ligne discrète avec une icône qui ouvre,
 * dans une fenêtre, la liste des autorités destinataires et son explication.
 */
export function AmpliationsInfo({ autorites }: { autorites: string }) {
  const [ouvert, setOuvert] = useState(false);
  const titleId = useId();
  const liste = autorites
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-hairline bg-raised px-3 py-2.5">
        <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-faint">Ampliations</p>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          aria-label="Voir les ampliations"
          title="Voir les ampliations"
          className="grid size-8 place-items-center rounded-full bg-info-soft text-info ring-1 ring-inset ring-info/25 transition-colors hover:bg-info/20"
        >
          <Icon name="info" size={16} />
        </button>
      </div>

      <Modale open={ouvert} onClose={() => setOuvert(false)} labelId={titleId} className="max-w-md">
        <div className="flex items-start gap-3">
          <IconTile name="shield" ton="info" size={18} />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-sm font-semibold text-ink">
              Ampliations de l’avis d’évasion
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Les ampliations sont les autorités qui reçoivent une copie de l’avis d’évasion dès qu’il est consigné,
              afin qu’elles puissent engager les recherches et les procédures qui leur incombent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            aria-label="Fermer"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <ul className="flex flex-col gap-1.5 overflow-y-auto">
          {liste.length === 0 ? (
            <li className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
              Aucune autorité n’est renseignée pour le moment.
            </li>
          ) : (
            liste.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-md border border-hairline bg-raised px-3 py-2 text-sm text-ink">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-info-soft text-2xs font-semibold text-info">
                  {i + 1}
                </span>
                <span>{a}</span>
              </li>
            ))
          )}
        </ul>

        <p className="text-xs text-muted">Cette liste se modifie dans Administration › Paramètres de l’établissement.</p>

        <div className="flex justify-end border-t border-hairline pt-4">
          <Button type="button" variante="secondaire" onClick={() => setOuvert(false)}>
            Fermer
          </Button>
        </div>
      </Modale>
    </>
  );
}
