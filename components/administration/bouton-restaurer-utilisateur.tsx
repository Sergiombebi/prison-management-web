"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { restaurerUtilisateur } from "@/app/(app)/administration/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Réactivation d'un compte désactivé. Action réversible et sans perte : une
 * simple confirmation suffit, pas de saisie du nom.
 */
export function BoutonRestaurerUtilisateur({ utilisateurId }: { utilisateurId: number }) {
  const router = useRouter();
  const { push } = useToast();
  const [enCours, demarrer] = useTransition();

  return (
    <Button
      type="button"
      variante="primaire"
      icone="arrowUp"
      chargement={enCours}
      onClick={() =>
        demarrer(async () => {
          const r = await restaurerUtilisateur(utilisateurId);
          push({ type: "success", title: r.message });
          router.refresh();
        })
      }
    >
      Réactiver le compte
    </Button>
  );
}
