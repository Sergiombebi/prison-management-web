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
  neutre: "bg-sunken text-muted",
  accent: "bg-accent-soft text-accent-ink",
  succes: "bg-success-soft text-success",
  alerte: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
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
        "inline-flex h-5 items-center gap-1.5 rounded-sm px-1.5 text-2xs font-medium whitespace-nowrap",
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
