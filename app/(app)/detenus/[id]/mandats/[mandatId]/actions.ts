"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiErreur } from "@/lib/api";
import { construireMandat, valeursSaisies } from "@/lib/api/formulaires";

export interface EtatMandat {
  message?: string;
  erreurs?: Record<string, string[]>;
  valeurs?: Record<string, string>;
}

/**
 * Fait évoluer un mandat existant : une détention provisoire qui reçoit son
 * jugement devient une exécution de peine, puis un appel, etc.
 *
 * C'est l'API qui reclasse ensuite le détenu dans la bonne catégorie pénale —
 * le front n'a rien à recalculer.
 */
export async function faireEvoluerMandat(
  _precedent: EtatMandat,
  formulaire: FormData,
): Promise<EtatMandat> {
  const mandatId = Number(formulaire.get("mandat_id"));
  const detenuId = Number(formulaire.get("detenu_id"));

  if (!Number.isFinite(mandatId) || !Number.isFinite(detenuId)) {
    return { message: "Mandat introuvable.", valeurs: valeursSaisies(formulaire) };
  }

  try {
    await api.majMandat(mandatId, construireMandat(formulaire));
  } catch (e) {
    if (!(e instanceof ApiErreur)) throw e;
    return {
      message: e.message,
      erreurs: e.erreurs,
      valeurs: valeursSaisies(formulaire),
    };
  }

  revalidatePath(`/detenus/${detenuId}`);
  revalidatePath("/detenus");
  // redirect() lève une exception de contrôle : il reste hors du try/catch
  redirect(`/detenus/${detenuId}?onglet=mandats`);
}
