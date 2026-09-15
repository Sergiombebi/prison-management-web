"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Icon, type NomIcone } from "./icon";

/**
 * Bouton d'enregistrement tant que l'API d'écriture n'existe pas.
 *
 * Plutôt qu'un bouton grisé sans explication, il répond honnêtement : l'action est
 * simulée, les saisies restent en place.
 */
export function DemoSubmit({
  children,
  icone = "check",
  variante = "primaire",
  endpoint,
}: {
  children: ReactNode;
  icone?: NomIcone;
  variante?: "primaire" | "secondaire" | "danger";
  /** Point d'entrée qui prendra le relais, affiché dans le message. */
  endpoint?: string;
}) {
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait">("repos");

  useEffect(() => {
    if (etat !== "fait") return;
    const id = setTimeout(() => setEtat("repos"), 6000);
    return () => clearTimeout(id);
  }, [etat]);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="submit"
        variante={variante}
        icone={icone}
        chargement={etat === "envoi"}
        onClick={(e) => {
          const form = e.currentTarget.form;
          // On laisse le navigateur signaler les champs requis manquants
          if (form && !form.reportValidity()) return;
          e.preventDefault();
          setEtat("envoi");
          setTimeout(() => setEtat("fait"), 650);
        }}
      >
        {children}
      </Button>
      <p role="status" aria-live="polite" className="min-h-4 text-right text-xs">
        {etat === "fait" && (
          <span className="inline-flex items-center gap-1.5 text-muted animate-rise">
            <Icon name="info" size={12} className="text-accent" />
            Enregistrement simulé : l&apos;API n&apos;est pas branchée
            {endpoint && (
              <>
                {" "}
                (<code className="font-mono text-2xs text-accent-ink">{endpoint}</code>)
              </>
            )}
            . Vos saisies sont conservées.
          </span>
        )}
      </p>
    </div>
  );
}

/** Déclenche la boîte d'impression du navigateur. */
export function PrintButton({ children = "Imprimer" }: { children?: ReactNode }) {
  return (
    <Button type="button" icone="printer" onClick={() => window.print()}>
      {children}
    </Button>
  );
}
