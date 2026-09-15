import type { Metadata } from "next";
import { MODE_API } from "@/lib/api";
import { t } from "@/lib/i18n/fr";
import { param } from "@/lib/url";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: t.connexion.titre };

export default async function ConnexionPage(props: PageProps<"/connexion">) {
  const sp = await props.searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Panneau institutionnel — composé comme l'en-tête d'un acte officiel */}
      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-inverse text-ink-inverse lg:flex lg:flex-col lg:justify-between lg:p-12"
      >
        {/* Lignes de registre qui se tracent à l'ouverture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          {Array.from({ length: 28 }, (_, i) => (
            <div
              key={i}
              className="h-px origin-left bg-current"
              style={{
                marginTop: i === 0 ? 48 : 31,
                animation: `sgp-grow-x 1100ms var(--ease-out) ${i * 28}ms both`,
              }}
            />
          ))}
        </div>

        <div className="relative stagger" style={{ ["--stagger-step" as string]: "90ms" }}>
          <p className="text-2xs font-semibold uppercase tracking-[0.24em] opacity-70" style={{ ["--i" as string]: 0 }}>
            {t.app.republique}
          </p>
          <p className="mt-1 text-2xs uppercase tracking-[0.24em] opacity-50" style={{ ["--i" as string]: 1 }}>
            {t.app.devise}
          </p>
          <div className="mt-4 h-px w-12 bg-current opacity-40" style={{ ["--i" as string]: 2 }} />
          <p className="mt-4 text-2xs uppercase tracking-[0.2em] opacity-60" style={{ ["--i" as string]: 3 }}>
            Ministère de la Justice
            <br />
            Administration pénitentiaire
          </p>
        </div>

        <div className="relative">
          <p
            className="font-mono text-[7.5rem] font-semibold leading-none tracking-[-0.06em] animate-rise"
            style={{ animationDelay: "250ms" }}
          >
            SGP
          </p>
          <p
            className="mt-4 max-w-sm text-md leading-relaxed opacity-75 animate-rise"
            style={{ animationDelay: "350ms" }}
          >
            {t.app.nomComplet}. Registre d&apos;écrou, mandats de détention, discipline et
            états réglementaires de l&apos;établissement.
          </p>
        </div>

        <p className="relative font-mono text-2xs opacity-40">
          Accès journalisé — tout usage est tracé
        </p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-8 animate-rise">
            <p className="mb-3 font-mono text-xs font-semibold text-accent lg:hidden">SGP</p>
            <h1 className="text-xl font-semibold tracking-[-0.015em] text-ink">{t.connexion.titre}</h1>
            <p className="mt-1.5 text-base text-muted">{t.connexion.sousTitre}</p>
          </div>

          <div className="animate-rise" style={{ animationDelay: "80ms" }}>
            <LoginForm suite={param(sp, "suite")} demo={MODE_API === "mock"} />
          </div>
        </div>

        <p className="text-center text-2xs text-faint">
          © {new Date().getFullYear()} {t.app.nom} — {t.app.nomComplet}
        </p>
      </main>
    </div>
  );
}
