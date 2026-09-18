"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { etatDepuisErreur, texte, type EtatAction } from "@/lib/api/actions";

/** En démonstration rien n'est persisté : le message le dit. */
const suffixe = () => (modeDe("auth") === "mock" ? " (démonstration : rien n’est enregistré)" : "");

export async function modifierProfil(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  try {
    await api.majProfil({
      nom: texte(formulaire, "nom"),
      prenom: texte(formulaire, "prenom"),
      username: texte(formulaire, "username"),
      email: texte(formulaire, "email"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath("/", "layout");
  return { ok: true, message: `Profil mis à jour${suffixe()}.` };
}

export async function changerMonMotDePasse(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const motDePasseActuel = texte(formulaire, "mot_de_passe_actuel");
  const nouveauMotDePasse = texte(formulaire, "password");

  if (nouveauMotDePasse.length < 8) {
    return {
      message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      erreurs: { password: ["Le nouveau mot de passe doit contenir au moins 8 caractères."] },
    };
  }

  try {
    await api.changerMonMotDePasse(motDePasseActuel, nouveauMotDePasse);
  } catch (e) {
    return etatDepuisErreur(e);
  }

  return { ok: true, message: `Mot de passe modifié${suffixe()}.` };
}
