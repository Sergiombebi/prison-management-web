import { NextResponse, type NextRequest } from "next/server";
import { ACCES_REFUSE, aAcces, pageDArrivee } from "@/lib/acces";
import { COOKIE_JETON, COOKIE_PROFIL, permissionsDuCookie } from "@/lib/session-cookies";

/**
 * Vérification optimiste : sans cookie de session, on renvoie vers la connexion ;
 * avec un cookie qui n'ouvre pas l'écran demandé, on renvoie vers l'écran de refus
 * plutôt que de laisser l'API répondre 403 et l'écran d'erreur générique s'afficher.
 *
 * Ce n'est pas une autorisation — l'API reste seule juge de ce qu'un jeton permet.
 * Le cookie peut avoir vieilli ; `app/(app)/layout.tsx` le confronte aux permissions
 * fraîches à chaque chargement complet.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const connecte = request.cookies.has(COOKIE_JETON);
  const permissions = permissionsDuCookie(request.cookies.get(COOKIE_PROFIL)?.value);

  // Nettoyage d'une session inutilisable : accessible connecté ou non (voir app/deconnexion)
  if (pathname === "/deconnexion") return NextResponse.next();

  if (pathname === "/connexion") {
    return connecte
      ? NextResponse.redirect(new URL(pageDArrivee(permissions), request.url))
      : NextResponse.next();
  }

  if (!connecte) {
    const url = new URL("/connexion", request.url);
    if (pathname !== "/") url.searchParams.set("suite", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // « / » n'a pas de contenu propre : il mène à l'écran d'arrivée du profil.
  if (pathname === "/") {
    return NextResponse.redirect(new URL(pageDArrivee(permissions), request.url));
  }

  // `null` = cookie illisible : on ne bloque rien, le layout et l'API trancheront.
  if (permissions && !aAcces(permissions, pathname)) {
    const url = new URL(ACCES_REFUSE, request.url);
    url.searchParams.set("vers", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|ico|webp)$).*)"],
};
