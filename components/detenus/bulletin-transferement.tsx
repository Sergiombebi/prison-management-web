"use client";

import { useState } from "react";
import type { Parametres, SortieDetenu } from "@/lib/domain/types";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";
import { DocumentOfficiel, LigneDocument } from "@/components/etats/document";
import { Button } from "@/components/ui/button";
import { ModalImpression } from "@/components/ui/modal-impression";

/** Référence du bulletin : numéro de la sortie sur l'année du transfert. */
export const referenceBulletin = (s: SortieDetenu) =>
  `BT-${String(s.id).padStart(5, "0")}/${(s.dateSortie || s.dateEnregistrement).slice(0, 4)}`;

/**
 * Bulletin de transfèrement : le document qui accompagne le détenu vers son nouvel
 * établissement. Conçu pour tenir sur une seule page A4.
 */
export function BulletinTransferement({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const fiche = sortie.detenuFiche;

  return (
    <DocumentOfficiel
      parametres={parametres}
      titre="Bulletin de transfèrement"
      reference={referenceBulletin(sortie)}
      signataire="Le Régisseur"
      className="print:px-2 print:py-0 print:text-[12px] print:leading-snug"
    >
      <style>{"@media print { @page { size: A4 portrait; margin: 12mm } }"}</style>

      <p className="text-justify">
        Le Régisseur de la <strong>{parametres.nomPrison}</strong> prescrit le transfèrement du détenu ci-après désigné
        vers l’établissement de destination indiqué, à la date fixée ci-dessous.
      </p>

      <section className="mt-5 break-inside-avoid">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Identité du détenu</h3>
        <LigneDocument label="Numéro d’écrou" valeur={<span className="font-mono">{sortie.numeroEcrou}</span>} />
        <LigneDocument label="Nom et prénoms" valeur={sortie.detenuNom} />
        {fiche && (
          <>
            <LigneDocument label="Né(e) le" valeur={`${formatDate(fiche.dateNaissance)} à ${ouVide(fiche.lieuNaissance)}`} />
            <LigneDocument label="Fils/fille de" valeur={ouVide(fiche.nomPere)} />
            <LigneDocument label="Et de" valeur={ouVide(fiche.nomMere)} />
          </>
        )}
      </section>

      <section className="mt-5 break-inside-avoid">
        <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600">Transfèrement</h3>
        <LigneDocument label="Date du transfèrement" valeur={formatDateLongue(sortie.dateSortie)} />
        <LigneDocument label="Établissement d’origine" valeur={parametres.nomPrison} />
        <LigneDocument label="Établissement de destination" valeur={<strong>{ouVide(sortie.destination)}</strong>} />
        <LigneDocument label="Motif" valeur={ouVide(sortie.motif)} />
        <LigneDocument label="Observations" valeur={ouVide(sortie.observation)} />
      </section>

      <p className="mt-5 text-[12px] text-neutral-600">
        Le présent bulletin est remis à l’escorte et doit être visé par le chef de l’établissement de destination à
        l’arrivée du détenu.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid text-center text-[12px]">
        <div className="rounded-sm border border-neutral-400 px-3 pb-14 pt-2">
          <p className="font-semibold uppercase tracking-wide">L’escorte</p>
          <p className="text-neutral-500">Nom, grade et signature</p>
        </div>
        <div className="rounded-sm border border-neutral-400 px-3 pb-14 pt-2">
          <p className="font-semibold uppercase tracking-wide">Établissement de destination</p>
          <p className="text-neutral-500">Reçu le ……… — cachet et signature</p>
        </div>
      </div>
    </DocumentOfficiel>
  );
}

/** Aperçu du bulletin avant impression, en fenêtre modale. */
export function BulletinModal({
  open,
  sortie,
  parametres,
  onClose,
  titre = "Transfert enregistré",
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
      description="Vérifiez le bulletin de transfèrement avant de l’imprimer."
      libelleImprimer="Imprimer le bulletin"
      className="max-w-4xl"
    >
      <BulletinTransferement sortie={sortie} parametres={parametres} />
    </ModalImpression>
  );
}

/** Icône d'impression du listing : rouvre le bulletin d'un transfert déjà consigné. */
export function BoutonBulletin({ sortie, parametres }: { sortie: SortieDetenu; parametres: Parametres }) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <Button
        type="button"
        variante="secondaire"
        taille="sm"
        icone="printer"
        title="Imprimer le bulletin de transfèrement"
        aria-label="Imprimer le bulletin de transfèrement"
        className="w-8 rounded-full border-0 bg-accent-soft px-0 text-accent shadow-none hover:bg-accent/20"
        onClick={() => setOuvert(true)}
      />
      <BulletinModal open={ouvert} sortie={sortie} parametres={parametres} onClose={() => setOuvert(false)} titre="Bulletin de transfèrement" />
    </>
  );
}
