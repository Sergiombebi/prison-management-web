import { DataTableSkeleton } from "@/components/data/data-table";
import { getT } from "@/lib/i18n/server";

/** Squelette générique : même géométrie qu'un écran de liste, pour que rien ne saute. */
export default async function Chargement() {
  const t = await getT();
  return (
    <div
      role="status"
      aria-label={t.etats.chargementEnCours}
      className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8"
    >
      <div className="flex flex-col gap-2.5 border-b border-rule pb-5">
        <div className="skeleton h-2 w-24 rounded-xs" />
        <div className="skeleton h-6 w-72 max-w-full rounded-sm" />
        <div className="skeleton h-3 w-[28rem] max-w-full rounded-xs" />
      </div>
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        <div className="flex gap-2 border-b border-hairline px-4 py-3">
          <div className="skeleton h-9 w-64 rounded-md" />
          <div className="skeleton h-9 w-40 rounded-md" />
        </div>
        <DataTableSkeleton />
      </div>
      <span className="sr-only">{t.etats.chargement}</span>
    </div>
  );
}
