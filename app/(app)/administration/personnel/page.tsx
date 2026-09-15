import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { RoleUtilisateur, Utilisateur } from "@/lib/domain/types";
import { DESCRIPTION_ROLE, LIBELLE_ROLE } from "@/lib/domain/referentiels";
import { formatNombre, formatRelatif, initiales } from "@/lib/format";
import { getProfil, peutAdministrer } from "@/lib/session";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Personnel" };

const ROLES: RoleUtilisateur[] = ["Administrateur", "Gestionnaire", "Consultation"];

export default async function PersonnelPage() {
  const profil = await getProfil();

  if (!profil || !peutAdministrer(profil.role)) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.administration} titre="Personnel" />
        <Panel>
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte="La gestion des comptes est réservée aux administrateurs. Adressez-vous au régisseur si vous avez besoin d’un accès."
            action={<ButtonLink href="/tableau-de-bord" taille="sm">{t.modules.tableauDeBord}</ButtonLink>}
          />
        </Panel>
      </Page>
    );
  }

  const utilisateurs = await api.listUtilisateurs();
  const actifs = utilisateurs.filter((u) => u.estActif).length;

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.administration}
        titre="Personnel"
        description="Comptes ayant accès au système et niveau d’habilitation de chacun."
      />

      <StatGrid colonnes={4}>
        <Stat style={{ ["--i" as string]: 0 }} label="Comptes" valeur={formatNombre(utilisateurs.length)} contexte={`${formatNombre(actifs)} actifs`} />
        {ROLES.map((r, i) => (
          <Stat key={r} style={{ ["--i" as string]: i + 1 }} label={`${LIBELLE_ROLE[r]}s`} valeur={formatNombre(utilisateurs.filter((u) => u.role === r).length)} contexte={DESCRIPTION_ROLE[r]} />
        ))}
      </StatGrid>

      <Panel titre="Comptes utilisateurs" flush className="overflow-hidden">
        <DataTable<Utilisateur>
          legende="Comptes utilisateurs"
          lignes={utilisateurs}
          cleLigne={(u) => u.id}
          colonnes={[
            {
              cle: "nom",
              titre: "Agent",
              rendu: (u) => (
                <div className="flex items-center gap-2.5">
                  <Avatar initiales={initiales(`${u.prenom} ${u.nom}`)} taille="sm" />
                  <div>
                    <p className="font-medium">
                      {u.prenom} {u.nom}
                      {u.id === profil.id && <span className="ml-1.5 text-xs font-normal text-faint">(vous)</span>}
                    </p>
                    <p className="font-mono text-xs text-muted">{u.username}</p>
                  </div>
                </div>
              ),
            },
            { cle: "email", titre: "Adresse électronique", masquerSous: "lg", rendu: (u) => <span className="text-muted">{u.email ?? "—"}</span> },
            {
              cle: "role",
              titre: t.champs.role,
              rendu: (u) => (
                <Badge ton={u.role === "Administrateur" ? "accent" : "neutre"} title={DESCRIPTION_ROLE[u.role]}>
                  {LIBELLE_ROLE[u.role]}
                </Badge>
              ),
            },
            { cle: "etat", titre: "Compte", rendu: (u) => <Badge ton={u.estActif ? "succes" : "neutre"}>{u.estActif ? "Actif" : "Désactivé"}</Badge> },
            {
              cle: "connexion",
              titre: t.champs.derniereConnexion,
              align: "droite",
              masquerSous: "md",
              rendu: (u) => <span className="text-muted">{u.derniereConnexion ? formatRelatif(u.derniereConnexion) : "Jamais connecté"}</span>,
            },
          ]}
        />
      </Panel>
    </Page>
  );
}
