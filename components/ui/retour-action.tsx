import type { EtatAction } from "@/lib/api/actions";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

/**
 * Retour d'un formulaire après envoi : confirmation ou erreur, annoncé aux
 * lecteurs d'écran. Les erreurs de champ, elles, s'affichent sous chaque champ.
 */
export function RetourAction({ etat, className }: { etat: EtatAction; className?: string }) {
  if (!etat.message) return null;

  return (
    <p
      role={etat.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm animate-rise",
        etat.ok
          ? "border-success/30 bg-success-soft text-success"
          : "border-danger/30 bg-danger-soft text-danger",
        className,
      )}
    >
      <Icon name={etat.ok ? "check" : "alert"} size={15} className="mt-0.5 shrink-0" />
      <span>{etat.message}</span>
    </p>
  );
}
