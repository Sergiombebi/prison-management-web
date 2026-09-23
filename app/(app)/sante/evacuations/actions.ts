"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";

export interface EtatEvacuation extends EtatAction {
  /** Évacuation qui vient d'être consignée, pour remettre le formulaire à vide. */
  evacuationId?: number;
}

function manquant(formulaire: FormData, champ: string, message: string): EtatEvacuation {
  return { message, erreurs: { [champ]: [message] }, valeurs: valeursSaisies(formulaire) };
}

function rafraichir(detenuId?: number) {
  revalidatePath("/sante/evacuations", "layout");
  if (detenuId) revalidatePath(`/detenus/${detenuId}`);
}

/** Enregistre le départ d'un détenu en évacuation sanitaire. */
export async function enregistrerEvacuation(
  _precedent: EtatEvacuation,
  formulaire: FormData,
): Promise<EtatEvacuation> {
  const detenuId = entier(formulaire, "detenu_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu concerné.");

  let evacuationId: number;
  try {
    ({ id: evacuationId } = await api.creerEvacuation(detenuId, {
      dateDepart: texte(formulaire, "date_depart"),
      structureDestination: texte(formulaire, "structure_destination"),
      motif: optionnel(formulaire, "motif"),
      escorte: optionnel(formulaire, "escorte"),
      observationsDepart: optionnel(formulaire, "observations_depart"),
    }));
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  const demo = modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, evacuationId, message: `Évacuation sanitaire enregistrée${demo}.` };
}

/** Enregistre le retour du détenu. Liée à l'évacuation par `.bind(null, id)`. */
export async function enregistrerRetourEvacuation(
  evacuationId: number,
  detenuId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  try {
    await api.enregistrerRetourEvacuation(evacuationId, {
      dateRetour: texte(formulaire, "date_retour"),
      observationsRetour: optionnel(formulaire, "observations_retour"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  const demo = modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, message: `Retour enregistré${demo}.` };
}
