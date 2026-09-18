"use client";

import { useEffect, useRef } from "react";
import type { EtatAction } from "@/lib/api/actions";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { useToast } from "./toast";

/**
 * Retour d'un formulaire après envoi. Un succès part en toast (il ne bloque
 * pas la mise en page et disparaît de lui-même) ; une erreur reste affichée
 * ici, à côté du formulaire, pour rester visible tant qu'elle n'est pas
 * corrigée. Les erreurs de champ, elles, s'affichent sous chaque champ.
 */
export function RetourAction({ etat, className }: { etat: EtatAction; className?: string }) {
  const { push } = useToast();
  const dernier = useRef<EtatAction>(undefined);

  useEffect(() => {
    if (etat === dernier.current) return;
    dernier.current = etat;
    if (etat.ok && etat.message) {
      push({ type: "success", title: etat.message });
    }
  }, [etat, push]);

  if (!etat.message || etat.ok) return null;

  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm animate-rise border-danger/30 bg-danger-soft text-danger",
        className,
      )}
    >
      <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
      <span>{etat.message}</span>
    </p>
  );
}
