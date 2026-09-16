"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

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
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<string>();

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="button"
        variante="primaire"
        icone="arrowUp"
        chargement={enCours}
        onClick={() =>
          demarrer(async () => {
            const r = await restaurer(detenuId);
            setMessage(r.message);
            router.refresh();
          })
        }
      >
        Restaurer le dossier
      </Button>
      {message && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-muted">
          <Icon name="info" size={12} className="text-accent" />
          {message}
        </p>
      )}
    </div>
  );
}
