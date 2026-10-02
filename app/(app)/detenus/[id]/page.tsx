import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { api, type MandatDetaille } from "@/lib/api";
import type { Sanction } from "@/lib/domain/types";
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
import { getLocale, getT } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/fr";
import type { Locale } from "@/lib/i18n/locale";
import { getProfil, peut } from "@/lib/session";
import { Page } from "@/components/layout/page";
import { DataTable } from "@/components/data/data-table";
import { Badge, BadgeCategorie, BadgeStatut } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/client-actions";
import { Icon, type NomIcone } from "@/components/ui/icon";
import { Avatar, DataPair, EmptyState, Ecrou, Panel } from "@/components/ui/surface";
import { TabsNav } from "@/components/ui/tabs";
import { BoutonConfirmation } from "@/components/ui/bouton-confirmation";
import { ConfirmationToast } from "@/components/ui/confirmation-toast";
import { ActionsSanction } from "@/components/discipline/actions-sanction";
import { BoutonRestaurer } from "@/components/detenus/bouton-restaurer";
import { BoutonVoirVisite } from "@/components/sante/bouton-voir-visite";
import { AlerteEvacuation, EtatSante } from "@/components/sante/dossier-medical";
import { restaurerDossier } from "../nouveau/actions";
import { desactiverDossier, desactiverMandat } from "./actions";

export async function generateMetadata(props: PageProps<"/detenus/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [dossier, t] = await Promise.all([api.getDossierDetenu(Number(id)), getT()]);
  return { title: dossier ? dossier.detenu.nom : t.formulaireDetenu.dossierIntrouvable };
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

  const [dossier, profil, t, locale] = await Promise.all([
    api.getDossierDetenu(numero),
    getProfil(),
    getT(),
    getLocale(),
  ]);
  if (!dossier) notFound();
  const fd = t.ficheDetenu;

  const { detenu: d } = dossier;
  const peutGererSante = Boolean(profil && peut(profil.permissions, "sante.dossier_medical.gerer"));
  const ongletBrut = param(sp, "onglet");
  const onglet: OngletId = ONGLETS.includes(ongletBrut as OngletId) ? (ongletBrut as OngletId) : "identite";
  const chemin = `/detenus/${d.id}`;
  const lien = (o: OngletId) => hrefAvec(chemin, {}, { onglet: o === "identite" ? null : o });

  const present = d.statut === "Present";
  const confirmation = param(sp, "maj") === "identite" ? fd.majIdentiteConfirmation : undefined;

  // Mandats ouverts (non désactivés) affichés au premier plan ; les désactivés restent
  // consultables dans un historique séparé, sans y donner accès aux actions.
  const mandatsOuverts = dossier.mandats.filter((m) => m.ouvert);
  const mandatsHistorique = dossier.mandats.filter((m) => !m.ouvert);

  // La date de libération réelle d'un détenu est celle du mandat ouvert dont l'échéance
  // est la plus lointaine : tant qu'un seul mandat reste ouvert au-delà des autres, le
  // détenu n'est pas libérable. On se base sur `ouvert` (non désactivé manuellement) et
  // non `actif` : `actif` devient faux dès que `dateSortieMandat` (l'alerte administrative
  // signature + 6 mois) est dépassée, ce qui masquerait à tort une date de sortie réelle
  // encore valide. `dateSortieEffective` (calculée par étape de procédure) est la seule
  // date fiable ici — `dateSortieMandat` n'a jamais été une date de sortie réelle.
  const dateLiberationEffective =
    mandatsOuverts
      .map((m) => m.dateSortieEffective)
      .filter((date): date is string => date !== null)
      .sort()
      .at(-1) ?? null;
  const joursLiberation = joursRestants(dateLiberationEffective);

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
        {fd.registreEcrou}
      </ButtonLink>

      <ConfirmationToast message={confirmation} />

      {/* Dossier désactivé : aucune modification n'est possible tant qu'il n'est pas restauré */}
      {!present && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between animate-rise">
          <div className="flex items-start gap-3">
            <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-ink">{fd.dossierDesactiveTitre}</p>
              <p className="mt-0.5 text-sm text-muted">{fd.dossierDesactiveTexte}</p>
            </div>
          </div>
          <BoutonRestaurer detenuId={d.id} restaurer={restaurerDossier} />
        </div>
      )}

      {d.evacuationActive && <AlerteEvacuation evacuation={d.evacuationActive} />}

      {/* En-tête d'identité — la carte du dossier */}
      <header className="relative overflow-hidden rounded-xl border border-hairline bg-surface shadow-e2 animate-pop">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent-soft to-transparent"
        />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              {d.photoFaceUrl ? (
                <span className="relative hidden size-24 shrink-0 overflow-hidden rounded-xl border border-hairline shadow-e1 sm:block">
                  <Image
                    src={d.photoFaceUrl}
                    alt={`Photographie de face de ${d.nom}`}
                    fill
                    unoptimized
                    sizes="96px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <Avatar initiales={initiales(d.nom)} taille="xl" className="hidden sm:grid" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-accent">{fd.ecrouNumero} {d.numeroEcrou}</p>
                <h1 className="mt-1 text-balance text-xl font-semibold tracking-[-0.03em] text-ink md:text-2xl">
                  {d.nom}
                </h1>
                <p className="mt-1.5 text-base text-muted">
                  {d.sexe} · {d.age ? `${d.age} ${t.formulaireDetenu.ans}` : fd.ageInconnu} · {fd.neALieuPrefix} {d.lieuNaissance}
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
                    <Badge ton="alerte">{t.listeDetenus.nonLoge}</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2" data-print-hide>
              {present && (
                <>
                  <ButtonLink
                    href={`/detenus/${d.id}/modifier`}
                    icone="edit"
                    transitionTypes={["nav-forward"]}
                  >
                    {t.actions.modifier}
                  </ButtonLink>
                  <ButtonLink
                    href={`/detenus/liberation/normale?detenu=${d.id}`}
                    icone="exit"
                    transitionTypes={["nav-forward"]}
                  >
                    {fd.consignerSortie}
                  </ButtonLink>
                </>
              )}
              <PrintButton />
              <ButtonLink
                href={`/etats/fiches-avis?etat=${encodeURIComponent("Fiche signalétique")}&detenu=${d.id}`}
                variante="primaire"
                icone="file"
                transitionTypes={["nav-forward"]}
              >
                {fd.ficheSignaletique}
              </ButtonLink>
            </div>
          </div>

          {/* Repères : ce qu'un agent veut savoir avant d'ouvrir un onglet */}
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Repere
              icone="scale"
              label={fd.mandatsActifs}
              valeur={pluriel(d.nombreMandatsActifs, fd.mandatMot, undefined, locale)}
            />
            <Repere
              icone="calendar"
              label={fd.incarcereLe}
              valeur={formatDate(d.mandatCourant?.dateIncarceration, locale)}
            />
            <Repere
              icone="clock"
              label={fd.echeanceMandat}
              valeur={
                joursLiberation === null
                  ? "—"
                  : `${formatDate(dateLiberationEffective, locale)} (${pluriel(Math.max(joursLiberation, 0), fd.jourMot, undefined, locale)})`
              }
              alerte={joursLiberation !== null && joursLiberation <= 30}
            />
            <Repere
              icone="door"
              label={t.champs.motifDetention}
              valeur={ouVide(d.mandatCourant?.motifDetention)}
            />
          </div>
        </div>

        <div className="border-t border-hairline px-4 sm:px-5">
          <TabsNav
            label={fd.rubriquesDossier}
            items={[
              { href: lien("identite"), label: fd.ongletIdentite, actif: onglet === "identite" },
              { href: lien("mandats"), label: fd.ongletMandats, compte: mandatsOuverts.length, actif: onglet === "mandats" },
              { href: lien("detention"), label: fd.ongletDetention, compte: dossier.affectations.length + dossier.sorties.length, actif: onglet === "detention" },
              { href: lien("discipline"), label: fd.ongletDiscipline, compte: dossier.sanctions.length, actif: onglet === "discipline" },
              { href: lien("sante"), label: fd.ongletSante, compte: dossier.suivisMedicaux.length, actif: onglet === "sante" },
              { href: lien("visites"), label: fd.ongletVisites, compte: dossier.visites.length, actif: onglet === "visites" },
            ]}
          />
        </div>
      </header>

      <div key={onglet} className="animate-rise">
        {onglet === "identite" && (
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel titre={fd.etatCivilTitre} variante="eleve" className="xl:col-span-2">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label={fd.nomComplet}>{d.nom}</DataPair>
                <DataPair label={t.champs.sexe}>{d.sexe}</DataPair>
                <DataPair label={t.champs.dateNaissance}>{formatDateLongue(d.dateNaissance, locale)}</DataPair>
                <DataPair label={t.champs.lieuNaissance}>{d.lieuNaissance}</DataPair>
                <DataPair label={t.champs.nationalite}>{ouVide(d.nationalite)}</DataPair>
                <DataPair label={t.champs.profession}>{d.profession}</DataPair>
                <DataPair label={t.formulaireDetenu.nomPereLabel}>{d.nomPere}</DataPair>
                <DataPair label={t.formulaireDetenu.nomMereLabel}>{d.nomMere}</DataPair>
                <DataPair label={t.formulaireDetenu.situationMatrimoniale}>{ouVide(d.statutMatrimonial)}</DataPair>
                <DataPair label={t.formulaireDetenu.nombreEnfants}>{ouVide(d.nombreEnfants)}</DataPair>
                <DataPair label={t.formulaireDetenu.niveauEtudes}>{ouVide(d.niveauEtudes)}</DataPair>
                <DataPair label={t.formulaireDetenu.religionLabel}>{ouVide(d.religion)}</DataPair>
              </dl>
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel titre={fd.origineDocumentsTitre} variante="eleve">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-1">
                  <DataPair label={t.formulaireDetenu.departementLabel}>{ouVide(d.departement)}</DataPair>
                  <DataPair label={t.formulaireDetenu.arrondissementLabel}>{ouVide(d.arrondissement)}</DataPair>
                  <DataPair label={t.formulaireDetenu.residenceLabel}>{ouVide(d.residence)}</DataPair>
                  <DataPair label={t.champs.contact} mono>{ouVide(d.contact)}</DataPair>
                  <DataPair label={fd.numeroCniLabel} mono>{ouVide(d.numeroCNI)}</DataPair>
                  <DataPair label={fd.numeroPasseportLabel} mono>{ouVide(d.numeroPasseport)}</DataPair>
                </dl>
              </Panel>
              {d.contactUrgence && (
                <Panel titre={fd.contactUrgenceTitre} variante="eleve">
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-1">
                    <DataPair label={fd.procheAPrevenir}>{ouVide(d.contactUrgence.nom)}</DataPair>
                    <DataPair label={t.champs.lienParente}>{ouVide(d.contactUrgence.lienParente)}</DataPair>
                    <DataPair label={t.formulaireDetenu.telephoneLabel} mono>{ouVide(d.contactUrgence.telephone)}</DataPair>
                    <DataPair label={t.formulaireDetenu.adresseLabel}>{ouVide(d.contactUrgence.adresse)}</DataPair>
                  </dl>
                </Panel>
              )}
              <Panel titre={fd.signalementTitre} variante="eleve">
                {(d.photoFaceUrl || d.photoProfilUrl) && (
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    {(
                      [
                        [d.photoFaceUrl, fd.deFace],
                        [d.photoProfilUrl, fd.deProfil],
                      ] as const
                    ).map(([src, legende]) => (
                      <figure key={legende} className="flex flex-col gap-1.5">
                        <span className="relative aspect-[3/4] overflow-hidden rounded-md border border-hairline bg-sunken">
                          {src ? (
                            <Image src={src} alt={`${d.nom}, ${legende.toLowerCase()}`} fill unoptimized sizes="160px" className="object-cover" />
                          ) : (
                            <span className="grid h-full place-items-center text-xs text-faint">{fd.photoNonFournie}</span>
                          )}
                        </span>
                        <figcaption className="text-2xs text-muted">{legende}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                <dl className="grid gap-4">
                  <DataPair label={t.formulaireDetenu.anthropometrieLabel}>
                    {ouVide(d.anthropometrie)}
                  </DataPair>
                  <DataPair label={fd.langueEthnieLabel}>
                    {ouVide(d.langue)} / {ouVide(d.ethnie)}
                  </DataPair>
                  <DataPair label={fd.enregistreLe}>{formatDate(d.dateCreation, locale)}</DataPair>
                </dl>
              </Panel>
            </div>

            {/* Action administrative, volontairement à l'écart des actions courantes */}
            {present && (
              <section
                aria-labelledby="correction-admin"
                className="flex flex-col gap-3 rounded-lg border border-dashed border-rule px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between xl:col-span-3"
              >
                <div>
                  <h2 id="correction-admin" className="text-sm font-medium text-ink">
                    {fd.correctionAdminTitre}
                  </h2>
                  <p className="mt-0.5 max-w-[70ch] text-xs text-muted">
                    {fd.correctionAdminTexte}{fd.consignerSortie}{fd.correctionAdminTexteSuffix}
                  </p>
                </div>
                <BoutonConfirmation
                  libelle={fd.desactiverDossier}
                  icone="trash"
                  titre={fd.desactiverDossierTitreConfirm}
                  description={
                    <>
                      <p>
                        {d.nom} ({t.formulaireDetenu.ecrouNumero} {d.numeroEcrou}) {fd.desactiverDossierTexteA}{" "}
                        <strong className="font-medium text-ink">{fd.aucuneSortieEnregistree}</strong>{" "}
                        {fd.desactiverDossierTexteB}
                      </p>
                      <p className="mt-2">{fd.desactiverDossierTexteC}</p>
                    </>
                  }
                  confirmer={fd.desactiverConfirmerBouton}
                  action={desactiverDossier.bind(null, d.id)}
                  messageSucces={fd.desactiverDossierMessageSucces}
                />
              </section>
            )}
          </div>
        )}

        {onglet === "mandats" && (
          <div className="flex flex-col gap-4">
            {present && (
              <div className="flex justify-end">
                <ButtonLink href={`/detenus/${d.id}/mandats/nouveau`} taille="sm" icone="plus" transitionTypes={["nav-forward"]}>
                  {fd.ajouterMandat}
                </ButtonLink>
              </div>
            )}

            {dossier.mandats.length === 0 ? (
              <Panel variante="eleve">
                <EmptyState icone="file" titre={fd.aucunMandatTitre} texte={fd.aucunMandatTexte} />
              </Panel>
            ) : (
              <>
                {d.categoriePenale && (
                  <p className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-muted shadow-e1">
                    <Icon name="info" size={15} className="shrink-0 text-accent" />
                    {fd.categorieRetenuePrefix} <BadgeCategorie categorie={d.categoriePenale} />
                    <span className="min-w-0">{REGLE_CATEGORIE[d.categoriePenale]}</span>
                  </p>
                )}
                {mandatsOuverts.length === 0 ? (
                  <Panel variante="eleve">
                    <EmptyState icone="file" titre={fd.aucunMandatTitre} texte={fd.aucunMandatTexte} />
                  </Panel>
                ) : (
                  <ol className="stagger flex flex-col gap-4">
                    {mandatsOuverts.map((m, i) => (
                      <li key={m.id} style={{ ["--i" as string]: i }}>
                        <CarteMandat mandat={m} modifiable={present} t={fd} locale={locale} />
                      </li>
                    ))}
                  </ol>
                )}
                {mandatsHistorique.length > 0 && (
                  <details className="group rounded-lg border border-hairline bg-surface">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-ink">
                      {fd.historiqueMandatsTitre}
                      <Icon name="chevronDown" size={16} className="text-muted transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="flex flex-col gap-4 border-t border-hairline p-4">
                      {mandatsHistorique.map((m, i) => (
                        <li key={m.id} style={{ ["--i" as string]: i }}>
                          <CarteMandat mandat={m} modifiable={false} t={fd} locale={locale} />
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}
          </div>
        )}

        {onglet === "detention" && (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              titre={fd.affectationsCelluleTitre}
              sousTitre={d.cellule ? `${fd.actuellementEnPrefix} ${d.cellule.bloc ? `${d.cellule.bloc} · ` : ""}${d.cellule.numero}` : undefined}
              actions={
                present &&
                dossier.affectations.length > 0 && (
                  <ButtonLink href={`/discipline/affectations?detenu=${d.id}`} taille="sm" icone="arrowRight">
                    {fd.reaffecter}
                  </ButtonLink>
                )
              }
              variante="eleve"
              flush
            >
              <DataTable
                dense
                legende={fd.historiqueAffectations}
                lignes={dossier.affectations}
                cleLigne={(a) => a.id}
                colonnes={[
                  {
                    cle: "cellule",
                    titre: t.champs.cellule,
                    rendu: (a) => (
                      <span className="flex items-center gap-2 font-medium">
                        {a.celluleLibelle}
                        {!a.dateFin && <Badge ton="succes">{fd.actuelleBadge}</Badge>}
                      </span>
                    ),
                  },
                  {
                    cle: "date",
                    titre: fd.periode,
                    rendu: (a) => (
                      <span className="tnum">
                        {formatDate(a.dateAffectation, locale)}
                        {a.dateFin ? ` → ${formatDate(a.dateFin, locale)}` : ""}
                      </span>
                    ),
                  },
                  { cle: "motif", titre: t.champs.motif, masquerSous: "md", rendu: (a) => <span className="text-muted">{ouVide(a.motifAffectation)}</span> },
                ]}
                vide={
                  <EmptyState
                    compact
                    icone="cell"
                    titre={fd.detenuNonLoge}
                    action={
                      present && (
                        <ButtonLink href={`/discipline/affectations?detenu=${d.id}`} taille="sm" icone="arrowRight">
                          {fd.affecterCellule}
                        </ButtonLink>
                      )
                    }
                  />
                }
              />
            </Panel>
            <Panel titre={fd.sortiesEnregistreesTitre} variante="eleve" flush>
              <DataTable
                dense
                legende={fd.sortiesDetenuLegende}
                lignes={dossier.sorties}
                cleLigne={(s) => s.id}
                colonnes={[
                  {
                    cle: "type",
                    titre: t.champs.type,
                    rendu: (s) => (
                      <Badge ton={s.typeSortie === "Evasion" || s.typeSortie === "Deces" ? "danger" : "neutre"}>
                        {LIBELLE_TYPE_SORTIE[s.typeSortie]}
                      </Badge>
                    ),
                  },
                  { cle: "date", titre: t.champs.date, rendu: (s) => formatDate(s.dateSortie, locale) },
                  {
                    cle: "motif",
                    titre: fd.detail,
                    rendu: (s) => (
                      <span className="text-muted">
                        {ouVide(s.destination ?? s.cause ?? s.motif)}
                        {s.definitive === false && (
                          <span className="mt-0.5 block text-2xs">{fd.mandatLeveAutresActifs}</span>
                        )}
                      </span>
                    ),
                  },
                ]}
                vide={<EmptyState compact icone="door" titre={fd.aucuneSortieEnregistreeCourte} />}
              />
            </Panel>
          </div>
        )}

        {onglet === "discipline" && (
          <Panel
            titre={fd.sanctionsDisciplinairesTitre}
            variante="eleve"
            flush
            actions={
              present && (
                <ButtonLink href={`/discipline/sanctions?detenu=${d.id}`} taille="sm" icone="plus">
                  {fd.prononcerSanction}
                </ButtonLink>
              )
            }
          >
            <DataTable
              legende={fd.sanctionsDetenuLegende}
              lignes={dossier.sanctions}
              cleLigne={(s) => s.id}
              colonnes={[
                { cle: "type", titre: fd.sanctionColonne, rendu: (s) => <span className="font-medium">{ouVide(s.typeSanction)}</span> },
                { cle: "motif", titre: fd.fauteCommise, rendu: (s) => <span className="text-muted">{ouVide(s.motif)}</span> },
                { cle: "periode", titre: fd.periode, masquerSous: "md", rendu: (s) => `${formatDate(s.dateDebut, locale)} → ${formatDate(s.dateFin, locale)}` },
                {
                  cle: "statut",
                  titre: t.champs.statut,
                  rendu: (s) => (
                    <span className="flex flex-col items-start gap-1">
                      <Badge ton={s.statut === "En cours" ? "alerte" : "neutre"}>{s.statut ?? "—"}</Badge>
                      {s.isolementEnCours && s.celluleLibelle && (
                        <span className="text-2xs text-warning">{fd.isoleEnPrefix} {s.celluleLibelle}</span>
                      )}
                    </span>
                  ),
                },
                ...(present
                  ? [
                      {
                        cle: "actions",
                        titre: "",
                        align: "droite" as const,
                        rendu: (s: Sanction) => <ActionsSanction sanction={s} />,
                      },
                    ]
                  : []),
              ]}
              vide={<EmptyState compact icone="scale" titre={fd.aucuneSanctionTitre} texte={fd.aucuneSanctionTexte} />}
            />
          </Panel>
        )}

        {onglet === "sante" && (
          <div className="flex flex-col gap-4">
            <Panel titre={fd.etatSanteTitre} sousTitre={fd.etatSanteSousTitre} variante="eleve">
              <EtatSante detenu={d} modifiable={peutGererSante} />
            </Panel>

            <Panel
              titre={fd.traitementsTitre}
              variante="eleve"
              flush
              actions={
                present && (
                  <ButtonLink href={`/sante/traitements?detenu=${d.id}`} taille="sm" icone="plus">
                    {fd.prescrireTraitement}
                  </ButtonLink>
                )
              }
            >
              <DataTable
                legende={fd.traitementsLegende}
                lignes={dossier.prescriptions}
                cleLigne={(p) => p.id}
                colonnes={[
                  { cle: "debut", titre: fd.debutColonne, rendu: (p) => formatDate(p.dateDebut, locale) },
                  {
                    cle: "medicament",
                    titre: fd.medicamentColonne,
                    rendu: (p) => (
                      <div>
                        <p className="font-medium">{p.medicament}</p>
                        <p className="text-xs text-muted">{p.posologie}</p>
                      </div>
                    ),
                  },
                  {
                    cle: "statut",
                    titre: t.champs.statut,
                    rendu: (p) =>
                      p.statut === "en_cours" ? (
                        <Badge ton="accent">{fd.statutEnCours}</Badge>
                      ) : p.statut === "arrete" ? (
                        <Badge ton="danger">{fd.statutArrete}</Badge>
                      ) : (
                        <Badge ton="neutre">{fd.statutTermine}</Badge>
                      ),
                  },
                  { cle: "prescripteur", titre: fd.prescripteurColonne, masquerSous: "md", rendu: (p) => <span className="text-muted">{p.prescripteur}</span> },
                ]}
                vide={<EmptyState compact icone="sante" titre={fd.aucunTraitement} />}
              />
            </Panel>

            <Panel
              titre={fd.consultationsMedicalesTitre}
              variante="eleve"
              flush
              actions={
                present && (
                  <ButtonLink href={`/sante/suivi-medical?detenu=${d.id}`} taille="sm" icone="plus">
                    {fd.enregistrerConsultation}
                  </ButtonLink>
                )
              }
            >
              <DataTable
                legende={fd.suiviMedicalLegende}
                lignes={dossier.suivisMedicaux}
                cleLigne={(s) => s.id}
                colonnes={[
                  { cle: "date", titre: t.champs.date, rendu: (s) => formatDate(s.dateConsultation, locale) },
                  {
                    cle: "type",
                    titre: t.champs.type,
                    rendu: (s) => <Badge ton={s.typeConsultation === "Urgence" ? "danger" : "neutre"}>{s.typeConsultation}</Badge>,
                  },
                  { cle: "diagnostic", titre: t.champs.diagnostic, rendu: (s) => <span className="font-medium">{ouVide(s.diagnostic)}</span> },
                  { cle: "traitement", titre: fd.traitementColonne, masquerSous: "lg", rendu: (s) => <span className="text-muted">{ouVide(s.medicamentsPrescrits)}</span> },
                  { cle: "medecin", titre: t.champs.medecin, masquerSous: "md", rendu: (s) => <span className="text-muted">{s.nomMedecin}</span> },
                ]}
                vide={<EmptyState compact icone="sante" titre={fd.aucuneConsultation} />}
              />
            </Panel>

            <Panel
              titre={fd.evacuationsSanitairesTitre}
              variante="eleve"
              flush
              actions={
                present &&
                !d.evacuationActive && (
                  <ButtonLink href={`/sante/evacuations?detenu=${d.id}`} taille="sm" icone="plus">
                    {fd.enregistrerEvacuation}
                  </ButtonLink>
                )
              }
            >
              <DataTable
                legende={fd.evacuationsLegende}
                lignes={dossier.evacuations}
                cleLigne={(e) => e.id}
                colonnes={[
                  { cle: "depart", titre: fd.departColonne, rendu: (e) => formatDate(e.dateDepart, locale) },
                  { cle: "structure", titre: fd.structureColonne, rendu: (e) => <span className="font-medium">{e.structureDestination}</span> },
                  {
                    cle: "statut",
                    titre: t.champs.statut,
                    rendu: (e) =>
                      e.dateRetour ? (
                        <Badge ton="succes">{fd.rentreLePrefix} {formatDate(e.dateRetour, locale)}</Badge>
                      ) : (
                        <Badge ton="alerte">{fd.enEvacuation}</Badge>
                      ),
                  },
                  { cle: "motif", titre: t.champs.motif, masquerSous: "md", rendu: (e) => <span className="text-muted">{ouVide(e.motif)}</span> },
                ]}
                vide={<EmptyState compact icone="pulse" titre={fd.aucuneEvacuation} />}
              />
            </Panel>
          </div>
        )}

        {onglet === "visites" && (
          <Panel
            titre={fd.visitesRecuesTitre}
            variante="eleve"
            flush
            actions={
              present && (
                <ButtonLink href={`/sante/visites?detenu=${d.id}`} taille="sm" icone="plus">
                  {fd.enregistrerVisite}
                </ButtonLink>
              )
            }
          >
            <DataTable
              legende={fd.visitesDetenuLegende}
              lignes={dossier.visites}
              cleLigne={(v) => v.id}
              colonnes={[
                { cle: "date", titre: t.champs.date, rendu: (v) => `${formatDate(v.dateVisite, locale)} · ${v.heureArrivee}` },
                { cle: "visiteur", titre: fd.visiteurColonne, rendu: (v) => <span className="font-medium">{v.nomVisiteur}</span> },
                { cle: "lien", titre: fd.lienColonne, rendu: (v) => <span className="text-muted">{v.lienParente}</span> },
                { cle: "type", titre: t.champs.type, masquerSous: "md", rendu: (v) => <span className="text-muted">{v.typeVisite}</span> },
                {
                  cle: "actions",
                  titre: "",
                  align: "droite",
                  rendu: (v) => <BoutonVoirVisite visiteId={v.id} />,
                },
              ]}
              vide={<EmptyState compact icone="user" titre={fd.aucuneVisiteEnregistree} />}
            />
          </Panel>
        )}
      </div>
    </Page>
  );
}

/** Un mandat présenté comme une pièce du dossier, avec l'avancement de la procédure. */
function CarteMandat({
  mandat: m,
  modifiable,
  t: fd,
  locale,
}: {
  mandat: MandatDetaille;
  modifiable: boolean;
  t: Messages["ficheDetenu"];
  locale: Locale;
}) {
  // Un mandat inactif l'est soit par échéance réelle, soit parce qu'il a été désactivé ou
  // levé. `dateSortieEffective` (calculée par étape de procédure) donne la vraie échéance —
  // `dateSortieMandat` n'est qu'une alerte administrative (signature + 6 mois) qui ne bouge
  // pas quand le mandat évolue : l'utiliser marquait à tort « Expiré » un mandat dont la
  // procédure venait d'avancer.
  const echu = Boolean(m.dateSortieEffective && new Date(m.dateSortieEffective) <= new Date());
  const etat = !m.ouvert ? fd.etatLeveDesactive : echu ? fd.etatExpire : fd.etatActif;
  const etapes = [
    { label: fd.etapeIncarceration, date: m.dateIncarceration, detail: m.autoriteSignataire },
    { label: fd.etapeJugement, date: m.dateJugement, detail: m.peinePrononcee ?? m.tribunalJugement },
    { label: fd.etapeAppel, date: m.dateAppel, detail: m.decisionAppel },
    { label: fd.etapeCassation, date: m.dateCassation, detail: m.decisionCassation },
  ];
  const derniere = etapes.reduce((acc, e, i) => (e.date ? i : acc), 0);

  return (
    <Panel
      variante="eleve"
      accent={m.actif}
      titre={
        <span className="flex flex-wrap items-center gap-2">
          {m.typeMandat ?? fd.mandatParDefaut}
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
          <Badge ton={!m.ouvert ? "neutre" : echu ? "danger" : "succes"}>{etat}</Badge>
          {modifiable && (
            <ButtonLink
              href={`/detenus/${m.detenuId}/mandats/${m.id}`}
              taille="sm"
              icone="edit"
              transitionTypes={["nav-forward"]}
            >
              {fd.faireEvoluer}
            </ButtonLink>
          )}
          {modifiable && m.ouvert && (
            <BoutonConfirmation
              libelle={fd.desactiverConfirmerBouton}
              taille="sm"
              icone="trash"
              titre={fd.desactiverMandatTitreConfirm}
              description={
                <>
                  <p>
                    {fd.desactiverMandatTextePrefix} {m.referenceMandat ?? ""} {fd.desactiverMandatTexteSuffix}
                  </p>
                  <p className="mt-2">{fd.desactiverMandatTexte2}</p>
                </>
              }
              confirmer={fd.desactiverMandatConfirmerBouton}
              action={desactiverMandat.bind(null, m.detenuId, m.id)}
              messageSucces={fd.desactiverMandatMessageSucces}
            />
          )}
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
            <p className="tnum text-sm text-ink">{e.date ? formatDate(e.date, locale) : "—"}</p>
            {e.date && e.detail && <p className="mt-0.5 text-xs text-muted">{e.detail}</p>}
          </li>
        ))}
      </ol>
      <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-hairline pt-4 text-sm sm:grid-cols-3">
        <DataPair label={fd.signeLe}>{formatDate(m.dateSignatureMandat, locale)}</DataPair>
        {/* L'alerte à 6 mois relance le procureur tant que le détenu n'est pas jugé ; une fois
            le mandat passé en exécution de peine, appel ou cassation, elle n'a plus de sens. */}
        {m.typeStatutPenal === "Détention provisoire" && (
          <DataPair label={fd.expirationAlerte}>{formatDate(m.dateSortieMandat, locale)}</DataPair>
        )}
        <DataPair label={fd.dateSortieLabel}>{ouVide(m.dateSortieEffective && formatDate(m.dateSortieEffective, locale))}</DataPair>
        <DataPair label={fd.autoritePenitentiaire}>{ouVide(m.autoritePenitentiaire)}</DataPair>
        <DataPair label={fd.etatPhysiqueArrivee}>{ouVide(m.etatPhysiqueArrivee)}</DataPair>
        <DataPair label={fd.objetsPersonnels} className="sm:col-span-2">
          {ouVide(m.objetsPersonnels)}
        </DataPair>
      </dl>
    </Panel>
  );
}
