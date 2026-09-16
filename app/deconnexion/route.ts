import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_JETON, COOKIE_PROFIL } from "@/lib/session";

const RAISONS = new Set(["expiree", "session-invalide"]);

/**
 * GET /deconnexion — nettoie une session devenue inutilisable (jeton expiré, cookie
 * illisible) puis renvoie vers la connexion.
 *
 * Pourquoi une route plutôt qu'un redirect("/connexion") direct : un composant serveur
 * ne peut pas supprimer de cookie, et tant que le cookie existe, le proxy renverrait
 * /connexion vers le tableau de bord — boucle infinie.
 *
 * La déconnexion volontaire passe par la Server Action `seDeconnecter` (POST), qui
 * révoque aussi le jeton côté API.
 */
export function GET(request: NextRequest) {
  const raison = request.nextUrl.searchParams.get("raison");
  const cible = new URL("/connexion", request.url);
  if (raison && RAISONS.has(raison)) cible.searchParams.set("raison", raison);

  const reponse = NextResponse.redirect(cible);
  reponse.cookies.delete(COOKIE_JETON);
  reponse.cookies.delete(COOKIE_PROFIL);
  return reponse;
}
