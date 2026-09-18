"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Restauration d'un dossier désactivé.
 *
 * Action réversible et sans perte : une simple confirmation suffit, pas de
 * saisie du nom. Tant qu'elle n'est pas faite, l'API refuse toute modification
 * du dossier (409).
 */
export function BoutonRestaurer({
  detenuId,
  restaurer,
}: {
  detenuId: number;
  restaurer: (id: number) => Promise<{ message: string }>;
}) {
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
          const r = await restaurer(detenuId);
          push({ type: "success", title: r.message });
          router.refresh();
        })
      }
    >
      Restaurer le dossier
    </Button>
  );
}
