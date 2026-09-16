import type { Metadata } from "next";
import { modeDe } from "@/lib/api";
import { t } from "@/lib/i18n/fr";
import { param } from "@/lib/url";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Icon } from "@/components/ui/icon";
import { LoginForm, type AideConnexion } from "./login-form";

export const metadata: Metadata = { title: t.connexion.titre };

/** Vignettes flottantes : un aperçu de l'application, pas une capture d'écran. */
const VIGNETTES = [
  {
    classe: "left-[6%] top-[18%] hidden xl:flex",
    delai: "1.1s",
    icone: "detenus" as const,
    titre: "Population détenue",
    valeur: "48",
    detail: "+2 cette semaine",
  },
  {
    classe: "right-[7%] top-[24%] hidden xl:flex",
    delai: "1.35s",
    icone: "file" as const,
    titre: "Mandats expirés",
    valeur: "16",
    detail: "à régulariser",
    alerte: true,
  },
  {
    classe: "left-[10%] bottom-[16%] hidden xl:flex",
    delai: "1.6s",
    icone: "cell" as const,
    titre: "Taux d'occupation",
    valeur: "35,8 %",
    detail: "86 places libres",
  },
];

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
        : undefined;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-inverse">
      {/* Nappes de couleur — le fond respire au lieu d'être un aplat */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-60 -top-60 size-[46rem] rounded-full opacity-45 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--sgp-viz-1), transparent 62%)",
          animation: "sgp-halo 16s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-72 -right-52 size-[52rem] rounded-full opacity-35 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--sgp-viz-2), transparent 62%)",
          animation: "sgp-halo 21s ease-in-out 3s infinite",
        }}
      />

      {/* Trame de registre en filigrane */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at 50% 40%, #000 30%, transparent 78%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3 animate-rise">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-lg bg-white/12 font-mono text-2xs font-bold tracking-tight text-white ring-1 ring-inset ring-white/25"
          >
            SGP
          </span>
          <span className="text-2xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {t.app.republique}
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-8">
        {VIGNETTES.map((v) => (
          <figure
            key={v.titre}
            aria-hidden
            className={`absolute w-56 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md ${v.classe}`}
            style={{ animation: `sgp-pop 700ms var(--ease-spring) ${v.delai} both` }}
          >
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                v.alerte ? "bg-danger/25 text-white" : "bg-white/15 text-white"
              }`}
            >
              <Icon name={v.icone} size={16} />
            </span>
            <figcaption className="min-w-0">
              <p className="truncate text-2xs text-white/60">{v.titre}</p>
              <p className="tnum text-md font-semibold text-white">{v.valeur}</p>
              <p className="truncate text-2xs text-white/50">{v.detail}</p>
            </figcaption>
          </figure>
        ))}

        <div className="w-full max-w-[26rem]">
          <div className="mb-6 text-center animate-rise">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
              {t.connexion.titre}
            </h1>
            <p className="mt-2 text-base text-white/60">{t.connexion.sousTitre}</p>
          </div>

          <div
            className="rounded-xl border border-hairline bg-surface p-6 shadow-e4 sm:p-7 animate-pop"
            style={{ animationDelay: "120ms" }}
          >
            <LoginForm suite={param(sp, "suite")} aide={aide} avis={avis} />
          </div>

          <p
            className="mt-6 text-center text-2xs leading-5 text-white/45 animate-rise"
            style={{ animationDelay: "260ms" }}
          >
            {t.app.nomComplet} — {t.app.devise}
            <br />
            Accès journalisé : tout usage est tracé.
          </p>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-5 text-center text-2xs text-white/35 sm:px-10">
        © {new Date().getFullYear()} {t.app.nom} · Ministère de la Justice · Administration pénitentiaire
      </footer>
    </div>
  );
}
