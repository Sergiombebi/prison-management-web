import type { Metadata } from "next";
import { api } from "@/lib/api";
import type { Utilisateur } from "@/lib/domain/types";
import {
  MODULES_METIER,
  estAdministrateur,
  modulesAccordes,
} from "@/lib/domain/modules";
import { formatNombre, formatRelatif, initiales } from "@/lib/format";
import { hrefAvec, param } from "@/lib/url";
import { getProfil, peut } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Stat, StatGrid } from "@/components/data/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, EmptyState, Panel } from "@/components/ui/surface";
import { BoutonConfirmation } from "@/components/ui/bouton-confirmation";
import { FormulaireUtilisateur } from "@/components/administration/formulaire-utilisateur";
import { BoutonReinitialiserMotDePasse } from "@/components/administration/bouton-reinitialiser-mot-de-passe";
import { BoutonRestaurerUtilisateur } from "@/components/administration/bouton-restaurer-utilisateur";
import { PucesAcces } from "@/components/administration/puces-acces";
import { creerUtilisateur, desactiverUtilisateur, modifierUtilisateur } from "../actions";

export const metadata: Metadata = { title: "Personnel" };

const CHEMIN = "/administration/personnel";

export default async function PersonnelPage(props: PageProps<"/administration/personnel">) {
  const t = await getT();
  const profil = await getProfil();

  if (!profil || !peut(profil.permissions, "administration.personnel.gerer")) {
    return (
      <Page>
        <PageHeader surtitre={t.modules.administration} titre="Personnel" />
        <Panel variante="eleve">
          <EmptyState
            icone="lock"
            titre={t.etats.horsPerimetre}
            texte="La gestion des comptes est réservée aux administrateurs. Adressez-vous au régisseur si vous avez besoin d’un accès."
            action={<ButtonLink href="/accueil" taille="sm">Mon accueil</ButtonLink>}
          />
        </Panel>
      </Page>
    );
  }

  const sp = await props.searchParams;
  const utilisateurs = await api.listUtilisateurs();
  const actifs = utilisateurs.filter((u) => u.estActif).length;
  const administrateurs = utilisateurs.filter((u) => estAdministrateur(u.permissions)).length;
  // Un compte sans module se connecte mais n'ouvre rien : c'est exactement ce qui
  // envoyait les profils sur l'écran d'erreur. On le fait remonter ici.
  const sansAcces = utilisateurs.filter(
    (u) => !estAdministrateur(u.permissions) && modulesAccordes(u.permissions).length === 0,
  ).length;
  const enModification = utilisateurs.find((u) => String(u.id) === param(sp, "modifier"));

  return (
    <Page>
      <PageHeader
        surtitre={t.modules.administration}
        titre="Personnel"
        description="Comptes ayant accès au système. L’habilitation se donne par module : un compte peut en cumuler plusieurs."
      />

      <StatGrid colonnes={4}>
        <Stat
          icone="user"
          style={{ ["--i" as string]: 0 }}
          label="Comptes"
          nombre={utilisateurs.length}
          contexte={`${formatNombre(actifs)} actifs`}
        />
        <Stat
          icone="shield"
          style={{ ["--i" as string]: 1 }}
          label="Administrateurs"
          nombre={administrateurs}
          contexte="Accès complet, administration comprise"
        />
        <Stat
          icone="dashboard"
          style={{ ["--i" as string]: 2 }}
          label="Modules ouverts"
          nombre={utilisateurs.reduce((total, u) => total + modulesAccordes(u.permissions).length, 0)}
          contexte={`Sur ${formatNombre(utilisateurs.length * MODULES_METIER.length)} possibles`}
        />
        <Stat
          icone="alert"
          style={{ ["--i" as string]: 3 }}
          label="Sans aucun accès"
          nombre={sansAcces}
          signal={sansAcces > 0 ? "attention" : "positif"}
          contexte={sansAcces > 0 ? "Comptes qui n’ouvriront aucun écran" : "Tous les comptes ont un module"}
        />
      </StatGrid>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel variante="eleve" titre="Comptes utilisateurs" flush className="overflow-hidden">
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
                cle: "acces",
                titre: "Accès",
                rendu: (u) => <PucesAcces permissions={u.permissions} />,
              },
              { cle: "etat", titre: "Compte", rendu: (u) => <Badge ton={u.estActif ? "succes" : "neutre"}>{u.estActif ? "Actif" : "Désactivé"}</Badge> },
              {
                cle: "connexion",
                titre: t.champs.derniereConnexion,
                align: "droite",
                masquerSous: "md",
                rendu: (u) => <span className="text-muted">{u.derniereConnexion ? formatRelatif(u.derniereConnexion) : "Jamais connecté"}</span>,
              },
              {
                cle: "actions",
                titre: "",
                align: "droite",
                rendu: (u) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <ButtonLink
                      href={hrefAvec(CHEMIN, sp, { modifier: String(u.id) })}
                      taille="sm"
                      icone="edit"
                      title="Modifier"
                      aria-label="Modifier"
                      className="w-8 rounded-full border-0 bg-accent-soft px-0 text-accent shadow-none hover:bg-accent/20"
                      aria-current={enModification?.id === u.id ? "true" : undefined}
                    />
                    {u.id !== profil.id && (
                      <BoutonReinitialiserMotDePasse
                        utilisateurId={u.id}
                        nom={`${u.prenom} ${u.nom}`}
                        iconeSeule
                      />
                    )}
                    {u.id !== profil.id &&
                      (u.estActif ? (
                        <BoutonConfirmation
                          libelle="Désactiver le compte"
                          titre="Désactiver ce compte ?"
                          description="La personne ne pourra plus se connecter tant que le compte n’est pas réactivé."
                          confirmer="Désactiver"
                          icone="lock"
                          taille="sm"
                          iconeSeule
                          action={desactiverUtilisateur.bind(null, u.id)}
                        />
                      ) : (
                        <BoutonRestaurerUtilisateur utilisateurId={u.id} iconeSeule />
                      ))}
                  </div>
                ),
              },
            ]}
          />
        </Panel>

        <div className="xl:sticky xl:top-20">
          {enModification ? (
            <Panel
              key={enModification.id}
              titre={`Modifier ${enModification.prenom} ${enModification.nom}`}
              variante="eleve"
              accent
            >
              <FormulaireUtilisateur
                utilisateur={enModification}
                action={modifierUtilisateur.bind(null, enModification.id)}
                permissionsAccordables={profil.permissions}
              />
            </Panel>
          ) : (
            <Panel key="creation" titre="Nouveau compte" variante="eleve">
              <FormulaireUtilisateur action={creerUtilisateur} permissionsAccordables={profil.permissions} />
            </Panel>
          )}
        </div>
      </div>
    </Page>
  );
}
