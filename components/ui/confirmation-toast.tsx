"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./toast";

/**
 * Pont entre une confirmation décidée côté serveur (paramètre d'URL après un
 * `redirect()`) et le toast qui l'affiche : la page reste un composant serveur,
 * seul ce pont a besoin du contexte client.
 */
export function ConfirmationToast({ message }: { message?: string }) {
  const { push } = useToast();
  const dernier = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!message || message === dernier.current) return;
    dernier.current = message;
    push({ type: "success", title: message });
  }, [message, push]);

  return null;
}
