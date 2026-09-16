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

export const COOKIE_JETON = "sgp_session";
export const COOKIE_PROFIL = "sgp_profil";

export interface ProfilSession {
  id: number;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
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
    // Un cookie posé avant le passage aux rôles de l'API (« Administrateur »…) n'est plus valide
    if (typeof profil.id !== "number" || !ROLES_UTILISATEUR.includes(profil.role as RoleUtilisateur)) {
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

/** Droits d'administration (personnel, paramètres) — matrice complète à confirmer avec l'API. */
export function peutAdministrer(role: RoleUtilisateur) {
  return role === "admin";
}
