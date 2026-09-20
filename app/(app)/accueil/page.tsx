import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api, ApiErreur } from "@/lib/api";
import { getProfil } from "@/lib/session";
import {
  MODULES_METIER,
  moduleMetier,
  modulesAccordes,
  estAdministrateur,
  type CleModule,
} from "@/lib/domain/modules";
import { formatDateLongue, formatNombre, formatPourcent, pluriel } from "@/lib/format";
import { Page, PageHeader } from "@/components/layout/page";
import { Salutation } from "@/components/layout/salutation";
import { CarteModule } from "@/components/accueil/carte-module";
import { EmptyState, Panel } from "@/components/ui/surface";
import { Icon } from "@/components/ui/icon";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accueil" };

/**
 * Hall d'accueil.
 *
 * Il n'existe que pour les comptes à plusieurs modules : un compte à module unique
 * va droit à son sous-tableau de bord, et l'administrateur au tableau de bord
 * général. Cet écran ne duplique donc aucun des quatre — il donne juste un chiffre
 * par module et la porte pour y entrer.
 *
 * C'est aussi la destination de secours de toute l'application : elle ne doit
 * jamais échouer, d'où les chargements tolérants ci-dessous.
 */

/** Charge un indicateur sans jamais faire tomber l'accueil. */
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

export default async function AccueilPage() {
  const profil = await getProfil();
  // Le layout a déjà exigé une session valide ; ce garde-fou n'existe que pour TypeScript.
  if (!profil) redirect("/deconnexion?raison=session-invalide");

  const admin = estAdministrateur(profil.permissions);
  const ouverts = modulesAccordes(profil.permissions);

  // Un seul écran d'arrivée par profil : l'administrateur a son tableau de bord
  // complet, et un module unique se passe d'un hall qui n'offrirait qu'une porte.
  if (profil.permissions.includes("tableau_bord.consulter")) redirect("/tableau-de-bord");
  if (ouverts.length === 1) redirect(moduleMetier(ouverts[0]).accueil);

  const a = (cle: CleModule) => ouverts.includes(cle);

  const [registre, cellules, consultations, visites] = await Promise.all([
    indicateur(a("detenus"), () => api.listDetenus({ parPage: 1 })),
    indicateur(a("discipline"), () => api.listCellules()),
    indicateur(a("sante"), () => api.listSuivisMedicaux()),
    indicateur(a("visites"), () => api.listVisites()),
  ]);

  const maintenant = new Date();
  const jour = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const capacite = cellules?.reduce((s, c) => s + c.capaciteMax, 0) ?? 0;
  const loges = cellules?.reduce((s, c) => s + c.effectifReel, 0) ?? 0;

  /** Un chiffre par module — celui qui vaut la peine d'être lu avant d'entrer. */
  const chiffre: Record<CleModule, { valeur: string; legende: string } | undefined> = {
    detenus: registre
      ? { valeur: formatNombre(registre.total), legende: "détenus écroués" }
      : undefined,
    discipline: cellules
      ? {
          valeur: formatPourcent(capacite > 0 ? (loges / capacite) * 100 : 0),
          legende: "d’occupation",
        }
      : undefined,
    sante: consultations
      ? {
          valeur: formatNombre(
            consultations.filter((c) => new Date(c.dateConsultation) >= debutMois).length,
          ),
          legende: "consultations ce mois",
        }
      : undefined,
    visites: visites
      ? {
          valeur: formatNombre(visites.filter((v) => v.dateVisite.slice(0, 10) === jour).length),
          legende: "visites aujourd’hui",
        }
      : undefined,
  };

  return (
    <Page>
      <PageHeader
        surtitre={formatDateLongue(maintenant)}
        titre={<Salutation prenom={profil.prenom} />}
        description="Vos modules, et ce qu’il s’y passe aujourd’hui. Tout le reste est fermé à votre compte."
        meta={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="shield" size={12} />
            {admin
              ? "Administrateur"
              : pluriel(ouverts.length, "module ouvert", "modules ouverts")}
          </span>
        }
      />

      {ouverts.length === 0 ? (
        <Panel variante="eleve" flush>
          <EmptyState
            icone="lock"
            titre="Aucun module ne vous est encore ouvert"
            texte={
              <>
                Votre compte est bien actif, mais aucun module ne lui a été attribué.
                Demandez à l’administrateur de l’établissement d’ouvrir ceux dont vous avez
                besoin depuis <strong>Administration &rsaquo; Personnel</strong>.
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
        <ul className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES_METIER.filter((m) => ouverts.includes(m.cle)).map((m, rang) => (
            <CarteModule
              key={m.cle}
              module={m}
              index={rang}
              chiffre={chiffre[m.cle]?.valeur}
              legende={chiffre[m.cle]?.legende}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Un module vous manque ? Les accès s’accordent compte par compte —{" "}
        <Link href="/profil" className="text-accent-ink underline underline-offset-2">
          consultez vos accès
        </Link>{" "}
        puis adressez-vous à l’administrateur.
      </p>
    </Page>
  );
}
