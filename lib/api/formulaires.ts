/**
 * Traduction formulaire → contrat d'API.
 *
 * Module ordinaire (et non `"use server"`) : un fichier de Server Actions ne peut
 * exporter que des fonctions asynchrones, or ces constructeurs sont synchrones et
 * servent à plusieurs actions.
 *
 * Les champs des formulaires portent les noms de l'API (snake_case) : une erreur
 * 422 se replace ainsi directement sous le bon champ, sans table de correspondance.
 */

import type { EntreeDetenu, EntreeMandat } from "./contract";
import type { Sexe, TypeStatutPenal } from "@/lib/domain/types";

const texte = (f: FormData, cle: string): string => String(f.get(cle) ?? "").trim();
const optionnel = (f: FormData, cle: string): string | null => texte(f, cle) || null;

/** Renvoie les saisies au formulaire pour qu'il les réaffiche après une erreur. */
export function valeursSaisies(f: FormData): Record<string, string> {
  const valeurs: Record<string, string> = {};
  for (const [cle, valeur] of f.entries()) {
    if (typeof valeur === "string" && valeur !== "") valeurs[cle] = valeur;
  }
  return valeurs;
}

export function construireDetenu(f: FormData): EntreeDetenu {
  const enfants = texte(f, "nombre_enfants");
  return {
    numeroEcrou: texte(f, "numero_ecrou"),
    nom: texte(f, "nom"),
    sexe: (texte(f, "sexe") || "Masculin") as Sexe,
    dateNaissance: texte(f, "date_naissance"),
    lieuNaissance: texte(f, "lieu_naissance"),
    profession: texte(f, "profession"),
    nomPere: texte(f, "nom_pere"),
    nomMere: texte(f, "nom_mere"),
    nationalite: optionnel(f, "nationalite"),
    langue: optionnel(f, "langue"),
    ethnie: optionnel(f, "ethnie"),
    religion: optionnel(f, "religion"),
    departement: optionnel(f, "departement"),
    arrondissement: optionnel(f, "arrondissement"),
    residence: optionnel(f, "residence"),
    statutMatrimonial: optionnel(f, "statut_matrimonial"),
    nombreEnfants: enfants ? Number(enfants) : null,
    niveauEtudes: optionnel(f, "niveau_etudes"),
    numeroCNI: optionnel(f, "numero_cni"),
    numeroPasseport: optionnel(f, "numero_passeport"),
    anthropometrie: optionnel(f, "anthropometrie"),
    contactUrgence: {
      nom: optionnel(f, "contact_urgence_nom"),
      lienParente: optionnel(f, "contact_urgence_lien_parente"),
      telephone: optionnel(f, "contact_urgence_telephone"),
      adresse: optionnel(f, "contact_urgence_adresse"),
    },
  };
}

export function construireMandat(f: FormData): EntreeMandat {
  return {
    typeStatutPenal: texte(f, "type_statut_penal") as TypeStatutPenal,
    dateIncarceration: texte(f, "date_incarceration"),
    autoriteSignataire: texte(f, "autorite_signataire"),
    motifDetention: texte(f, "motif_detention"),
    typeMandat: texte(f, "type_mandat"),
    referenceMandat: texte(f, "reference_mandat"),
    dateSignatureMandat: texte(f, "date_signature_mandat"),
    dateExpirationMandat: texte(f, "date_expiration_mandat"),
    objetsPersonnels: optionnel(f, "objets_personnels"),
    autoritePenitentiaire: optionnel(f, "autorite_penitentiaire"),
    etatPhysiqueArrivee: optionnel(f, "etat_physique_arrivee"),
    observationsStatut: optionnel(f, "observations_statut"),
    dateJugement: optionnel(f, "date_jugement"),
    referenceJugement: optionnel(f, "reference_jugement"),
    tribunalJugement: optionnel(f, "tribunal_jugement"),
    motifJugement: optionnel(f, "motif_jugement"),
    peinePrononcee: optionnel(f, "peine_prononcee"),
    dateAppel: optionnel(f, "date_appel"),
    tribunalAppel: optionnel(f, "tribunal_appel"),
    decisionAppel: optionnel(f, "decision_appel"),
    observationsAppel: optionnel(f, "observations_appel"),
    dateCassation: optionnel(f, "date_cassation"),
    tribunalCassation: optionnel(f, "tribunal_cassation"),
    decisionCassation: optionnel(f, "decision_cassation"),
    observationsCassation: optionnel(f, "observations_cassation"),
  };
}
