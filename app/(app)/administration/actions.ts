"use server";

import { revalidatePath } from "next/cache";
import { api, ApiErreur, modeDe } from "@/lib/api";
import { etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";
import {
  CLES_MODULES,
  permissionsPourAcces,
  roleImplicite,
  type CleModule,
} from "@/lib/domain/modules";

/** En démonstration rien n'est persisté : le message le dit. */
const suffixe = () =>
  modeDe("administration") === "mock" ? " (démonstration : rien n’est enregistré)" : "";

/**
 * Traduit la sélection du formulaire (modules cochés + interrupteur administrateur)
 * en ce que l'API attend encore : une liste de permissions et un rôle.
 *
 * Le rôle n'est plus saisi nulle part ; il est déduit ici parce que la route le
 * valide toujours comme obligatoire. Côté API ce n'est qu'une étiquette : les
 * droits réels viennent des permissions.
 */
function accesDepuisFormulaire(formulaire: FormData) {
  const administrateur = formulaire.get("administrateur") !== null;
  const modules = formulaire
    .getAll("modules[]")
    .map(String)
    .filter((cle): cle is CleModule => (CLES_MODULES as string[]).includes(cle));

  return {
    role: roleImplicite(modules, administrateur),
    permissions: permissionsPourAcces(modules, administrateur),
  };
}

function rafraichirPersonnel() {
  revalidatePath("/administration/personnel");
}

export async function creerUtilisateur(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const username = texte(formulaire, "username");
  const motDePasse = texte(formulaire, "password");

  if (motDePasse.length < 8) {
    return {
      message: "Le mot de passe doit contenir au moins 8 caractères.",
      erreurs: { password: ["Le mot de passe doit contenir au moins 8 caractères."] },
      valeurs: valeursSaisies(formulaire),
    };
  }

  try {
    await api.creerUtilisateur({
      nom: texte(formulaire, "nom"),
      prenom: texte(formulaire, "prenom"),
      username,
      email: texte(formulaire, "email"),
      ...accesDepuisFormulaire(formulaire),
      motDePasse,
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichirPersonnel();
  return { ok: true, message: `Compte ${username} créé${suffixe()}.` };
}

/** Liée à l'identifiant par `.bind(null, id)` : il ne transite pas par un champ modifiable. */
export async function modifierUtilisateur(
  utilisateurId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const username = texte(formulaire, "username");

  try {
    await api.majUtilisateur(utilisateurId, {
      nom: texte(formulaire, "nom"),
      prenom: texte(formulaire, "prenom"),
      username,
      email: texte(formulaire, "email"),
      ...accesDepuisFormulaire(formulaire),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichirPersonnel();
  return { ok: true, message: `Compte ${username} mis à jour${suffixe()}.` };
}

export async function desactiverUtilisateur(utilisateurId: number): Promise<{ ok: boolean; message?: string }> {
  try {
    await api.desactiverUtilisateur(utilisateurId);
  } catch (e) {
    return { ok: false, message: etatDepuisErreur(e).message };
  }
  rafraichirPersonnel();
  return { ok: true };
}

export async function restaurerUtilisateur(utilisateurId: number): Promise<{ message: string }> {
  try {
    await api.restaurerUtilisateur(utilisateurId);
    rafraichirPersonnel();
    return { message: `Compte réactivé${suffixe()}.` };
  } catch (e) {
    return { message: etatDepuisErreur(e).message ?? "Le compte n’a pas pu être réactivé." };
  }
}

export async function reinitialiserMotDePasse(
  utilisateurId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const motDePasse = texte(formulaire, "password");
  if (motDePasse.length < 8) {
    return {
      message: "Le mot de passe doit contenir au moins 8 caractères.",
      erreurs: { password: ["Le mot de passe doit contenir au moins 8 caractères."] },
    };
  }

  try {
    await api.reinitialiserMotDePasse(utilisateurId, motDePasse);
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  return { ok: true, message: `Mot de passe réinitialisé${suffixe()}.` };
}

export async function modifierParametres(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  let logoUrl = optionnel(formulaire, "logoUrl");
  let logoPublicId = optionnel(formulaire, "logoPublicId");

  const logo = formulaire.get("logo");
  if (logo instanceof File && logo.size > 0) {
    try {
      const televerse = await api.televerserLogo(logo);
      logoUrl = televerse.url;
      logoPublicId = televerse.publicId;
    } catch (e) {
      // Le stockage indisponible n'empêche pas d'enregistrer le reste : on
      // conserve le logo actuel et on le signale.
      if (!(e instanceof ApiErreur)) throw e;
      const etat = etatDepuisErreur(e, formulaire);
      return {
        ...etat,
        message: `Le logo n’a pas pu être déposé (${e.message}). Enregistrez à nouveau sans changer le logo pour conserver les autres modifications.`,
      };
    }
  }

  try {
    await api.majParametres({
      nomPrison: texte(formulaire, "nomPrison"),
      ville: texte(formulaire, "ville"),
      telephone: texte(formulaire, "telephone"),
      fax: texte(formulaire, "fax"),
      enteteGauche: texte(formulaire, "enteteGauche"),
      enteteDroite: texte(formulaire, "enteteDroite"),
      logoUrl,
      logoPublicId,
      ageMajorite: Number(texte(formulaire, "ageMajorite")) || 18,
      autoritesAmpliataires: texte(formulaire, "autoritesAmpliataires"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  revalidatePath("/administration/parametres");
  return { ok: true, message: `Paramètres enregistrés${suffixe()}.` };
}
