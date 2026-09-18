"use server";

import { revalidatePath } from "next/cache";
import { api, ApiErreur, type ConflitApi, type VerificationIdentite } from "@/lib/api";
import { construireDetenu, construireMandat, valeursSaisies } from "@/lib/api/formulaires";

export interface EtatEnregistrement {
  ok?: boolean;
  /** Conservé après un échec du mandat : la reprise ne recrée pas le détenu. */
  detenuId?: number;
  mandatId?: number;
  message?: string;
  /** Erreurs de validation, clés identiques aux noms des champs du formulaire. */
  erreurs?: Record<string, string[]>;
  /** Dossier désactivé portant la même identité (409). */
  conflit?: ConflitApi;
  /** Valeurs saisies, renvoyées pour que rien ne se perde après une erreur. */
  valeurs?: Record<string, string>;
  photoIgnoree?: boolean;
}

/**
 * Enregistrement d'un détenu entrant.
 *
 * L'API impose deux appels : d'abord la fiche, puis son mandat. Si le second
 * échoue, le détenu existe déjà : on renvoie son identifiant pour que la reprise
 * n'envoie que le mandat — sinon le second essai buterait sur « écrou déjà utilisé ».
 */
export async function enregistrerDetenu(
  precedent: EtatEnregistrement,
  formulaire: FormData,
): Promise<EtatEnregistrement> {
  const valeurs = valeursSaisies(formulaire);
  let detenuId = precedent.detenuId;
  let photoIgnoree = false;

  // --- Étape 1 : la fiche (sautée si une tentative précédente l'a déjà créée)
  if (!detenuId) {
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
        // Le stockage des photos ne doit pas bloquer un écrou : on enregistre
        // la fiche sans image et on le dit clairement.
        if (!(e instanceof ApiErreur)) throw e;
        photoIgnoree = true;
        console.warn("[SGP] Téléversement des photos impossible :", e.message);
      }
    }

    try {
      const cree = await api.creerDetenu(entree);
      detenuId = cree.id;
    } catch (e) {
      if (!(e instanceof ApiErreur)) throw e;
      return {
        message: e.message,
        erreurs: e.erreurs,
        conflit: e.conflit,
        valeurs,
        photoIgnoree,
      };
    }
  }

  // --- Étape 2 : le mandat
  try {
    const mandat = await api.creerMandat(detenuId, construireMandat(formulaire));
    revalidatePath("/detenus");
    return { ok: true, detenuId, mandatId: mandat.id, photoIgnoree };
  } catch (e) {
    if (!(e instanceof ApiErreur)) throw e;
    return {
      message: e.message,
      erreurs: e.erreurs,
      // On garde l'identifiant : « Réessayer » n'enverra que le mandat
      detenuId,
      valeurs,
      photoIgnoree,
    };
  }
}

/**
 * Vérification à la volée d'un numéro d'écrou/CNI/passeport, appelée quand le champ
 * perd le focus — sans attendre que le reste de la fiche soit rempli.
 */
export async function verifierIdentite(
  champ: "numero_ecrou" | "numero_cni" | "numero_passeport",
  valeur: string,
): Promise<VerificationIdentite> {
  if (!valeur.trim()) return { disponible: true };

  try {
    return await api.verifierIdentiteDetenu(champ, valeur.trim());
  } catch (e) {
    // Une vérification qui échoue (réseau, permission…) ne doit pas bloquer la
    // saisie : le contrôle à la soumission reste le filet de sécurité réel.
    if (e instanceof ApiErreur) return { disponible: true };
    throw e;
  }
}

/** Restaure un dossier désactivé, puis rafraîchit les écrans concernés. */
export async function restaurerDossier(detenuId: number): Promise<{ message: string }> {
  try {
    await api.restaurerDetenu(detenuId);
    revalidatePath(`/detenus/${detenuId}`);
    revalidatePath("/detenus");
    return { message: "Dossier restauré." };
  } catch (e) {
    if (e instanceof ApiErreur) return { message: e.message };
    throw e;
  }
}
