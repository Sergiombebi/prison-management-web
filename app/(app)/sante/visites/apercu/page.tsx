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
 * rythme de la semaine pour anticiper l'affluence de demain.
 */
export default async function ApercuVisitesPage() {
  const visites = await api.listVisites();

  const maintenant = new Date();
  const aujourdhui = cleJour(maintenant);

  const duJour = visites
    .filter((v) => v.dateVisite.slice(0, 10) === aujourdhui)
    .sort((a, b) => a.heureArrivee.localeCompare(b.heureArrivee));

  // Une visite commencée et non close est en cours dans le parloir.
  const enCours = visites.filter((v) => v.heureDebut && !v.heureFin);
  const sansAutorisation = duJour.filter((v) => !v.autorisationPrealable).length;

  const semaine = Array.from({ length: 7 }, (_, i) => {
    const jour = new Date(maintenant.getTime() - (6 - i) * 86_400_000);
    const cle = cleJour(jour);
    return {
      label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(jour).replace(".", ""),
      date: cle,
      valeur: visites.filter((v) => v.dateVisite.slice(0, 10) === cle).length,
      aujourdhui: cle === aujourdhui,
    };
  });
  const totalSemaine = semaine.reduce((s, j) => s + j.valeur, 0);

  const parType = Object.entries(
    visites.reduce<Record<string, number>>((acc, v) => {
      acc[v.typeVisite] = (acc[v.typeVisite] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const recentes = [...visites]
    .sort((a, b) => `${b.dateVisite}${b.heureArrivee}`.localeCompare(`${a.dateVisite}${a.heureArrivee}`))
    .slice(0, 5);

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
              {enCours.length > 0 && (
                <>
                  {" "}
                  <strong className="font-medium text-[color:var(--teinte)]">
                    {pluriel(enCours.length, "visite en cours", "visites en cours")}
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
              valeur={enCours.length}
              part={duJour.length > 0 ? enCours.length / duJour.length : 0}
              ton={enCours.length > 0 ? "attention" : "teinte"}
              aide={enCours.length > 0 ? "Commencées, non closes" : "Aucune visite ouverte"}
            />
            <Chiffre
              index={2}
              label="Sur 7 jours"
              valeur={totalSemaine}
              part={visites.length > 0 ? totalSemaine / visites.length : 0}
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
                    total={visites.length}
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
