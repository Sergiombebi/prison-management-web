/**
 * Session — version provisoire.
 *
 * Tant que l'API d'authentification n'existe pas, la session tient dans deux cookies
 * httpOnly posés par la Server Action de connexion. Ce n'est PAS une sécurité : c'est
 * un échafaudage. Le jour où l'API émet un vrai jeton (JWT), seul ce fichier change.
 */

import "server-only";

import { cookies } from "next/headers";
import type { RoleUtilisateur } from "@/lib/domain/types";

export const COOKIE_JETON = "sgp_session";
export const COOKIE_PROFIL = "sgp_profil";

export interface ProfilSession {
  id: number;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
}

export async function getProfil(): Promise<ProfilSession | null> {
  const store = await cookies();
  if (!store.get(COOKIE_JETON)) return null;
  const brut = store.get(COOKIE_PROFIL)?.value;
  if (!brut) return null;
  try {
    return JSON.parse(brut) as ProfilSession;
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

/** Permissions dérivées du rôle — l'API reste seule garante, l'UI ne fait qu'expliquer. */
export function peutEcrire(role: RoleUtilisateur) {
  return role !== "Consultation";
}

export function peutAdministrer(role: RoleUtilisateur) {
  return role === "Administrateur";
}
