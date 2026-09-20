import type { Metadata } from "next";
import { api } from "@/lib/api";
import { optionnel } from "@/lib/api/disponibilite";
import type { CategoriePenale } from "@/lib/domain/types";
import { CATEGORIE_SLUG, LIBELLE_CATEGORIE, SLUG_CATEGORIE } from "@/lib/domain/referentiels";
import { formatDate, ouVide, pluriel } from "@/lib/format";
import { param } from "@/lib/url";
import { t } from "@/lib/i18n/fr";
import { Page, PageHeader } from "@/components/layout/page";
import { DocumentOfficiel } from "@/components/etats/document";
import { PrintButton } from "@/components/ui/client-actions";
import { TabsNav } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Dossier par catégorie" };

const TITRES: Record<CategoriePenale, string> = {
  Prevenu: "État nominatif des prévenus",
  Condamne: "État nominatif des condamnés",
  Appellant: "État nominatif des appellants",
  Cassationnaire: "État nominatif des cassationnaires",
  Dpac: "État nominatif des DPAC",
};

export default async function CategoriesEtatPage(props: PageProps<"/etats/categories">) {
  const sp = await props.searchParams;
  const categorie = SLUG_CATEGORIE[param(sp, "categorie") ?? ""] ?? "Prevenu";

  const [detenus, parametres, tb] = await Promise.all([
    api.listParCategorie(categorie),
    api.getParametres(),
    // Compteur secondaire, derrière tableau_bord.consulter : facultatif.
    optionnel(() => api.getTableauDeBord(), null),
  ]);

  return (
    <Page className="print:p-0">
      <PageHeader
        surtitre={t.modules.etats}
        titre="Dossier par catégorie de détenus"
        description="État nominatif prêt à imprimer, par catégorie pénale."
        actions={<PrintButton />}
      />

      <div data-print-hide>
        <TabsNav
          label="Catégorie pénale"
          items={(Object.keys(LIBELLE_CATEGORIE) as CategoriePenale[]).map((c) => ({
            href: `/etats/categories?categorie=${CATEGORIE_SLUG[c]}`,
            label: LIBELLE_CATEGORIE[c],
            compte: tb?.effectifsParCategorie[c],
            actif: c === categorie,
          }))}
        />
      </div>

      <div key={categorie} className="rounded-lg bg-sunken p-4 sm:p-8 print:bg-white print:p-0">
        <DocumentOfficiel parametres={parametres} titre={TITRES[categorie]}>
          <p className="mb-4 text-[12px] text-neutral-600">
            Arrêté au {formatDate(new Date())} — {pluriel(detenus.length, "détenu")}.
          </p>
          {detenus.length === 0 ? (
            <p className="text-center italic text-neutral-600">Néant.</p>
          ) : (
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr>
                  {["N°", "Écrou", "Nom et prénoms", "Sexe", "Motif", "Incarcéré le", "Échéance"].map((e) => (
                    <th key={e} className="border border-neutral-500 bg-neutral-100 px-2 py-1.5 text-left font-semibold">
                      {e}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detenus.map((d, i) => (
                  <tr key={d.id} className="break-inside-avoid">
                    <td className="border border-neutral-400 px-2 py-1 tabular-nums">{i + 1}</td>
                    <td className="border border-neutral-400 px-2 py-1 font-mono">{d.numeroEcrou}</td>
                    <td className="border border-neutral-400 px-2 py-1 font-medium">{d.nom}</td>
                    <td className="border border-neutral-400 px-2 py-1">{d.sexe === "Féminin" ? "F" : "M"}</td>
                    <td className="border border-neutral-400 px-2 py-1">{ouVide(d.mandatCourant?.motifDetention)}</td>
                    <td className="border border-neutral-400 px-2 py-1 tabular-nums">{formatDate(d.mandatCourant?.dateIncarceration)}</td>
                    <td className="border border-neutral-400 px-2 py-1 tabular-nums">{formatDate(d.mandatCourant?.dateSortieMandat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DocumentOfficiel>
      </div>
    </Page>
  );
}
