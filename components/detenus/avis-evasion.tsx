"use client";

import Image from "next/image";
import { useState } from "react";
import type { Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";
import { DocumentOfficiel, LigneDocument } from "@/components/etats/document";
import { Button } from "@/components/ui/button";
import { ModalImpression } from "@/components/ui/modal-impression";

/** Référence de l'avis : numéro de la sortie sur l'année de l'évasion. */
export const referenceAvis = (s: SortieDetenu) =>
  `AE-${String(s.id).padStart(5, "0")}/${(s.dateSortie || s.dateEnregistrement).slice(0, 4)}`;

function Photo({ url, legende }: { url: string | null | undefined; legende: string }) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <span className="relative block h-28 w-22 overflow-hidden border border-neutral-400 bg-neutral-100">
        {url ? (
          <Image src={url} alt={legende} fill unoptimized sizes="90px" className="object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-[9px] uppercase tracking-wide text-neutral-400">Non fournie</span>
        )}
      </span>
      <figcaption className="text-[9px] uppercase tracking-wide text-neutral-500">{legende}</figcaption>
    </figure>
  );
}

/**
 * Avis d'évasion et de recherche : adressé aux autorités ampliataires pour lancer les
 * recherches. Conçu pour tenir sur une seule page A4.
 */
export function AvisEvasion({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const fiche = sortie.detenuFiche;
  const ampliations = parametres.autoritesAmpliataires
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <DocumentOfficiel
      parametres={parametres}
      titre="Avis d’évasion et de recherche"
      reference={referenceAvis(sortie)}
      className="print:px-2 print:py-0 print:text-[11.5px] print:leading-snug"
    >
      <style>{"@media print { @page { size: A4 portrait; margin: 10mm } }"}</style>

      <p className="text-justify">
        Le Régisseur de la <strong>{parametres.nomPrison}</strong> a l’honneur de porter à votre connaissance que le
        détenu ci-après désigné s’est <strong>évadé le {formatDateLongue(sortie.dateSortie)}</strong>. Vous êtes
        prié(e) de bien vouloir engager toutes recherches utiles en vue de son arrestation et de sa réintégration.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
        <section className="break-inside-avoid">
          <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Identité du fugitif</h3>
          <LigneDocument label="Numéro d’écrou" valeur={<span className="font-mono">{sortie.numeroEcrou}</span>} />
          <LigneDocument label="Nom et prénoms" valeur={<strong>{sortie.detenuNom}</strong>} />
          {fiche && (
            <>
              <LigneDocument label="Né(e) le" valeur={`${formatDate(fiche.dateNaissance)} à ${ouVide(fiche.lieuNaissance)}`} />
              <LigneDocument label="Fils/fille de" valeur={ouVide(fiche.nomPere)} />
              <LigneDocument label="Et de" valeur={ouVide(fiche.nomMere)} />
              <LigneDocument label="Nationalité" valeur={ouVide(fiche.nationalite)} />
              <LigneDocument label="Profession" valeur={ouVide(fiche.profession)} />
              <LigneDocument label="Signes particuliers" valeur={ouVide(fiche.anthropometrie)} />
            </>
          )}
        </section>
        <div className="flex gap-3 sm:flex-col print:flex-row">
          <Photo url={fiche?.photoFaceUrl} legende="De face" />
          <Photo url={fiche?.photoProfilUrl} legende="De profil" />
        </div>
      </div>

      <section className="mt-4 break-inside-avoid">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Circonstances</h3>
        <LigneDocument label="Date de l’évasion" valeur={formatDateLongue(sortie.dateSortie)} />
        <LigneDocument label="Circonstances" valeur={ouVide(sortie.cause)} />
        <LigneDocument label="Observations" valeur={ouVide(sortie.observation)} />
      </section>

      <p className="mt-4 text-[12px] text-neutral-700">
        Toute information relative à ce fugitif doit être communiquée sans délai à l’autorité la plus proche ou à la{" "}
        {parametres.nomPrison}.
      </p>

      {ampliations.length > 0 && (
        <section className="mt-4 break-inside-avoid text-[11px]">
          <h3 className="mb-1 font-bold uppercase tracking-[0.14em] text-neutral-600">Ampliations</h3>
          <ul className="grid gap-x-6 sm:grid-cols-2 print:grid-cols-2">
            {ampliations.map((a, i) => (
              <li key={i} className="leading-snug">
                — {a}
              </li>
            ))}
          </ul>
        </section>
      )}
    </DocumentOfficiel>
  );
}

/** Aperçu de l'avis avant impression, en fenêtre modale. */
export function AvisEvasionModal({
  open,
  sortie,
  parametres,
  onClose,
  titre = "Évasion enregistrée",
}: {
  open: boolean;
  sortie: SortieDetenu | null;
  parametres: Parametres;
  onClose: () => void;
  titre?: string;
}) {
  if (!sortie) return null;

  return (
    <ModalImpression
      open={open}
      onClose={onClose}
      titre={titre}
      description="Vérifiez l’avis d’évasion et de recherche avant de l’imprimer."
      libelleImprimer="Imprimer l’avis"
      className="max-w-4xl"
    >
      <AvisEvasion sortie={sortie} parametres={parametres} />
    </ModalImpression>
  );
}

/** Icône d'impression du listing : rouvre l'avis d'une évasion déjà consignée. */
export function BoutonAvisEvasion({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="printer"
        title="Imprimer l’avis d’évasion et de recherche"
        aria-label="Imprimer l’avis d’évasion et de recherche"
        className="w-8 rounded-full border-0 !bg-accent-soft px-0 !text-accent shadow-none hover:!bg-accent/20"
        onClick={() => setOuvert(true)}
      />
      <AvisEvasionModal open={ouvert} sortie={sortie} parametres={parametres} onClose={() => setOuvert(false)} titre="Avis d’évasion et de recherche" />
    </>
  );
}
