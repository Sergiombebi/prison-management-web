"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restaurerUtilisateur } from "@/app/(app)/administration/actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Réactivation d'un compte désactivé. Action réversible et sans perte : une
 * simple confirmation suffit, pas de saisie du nom.
 */
export function BoutonRestaurerUtilisateur({ utilisateurId }: { utilisateurId: number }) {
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
            const r = await restaurerUtilisateur(utilisateurId);
            setMessage(r.message);
            router.refresh();
          })
        }
      >
        Réactiver le compte
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
