import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type NomIcone } from "./icon";

type Variante = "primaire" | "secondaire" | "discret" | "danger";
type Taille = "sm" | "md";

const BASE =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "rounded-md transition-[background-color,color,border-color,transform] duration-[var(--dur-fast)] ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANTES: Record<Variante, string> = {
  primaire:
    "bg-accent text-ink-inverse hover:bg-accent-hover",
  secondaire:
    "bg-surface text-ink border border-rule hover:border-rule-strong hover:bg-raised",
  discret: "text-muted hover:text-ink hover:bg-sunken",
  danger:
    "bg-surface text-danger border border-rule hover:border-danger hover:bg-danger-soft",
};

const TAILLES: Record<Taille, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
};

interface Commun {
  variante?: Variante;
  taille?: Taille;
  icone?: NomIcone;
  iconeDroite?: NomIcone;
  children?: ReactNode;
}

type BoutonProps = Commun & ComponentProps<"button"> & { chargement?: boolean };

export function Button({
  variante = "secondaire",
  taille = "md",
  icone,
  iconeDroite,
  chargement,
  className,
  children,
  disabled,
  ...rest
}: BoutonProps) {
  return (
    <button
      className={cn(BASE, VARIANTES[variante], TAILLES[taille], className)}
      disabled={disabled || chargement}
      aria-busy={chargement || undefined}
      {...rest}
    >
      {chargement ? (
        <span
          className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin-slow"
          aria-hidden
        />
      ) : (
        icone && <Icon name={icone} size={taille === "sm" ? 14 : 16} />
      )}
      {children}
      {iconeDroite && <Icon name={iconeDroite} size={taille === "sm" ? 14 : 16} />}
    </button>
  );
}

type LienBoutonProps = Commun &
  ComponentProps<typeof Link> & { transitionTypes?: string[] };

export function ButtonLink({
  variante = "secondaire",
  taille = "md",
  icone,
  iconeDroite,
  className,
  children,
  ...rest
}: LienBoutonProps) {
  return (
    <Link
      className={cn(BASE, VARIANTES[variante], TAILLES[taille], className)}
      {...rest}
    >
      {icone && <Icon name={icone} size={taille === "sm" ? 14 : 16} />}
      {children}
      {iconeDroite && <Icon name={iconeDroite} size={taille === "sm" ? 14 : 16} />}
    </Link>
  );
}
