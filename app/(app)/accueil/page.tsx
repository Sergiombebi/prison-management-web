import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api, ApiErreur } from "@/lib/api";
import { getProfil, peut } from "@/lib/session";
import { LIBELLE_ROLE } from "@/lib/domain/referentiels";
import { formatDateLongue, formatNombre, formatPourcent, pluriel } from "@/lib/format";
import { MODULES, peutVoirModule } from "@/lib/navigation";
import { Page, PageHeader } from "@/components/layout/page";
import { Salutation } from "@/components/layout/salutation";
import { CarteModule } from "@/components/accueil/carte-module";
import { Stat, StatGrid } from "@/components/data/stat";
import { EmptyState, Panel } from "@/components/ui/surface";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accueil" };

type Signal = "neutre" | "attention" | "critique" | "positif";

interface Indicateur {
  cle: string;
  icone: NomIcone;
  label: string;
  nombre: number;
  decimales?: number;
  unite?: string;
  signal?: Signal;
  contexte: string;
  href: string;
}

/**
 * Charge un indicateur sans jamais faire tomber l'accueil.
 *
 * Cet écran est la destination de secours de toute l'application : une route en
 * panne doit faire disparaître un chiffre, pas la page qui explique à l'utilisateur
 * ce à quoi il a droit.
 */
async function indicateur<T>(autorise: boolean, appel: () => Promise<T>): Promise<T | null> {
  if (!autorise) return null;
  try {
    return await appel();
  } catch (e) {
    // redirect() (401) lève autre chose qu'une ApiErreur : elle doit repasser.
    if (!(e instanceof ApiErreur)) throw e;
    console.warn("[SGP] Indicateur d’accueil indisponible :", e.message);
    return null;
  }
}

/**
 * Écran d'arrivée des profils qui n'ont pas le tableau de bord complet.
 *
 * Auparavant tout le monde atterrissait sur /tableau-de-bord : un compte sans
 * `tableau_bord.consulter` y récoltait un 403 de l'API et l'écran d'erreur
 * générique. Ici, chaque indicateur n'est demandé que si la permission qui le
 * couvre est accordée, et seuls les modules réellement ouverts sont proposés.
 */
export default async function AccueilPage() {
  const profil = await getProfil();
  // Le layout a déjà exigé une session valide ; ce garde-fou n'existe que pour TypeScript.
  if (!profil) redirect("/deconnexion?raison=session-invalide");

  // Un seul écran d'arrivée par profil : qui a droit au tableau de bord complet n'a
  // rien à faire sur sa version réduite.
  if (peut(profil.permissions, "tableau_bord.consulter")) redirect("/tableau-de-bord");

  const droit = (cle: string) => peut(profil.permissions, cle);

  const [registre, cellules, sanctions, consultations, visites, comptes] = await Promise.all([
    indicateur(droit("detenus.consulter"), () => api.listDetenus({ parPage: 1 })),
    indicateur(droit("discipline.cellules.consulter"), () => api.listCellules()),
    indicateur(droit("discipline.sanctions.consulter"), () => api.listSanctions()),
    indicateur(droit("sante.consultations.consulter"), () => api.listSuivisMedicaux()),
    indicateur(droit("visites.consulter"), () => api.listVisites()),
    indicateur(droit("administration.personnel.gerer"), () => api.listUtilisateurs()),
  ]);

  const maintenant = new Date();
  const jour = maintenant.toISOString().slice(0, 10);
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const capacite = cellules?.reduce((s, c) => s + c.capaciteMax, 0) ?? 0;
  const loges = cellules?.reduce((s, c) => s + c.effectifReel, 0) ?? 0;
  const tauxOccupation = capacite > 0 ? (loges / capacite) * 100 : 0;

  const sanctionsEnCours = sanctions?.filter((s) => s.statut === "En cours").length ?? 0;
  const consultationsDuMois =
    consultations?.filter((c) => new Date(c.dateConsultation) >= debutMois).length ?? 0;
  const visitesDuJour = visites?.filter((v) => v.dateVisite.slice(0, 10) === jour).length ?? 0;
  const comptesActifs = comptes?.filter((u) => u.estActif).length ?? 0;

  /** Chiffre repris sous la carte du module, quand un seul le résume. */
  const chiffreDuModule: Record<string, { valeur: string; legende: string } | undefined> = {
    detenus: registre
      ? { valeur: formatNombre(registre.total), legende: "détenus écroués" }
      : undefined,
    discipline: cellules
      ? { valeur: formatPourcent(tauxOccupation), legende: "d’occupation" }
      : sanctions
        ? { valeur: formatNombre(sanctionsEnCours), legende: "sanctions en cours" }
        : undefined,
    "suivi-medical": consultations
      ? { valeur: formatNombre(consultationsDuMois), legende: "consultations ce mois" }
      : undefined,
    visites: visites
      ? { valeur: formatNombre(visitesDuJour), legende: "visites aujourd’hui" }
      : undefined,
    administration: comptes
      ? { valeur: formatNombre(comptesActifs), legende: "comptes actifs" }
      : undefined,
  };

  const modulesOuverts = MODULES.filter(
    (m) => m.id !== "tableau-de-bord" && peutVoirModule(profil.permissions, m),
  );

  const indicateurs: Indicateur[] = [
    registre && {
      cle: "registre",
      icone: "detenus",
      label: "Détenus écroués",
      nombre: registre.total,
      contexte: "Registre d’écrou de l’établissement",
      href: "/detenus",
    },
    cellules && {
      cle: "cellules",
      icone: "cell",
      label: "Taux d’occupation",
      nombre: tauxOccupation,
      decimales: 1,
      unite: "%",
      signal:
        tauxOccupation > 100 ? "critique" : tauxOccupation >= 90 ? "attention" : "neutre",
      contexte: `${pluriel(loges, "détenu logé", "détenus logés")} sur ${formatNombre(capacite)} places`,
      href: "/discipline/cellules",
    },
    sanctions && {
      cle: "sanctions",
      icone: "discipline",
      label: "Sanctions en cours",
      nombre: sanctionsEnCours,
      signal: sanctionsEnCours > 0 ? "attention" : "positif",
      contexte: sanctionsEnCours > 0 ? "Mesures encore actives" : "Aucune mesure active",
      href: "/discipline/sanctions",
    },
    consultations && {
      cle: "consultations",
      icone: "sante",
      label: "Consultations ce mois",
      nombre: consultationsDuMois,
      contexte: "Depuis le 1er du mois",
      href: "/sante/suivi-medical",
    },
    visites && {
      cle: "visites",
      icone: "door",
      label: "Visites du jour",
      nombre: visitesDuJour,
      contexte: "Parloirs enregistrés aujourd’hui",
      href: "/sante/visites",
    },
    comptes && {
      cle: "comptes",
      icone: "administration",
      label: "Comptes actifs",
      nombre: comptesActifs,
      contexte: `${pluriel(comptes.length, "compte")} au total`,
      href: "/administration/personnel",
    },
  ].filter(Boolean) as Indicateur[];

  return (
    <Page>
      <PageHeader
        surtitre={formatDateLongue(maintenant)}
        titre={<Salutation prenom={profil.prenom} />}
        description="Votre espace de travail : seuls les modules ouverts à votre compte apparaissent ici."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="shield" size={12} />
            {LIBELLE_ROLE[profil.role]} ·{" "}
            {pluriel(profil.permissions.length, "droit accordé", "droits accordés")}
          </span>
        }
      />

      {modulesOuverts.length === 0 ? (
        <Panel variante="eleve" flush>
          <EmptyState
            icone="lock"
            titre="Aucun module ne vous est encore ouvert"
            texte={
              <>
                Votre compte est bien actif, mais aucune permission ne lui a été accordée.
                Demandez à l’administrateur de l’établissement d’ouvrir les modules dont vous
                avez besoin depuis <strong>Administration &rsaquo; Personnel</strong>.
              </>
            }
            action={
              <ButtonLink href="/profil" icone="user">
                Voir mon profil
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <>
          {indicateurs.length > 0 && (
            <StatGrid colonnes={indicateurs.length >= 4 ? 4 : 3}>
              {indicateurs.map((i, rang) => (
                <Stat
                  key={i.cle}
                  style={{ ["--i" as string]: rang }}
                  icone={i.icone}
                  label={i.label}
                  nombre={i.nombre}
                  decimales={i.decimales}
                  unite={i.unite}
                  signal={i.signal}
                  contexte={i.contexte}
                  href={i.href}
                />
              ))}
            </StatGrid>
          )}

          <Panel
            titre="Vos modules"
            sousTitre="Ce que votre compte peut ouvrir aujourd’hui"
            variante="eleve"
            accent
            className="reveal"
          >
            <ul className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modulesOuverts.map((m, rang) => {
                const chiffre = chiffreDuModule[m.id];
                return (
                  <CarteModule
                    key={m.id}
                    module={m}
                    index={rang}
                    chiffre={chiffre?.valeur}
                    legende={chiffre?.legende}
                  />
                );
              })}
            </ul>
          </Panel>
        </>
      )}

      <p className="text-xs text-muted">
        Un écran vous manque ? Les droits sont accordés compte par compte —{" "}
        <Link href="/profil" className="text-accent-ink underline underline-offset-2">
          consultez la liste de vos permissions
        </Link>{" "}
        puis adressez-vous à l’administrateur.
      </p>
    </Page>
  );
}
