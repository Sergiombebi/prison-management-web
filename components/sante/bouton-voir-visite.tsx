import { ButtonLink } from "@/components/ui/button";

/** Action « œil » compacte, réduite à l'icône : ouvre la fiche complète de la visite. */
export function BoutonVoirVisite({ visiteId }: { visiteId: number }) {
  return (
    <ButtonLink
      href={`/sante/visites/${visiteId}`}
      variante="secondaire"
      taille="sm"
      icone="eye"
      title="Voir le détail"
      aria-label="Voir le détail"
      className="w-8 rounded-full border-0 bg-accent-soft px-0 text-accent shadow-none hover:bg-accent/20"
    />
  );
}
