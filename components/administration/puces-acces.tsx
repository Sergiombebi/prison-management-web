import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import {
  MODULES_METIER,
  estAdministrateur,
  modulesAccordes,
} from "@/lib/domain/modules";

/**
 * Les accès d'un compte, lus depuis ses permissions.
 *
 * Remplace la colonne « Rôle » : ce qui compte désormais n'est pas l'étiquette du
 * poste mais les modules réellement ouverts. Chaque puce reprend la teinte de son
 * module, la même que dans la sidebar et sur son sous-tableau de bord.
 */
export function PucesAcces({
  permissions,
  className,
}: {
  permissions: string[];
  className?: string;
}) {
  const admin = estAdministrateur(permissions);
  const ouverts = modulesAccordes(permissions);

  if (admin) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-2xs font-medium text-accent-ink",
          className,
        )}
      >
        <Icon name="shield" size={11} />
        Administrateur
      </span>
    );
  }

  if (ouverts.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning-soft px-2 py-0.5 text-2xs font-medium text-warning",
          className,
        )}
      >
        <Icon name="alert" size={11} />
        Aucun accès
      </span>
    );
  }

  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {MODULES_METIER.filter((m) => ouverts.includes(m.cle)).map((m) => (
        <span
          key={m.cle}
          title={m.resume}
          style={{
            ["--teinte" as string]: m.teinte.trait,
            backgroundColor: m.teinte.voile,
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium text-[color:var(--teinte)] ring-1 ring-inset ring-[color:var(--teinte)]/25"
        >
          <Icon name={m.icone} size={11} />
          {m.labelCourt}
        </span>
      ))}
    </span>
  );
}
