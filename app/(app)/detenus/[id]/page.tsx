import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, type MandatDetaille } from "@/lib/api";
import { LIBELLE_TYPE_SORTIE, REGLE_CATEGORIE } from "@/lib/domain/referentiels";
import {
  formatDate,
  formatDateLongue,
  initiales,
  joursRestants,
  ouVide,
  pluriel,
} from "@/lib/format";
import { hrefAvec, param } from "@/lib/url";
import { cn } from "@/lib/cn";
import { Page } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Badge, BadgeCategorie, BadgeStatut } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/client-actions";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { Avatar, DataPair, EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";

export async function generateMetadata(props: PageProps<"/detenus/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const dossier = await api.getDossierDetenu(Number(id));
  return { title: dossier ? dossier.detenu.nom : "Dossier introuvable" };
}

const ONGLETS = ["identite", "mandats", "detention", "discipline", "sante", "visites"] as const;
type OngletId = (typeof ONGLETS)[number];

/** Repère chiffré de l'en-tête : une information clé, lisible sans cliquer. */
function Repere({
  icone,
  label,
  valeur,
  alerte,
}: {
  icone: NomIcone;
  label: string;
  valeur: string;
  alerte?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-surface px-3 py-2 shadow-e1">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md",
          alerte ? "bg-warning-soft text-warning" : "bg-accent-soft text-accent",
        )}
      >
        <Icon name={icone} size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-2xs text-muted">{label}</p>
        <p className={cn("truncate text-sm font-medium", alerte ? "text-warning" : "text-ink")}>
          {valeur}
        </p>
      </div>
    </div>
  );
}

export default async function DossierDetenuPage(props: PageProps<"/detenus/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const numero = Number.parseInt(id, 10);
  if (!Number.isFinite(numero)) notFound();

  const dossier = await api.getDossierDetenu(numero);
  if (!dossier) notFound();

  const { detenu: d } = dossier;
  const ongletBrut = param(sp, "onglet");
  const onglet: OngletId = ONGLETS.includes(ongletBrut as OngletId) ? (ongletBrut as OngletId) : "identite";
  const chemin = `/detenus/${d.id}`;
  const lien = (o: OngletId) => hrefAvec(chemin, {}, { onglet: o === "identite" ? null : o });

  const joursMandat = joursRestants(d.mandatCourant?.dateSortieMandat);

  return (
    <Page>
      <ButtonLink
        href="/detenus"
        variante="discret"
        taille="sm"
        icone="arrowLeft"
        transitionTypes={["nav-back"]}
        className="-ml-3 self-start"
      >
        Registre d’écrou
      </ButtonLink>

      {/* En-tête d'identité — la carte du dossier */}
      <header className="relative overflow-hidden rounded-xl border border-hairline bg-surface shadow-e2 animate-pop">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-soft to-transparent"
        />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
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
                  <BadgeStatut statut={d.statut} />
                  <BadgeCategorie categorie={d.categoriePenale} />
                  {d.cellule ? (
                    <Badge ton="neutre" point={false}>
                      <Icon name="cell" size={11} />
                      {d.cellule.bloc} · {d.cellule.numero}
                    </Badge>
                  ) : (
                    <Badge ton="alerte">Non logé</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2" data-print-hide>
              <PrintButton />
              <ButtonLink
                href={`/etats/fiches-avis?etat=${encodeURIComponent("Fiche signalétique")}&detenu=${d.id}`}
                variante="primaire"
                icone="file"
                transitionTypes={["nav-forward"]}
              >
                Fiche signalétique
              </ButtonLink>
            </div>
          </div>

          {/* Repères : ce qu'un agent veut savoir avant d'ouvrir un onglet */}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Repere
              icone="scale"
              label="Mandats actifs"
              valeur={pluriel(d.nombreMandatsActifs, "mandat")}
            />
            <Repere
              icone="calendar"
              label="Incarcéré le"
              valeur={formatDate(d.mandatCourant?.dateIncarceration)}
            />
            <Repere
              icone="clock"
              label="Échéance du mandat"
              valeur={
                joursMandat === null
                  ? "—"
                  : `${formatDate(d.mandatCourant?.dateSortieMandat)} (${pluriel(Math.max(joursMandat, 0), "jour")})`
              }
              alerte={joursMandat !== null && joursMandat <= 30}
            />
            <Repere
              icone="door"
              label="Motif de détention"
              valeur={ouVide(d.mandatCourant?.motifDetention)}
            />
          </div>
        </div>

        <div className="border-t border-hairline px-4 sm:px-5">
          <TabsNav
            label="Rubriques du dossier"
            items={[
              { href: lien("identite"), label: "Identité", actif: onglet === "identite" },
              { href: lien("mandats"), label: "Mandats", compte: dossier.mandats.length, actif: onglet === "mandats" },
              { href: lien("detention"), label: "Détention", compte: dossier.affectations.length + dossier.sorties.length, actif: onglet === "detention" },
              { href: lien("discipline"), label: "Discipline", compte: dossier.sanctions.length, actif: onglet === "discipline" },
              { href: lien("sante"), label: "Santé", compte: dossier.suivisMedicaux.length, actif: onglet === "sante" },
              { href: lien("visites"), label: "Visites", compte: dossier.visites.length, actif: onglet === "visites" },
            ]}
          />
        </div>
      </header>

      <div key={onglet} className="animate-rise">
        {onglet === "identite" && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel titre="État civil" variante="eleve" className="xl:col-span-2">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label="Nom complet">{d.nom}</DataPair>
                <DataPair label="Sexe">{d.sexe}</DataPair>
                <DataPair label="Date de naissance">{formatDateLongue(d.dateNaissance)}</DataPair>
                <DataPair label="Lieu de naissance">{d.lieuNaissance}</DataPair>
                <DataPair label="Nationalité">{ouVide(d.nationalite)}</DataPair>
                <DataPair label="Profession">{d.profession}</DataPair>
                <DataPair label="Nom du père">{d.nomPere}</DataPair>
                <DataPair label="Nom de la mère">{d.nomMere}</DataPair>
                <DataPair label="Situation matrimoniale">{ouVide(d.statutMatrimonial)}</DataPair>
                <DataPair label="Nombre d’enfants">{ouVide(d.nombreEnfants)}</DataPair>
                <DataPair label="Niveau d’études">{ouVide(d.niveauEtudes)}</DataPair>
                <DataPair label="Religion">{ouVide(d.religion)}</DataPair>
              </dl>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel titre="Origine et documents" variante="eleve">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-1">
                  <DataPair label="Département">{ouVide(d.departement)}</DataPair>
                  <DataPair label="Arrondissement">{ouVide(d.arrondissement)}</DataPair>
                  <DataPair label="Résidence">{ouVide(d.residence)}</DataPair>
                  <DataPair label="Contact" mono>{ouVide(d.contact)}</DataPair>
                  <DataPair label="N° CNI" mono>{ouVide(d.numeroCNI)}</DataPair>
                  <DataPair label="N° passeport" mono>{ouVide(d.numeroPasseport)}</DataPair>
                </dl>
              </Panel>
              <Panel titre="Signalement" variante="eleve">
                <dl className="grid gap-4">
                  <DataPair label="Anthropométrie et signes particuliers">
                    {ouVide(d.anthropometrie)}
                  </DataPair>
                  <DataPair label="Langue / Ethnie">
                    {ouVide(d.langue)} / {ouVide(d.ethnie)}
                  </DataPair>
                  <DataPair label="Enregistré le">{formatDate(d.dateCreation)}</DataPair>
                </dl>
              </Panel>
            </div>
          </div>
        )}

        {onglet === "mandats" &&
          (dossier.mandats.length === 0 ? (
            <Panel variante="eleve">
              <EmptyState icone="file" titre="Aucun mandat" texte="Ce détenu n’a aucun titre de détention enregistré." />
            </Panel>
          ) : (
            <div className="flex flex-col gap-4">
              {d.categoriePenale && (
                <p className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-muted shadow-e1">
                  <Icon name="info" size={15} className="shrink-0 text-accent" />
                  Catégorie retenue : <BadgeCategorie categorie={d.categoriePenale} />
                  <span className="min-w-0">{REGLE_CATEGORIE[d.categoriePenale]}</span>
                </p>
              )}
              <ol className="stagger flex flex-col gap-4">
                {dossier.mandats.map((m, i) => (
                  <li key={m.id} style={{ ["--i" as string]: i }}>
                    <CarteMandat mandat={m} />
                  </li>
                ))}
              </ol>
            </div>
          ))}

        {onglet === "detention" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel titre="Affectations en cellule" variante="eleve" flush>
              <DataTable
                dense
                legende="Historique des affectations"
                lignes={dossier.affectations}
                cleLigne={(a) => a.id}
                colonnes={[
                  { cle: "cellule", titre: "Cellule", rendu: (a) => <span className="font-medium">{a.celluleLibelle}</span> },
                  { cle: "date", titre: "Depuis le", rendu: (a) => formatDate(a.dateAffectation) },
                  { cle: "motif", titre: "Motif", rendu: (a) => <span className="text-muted">{ouVide(a.motifAffectation)}</span> },
                ]}
                vide={
                  <EmptyState
                    compact
                    icone="cell"
                    titre="Détenu non logé"
                    action={
                      <ButtonLink href="/discipline/affectations" taille="sm" icone="arrowRight">
                        Affecter une cellule
                      </ButtonLink>
                    }
                  />
                }
              />
            </Panel>
            <Panel titre="Sorties enregistrées" variante="eleve" flush>
              <DataTable
                dense
                legende="Sorties du détenu"
                lignes={dossier.sorties}
                cleLigne={(s) => s.id}
                colonnes={[
                  {
                    cle: "type",
                    titre: "Type",
                    rendu: (s) => (
                      <Badge ton={s.typeSortie === "Evasion" || s.typeSortie === "Deces" ? "danger" : "neutre"}>
                        {LIBELLE_TYPE_SORTIE[s.typeSortie]}
                      </Badge>
                    ),
                  },
                  { cle: "date", titre: "Date", rendu: (s) => formatDate(s.dateSortie) },
                  { cle: "motif", titre: "Motif", rendu: (s) => <span className="text-muted">{ouVide(s.destination ?? s.motif)}</span> },
                ]}
                vide={<EmptyState compact icone="door" titre="Aucune sortie enregistrée" />}
              />
            </Panel>
          </div>
        )}

        {onglet === "discipline" && (
          <Panel titre="Sanctions disciplinaires" variante="eleve" flush>
            <DataTable
              legende="Sanctions du détenu"
              lignes={dossier.sanctions}
              cleLigne={(s) => s.id}
              colonnes={[
                { cle: "type", titre: "Sanction", rendu: (s) => <span className="font-medium">{ouVide(s.typeSanction)}</span> },
                { cle: "motif", titre: "Faute commise", rendu: (s) => <span className="text-muted">{ouVide(s.motif)}</span> },
                { cle: "periode", titre: "Période", masquerSous: "md", rendu: (s) => `${formatDate(s.dateDebut)} → ${formatDate(s.dateFin)}` },
                {
                  cle: "statut",
                  titre: "Statut",
                  rendu: (s) => <Badge ton={s.statut === "En cours" ? "alerte" : "neutre"}>{s.statut ?? "—"}</Badge>,
                },
              ]}
              vide={<EmptyState compact icone="scale" titre="Aucune sanction" texte="Aucune faute disciplinaire n’a été relevée." />}
            />
          </Panel>
        )}

        {onglet === "sante" && (
          <Panel titre="Consultations médicales" variante="eleve" flush>
            <DataTable
              legende="Suivi médical du détenu"
              lignes={dossier.suivisMedicaux}
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
        )}

        {onglet === "visites" && (
          <Panel titre="Visites reçues" variante="eleve" flush>
            <DataTable
              legende="Visites du détenu"
              lignes={dossier.visites}
              cleLigne={(v) => v.id}
              colonnes={[
                { cle: "date", titre: "Date", rendu: (v) => `${formatDate(v.dateVisite)} · ${v.heureArrivee}` },
                { cle: "visiteur", titre: "Visiteur", rendu: (v) => <span className="font-medium">{v.nomVisiteur}</span> },
                { cle: "lien", titre: "Lien", rendu: (v) => <span className="text-muted">{v.lienParente}</span> },
                { cle: "type", titre: "Type", masquerSous: "md", rendu: (v) => <span className="text-muted">{v.typeVisite}</span> },
              ]}
              vide={<EmptyState compact icone="user" titre="Aucune visite enregistrée" />}
            />
          </Panel>
        )}
      </div>
    </Page>
  );
}

/** Un mandat présenté comme une pièce du dossier, avec l'avancement de la procédure. */
function CarteMandat({ mandat: m }: { mandat: MandatDetaille }) {
  const etapes = [
    { label: "Incarcération", date: m.dateIncarceration, detail: m.autoriteSignataire },
    { label: "Jugement", date: m.dateJugement, detail: m.peinePrononcee ?? m.tribunalJugement },
    { label: "Appel", date: m.dateAppel, detail: m.decisionAppel },
    { label: "Cassation", date: m.dateCassation, detail: m.decisionCassation },
  ];
  const derniere = etapes.reduce((acc, e, i) => (e.date ? i : acc), 0);

  return (
    <Panel
      variante="eleve"
      accent={m.actif}
      titre={
        <span className="flex flex-wrap items-center gap-2">
          {m.typeMandat ?? "Mandat"}
          <Ecrou className="text-xs font-normal text-muted">{m.referenceMandat}</Ecrou>
        </span>
      }
      sousTitre={m.motifDetention}
      actions={
        <>
          {m.typeStatutPenal && (
            <Badge ton="neutre" point={false}>
              {m.typeStatutPenal}
            </Badge>
          )}
          <Badge ton={m.actif ? "succes" : "danger"}>{m.actif ? "Actif" : "Expiré"}</Badge>
        </>
      }
    >
      <ol className="grid gap-4 sm:grid-cols-4">
        {etapes.map((e, i) => (
          <li key={e.label} className="relative">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full border-2",
                  e.date ? "border-accent bg-accent" : "border-rule bg-surface",
                  i === derniere && e.date && "ring-4 ring-accent/15",
                )}
              />
              <span
                className={cn(
                  "h-0.5 flex-1 rounded-full",
                  i < 3 && etapes[i + 1].date ? "bg-accent/40" : "bg-hairline",
                  i === 3 && "hidden",
                )}
              />
            </div>
            <p className={cn("mt-2.5 text-2xs font-semibold uppercase tracking-[0.08em]", e.date ? "text-ink" : "text-faint")}>
              {e.label}
            </p>
            <p className="tnum text-sm text-ink">{e.date ? formatDate(e.date) : "—"}</p>
            {e.date && e.detail && <p className="mt-0.5 text-xs text-muted">{e.detail}</p>}
          </li>
        ))}
      </ol>
      <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-hairline pt-4 text-sm sm:grid-cols-3">
        <DataPair label="Signé le">{formatDate(m.dateSignatureMandat)}</DataPair>
        <DataPair label="Expire le">{formatDate(m.dateSortieMandat)}</DataPair>
        <DataPair label="Autorité pénitentiaire">{ouVide(m.autoritePenitentiaire)}</DataPair>
        <DataPair label="État physique à l’arrivée">{ouVide(m.etatPhysiqueArrivee)}</DataPair>
        <DataPair label="Objets personnels" className="sm:col-span-2">
          {ouVide(m.objetsPersonnels)}
        </DataPair>
      </dl>
    </Panel>
  );
}
