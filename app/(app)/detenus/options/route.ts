import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/api";
import { getJeton } from "@/lib/session";

/**
 * GET /detenus/options?q=&decalage= — proxy serveur pour le combobox de recherche de détenu
 * (`components/ui/select-detenu.tsx`). Un Client Component ne peut pas appeler
 * directement l'API Laravel : le jeton Sanctum vit dans un cookie httpOnly, illisible
 * en JavaScript navigateur. Cette route tourne côté serveur, lit le cookie comme le
 * reste de `lib/api`, et ne renvoie que les quelques champs nécessaires au combobox.
 */
export async function GET(request: NextRequest) {
  if (!(await getJeton())) return NextResponse.json({ data: [], aPlus: false }, { status: 401 });

  const recherche = request.nextUrl.searchParams.get("q") ?? "";
  const decalage = Number(request.nextUrl.searchParams.get("decalage") ?? "0") || 0;
  const resultat = await api.listOptionsDetenus(recherche, decalage);
  return NextResponse.json({ data: resultat.items, aPlus: resultat.aPlus });
}
