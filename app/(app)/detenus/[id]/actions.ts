"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { api, ApiErreur, modeDe } from "@/lib/api";
import { etatDepuisErreur, optionnel, type EtatAction } from "@/lib/api/actions";
import { construireDetenu } from "@/lib/api/formulaires";

export interface EtatModification extends EtatAction {
  photoIgnoree?: boolean;
}

/**
 * Mise à jour de la fiche d'identité. Liée à l'identifiant du détenu par
 * `.bind(null, id)` dans la page : il ne transite jamais par un champ caché
 * que l'on pourrait modifier.
 */
export async function modifierDetenu(
  detenuId: number,
  _precedent: EtatModification,
  formulaire: FormData,
): Promise<EtatModification> {
  const entree = construireDetenu(formulaire);

  const face = formulaire.get("photo_face");
  const profil = formulaire.get("photo_profil");
  const aFace = face instanceof File && face.size > 0;
  const aProfil = profil instanceof File && profil.size > 0;

  if (aFace || aProfil) {
    try {
      const photos = await api.televerserPhotos({
        face: aFace ? (face as File) : null,
        profil: aProfil ? (profil as File) : null,
      });
      entree.photoFace = photos.face ?? null;
      entree.photoProfil = photos.profil ?? null;
    } catch (e) {
      // Le stockage indisponible n'empêche pas de corriger l'identité : on
      // enregistre le reste et on le signale.
      if (!(e instanceof ApiErreur)) throw e;
      const etat = etatDepuisErreur(e, formulaire);
      return {
        ...etat,
        message: `Les photographies n’ont pas pu être déposées (${e.message}). Enregistrez à nouveau sans photo pour conserver les autres modifications.`,
      };
    }
  }

  try {
    await api.majDetenu(detenuId, entree);
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath(`/detenus/${detenuId}`);
  revalidatePath("/detenus");
  // redirect() lève une exception de contrôle : il reste hors du try/catch
  redirect(`/detenus/${detenuId}?maj=identite`);
}

/**
 * Désactivation administrative (doublon, dossier créé par erreur). Une vraie
 * sortie de détention passe par les écrans de libération, qui l'archivent.
 */
export async function desactiverDossier(detenuId: number): Promise<{ ok: boolean; message?: string }> {
  try {
    await api.desactiverDetenu(detenuId);
  } catch (e) {
    return { ok: false, message: etatDepuisErreur(e).message };
  }
  revalidatePath(`/detenus/${detenuId}`);
  revalidatePath("/detenus");
  return { ok: true };
}

/** Désactive un mandat saisi par erreur. La levée d'écrou, elle, est une sortie. */
export async function desactiverMandat(
  detenuId: number,
  mandatId: number,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await api.desactiverMandat(mandatId);
  } catch (e) {
    return { ok: false, message: etatDepuisErreur(e).message };
  }
  revalidatePath(`/detenus/${detenuId}`);
  revalidatePath("/detenus");
  return { ok: true };
}

/**
 * Met à jour l'état de santé persistant (groupe sanguin, allergies, maladies
 * chroniques) — indépendant de toute consultation. Le traitement en cours ne s'y
 * saisit plus : il se déduit des prescriptions actives (voir `creerPrescription`).
 * Liée au détenu par `.bind(null, id)` dans la page.
 */
export async function modifierDossierMedical(
  detenuId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  try {
    await api.majDossierMedical(detenuId, {
      groupeSanguin: optionnel(formulaire, "groupe_sanguin"),
      allergies: optionnel(formulaire, "allergies"),
      maladiesChroniques: optionnel(formulaire, "maladies_chroniques"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath(`/detenus/${detenuId}`);
  const demo = modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "";
  return { ok: true, message: `Dossier médical mis à jour${demo}.` };
}
