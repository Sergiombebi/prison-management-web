import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { api, ApiErreur } from "@/lib/api";
import { getProfil, type ProfilSession } from "@/lib/session";
import { seDeconnecter } from "./actions";

export default async function ApplicationLayout({ children }: LayoutProps<"/">) {
  const profilCookie = await getProfil();

  // Cookie absent, illisible ou d'un ancien format : on passe par /deconnexion pour
  // l'effacer. Rediriger directement vers /connexion bouclerait, car le proxy y voit
  // encore le cookie et renvoie vers le tableau de bord.
  if (!profilCookie) redirect("/deconnexion?raison=session-invalide");

  let profil: ProfilSession = profilCookie;
  let sessionExpiree = false;

  try {
    // Un layout ne se rend qu'au chargement complet ou au rafraîchissement, pas à chaque
    // navigation : cette vérification coûte un seul appel par visite.
    const utilisateur = await api.getUtilisateurCourant();
    profil = {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      role: utilisateur.role,
      permissions: utilisateur.permissions,
    };
  } catch (e) {
    if (!(e instanceof ApiErreur)) throw e;
    // 401 : jeton révoqué ou expiré. Toute autre erreur (API injoignable…) : on garde le
    // profil du cookie, et chaque écran affichera sa propre erreur de chargement.
    if (e.statut === 401) sessionExpiree = true;
  }

  // redirect() hors du try : il lève une exception que le catch intercepterait
  if (sessionExpiree) redirect("/deconnexion?raison=expiree");

  return (
    <AppShell profil={profil} seDeconnecter={seDeconnecter}>
      {children}
    </AppShell>
  );
}
