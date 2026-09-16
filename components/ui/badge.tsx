import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CategoriePenale, StatutDetenu } from "@/lib/domain/types";
import {
  LIBELLE_CATEGORIE,
  LIBELLE_STATUT_DETENU,
  REGLE_CATEGORIE,
} from "@/lib/domain/referentiels";

export type Ton = "neutre" | "accent" | "succes" | "alerte" | "danger" | "info";

const TONS: Record<Ton, string> = {
  neutre: "bg-sunken text-muted ring-rule/40",
  accent: "bg-accent-soft text-accent-ink ring-accent/20",
  succes: "bg-success-soft text-success ring-success/20",
  alerte: "bg-warning-soft text-warning ring-warning/25",
  danger: "bg-danger-soft text-danger ring-danger/25",
  info: "bg-info-soft text-info ring-info/20",
};

/**
 * Pastille de statut. Toujours accompagnée d'un texte : la couleur n'est jamais
 * le seul porteur d'information. Le point renforce la lecture sans la remplacer.
 */
export function Badge({
  ton = "neutre",
  point = true,
  title,
  className,
  children,
}: {
  ton?: Ton;
  point?: boolean;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5.5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-2xs font-medium ring-1 ring-inset",
        TONS[ton],
        className,
      )}
    >
      {point && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

const TON_CATEGORIE: Record<CategoriePenale, Ton> = {
  Prevenu: "info",
  Condamne: "neutre",
  Appellant: "accent",
  Cassationnaire: "accent",
  Dpac: "alerte",
};

export function BadgeCategorie({ categorie }: { categorie: CategoriePenale | null }) {
  if (!categorie) {
    return (
      <Badge ton="neutre" point={false} title="Aucun mandat actif">
        Sans mandat actif
      </Badge>
    );
  }
  return (
    <Badge ton={TON_CATEGORIE[categorie]} title={REGLE_CATEGORIE[categorie]}>
      {LIBELLE_CATEGORIE[categorie]}
    </Badge>
  );
}

const TON_STATUT: Record<StatutDetenu, Ton> = {
  Present: "succes",
  EnAttente: "alerte",
  Hospitalise: "info",
  Transfere: "neutre",
  Sorti: "neutre",
  Evasion: "danger",
};

export function BadgeStatut({ statut }: { statut: StatutDetenu }) {
  return <Badge ton={TON_STATUT[statut]}>{LIBELLE_STATUT_DETENU[statut]}</Badge>;
}
