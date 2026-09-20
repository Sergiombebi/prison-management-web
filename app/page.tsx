import { redirect } from "next/navigation";
import { ACCUEIL, pageDArrivee } from "@/lib/acces";
import { getProfil } from "@/lib/session";

/**
 * « / » n'a pas de contenu propre. Le proxy l'intercepte déjà ; cette page couvre
 * les cas où il ne tourne pas (rendu statique, test) et oriente selon les droits
 * plutôt que vers un tableau de bord que tout le monde n'a pas le droit de voir.
 */
export default async function Accueil() {
  const profil = await getProfil();
  redirect(profil ? pageDArrivee(profil.permissions) : ACCUEIL);
}
