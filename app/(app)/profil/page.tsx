import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { PERMISSIONS } from "@/lib/domain/referentiels";
import { formatRelatif, initiales } from "@/lib/format";
import { getProfil } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { Badge } from "@/components/ui/badge";
import { Avatar, Panel } from "@/components/ui/surface";
import { FormulaireProfil } from "@/components/profil/formulaire-profil";
import { BoutonChangerMotDePasse } from "@/components/profil/bouton-changer-mot-de-passe";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const profil = await getProfil();
  if (!profil) redirect("/deconnexion?raison=session-invalide");

  const utilisateur = await api.getUtilisateurCourant();
  const permissionsAccordees = new Set(utilisateur.permissions);

  return (
    <Page>
      <PageHeader
        titre="Mon profil"
        description="Vos informations de connexion. Le rôle et les permissions sont gérés par un administrateur."
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel variante="eleve" titre="Identité">
          <FormulaireProfil profil={profil} email={utilisateur.email} username={utilisateur.username} />
        </Panel>

        <div className="flex flex-col gap-4 xl:sticky xl:top-20">
          <Panel variante="eleve" titre="Sécurité">
            <div className="flex flex-col items-start gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar initiales={initiales(`${profil.prenom} ${profil.nom}`)} taille="sm" />
                <p className="text-sm text-muted">
                  Dernière connexion :{" "}
                  {utilisateur.derniereConnexion ? formatRelatif(utilisateur.derniereConnexion) : "—"}
                </p>
              </div>
              <BoutonChangerMotDePasse />
            </div>
          </Panel>

          <Panel variante="eleve" titre="Mes permissions">
            <div className="flex flex-col gap-3">
              {PERMISSIONS.map((groupe) => {
                const accordees = groupe.permissions.filter((p) => permissionsAccordees.has(p.cle));
                if (accordees.length === 0) return null;
                return (
                  <div key={groupe.module} className="flex flex-col gap-1.5">
                    <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted">{groupe.module}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {accordees.map((p) => (
                        <Badge key={p.cle} ton="neutre">
                          {p.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              {permissionsAccordees.size === 0 && (
                <p className="text-sm text-muted">Aucune permission accordée pour l’instant.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
