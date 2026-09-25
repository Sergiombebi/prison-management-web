import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { resoudreDetenuInitial } from "@/lib/api/detenu-initial";
import { ETATS_A_GENERER, LIBELLE_CATEGORIE, LIBELLE_TYPE_SORTIE } from "@/lib/domain/referentiels";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";
import { param } from "@/lib/url";
import { getProfil, peut } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { AttestationOfficielle, DocumentOfficiel, LigneDocument } from "@/components/etats/document";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/client-actions";
import { Field, Select } from "@/components/ui/field";
import { SelectDetenu } from "@/components/ui/select-detenu";
import { EmptyState, Panel } from "@/components/ui/surface";
import { SansDroit } from "@/components/ui/en-attente-api";

export const metadata: Metadata = { title: "Fiches & avis divers" };

export default async function FichesAvisPage(props: PageProps<"/etats/fiches-avis">) {
  const t = await getT();
  const sp = await props.searchParams;
  const etat = param(sp, "etat");
  const detenuId = Number(param(sp, "detenu"));

  // Produire un état suppose de lire le registre, qui relève d'une autre permission :
  // un compte « états » sans « détenus » voit l'écran, pas le choix des détenus.
  const [profil, detenuInitial] = await Promise.all([
    getProfil(),
    resoudreDetenuInitial(Number.isFinite(detenuId) && detenuId > 0 ? detenuId : undefined),
  ]);
  const peutChoisirDetenu = Boolean(profil && peut(profil.permissions, "detenus.consulter"));

  const etatValide = etat && (ETATS_A_GENERER as readonly string[]).includes(etat) ? etat : undefined;

  return (
    <Page className="print:p-0">
      <PageHeader
        surtitre={t.modules.etats}
        titre="Fiches & avis divers"
        description="Choisir le document et le détenu, vérifier l’aperçu, puis imprimer. Les en-têtes proviennent des paramètres de l’établissement."
        actions={etatValide && Number.isFinite(detenuId) && detenuId > 0 ? <PrintButton /> : undefined}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)] print:block">
        <Panel variante="eleve" titre="Document à produire" className="xl:sticky xl:top-20 print:hidden">
          <div data-print-hide>
            {!peutChoisirDetenu ? (
              <SansDroit
                compact
                texte="Produire une fiche demande aussi le droit de consulter le registre des détenus."
              />
            ) : (
            <Form action="/etats/fiches-avis" className="flex flex-col gap-4">
              <Field label="État ou avis" requis>
                {(p) => (
                  <Select {...p} name="etat" defaultValue={etatValide ?? ""} placeholder="Sélectionner…">
                    {ETATS_A_GENERER.map((e) => (
                      <option key={e}>{e}</option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Détenu" requis>
                {(p) => <SelectDetenu {...p} name="detenu" requis initial={detenuInitial} />}
              </Field>
              <Button type="submit" variante="primaire" icone="eye">
                {t.actions.apercu}
              </Button>
            </Form>
            )}
          </div>
        </Panel>

        <div className="min-w-0 rounded-lg bg-sunken p-4 sm:p-8 print:bg-white print:p-0">
          {!etatValide ? (
            <EmptyState
              icone="file"
              titre="Aucun aperçu"
              texte="Sélectionnez un document et un détenu pour afficher l’aperçu avant impression."
            />
          ) : (
            <Suspense key={`${etatValide}-${detenuId}`} fallback={<ApercuChargement t={t} />}>
              <ApercuDocument etatValide={etatValide} detenuId={detenuId} />
            </Suspense>
          )}
        </div>
      </div>
    </Page>
  );
}

/**
 * Isolée dans son propre composant serveur asynchrone pour pouvoir être encadrée
 * par un <Suspense> : le panneau de choix (à gauche) reste affiché et interactif
 * pendant que seul l’aperçu se recharge après un changement d’état/détenu.
 */
async function ApercuDocument({ etatValide, detenuId }: { etatValide: string; detenuId: number }) {
  const [parametres, dossier] = await Promise.all([
    api.getParametres(),
    Number.isFinite(detenuId) && detenuId > 0
      ? optionnel(() => api.getDossierDetenu(detenuId), null)
      : Promise.resolve(null),
  ]);

  if (!dossier) {
    return (
      <EmptyState
        icone="file"
        titre="Aucun aperçu"
        texte="Sélectionnez un document et un détenu pour afficher l’aperçu avant impression."
      />
    );
  }

  return etatValide === "Attestation de détention" ? (
    <AttestationOfficielle parametres={parametres} reference={`${dossier.detenu.numeroEcrou}/${new Date().getFullYear()}`}>
      <p className="w-full text-center">
        Le Régisseur de la <strong>{parametres.nomPrison}</strong>, soussigné, atteste que
        <br />
        <span className="my-1 block text-[1.6em] font-bold uppercase tracking-wide text-[#5b4514]">{dossier.detenu.nom}</span>
        né(e) le {formatDateLongue(dossier.detenu.dateNaissance)} à {dossier.detenu.lieuNaissance}, fils/fille de{" "}
        {dossier.detenu.nomPere} et de {dossier.detenu.nomMere}, est détenu(e) dans cet établissement sous le numéro d’écrou{" "}
        <strong className="font-mono">{dossier.detenu.numeroEcrou}</strong> depuis le{" "}
        {formatDateLongue(dossier.detenu.mandatCourant?.dateIncarceration)}, en qualité de{" "}
        <strong>{dossier.detenu.categoriePenale ? LIBELLE_CATEGORIE[dossier.detenu.categoriePenale].toLowerCase() : "détenu"}</strong>{" "}
        pour {ouVide(dossier.detenu.mandatCourant?.motifDetention).toLowerCase()}.
        <br />
        <em>En foi de quoi la présente attestation lui est délivrée pour servir et valoir ce que de droit.</em>
      </p>
    </AttestationOfficielle>
  ) : (
    <DocumentOfficiel parametres={parametres} titre={etatValide} reference={`${dossier.detenu.numeroEcrou}/${new Date().getFullYear()}`}>
      {etatValide === "Fiche signalétique" && (
        <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <LigneDocument label="Numéro d’écrou" valeur={<span className="font-mono">{dossier.detenu.numeroEcrou}</span>} />
            <LigneDocument label="Nom et prénoms" valeur={dossier.detenu.nom} />
            <LigneDocument label="Né(e) le" valeur={`${formatDate(dossier.detenu.dateNaissance)} à ${dossier.detenu.lieuNaissance}`} />
            <LigneDocument label="Fils/fille de" valeur={dossier.detenu.nomPere} />
            <LigneDocument label="Et de" valeur={dossier.detenu.nomMere} />
            <LigneDocument label="Nationalité" valeur={ouVide(dossier.detenu.nationalite)} />
            <LigneDocument label="Profession" valeur={dossier.detenu.profession} />
            <LigneDocument label="Situation matrimoniale" valeur={ouVide(dossier.detenu.statutMatrimonial)} />
            <LigneDocument label="Domicile" valeur={ouVide(dossier.detenu.residence)} />
            <LigneDocument label="Signes particuliers" valeur={ouVide(dossier.detenu.anthropometrie)} />
            <LigneDocument label="Motif de détention" valeur={ouVide(dossier.detenu.mandatCourant?.motifDetention)} />
            <LigneDocument label="Écroué le" valeur={formatDate(dossier.detenu.mandatCourant?.dateIncarceration)} />
          </div>
          <div className="flex gap-3 sm:flex-col">
            {["Face", "Profil"].map((v) => (
              <div key={v} className="grid h-32 w-26 place-items-center border border-neutral-400 text-[10px] uppercase tracking-wide text-neutral-400">
                {v}
              </div>
            ))}
          </div>
        </div>
      )}

      {(etatValide === "Extrait du registre d'écrou" || etatValide === "Fichier des situations pénales") && (
        <TableDocument
          entetes={["Date d’incarcération", "Motif", "Tribunal", "Décision", "Statut"]}
          lignes={dossier.mandats.map((m) => [
            formatDate(m.dateIncarceration),
            ouVide(m.motifDetention),
            ouVide(m.tribunalJugement),
            ouVide(m.peinePrononcee ?? m.decisionAppel),
            ouVide(m.typeStatutPenal),
          ])}
          vide="Aucun mandat enregistré."
        />
      )}

      {etatValide === "Extrait du registre des sanctions" && (
        <TableDocument
          entetes={["Date de la faute", "Faute", "Sanction", "Du", "Au"]}
          lignes={dossier.sanctions.map((s) => [
            formatDate(s.dateFaute),
            ouVide(s.motif),
            ouVide(s.typeSanction),
            formatDate(s.dateDebut),
            formatDate(s.dateFin),
          ])}
          vide="Néant — aucune sanction disciplinaire."
        />
      )}

      {dossier.sorties.length > 0 && etatValide === "Extrait du registre d'écrou" && (
        <p className="mt-4 text-[12px] text-neutral-600">
          Mention : {dossier.sorties.map((s) => `${LIBELLE_TYPE_SORTIE[s.typeSortie]} le ${formatDate(s.dateSortie)}`).join(" ; ")}.
        </p>
      )}
    </DocumentOfficiel>
  );
}

/** Squelette à la silhouette d'une feuille A4, pour que rien ne saute à l'arrivée du vrai document. */
function ApercuChargement({ t }: { t: { etats: { chargement: string; chargementEnCours: string } } }) {
  return (
    <div
      role="status"
      aria-label={t.etats.chargementEnCours}
      className="mx-auto w-full max-w-[210mm] rounded-sm bg-white px-8 py-10 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5 sm:px-14"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <div className="skeleton mx-auto h-6 w-24 rounded-xs" />
        <div className="skeleton size-16 rounded-full" />
        <div className="skeleton mx-auto h-6 w-24 rounded-xs" />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="skeleton h-3 w-32 rounded-xs" />
        <div className="skeleton h-3 w-20 rounded-xs" />
      </div>
      <div className="skeleton mx-auto mt-8 h-5 w-2/3 rounded-xs" />
      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-3 rounded-xs" style={{ width: `${85 - (i % 3) * 12}%` }} />
        ))}
      </div>
      <span className="sr-only">{t.etats.chargement}</span>
    </div>
  );
}

function TableDocument({ entetes, lignes, vide }: { entetes: string[]; lignes: string[][]; vide: string }) {
  if (lignes.length === 0) return <p className="text-center italic text-neutral-600">{vide}</p>;
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr>
          {entetes.map((e) => (
            <th key={e} className="border border-neutral-500 bg-neutral-100 px-2 py-1.5 text-left font-semibold">
              {e}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((l, i) => (
          <tr key={i}>
            {l.map((c, j) => (
              <td key={j} className="border border-neutral-400 px-2 py-1.5 align-top">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
