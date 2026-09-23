"use client";

import type { Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDateLongue, ouVide } from "@/lib/format";
import { DocumentOfficiel, LigneDocument } from "@/components/etats/document";
import { ModalImpression } from "@/components/ui/modal-impression";
import { referenceAvis } from "@/components/detenus/avis-evasion";

/** Référence de l'avis de cessation, liée à celle de l'avis d'évasion d'origine. */
const referenceCessation = (s: SortieDetenu) => `CR-${referenceAvis(s).slice(3)}`;

/**
 * Avis de cessation de recherches : adressé aux mêmes autorités que l'avis d'évasion,
 * pour leur signaler que le détenu a été repris. Conçu pour tenir sur une seule page A4.
 */
export function AvisCessationRecherches({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const ampliations = parametres.autoritesAmpliataires
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <DocumentOfficiel
      parametres={parametres}
      titre="Avis de cessation de recherches"
      reference={referenceCessation(sortie)}
      className="print:px-2 print:py-0 print:text-[11.5px] print:leading-snug"
    >
      <style>{"@media print { @page { size: A4 portrait; margin: 10mm } }"}</style>

      <p className="text-justify">
        Le Régisseur de la <strong>{parametres.nomPrison}</strong> a l’honneur de porter à votre connaissance que le
        détenu ci-après désigné, évadé le {formatDateLongue(sortie.dateSortie)} sous notre avis n°{" "}
        {referenceAvis(sortie)}, a été <strong>repris le {formatDateLongue(sortie.dateReintegration)}</strong>. Les
        recherches engagées à son sujet peuvent être levées.
      </p>

      <section className="mt-4 break-inside-avoid">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Identité du détenu</h3>
        <LigneDocument label="Numéro d’écrou" valeur={<span className="font-mono">{sortie.numeroEcrou}</span>} />
        <LigneDocument label="Nom et prénoms" valeur={<strong>{sortie.detenuNom}</strong>} />
      </section>

      <section className="mt-4 break-inside-avoid">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Reprise</h3>
        <LigneDocument label="Date de la reprise" valeur={formatDateLongue(sortie.dateReintegration)} />
        <LigneDocument label="Lieu" valeur={ouVide(sortie.lieuReintegration)} />
        <LigneDocument label="Autorité ayant procédé à l’arrestation" valeur={ouVide(sortie.autoriteReintegration)} />
        <LigneDocument label="Observations" valeur={ouVide(sortie.observationsReintegration)} />
      </section>

      <p className="mt-4 text-[12px] text-neutral-700">
        Le détenu a réintégré la {parametres.nomPrison} et a été placé en cellule disciplinaire à la date ci-dessus.
      </p>

      {ampliations.length > 0 && (
        <section className="mt-4 break-inside-avoid text-[11px]">
          <h3 className="mb-1 font-bold uppercase tracking-[0.14em] text-neutral-600">Ampliations</h3>
          <ul>
            {ampliations.map((a, i) => (
              <li key={i} className="leading-snug print:whitespace-nowrap">
                — {a}
              </li>
            ))}
          </ul>
        </section>
      )}
    </DocumentOfficiel>
  );
}

/** Aperçu de l'avis de cessation avant impression, en fenêtre modale. */
export function AvisCessationModal({
  open,
  sortie,
  parametres,
  onClose,
  titre = "Détenu réintégré",
}: {
  open: boolean;
  sortie: SortieDetenu | null;
  parametres: Parametres;
  onClose: () => void;
  titre?: string;
}) {
  if (!sortie || !sortie.dateReintegration) return null;

  return (
    <ModalImpression
      open={open}
      onClose={onClose}
      titre={titre}
      description="Vérifiez l’avis de cessation de recherches avant de l’imprimer."
      libelleImprimer="Imprimer l’avis"
      className="max-w-4xl"
    >
      <AvisCessationRecherches sortie={sortie} parametres={parametres} />
    </ModalImpression>
  );
}
