"use server";

import { redirect } from "next/navigation";
import { api, ApiErreur } from "@/lib/api";
import { ouvrirSession } from "@/lib/session";
import { t } from "@/lib/i18n/fr";

export interface EtatConnexion {
  erreur?: string;
  identifiant?: string;
}

/** N'accepte qu'un chemin interne, pour ne jamais rediriger vers un site tiers. */
function suiteSure(valeur: FormDataEntryValue | null): string {
  const s = typeof valeur === "string" ? valeur : "";
  const interne = s.startsWith("/") && !s.startsWith("//");
  // Revenir sur /deconnexion juste après la connexion effacerait aussitôt la session
  return interne && !s.startsWith("/deconnexion") ? s : "/tableau-de-bord";
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

  try {
    const { utilisateur, jeton } = await api.connexion(identifiant, motDePasse);
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
  redirect(suiteSure(formData.get("suite")));
}
