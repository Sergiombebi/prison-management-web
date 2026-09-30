import type { Metadata } from "next";
import { api } from "@/lib/api";
import { moduleMetier } from "@/lib/domain/modules";
import { formatNombre, pluriel } from "@/lib/format";
import { Page } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";
import {
  BandeauModule,
  Barre,
  Bloc,
  CadreModule,
  Chiffre,
  LigneAction,
  ListeActions,
  ListeBarres,
  Raccourcis,
  RangeeChiffres,
  RienASignaler,
} from "@/components/modules/tableau-module";
import { RythmeSemaine } from "@/components/modules/visuels";

export const metadata: Metadata = { title: "Visites · Vue d’ensemble" };

const MODULE = moduleMetier("visites");

/** Clé calendaire locale — `toISOString()` décalerait d'un jour selon le fuseau. */
function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Sous-tableau de bord du module « Visites ».
 *
 * L'écran d'un surveillant de parloir : ce qui se passe maintenant, puis le
 * rythme de la semaine pour anticiper l'affluence de demain. Tout vient de
 * `meta.stats` (agrégats calculés côté API) : à l'effectif réel d'un établissement,
 * charger tout le registre pour ces quelques chiffres serait hors budget.
 */
export default async function ApercuVisitesPage() {
  const resultat = await api.listVisites({ parPage: 1, avecStats: true });
  const stats = resultat.stats;
  const total = stats?.total ?? 0;

  const maintenant = new Date();
  const aujourdhui = cleJour(maintenant);

  // Déjà filtrées et triées côté API (bornées à 20, largement assez pour cet aperçu).
  const duJour = stats?.duJourDetail ?? [];
  const enCours = stats?.enCours ?? 0;
  const sansAutorisation = stats?.sansAutorisation ?? 0;

  const semaine = (stats?.serie7j ?? []).map((p) => ({
    label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(new Date(p.date)).replace(".", ""),
    date: p.date,
    valeur: p.total,
    aujourdhui: p.date === aujourdhui,
  }));
  const totalSemaine = stats?.semaine ?? 0;

  const parType = Object.entries(stats?.parType ?? {}).sort((a, b) => b[1] - a[1]);

  const recentes = stats?.recentes ?? [];

  return (
    <Page>
      <CadreModule module={MODULE}>
        <BandeauModule
          module={MODULE}
          titre="Parloirs"
          phrase={
            <>
              {duJour.length === 0 ? (
                <>Aucun parloir enregistré aujourd’hui</>
              ) : (
                <>{pluriel(duJour.length, "parloir enregistré", "parloirs enregistrés")} aujourd’hui</>
              )}
              , {pluriel(totalSemaine, "visite", "visites")} sur les sept derniers jours.
              {enCours > 0 && (
                <>
                  {" "}
                  <strong className="font-medium text-[color:var(--teinte)]">
                    {pluriel(enCours, "visite en cours", "visites en cours")}
                  </strong>{" "}
                  en ce moment.
                </>
              )}
            </>
          }
          actions={
            <>
              <ButtonLink href="/sante/visites" icone="door">
                Registre
              </ButtonLink>
              <ButtonLink
                href="/sante/visites"
                variante="primaire"
                icone="plus"
                transitionTypes={["nav-forward"]}
              >
                Enregistrer une visite
              </ButtonLink>
            </>
          }
        >
          <RangeeChiffres>
            <Chiffre
              index={0}
              label="Aujourd’hui"
              valeur={duJour.length}
              part={totalSemaine > 0 ? duJour.length / totalSemaine : 0}
              aide="Parloirs enregistrés ce jour"
              href="/sante/visites?periode=aujourdhui"
            />
            <Chiffre
              index={1}
              label="En cours"
              valeur={enCours}
              part={duJour.length > 0 ? enCours / duJour.length : 0}
              ton={enCours > 0 ? "attention" : "teinte"}
              aide={enCours > 0 ? "Commencées, non closes" : "Aucune visite ouverte"}
            />
            <Chiffre
              index={2}
              label="Sur 7 jours"
              valeur={totalSemaine}
              part={total > 0 ? totalSemaine / total : 0}
              aide="Affluence de la semaine glissante"
            />
            <Chiffre
              index={3}
              label="Sans autorisation"
              valeur={sansAutorisation}
              part={duJour.length > 0 ? sansAutorisation / duJour.length : 0}
              ton={sansAutorisation > 0 ? "attention" : "positif"}
              aide={
                sansAutorisation > 0
                  ? "Parloirs du jour sans autorisation préalable"
                  : "Toutes les visites du jour sont autorisées"
              }
            />
          </RangeeChiffres>
        </BandeauModule>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Bloc
            titre="Rythme de la semaine"
            sousTitre={`${formatNombre(totalSemaine)} visites sur sept jours`}
            icone="calendar"
          >
            <RythmeSemaine jours={semaine} />
          </Bloc>

          <Bloc
            titre="Parloirs du jour"
            sousTitre={duJour.length > 0 ? "Par heure d’arrivée" : undefined}
            icone="door"
            flush
          >
            {duJour.length === 0 ? (
              <RienASignaler texte="Aucun parloir n’est enregistré pour aujourd’hui." />
            ) : (
              <ListeActions>
                {duJour.slice(0, 6).map((v, i) => (
                  <LigneAction
                    key={v.id}
                    index={i}
                    repere={v.heureArrivee.slice(0, 5)}
                    uniteRepere={v.heureDebut && !v.heureFin ? "en cours" : undefined}
                    ton={v.heureDebut && !v.heureFin ? "attention" : "teinte"}
                    titre={v.detenuNom}
                    detail={`${v.nomVisiteur} · ${v.lienParente} · ${v.typeVisite}`}
                    href={`/sante/visites/${v.id}`}
                  />
                ))}
              </ListeActions>
            )}
          </Bloc>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Bloc titre="Nature des visites" sousTitre="Sur l’ensemble du registre" icone="user">
            {parType.length === 0 ? (
              <p className="py-4 text-sm text-muted">Aucune visite enregistrée.</p>
            ) : (
              <ListeBarres>
                {parType.map(([type, n], i) => (
                  <Barre
                    key={type}
                    index={i}
                    label={type}
                    valeur={n}
                    total={total}
                    href={`/sante/visites?type=${encodeURIComponent(type)}`}
                  />
                ))}
              </ListeBarres>
            )}
          </Bloc>

          <Bloc titre="Dernières visites" sousTitre="Les plus récentes" icone="clock" flush>
            {recentes.length === 0 ? (
              <RienASignaler texte="Aucune visite enregistrée." />
            ) : (
              <ListeActions>
                {recentes.map((v, i) => (
                  <LigneAction
                    key={v.id}
                    index={i}
                    repere={v.dateVisite.slice(8, 10)}
                    uniteRepere={new Intl.DateTimeFormat("fr-FR", { month: "short" })
                      .format(new Date(v.dateVisite))
                      .replace(".", "")}
                    titre={v.detenuNom}
                    detail={`${v.nomVisiteur} · ${v.heureArrivee.slice(0, 5)} · ${v.lieuVisite}`}
                    href={`/sante/visites/${v.id}`}
                  />
                ))}
              </ListeActions>
            )}
          </Bloc>
        </div>

        <Raccourcis
          liens={[
            { href: "/sante/visites", label: "Registre des visites", aide: "Historique et saisie", icone: "door" },
            { href: "/sante/visites?periode=aujourdhui", label: "Visites du jour", aide: "Filtrer sur aujourd’hui", icone: "calendar" },
            { href: "/detenus", label: "Registre des détenus", aide: "Retrouver un dossier", icone: "detenus" },
          ]}
        />
      </CadreModule>
    </Page>
  );
}
