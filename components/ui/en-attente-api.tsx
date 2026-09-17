import type { NomIcone } from "./icon";
import { EmptyState } from "./surface";

/**
 * Panneau dont la donnée n'est pas encore servie par l'API.
 *
 * Distinct d'un état vide : « aucune sanction » serait faux, on ne sait pas.
 * La route attendue est nommée pour que le manque soit traçable des deux côtés.
 */
export function EnAttenteApi({
  route,
  titre = "En attente de l’API",
  texte,
  icone = "clock",
  compact,
}: {
  route: string;
  titre?: string;
  texte?: string;
  icone?: NomIcone;
  compact?: boolean;
}) {
  return (
    <EmptyState
      compact={compact}
      icone={icone}
      titre={titre}
      texte={
        <>
          {texte ?? "Cette donnée n’est pas encore exposée par le serveur."}{" "}
          Route attendue : <code className="font-mono text-2xs text-accent-ink">{route}</code>
        </>
      }
    />
  );
}
