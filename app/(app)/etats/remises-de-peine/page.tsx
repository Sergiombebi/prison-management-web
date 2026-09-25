import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { Page, PageHeader } from "@/components/layout/page";
import { ChantierNotice, EmptyState, Panel } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Remises de peine" };

const COLONNES = ["Détenu", "Peine initiale", "Remise accordée", "Texte de référence", "Date d’effet", "Nouvelle date de libération"];

export default async function RemisesDePeinePage() {
  const t = await getT();

  return (
    <Page className="print:p-0">
      <PageHeader
        surtitre={t.modules.etats}
        titre="Gestion des remises de peine"
        description="Réductions de peine accordées par décret de grâce ou décision individuelle, et recalcul de la date de libération."
      />

      <ChantierNotice t={t} points={["GET /remises-de-peine", "POST /remises-de-peine", "GET /textes-de-grace"]} />

      <Panel variante="eleve" titre="Remises accordées" flush className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-raised">
              <tr className="border-b border-rule">
                {COLONNES.map((c) => (
                  <th key={c} className="h-9 px-3 text-left text-2xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-faint first:pl-4">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <EmptyState
          icone="scale"
          titre="Module à définir"
          texte="Dans l’application desktop, cet écran n’est qu’un titre : aucune donnée ni règle de calcul n’existe encore. Les colonnes ci-dessus sont une proposition à valider avec l’administration avant de concevoir l’API."
        />
      </Panel>
    </Page>
  );
}
