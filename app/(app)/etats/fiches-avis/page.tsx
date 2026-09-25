import type { Metadata } from "next";
import Form from "next/form";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import { ETATS_A_GENERER, LIBELLE_CATEGORIE, LIBELLE_TYPE_SORTIE } from "@/lib/domain/referentiels";
import { formatDate, formatDateLongue, ouVide } from "@/lib/format";
import { param } from "@/lib/url";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { AttestationOfficielle, DocumentOfficiel, LigneDocument } from "@/components/etats/document";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/ui/client-actions";
import { Field, Select } from "@/components/ui/field";
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
  const [detenus, parametres, dossier] = await Promise.all([
    optionnel(() => api.listOptionsDetenus(), null),
    api.getParametres(),
    Number.isFinite(detenuId) && detenuId > 0
      ? optionnel(() => api.getDossierDetenu(detenuId), null)
      : Promise.resolve(null),
  ]);

  const etatValide = etat && (ETATS_A_GENERER as readonly string[]).includes(etat) ? etat : undefined;

  return (
    <Page className="print:p-0">
      <PageHeader
        surtitre={t.modules.etats}
        titre="Fiches & avis divers"
        description="Choisir le document et le détenu, vérifier l’aperçu, puis imprimer. Les en-têtes proviennent des paramètres de l’établissement."
        actions={etatValide && dossier ? <PrintButton /> : undefined}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)] print:block">
        <Panel variante="eleve" titre="Document à produire" className="xl:sticky xl:top-20 print:hidden">
          <div data-print-hide>
            {!detenus ? (
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
                {(p) => (
                  <Select {...p} name="detenu" defaultValue={dossier ? String(dossier.detenu.id) : ""} placeholder="Sélectionner un détenu…">
                    {detenus.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nom} — {d.numeroEcrou}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button type="submit" variante="primaire" icone="eye">
                {t.actions.apercu}
              </Button>
            </Form>
            )}
          </div>
        </Panel>

        <div className="min-w-0 rounded-lg bg-sunken p-4 sm:p-8 print:bg-white print:p-0">
          {!etatValide || !dossier ? (
            <EmptyState
              icone="file"
              titre="Aucun aperçu"
              texte="Sélectionnez un document et un détenu pour afficher l’aperçu avant impression."
            />
          ) : etatValide === "Attestation de détention" ? (
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
          )}
        </div>
      </div>
    </Page>
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
