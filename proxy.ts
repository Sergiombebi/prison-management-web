import { NextResponse, type NextRequest } from "next/server";

/**
 * Vérification optimiste : sans cookie de session, on renvoie vers la connexion.
 * Ce n'est pas une autorisation — l'API reste seule juge de ce qu'un jeton permet.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const connecte = request.cookies.has("sgp_session");

  // Nettoyage d'une session inutilisable : accessible connecté ou non (voir app/deconnexion)
  if (pathname === "/deconnexion") return NextResponse.next();

  if (pathname === "/connexion") {
    return connecte
      ? NextResponse.redirect(new URL("/tableau-de-bord", request.url))
      : NextResponse.next();
  }

  if (!connecte) {
    const url = new URL("/connexion", request.url);
    if (pathname !== "/") url.searchParams.set("suite", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
