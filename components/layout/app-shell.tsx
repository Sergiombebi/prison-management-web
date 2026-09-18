"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  peutVoirModule,
  type ModuleNav,
} from "@/lib/navigation";
import type { ProfilSession } from "@/lib/session";
import type { EtatApi } from "@/lib/api/contract";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";

export function AppShell({
  profil,
  modeApi,
  seDeconnecter,
  children,
}: {
  profil: ProfilSession;
  modeApi: EtatApi;
  seDeconnecter: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Le tiroir mobile retient le chemin sur lequel il a été ouvert : dès que l'URL
  // change, il se referme de lui-même, sans effet ni rendu supplémentaire.
  const [ouvertSur, setOuvertSur] = useState<string | null>(null);
  const ouvert = ouvertSur === pathname;

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
    <div className="min-h-screen lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-ink-inverse"
      >
        Aller au contenu
      </a>

      {/* Voile du tiroir mobile */}
      <div
        aria-hidden
        onClick={() => setOuvertSur(null)}
        className={cn(
          "fixed inset-0 z-30 bg-inverse/40 backdrop-blur-[3px] transition-opacity duration-[var(--dur-base)] lg:hidden",
          ouvert ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <Sidebar
        pathname={pathname}
        profil={profil}
        modeApi={modeApi}
        ouvert={ouvert}
        onFermer={() => setOuvertSur(null)}
        seDeconnecter={seDeconnecter}
      />

      <div className="flex min-w-0 flex-col">
        <Topbar pathname={pathname} onOuvrirMenu={() => setOuvertSur(pathname)} />
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
  modeApi: EtatApi;
  ouvert: boolean;
  onFermer: () => void;
  seDeconnecter: () => Promise<void>;
}) {
  const moduleCourant = moduleDe(pathname);
  const lien = lienActif(pathname);
  const modulesPrincipaux = MODULES_PRINCIPAUX.filter((m) => peutVoirModule(profil.permissions, m));
  const modulesAdmin = MODULES_ADMIN.filter((m) => peutVoirModule(profil.permissions, m));

  return (
    <aside
      data-print-hide
      aria-label="Navigation principale"
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-hairline verre",
        "transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)]",
        "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        ouvert ? "translate-x-0 shadow-e4" : "-translate-x-full",
      )}
    >
      {/* En-tête institutionnel */}
      <div className="relative px-5 pb-4 pt-5">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
        />
        <div className="flex items-start justify-between gap-2">
          <Link href="/tableau-de-bord" className="group flex items-center gap-3 rounded-md">
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-md bg-gradient-to-br from-accent to-accent-hover font-mono text-2xs font-bold tracking-tight text-ink-inverse shadow-e2 transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)] group-hover:scale-105"
            >
              SGP
            </span>
            <span className="min-w-0">
              <span className="block text-2xs font-semibold uppercase tracking-[0.12em] text-faint">
                {t.app.republique}
              </span>
              <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-ink">
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

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {modulesPrincipaux.length > 0 && (
          <SectionNav titre={t.nav.menuPrincipal}>
            {modulesPrincipaux.map((m) => (
              <EntreeModule
                key={m.id}
                module={m}
                actif={moduleCourant?.id === m.id}
                hrefActif={lien?.href}
              />
            ))}
          </SectionNav>
        )}

        {modulesAdmin.length > 0 && (
          <SectionNav titre={t.nav.administration} className="mt-6">
            {modulesAdmin.map((m) => (
              <EntreeModule
                key={m.id}
                module={m}
                actif={moduleCourant?.id === m.id}
                hrefActif={lien?.href}
              />
            ))}
          </SectionNav>
        )}
      </nav>

      <div className="border-t border-hairline p-3">
        {modeApi !== "live" && (
          <div
            className="mb-3 flex items-start gap-2 rounded-md border border-dashed border-rule bg-raised px-2.5 py-2"
            title={modeApi === "mock" ? t.mockBanner.texte : t.mockBanner.texteHybride}
          >
            <span
              aria-hidden
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
              style={{ animation: "sgp-halo 2.6s ease-in-out infinite" }}
            />
            <p className="text-2xs leading-4 text-muted">
              <span className="font-semibold text-ink">
                {modeApi === "mock" ? t.mockBanner.titre : t.mockBanner.titreHybride}
              </span>
              <br />
              {modeApi === "mock" ? "API non branchée" : "API branchée en partie"}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-surface px-2 py-2 shadow-e1">
          <Link
            href="/profil"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md transition-colors hover:bg-sunken"
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-md bg-gradient-to-br from-raised to-sunken text-2xs font-semibold text-muted shadow-e1"
            >
              {initiales(`${profil.prenom} ${profil.nom}`)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {profil.prenom} {profil.nom}
              </p>
              <p className="truncate text-2xs text-muted">{LIBELLE_ROLE[profil.role]}</p>
            </div>
          </Link>
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

        <div className="mt-2 flex items-center justify-between px-1">
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
          actif ? "font-medium text-accent-ink" : "text-muted hover:bg-sunken/70 hover:text-ink",
        )}
      >
        {/* Pilule active : nommée, elle glisse d'un module à l'autre pendant la transition */}
        {actif && (
          <span
            aria-hidden
            className="repere absolute inset-0 -z-10 rounded-md border border-accent/15 bg-accent-soft shadow-e1"
            style={{ viewTransitionName: "sgp-repere-module" }}
          />
        )}
        <Icon
          name={module.icone}
          size={17}
          className={cn(
            "shrink-0 transition-colors",
            actif ? "text-accent" : "text-faint group-hover:text-muted",
          )}
        />
        <span className="truncate">{module.label}</span>
        {aSousNav && (
          <Icon
            name="chevronRight"
            size={13}
            className={cn(
              "ml-auto text-faint transition-transform duration-[var(--dur-base)] ease-[var(--ease-spring)]",
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
            <div className="ml-[19px] mb-2 mt-1 border-l border-hairline pl-3">
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
                              courant
                                ? "font-medium text-accent-ink"
                                : "text-muted hover:text-ink",
                            )}
                          >
                            {courant && (
                              <span
                                aria-hidden
                                className="repere absolute -left-[13px] inset-y-1.5 w-0.5 rounded-full bg-accent"
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
  const [condense, setCondense] = useState(false);

  // La barre se resserre dès qu'on quitte le haut de page : plus de place au contenu
  useEffect(() => {
    const surDefilement = () => setCondense(window.scrollY > 8);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  return (
    <header
      data-print-hide
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 border-b px-4 transition-[height,border-color,box-shadow] duration-[var(--dur-base)] ease-out sm:px-6 lg:px-8",
        "verre",
        condense ? "h-12 border-hairline shadow-e2" : "h-15 border-transparent",
      )}
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
              <li
                key={`${m.label}-${i}`}
                className={cn("flex min-w-0 items-center gap-1.5", !dernier && "hidden sm:flex")}
              >
                {i > 0 && <Icon name="chevronRight" size={12} className="shrink-0 text-faint" />}
                {m.href && !dernier ? (
                  <Link
                    href={m.href}
                    transitionTypes={["nav-back"]}
                    className="truncate rounded-xs text-muted transition-colors hover:text-ink"
                  >
                    {m.label}
                  </Link>
                ) : (
                  <span
                    aria-current={dernier ? "page" : undefined}
                    className={cn("truncate", dernier ? "font-medium text-ink" : "text-muted")}
                  >
                    {m.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="hidden md:block">
        <CommandPalette />
      </div>
    </header>
  );
}
