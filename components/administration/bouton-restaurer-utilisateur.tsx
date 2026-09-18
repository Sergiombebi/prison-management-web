"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { restaurerUtilisateur } from "@/app/(app)/administration/actions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Réactivation d'un compte désactivé. Action réversible et sans perte : une
 * simple confirmation suffit, pas de saisie du nom.
 */
export function BoutonRestaurerUtilisateur({
  utilisateurId,
  iconeSeule = false,
}: {
  utilisateurId: number;
  /** Déclencheur réduit à l'icône — pour une rangée d'actions compacte. */
  iconeSeule?: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [enCours, demarrer] = useTransition();
  const libelle = "Réactiver le compte";

  return (
    <Button
      type="button"
      variante="primaire"
      taille={iconeSeule ? "sm" : "md"}
      icone="arrowUp"
      title={iconeSeule ? libelle : undefined}
      aria-label={iconeSeule ? libelle : undefined}
      className={cn(iconeSeule && "w-8 px-0")}
      chargement={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await restaurerUtilisateur(utilisateurId);
          push({ type: "success", title: r.message });
          router.refresh();
        })
      }
    >
      {!iconeSeule && libelle}
    </Button>
  );
}
