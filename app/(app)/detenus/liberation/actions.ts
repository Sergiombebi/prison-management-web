"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe, type EntreeSortie } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";
import type { SortieDetenu, TypeSortie } from "@/lib/domain/types";

export interface EtatSortie extends EtatAction {
  /** Détenu concerné par la sortie consignée, pour vider la sélection. */
  detenuId?: number;
  /** Transfert qui vient d'être consigné : sert à proposer le bulletin de transfèrement. */
  sortie?: SortieDetenu;
}

function manquant(formulaire: FormData, champ: string, message: string): EtatSortie {
  return { message, erreurs: { [champ]: [message] }, valeurs: valeursSaisies(formulaire) };
}

/**
 * Consigne une sortie. Liée au type par `.bind(null, type)` dans la page : le type
 * vient de l'URL de l'écran, pas d'un champ que l'on pourrait modifier.
 */
export async function consignerSortie(
  type: TypeSortie,
  _precedent: EtatSortie,
  formulaire: FormData,
): Promise<EtatSortie> {
  const detenuId = entier(formulaire, "detenu_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu concerné.");

  const dateSortie = texte(formulaire, "date_sortie");
  const observation = optionnel(formulaire, "observation");

  let entree: EntreeSortie;
  switch (type) {
    case "LiberationNormale": {
      const mandatId = entier(formulaire, "mandas_id");
      if (!mandatId) return manquant(formulaire, "mandas_id", "Choisissez le mandat qui prend fin.");
      entree = { type, mandatId, dateSortie, motif: texte(formulaire, "motif"), observation };
      break;
    }
    case "Transfert":
      entree = { type, dateSortie, destination: texte(formulaire, "destination"), motif: optionnel(formulaire, "motif"), observation };
      break;
    case "Evasion":
      entree = { type, dateSortie, cause: optionnel(formulaire, "cause"), observation };
      break;
    case "Deces":
      entree = { type, dateSortie, cause: texte(formulaire, "cause"), observation };
      break;
  }

  let definitive: boolean;
  let sortie: SortieDetenu | undefined;
  try {
    const cree = await api.enregistrerSortie(detenuId, entree);
    definitive = cree.definitive;
    if (type === "Transfert" || type === "Evasion") sortie = (await api.getSortie(cree.id)) ?? undefined;
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath("/detenus", "layout");
  revalidatePath("/discipline", "layout");

  const demo = modeDe("sorties") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return {
    ok: true,
    detenuId,
    sortie,
    message: definitive
      ? `Sortie consignée : le détenu ne fait plus partie de l’effectif, sa cellule est libérée${demo}.`
      : `Mandat levé. Le détenu reste écroué : d’autres mandats sont encore actifs${demo}.`,
  };
}

/** Corrige un transfert déjà consigné. Liée à la sortie par `.bind(null, id)`. */
export async function modifierTransfert(
  sortieId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  try {
    await api.majSortie(sortieId, {
      dateSortie: texte(formulaire, "date_sortie"),
      destination: texte(formulaire, "destination"),
      motif: optionnel(formulaire, "motif"),
      observation: optionnel(formulaire, "observation"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath("/detenus/liberation", "layout");
  const demo = modeDe("sorties") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, message: `Transfert modifié${demo}.` };
}
