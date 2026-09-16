"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { fermerSession } from "@/lib/session";

export async function seDeconnecter() {
  try {
    // Révoquer le jeton côté API AVANT d'effacer le cookie qui le contient :
    // sinon il resterait valide sur le serveur jusqu'à son expiration.
    await api.deconnexion();
  } catch (e) {
    // Jeton déjà expiré ou API injoignable : la déconnexion locale doit aboutir quand même
    console.warn("[SGP] Révocation du jeton impossible :", e);
  }

  await fermerSession();
  redirect("/connexion");
}
