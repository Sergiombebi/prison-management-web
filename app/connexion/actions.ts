"use server";

import { redirect } from "next/navigation";
import { api, ApiErreur } from "@/lib/api";
import { aAcces, pageDArrivee } from "@/lib/acces";
import { ouvrirSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr";

export interface EtatConnexion {
  erreur?: string;
  identifiant?: string;
}

/**
 * N'accepte qu'un chemin interne, pour ne jamais rediriger vers un site tiers — et
 * qu'un écran que ce compte peut ouvrir : un agent ayant tenté /administration avant
 * de se connecter n'y serait renvoyé que pour se voir refuser l'entrée.
 */
function suiteSure(valeur: FormDataEntryValue | null, permissions: string[]): string {
  const s = typeof valeur === "string" ? valeur : "";
  const interne = s.startsWith("/") && !s.startsWith("//");
  // Revenir sur /deconnexion juste après la connexion effacerait aussitôt la session
  const recevable = interne && !s.startsWith("/deconnexion") && aAcces(permissions, s);
  return recevable ? s : pageDArrivee(permissions);
}

export async function connecter(
  _precedent: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
  const identifiant = String(formData.get("identifiant") ?? "").trim();
  const motDePasse = String(formData.get("motDePasse") ?? "");

  if (!identifiant || !motDePasse) {
    return { erreur: t.connexion.erreurChampsRequis, identifiant };
  }

  let permissions: string[] = [];

  try {
    const { utilisateur, jeton } = await api.connexion(identifiant, motDePasse);
    permissions = utilisateur.permissions;
    await ouvrirSession(jeton, {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      permissions: utilisateur.permissions,
    });
  } catch (e) {
    // On garde l'identifiant saisi : l'utilisateur ne retape que le mot de passe
    if (e instanceof ApiErreur) return { erreur: e.message, identifiant };
    return { erreur: "Service momentanément indisponible. Réessayez.", identifiant };
  }

  // redirect() lève une exception de contrôle : il doit rester hors du try/catch
  redirect(suiteSure(formData.get("suite"), permissions));
}
