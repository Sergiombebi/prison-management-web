/**
 * Session — deux cookies httpOnly posés par la Server Action de connexion :
 * - le jeton Sanctum renvoyé par l'API (jamais lisible par le JavaScript du navigateur) ;
 * - un profil minimal pour afficher le shell sans rappeler l'API à chaque rendu.
 *
 * L'API reste seule juge des droits : le rôle ne sert ici qu'à adapter l'interface.
 */

import "server-only";

import { cookies } from "next/headers";
import type { RoleUtilisateur } from "@/lib/domain/types";
import { ROLES_UTILISATEUR } from "@/lib/domain/referentiels";
import { COOKIE_JETON, COOKIE_PROFIL } from "@/lib/session-cookies";

// Les noms vivent dans un module sans dépendance, pour être lisibles depuis le proxy.
// Réexportés ici pour que les appelants gardent un seul point d'entrée « session ».
export { COOKIE_JETON, COOKIE_PROFIL };

export interface ProfilSession {
  id: number;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  permissions: string[];
}

export async function getJeton(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_JETON)?.value;
}

export async function getProfil(): Promise<ProfilSession | null> {
  const store = await cookies();
  if (!store.get(COOKIE_JETON)) return null;
  const brut = store.get(COOKIE_PROFIL)?.value;
  if (!brut) return null;
  try {
    const profil = JSON.parse(brut) as Partial<ProfilSession>;
    // Un cookie posé avant le passage aux rôles de l'API (« Administrateur »…), ou avant
    // l'ajout des permissions individuelles, n'est plus valide - on force une reconnexion
    // plutôt que de traiter des permissions manquantes comme une liste vide légitime.
    if (
      typeof profil.id !== "number" ||
      !ROLES_UTILISATEUR.includes(profil.role as RoleUtilisateur) ||
      !Array.isArray(profil.permissions)
    ) {
      return null;
    }
    return profil as ProfilSession;
  } catch {
    return null;
  }
}

export async function ouvrirSession(jeton: string, profil: ProfilSession) {
  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 10, // une vacation de 10 heures
  };
  store.set(COOKIE_JETON, jeton, options);
  store.set(COOKIE_PROFIL, JSON.stringify(profil), options);
}

export async function fermerSession() {
  const store = await cookies();
  store.delete(COOKIE_JETON);
  store.delete(COOKIE_PROFIL);
}

/** Un utilisateur ne peut agir que sur ce que l'administrateur lui a explicitement accordé. */
export function peut(permissions: string[], cle: string): boolean {
  return permissions.includes(cle);
}

/** Accès à la section Administration (personnel ou paramètres). */
export function peutAdministrer(permissions: string[]) {
  return peut(permissions, "administration.personnel.gerer") || peut(permissions, "administration.parametres.gerer");
}
