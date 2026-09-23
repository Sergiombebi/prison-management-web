import type { Metadata } from "next";
import { modeDe } from "@/lib/api";
import { t } from "@/lib/i18n/fr";
import { param } from "@/lib/url";
import { PaletteToggle, ThemeToggle } from "@/components/layout/theme-toggle";
import { Armoiries } from "@/components/ui/armoiries";
import { LoginForm, type AideConnexion } from "./login-form";

export const metadata: Metadata = { title: t.connexion.titre };

export default async function ConnexionPage(props: PageProps<"/connexion">) {
  const sp = await props.searchParams;

  // Identifiants affichés sous le formulaire : jamais en production
  const aide: AideConnexion | undefined =
    modeDe("auth") === "mock"
      ? { source: "Démonstration", identifiant: "admin", motDePasse: "admin" }
      : process.env.NODE_ENV === "development"
        ? { source: "API locale (comptes de test)", identifiant: "admin", motDePasse: "password" }
        : undefined;

  const raison = param(sp, "raison");
  const avis =
    raison === "expiree"
      ? t.connexion.sessionExpiree
      : raison === "session-invalide"
        ? t.connexion.sessionInvalide
        : raison === "droits-modifies"
          ? t.connexion.droitsModifies
          : undefined;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-canvas">
      {/*
        Le décor suit le thème : palais en plein jour en clair, au crépuscule en
        sombre. Les deux images partagent le même cadrage, donc le basculement ne
        déplace rien. Tout est piloté par les jetons `--sgp-connexion-*` de
        globals.css — pour mettre une photographie, déposer le fichier dans
        /public et changer l'URL du jeton, rien d'autre ne bouge.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "var(--sgp-connexion-fond)" }}
      />
      {/* Deux dégradés légers : lisibilité du texte, puis mise au centre du regard */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--sgp-connexion-voile)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "var(--sgp-connexion-vignette)" }}
      />

      <header className="relative z-10 flex items-start justify-between gap-4 px-5 py-5 sm:px-10 sm:py-6">
        {/* Bloc-marque de l'État, à l'angle : armoiries, puis l'emblème du système */}
        <div className="flex min-w-0 items-center gap-3 animate-rise sm:gap-4">
          <Armoiries size={42} className="shrink-0 drop-shadow-[0_2px_5px_rgb(23_21_43/0.22)]" />

          <span
            aria-hidden
            className="h-9 w-px shrink-0"
            style={{ backgroundColor: "var(--sgp-connexion-filet)" }}
          />

          <span
            aria-hidden
            className="size-10 shrink-0 rounded-lg bg-white shadow-e2 ring-1 ring-inset ring-black/5"
            style={{
              backgroundImage: "url('/kzsgp.png')",
              backgroundSize: "185%",
              backgroundPosition: "50% 22%",
              backgroundRepeat: "no-repeat",
            }}
          />

          {/* Sous 640 px, les deux emblèmes suffisent : le texte céderait la place au sélecteur de thème */}
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-2xs font-semibold uppercase tracking-[0.18em] text-[color:var(--sgp-connexion-ink)] opacity-85">
              {t.app.republique}
            </span>
            <span className="mt-0.5 block truncate text-2xs text-[color:var(--sgp-connexion-ink-faible)]">
              {t.app.devise}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <PaletteToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-6">
        <div className="w-full max-w-[26rem]">
          <div className="mb-6 text-center animate-rise">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--sgp-connexion-ink)]">
              {t.connexion.titre}
            </h1>
            <p className="mt-2 text-base text-[color:var(--sgp-connexion-ink-doux)]">
              {t.connexion.sousTitre}
            </p>
          </div>

          <div
            className="rounded-xl border border-hairline bg-surface p-6 shadow-e4 sm:p-7 animate-pop"
            style={{ animationDelay: "120ms" }}
          >
            <LoginForm suite={param(sp, "suite")} aide={aide} avis={avis} />
          </div>

          <p
            className="mt-6 text-center text-2xs leading-5 text-[color:var(--sgp-connexion-ink-faible)] animate-rise"
            style={{ animationDelay: "260ms" }}
          >
            {t.app.nomComplet}
            <br />
            Accès journalisé : tout usage est tracé.
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-5 py-5 text-center text-2xs text-[color:var(--sgp-connexion-ink-faible)] sm:px-10">
        © {new Date().getFullYear()} {t.app.nom} · Ministère de la Justice · Administration pénitentiaire
      </footer>
    </div>
  );
}
