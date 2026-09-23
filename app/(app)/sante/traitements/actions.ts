"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";

export interface EtatPrescription extends EtatAction {
  /** Prescription qui vient d'être enregistrée, pour remettre le formulaire à vide. */
  prescriptionId?: number;
}

function manquant(formulaire: FormData, champ: string, message: string): EtatPrescription {
  return { message, erreurs: { [champ]: [message] }, valeurs: valeursSaisies(formulaire) };
}

function rafraichir(detenuId?: number) {
  revalidatePath("/sante/traitements", "layout");
  if (detenuId) revalidatePath(`/detenus/${detenuId}`);
}

/** Prescrit un traitement à un détenu. */
export async function enregistrerPrescription(
  _precedent: EtatPrescription,
  formulaire: FormData,
): Promise<EtatPrescription> {
  const detenuId = entier(formulaire, "detenu_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu concerné.");

  let prescriptionId: number;
  try {
    ({ id: prescriptionId } = await api.creerPrescription(detenuId, {
      medicament: texte(formulaire, "medicament"),
      posologie: texte(formulaire, "posologie"),
      dateDebut: texte(formulaire, "date_debut"),
      dateFin: optionnel(formulaire, "date_fin"),
      prescripteur: texte(formulaire, "prescripteur"),
      observations: optionnel(formulaire, "observations"),
    }));
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  const demo = modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, prescriptionId, message: `Traitement prescrit${demo}.` };
}

/** Arrêt anticipé d'un traitement. Liée à la prescription par `.bind(null, id)`. */
export async function arreterPrescription(
  prescriptionId: number,
  detenuId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  try {
    await api.arreterPrescription(prescriptionId, {
      arreteLe: texte(formulaire, "arrete_le"),
      motifArret: optionnel(formulaire, "motif_arret"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  const demo = modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, message: `Traitement arrêté${demo}.` };
}
