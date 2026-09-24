"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiErreur } from "@/lib/api";
import { construireMandat, valeursSaisies } from "@/lib/api/formulaires";
import type { EtatMandat } from "@/app/(app)/detenus/[id]/mandats/[mandatId]/actions";

/**
 * Enregistre un mandat supplémentaire pour un détenu déjà incarcéré - le cas
 * DPAC, où une nouvelle affaire survient pendant qu'il purge déjà une peine.
 * L'ancien mandat n'est pas touché : les deux coexistent, actifs en parallèle.
 */
export async function creerMandatPourDetenu(
  _precedent: EtatMandat,
  formulaire: FormData,
): Promise<EtatMandat> {
  const detenuId = Number(formulaire.get("detenu_id"));

  if (!Number.isFinite(detenuId)) {
    return { message: "Détenu introuvable.", valeurs: valeursSaisies(formulaire) };
  }

  try {
    await api.creerMandat(detenuId, construireMandat(formulaire));
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
  redirect(`/detenus/${detenuId}?onglet=mandats`);
}
