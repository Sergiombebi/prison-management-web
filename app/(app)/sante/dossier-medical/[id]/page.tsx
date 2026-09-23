import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, initiales, ouVide, pluriel } from "@/lib/format";
import { getProfil, peut } from "@/lib/session";
import { Page } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Badge, BadgeCategorie } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, DataPair, EmptyState, Panel } from "@/components/ui/surface";
import { AlerteEvacuation, EtatSante } from "@/components/sante/dossier-medical";

export async function generateMetadata(props: PageProps<"/sante/dossier-medical/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  const dossier = Number.isFinite(numero) ? await api.getDossierMedical(numero) : null;
  return { title: dossier ? `Dossier médical — ${dossier.detenu.nom}` : "Dossier introuvable" };
}

export default async function DossierMedicalPage(props: PageProps<"/sante/dossier-medical/[id]">) {
  const { id } = await props.params;
  const numero = Number.parseInt(id, 10);
  if (!Number.isFinite(numero)) notFound();

  const [dossier, profil] = await Promise.all([api.getDossierMedical(numero), getProfil()]);
  if (!dossier) notFound();

  const { detenu: d, suivisMedicaux, evacuations } = dossier;
  const peutGererSante = Boolean(profil && peut(profil.permissions, "sante.dossier_medical.gerer"));
  const peutVoirFicheComplete = Boolean(profil && peut(profil.permissions, "detenus.consulter"));

  return (
    <Page>
      <ButtonLink
        href="/sante/suivi-medical"
        variante="discret"
        taille="sm"
        icone="arrowLeft"
        transitionTypes={["nav-back"]}
        className="-ml-3 self-start"
      >
        Suivi médical
      </ButtonLink>

      {d.evacuationActive && <AlerteEvacuation evacuation={d.evacuationActive} />}

      <header className="relative overflow-hidden rounded-xl border border-hairline bg-surface shadow-e2 animate-pop">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-soft to-transparent"
        />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <Avatar initiales={initiales(d.nom)} taille="xl" className="hidden sm:grid" />
            <div className="min-w-0">
              <p className="font-mono text-sm font-medium text-accent">Écrou n° {d.numeroEcrou}</p>
              <h1 className="mt-1 text-balance text-xl font-semibold tracking-[-0.03em] text-ink md:text-2xl">
                {d.nom}
              </h1>
              <p className="mt-1.5 text-base text-muted">
                {d.sexe} · {d.age ? `${d.age} ans` : "âge inconnu"} · né(e) à {d.lieuNaissance}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge ton={d.estPresent ? "succes" : "danger"}>{d.estPresent ? "Présent" : "Sorti"}</Badge>
                <BadgeCategorie categorie={d.categoriePenale} />
                {d.cellule ? (
                  <Badge ton="neutre" point={false}>
                    {d.cellule.bloc} · {d.cellule.numero}
                  </Badge>
                ) : (
                  <Badge ton="alerte">Non logé</Badge>
                )}
              </div>
            </div>
          </div>

          {peutVoirFicheComplete && (
            <ButtonLink href={`/detenus/${d.id}`} icone="external" transitionTypes={["nav-forward"]}>
              Fiche complète du détenu
            </ButtonLink>
          )}
        </div>

        {d.mandatCourant && (
          <div className="grid gap-x-6 gap-y-3 border-t border-hairline px-5 py-4 text-sm sm:grid-cols-3">
            <DataPair label="Incarcéré le">{formatDate(d.mandatCourant.dateIncarceration)}</DataPair>
            <DataPair label="Échéance du mandat">{d.mandatCourant.dateExpirationMandat ? formatDate(d.mandatCourant.dateExpirationMandat) : "—"}</DataPair>
            <DataPair label="Motif de détention">{ouVide(d.mandatCourant.motifDetention)}</DataPair>
          </div>
        )}
      </header>

      <div className="flex flex-col gap-4">
        <Panel titre="État de santé" sousTitre="Indépendant de toute consultation : reste visible tant qu'il n'est pas mis à jour" variante="eleve">
          <EtatSante detenu={d} modifiable={peutGererSante} />
        </Panel>

        <Panel titre="Consultations médicales" variante="eleve" flush>
          <DataTable
            legende="Suivi médical du détenu"
            lignes={suivisMedicaux}
            cleLigne={(s) => s.id}
            colonnes={[
              { cle: "date", titre: "Date", rendu: (s) => formatDate(s.dateConsultation) },
              {
                cle: "type",
                titre: "Type",
                rendu: (s) => <Badge ton={s.typeConsultation === "Urgence" ? "danger" : "neutre"}>{s.typeConsultation}</Badge>,
              },
              { cle: "diagnostic", titre: "Diagnostic", rendu: (s) => <span className="font-medium">{ouVide(s.diagnostic)}</span> },
              { cle: "traitement", titre: "Traitement", masquerSous: "lg", rendu: (s) => <span className="text-muted">{ouVide(s.medicamentsPrescrits)}</span> },
              { cle: "medecin", titre: "Médecin", masquerSous: "md", rendu: (s) => <span className="text-muted">{s.nomMedecin}</span> },
            ]}
            vide={<EmptyState compact icone="sante" titre="Aucune consultation" />}
          />
        </Panel>

        <Panel
          titre="Évacuations sanitaires"
          sousTitre={evacuations.length > 0 ? pluriel(evacuations.length, "évacuation enregistrée", "évacuations enregistrées") : undefined}
          variante="eleve"
          flush
        >
          <DataTable
            legende="Évacuations sanitaires du détenu"
            lignes={evacuations}
            cleLigne={(e) => e.id}
            colonnes={[
              { cle: "depart", titre: "Départ", rendu: (e) => formatDate(e.dateDepart) },
              { cle: "structure", titre: "Structure", rendu: (e) => <span className="font-medium">{e.structureDestination}</span> },
              {
                cle: "statut",
                titre: "Statut",
                rendu: (e) =>
                  e.dateRetour ? (
                    <Badge ton="succes">Rentré le {formatDate(e.dateRetour)}</Badge>
                  ) : (
                    <Badge ton="alerte">En évacuation</Badge>
                  ),
              },
              { cle: "motif", titre: "Motif", masquerSous: "md", rendu: (e) => <span className="text-muted">{ouVide(e.motif)}</span> },
            ]}
            vide={<EmptyState compact icone="pulse" titre="Aucune évacuation" />}
          />
        </Panel>
      </div>
    </Page>
  );
}
