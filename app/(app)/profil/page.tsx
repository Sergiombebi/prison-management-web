import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import {
  MODULES_METIER,
  estAdministrateur,
  modulesAccordes,
} from "@/lib/domain/modules";
import { formatRelatif, initiales } from "@/lib/format";
import { getProfil } from "@/lib/session";
import { Page, PageHeader } from "@/components/layout/page";
import { Avatar, Panel } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { FormulaireProfil } from "@/components/profil/formulaire-profil";
import { BoutonChangerMotDePasse } from "@/components/profil/bouton-changer-mot-de-passe";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilPage() {
  const profil = await getProfil();
  if (!profil) redirect("/deconnexion?raison=session-invalide");

  const utilisateur = await api.getUtilisateurCourant();
  const ouverts = modulesAccordes(utilisateur.permissions);
  const admin = estAdministrateur(utilisateur.permissions);

  return (
    <Page>
      <PageHeader
        titre="Mon profil"
        description="Vos informations de connexion. Vos accès aux modules sont attribués par un administrateur."
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

          <Panel variante="eleve" titre="Mes accès">
            <div className="flex flex-col gap-3">
              {admin && (
                <p className="flex items-start gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 py-2 text-xs text-accent-ink">
                  <Icon name="shield" size={13} className="mt-0.5 shrink-0" />
                  Habilitation d’administration : tableau de bord général, édition d’états
                  et administration de l’établissement.
                </p>
              )}

              {ouverts.length === 0 && !admin ? (
                <p className="text-sm text-muted">
                  Aucun module ne vous est ouvert pour l’instant. Adressez-vous à
                  l’administrateur de l’établissement.
                </p>
              ) : (
                MODULES_METIER.filter((m) => ouverts.includes(m.cle)).map((m) => (
                  <div
                    key={m.cle}
                    style={{ ["--teinte" as string]: m.teinte.trait }}
                    className="flex gap-2.5 rounded-lg border border-hairline p-2.5"
                  >
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-md text-[color:var(--teinte)] ring-1 ring-inset ring-[color:var(--teinte)]/25"
                      style={{ backgroundColor: m.teinte.voile }}
                    >
                      <Icon name={m.icone} size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{m.label}</p>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {m.capacites.map((c) => (
                          <li key={c} className="flex items-start gap-1.5 text-2xs text-muted">
                            <Icon
                              name="check"
                              size={11}
                              className="mt-0.5 shrink-0 text-[color:var(--teinte)]"
                            />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
