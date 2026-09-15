"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initiales } from "@/lib/format";
import { t } from "@/lib/i18n/fr";
import { LIBELLE_ROLE } from "@/lib/domain/referentiels";
import {
  MODULES_ADMIN,
  MODULES_PRINCIPAUX,
  filAriane,
  lienActif,
  moduleDe,
  type ModuleNav,
} from "@/lib/navigation";
import type { ProfilSession } from "@/lib/session";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({
  profil,
  modeApi,
  seDeconnecter,
  children,
}: {
  profil: ProfilSession;
  modeApi: "mock" | "live";
  seDeconnecter: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Le tiroir mobile retient le chemin sur lequel il a été ouvert : dès que l'URL
  // change, il se referme de lui-même, sans effet ni rendu supplémentaire.
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === pathname;
  const setOuvert = (valeur: boolean) => setOuvertSur(valeur ? pathname : null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvertSur(null);
    document.addEventListener("keydown", surTouche);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-ink-inverse"
      >
        Aller au contenu
      </a>

      {/* Voile du tiroir mobile */}
      <div
        aria-hidden
        onClick={() => setOuvert(false)}
        className={cn(
          "fixed inset-0 z-30 bg-inverse/30 backdrop-blur-[2px] transition-opacity duration-[var(--dur-base)] lg:hidden",
          ouvert ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <Sidebar
        pathname={pathname}
        profil={profil}
        modeApi={modeApi}
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        seDeconnecter={seDeconnecter}
      />

      <div className="flex min-w-0 flex-col">
        <Topbar pathname={pathname} onOuvrirMenu={() => setOuvert(true)} />
        <main id="contenu" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Sidebar({
  pathname,
  profil,
  modeApi,
  ouvert,
  onFermer,
  seDeconnecter,
}: {
  pathname: string;
  profil: ProfilSession;
  modeApi: "mock" | "live";
  ouvert: boolean;
  onFermer: () => void;
  seDeconnecter: () => Promise<void>;
}) {
  const moduleCourant = moduleDe(pathname);
  const lien = lienActif(pathname);

  return (
    <aside
      data-print-hide
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-hairline bg-surface",
        "transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)]",
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        ouvert ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* En-tête institutionnel */}
      <div className="relative border-b border-hairline px-5 pb-4 pt-5">
        <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
        <div className="flex items-start justify-between gap-2">
          <Link href="/tableau-de-bord" className="group flex items-center gap-3 rounded-sm">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-md border border-rule-strong font-mono text-2xs font-semibold tracking-tight text-ink transition-colors group-hover:border-accent group-hover:text-accent"
            >
              SGP
            </span>
            <span className="min-w-0">
              <span className="block text-2xs font-semibold uppercase tracking-[0.12em] text-faint">
                {t.app.republique}
              </span>
              <span className="block truncate text-sm font-semibold text-ink">
                {t.app.nomComplet}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onFermer}
            className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink lg:hidden"
          >
            <Icon name="close" size={16} />
            <span className="sr-only">{t.nav.fermerMenu}</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <SectionNav titre={t.nav.menuPrincipal}>
          {MODULES_PRINCIPAUX.map((m) => (
            <EntreeModule
              key={m.id}
              module={m}
              actif={moduleCourant?.id === m.id}
              hrefActif={lien?.href}
            />
          ))}
        </SectionNav>

        <SectionNav titre={t.nav.administration} className="mt-6">
          {MODULES_ADMIN.map((m) => (
            <EntreeModule
              key={m.id}
              module={m}
              actif={moduleCourant?.id === m.id}
              hrefActif={lien?.href}
            />
          ))}
        </SectionNav>
      </nav>

      <div className="border-t border-hairline p-3">
        {modeApi === "mock" && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border border-dashed border-rule px-2.5 py-2"
            title={t.mockBanner.texte}
          >
            <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
            <p className="text-2xs leading-4 text-muted">
              <span className="font-semibold text-ink">{t.mockBanner.titre}</span>
              <br />
              API non branchée
            </p>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-md px-1.5 py-1">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-md bg-sunken text-2xs font-semibold text-muted"
          >
            {initiales(`${profil.prenom} ${profil.nom}`)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">
              {profil.prenom} {profil.nom}
            </p>
            <p className="truncate text-2xs text-muted">{LIBELLE_ROLE[profil.role]}</p>
          </div>
          <form action={seDeconnecter}>
            <button
              type="submit"
              title={t.actions.seDeconnecter}
              className="grid size-8 place-items-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <Icon name="logout" size={15} />
              <span className="sr-only">{t.actions.seDeconnecter}</span>
            </button>
          </form>
        </div>

        <div className="mt-2 flex items-center justify-between px-1.5">
          <span className="text-2xs text-faint">{t.nav.theme}</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function SectionNav({
  titre,
  className,
  children,
}: {
  titre: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-1.5 px-2.5 text-2xs font-semibold uppercase tracking-[0.12em] text-faint">
        {titre}
      </p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

function EntreeModule({
  module,
  actif,
  hrefActif,
}: {
  module: ModuleNav;
  actif: boolean;
  hrefActif?: string;
}) {
  const groupes = module.groupes ?? [];
  // Un module d'un seul lien n'a pas besoin de sous-navigation
  const aSousNav = groupes.flatMap((g) => g.liens).length > 1;

  return (
    <li>
      <Link
        href={module.href}
        aria-current={actif && !aSousNav ? "page" : undefined}
        className={cn(
          "group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-base transition-colors duration-[var(--dur-fast)]",
          actif ? "bg-sunken font-medium text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink",
        )}
      >
        {/* Repère actif : nommé pour glisser d'un module à l'autre pendant la transition */}
        {actif && (
          <span
            aria-hidden
            className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
            style={{ viewTransitionName: "sgp-repere-module" }}
          />
        )}
        <Icon
          name={module.icone}
          size={17}
          className={cn("shrink-0 transition-colors", actif ? "text-accent" : "text-faint group-hover:text-muted")}
        />
        <span className="truncate">{module.label}</span>
        {aSousNav && (
          <Icon
            name="chevronRight"
            size={13}
            className={cn(
              "ml-auto text-faint transition-transform duration-[var(--dur-base)] ease-out",
              actif && "rotate-90",
            )}
          />
        )}
      </Link>

      {aSousNav && (
        // grid-rows 0fr → 1fr : dépliage fluide sans mesurer la hauteur en JS
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-[var(--dur-slow)] ease-[var(--ease-out)]",
            actif ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="ml-[18px] mt-1 mb-2 border-l border-hairline pl-3">
              {groupes.map((g) => (
                <div key={g.label} className="mt-1.5 first:mt-0">
                  {groupes.length > 1 && (
                    <p className="px-2 pb-0.5 pt-1.5 text-2xs font-medium text-faint">{g.label}</p>
                  )}
                  <ul>
                    {g.liens.map((l) => {
                      const courant = hrefActif === l.href;
                      return (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            tabIndex={actif ? undefined : -1}
                            aria-current={courant ? "page" : undefined}
                            className={cn(
                              "relative flex h-7 items-center rounded-sm px-2 text-sm transition-colors",
                              courant ? "font-medium text-accent-ink" : "text-muted hover:text-ink",
                            )}
                          >
                            {courant && (
                              <span
                                aria-hidden
                                className="absolute -left-[13px] inset-y-1.5 w-px bg-accent"
                                style={{ viewTransitionName: "sgp-repere-lien" }}
                              />
                            )}
                            <span className="truncate">{l.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------

function Topbar({ pathname, onOuvrirMenu }: { pathname: string; onOuvrirMenu: () => void }) {
  const miettes = filAriane(pathname);
  const recherche = useRef<HTMLInputElement>(null);

  // « / » place le curseur dans la recherche, comme dans la plupart des outils métier
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (e.key !== "/" || cible.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      recherche.current?.focus();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, []);

  return (
    <header
      data-print-hide
      className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-8"
      style={{ viewTransitionName: "sgp-topbar" }}
    >
      <button
        type="button"
        onClick={onOuvrirMenu}
        className="-ml-1.5 grid size-9 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink lg:hidden"
      >
        <Icon name="menu" size={18} />
        <span className="sr-only">{t.nav.ouvrirMenu}</span>
      </button>

      <nav aria-label={t.nav.filAriane} className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {miettes.map((m, i) => {
            const dernier = i === miettes.length - 1;
            return (
              <li key={`${m.label}-${i}`} className={cn("flex min-w-0 items-center gap-1.5", !dernier && "hidden sm:flex")}>
                {i > 0 && <Icon name="chevronRight" size={12} className="shrink-0 text-faint" />}
                {m.href && !dernier ? (
                  <Link href={m.href} transitionTypes={["nav-back"]} className="truncate text-muted transition-colors hover:text-ink">
                    {m.label}
                  </Link>
                ) : (
                  <span aria-current={dernier ? "page" : undefined} className={cn("truncate", dernier ? "font-medium text-ink" : "text-muted")}>
                    {m.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <Form action="/detenus" role="search" className="relative hidden w-full max-w-72 md:block">
        <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <label htmlFor="recherche-globale" className="sr-only">
          Rechercher un détenu par nom ou numéro d&apos;écrou
        </label>
        <input
          ref={recherche}
          id="recherche-globale"
          name="recherche"
          type="search"
          autoComplete="off"
          placeholder="Nom ou n° d'écrou…"
          className="h-8 w-full rounded-md border border-hairline bg-surface pl-9 pr-9 text-sm text-ink placeholder:text-faint transition-colors hover:border-rule focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-xs border border-hairline px-1.5 font-mono text-2xs text-faint">
          /
        </kbd>
      </Form>
    </header>
  );
}
