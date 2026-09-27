import type { Metadata } from "next";
import { api } from "@/lib/api";
import { moduleMetier } from "@/lib/domain/modules";
import { formatDate, formatNombre, joursRestants, pluriel, tronquer } from "@/lib/format";
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
import { Impulsions } from "@/components/modules/visuels";

export const metadata: Metadata = { title: "Suivi médical · Vue d’ensemble" };

const MODULE = moduleMetier("sante");

const JOURS_TRACES = 14;

/**
 * Sous-tableau de bord du module « Suivi médical ».
 *
 * L'infirmerie se lit dans le temps : la courbe des quatorze derniers jours occupe
 * la place centrale, et ce qui demande une action — les suivis à honorer — vient
 * juste après. Tout vient de `meta.stats` (agrégats calculés côté API) : à l'effectif
 * réel d'un établissement, charger tout le registre pour ces quelques chiffres serait
 * hors de tout budget de chargement raisonnable.
 */
export default async function ApercuSantePage() {
  const resultat = await api.listSuivisMedicaux({ parPage: 1, avecStats: true });
  const stats = resultat.stats;
  const total = stats?.total ?? 0;

  const ceMois = stats?.ceMois ?? 0;
  const urgences = stats?.urgences7j ?? 0;

  // Suivis programmés encore à honorer, du plus proche au plus lointain (déjà bornés
  // et triés côté API — 20 au plus, largement assez pour cet aperçu).
  const aHonorer = (stats?.aHonorer ?? [])
    .map((s) => ({ suivi: s, jours: joursRestants(s.dateSuivi!) ?? 0 }))
    .filter((x) => x.jours >= -30);
  const enRetard = aHonorer.filter((x) => x.jours < 0).length;

  const serie = (stats?.serie14j ?? []).map((p) => ({
    label: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(p.date)),
    valeur: p.total,
  }));

  const parType = Object.entries(stats?.parType ?? {}).sort((a, b) => b[1] - a[1]);

  const recentes = stats?.recentes ?? [];

  return (
    <Page>
      <CadreModule module={MODULE}>
        <BandeauModule
          module={MODULE}
          titre="Infirmerie"
          phrase={
            <>
              {pluriel(ceMois, "consultation réalisée", "consultations réalisées")} depuis le début du
              mois.
              {urgences > 0 && (
                <>
                  {" "}
                  <strong className="font-medium text-warning">
                    {pluriel(urgences, "urgence", "urgences")}
                  </strong>{" "}
                  sur les sept derniers jours.
                </>
              )}
              {enRetard > 0 && (
                <>
                  {" "}
                  <strong className="font-medium text-danger">
                    {pluriel(enRetard, "suivi en retard", "suivis en retard")}
                  </strong>{" "}
                  à honorer.
                </>
              )}
            </>
          }
          actions={
            <>
              <ButtonLink href="/sante/suivi-medical" icone="sante">
                Historique
              </ButtonLink>
              <ButtonLink
                href="/sante/suivi-medical"
                variante="primaire"
                icone="plus"
                transitionTypes={["nav-forward"]}
              >
                Nouvelle consultation
              </ButtonLink>
            </>
          }
        >
          <RangeeChiffres>
            <Chiffre
              index={0}
              label="Ce mois-ci"
              valeur={ceMois}
              part={total > 0 ? ceMois / total : 0}
              aide="Depuis le 1er du mois"
              href="/sante/suivi-medical"
            />
            <Chiffre
              index={1}
              label="Urgences (7 j)"
              valeur={urgences}
              part={ceMois > 0 ? urgences / Math.max(ceMois, 1) : 0}
              ton={urgences > 0 ? "attention" : "positif"}
              aide={urgences > 0 ? "À surveiller" : "Aucune urgence récente"}
            />
            <Chiffre
              index={2}
              label="Suivis à honorer"
              valeur={aHonorer.length}
              part={total > 0 ? aHonorer.length / total : 0}
              ton={enRetard > 0 ? "critique" : "teinte"}
              aide={enRetard > 0 ? `${formatNombre(enRetard)} déjà dépassés` : "Rendez-vous à venir"}
            />
            <Chiffre
              index={3}
              label="Consultations"
              valeur={total}
              part={1}
              aide="Total enregistré"
            />
          </RangeeChiffres>
        </BandeauModule>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Bloc
            titre="Activité de l’infirmerie"
            sousTitre={`Consultations des ${JOURS_TRACES} derniers jours`}
            icone="pulse"
          >
            <Impulsions
              points={serie}
              legende={`Consultations réalisées sur les ${JOURS_TRACES} derniers jours`}
            />
          </Bloc>

          <Bloc titre="Nature des consultations" sousTitre="Sur l’ensemble des dossiers" icone="sante">
            {parType.length === 0 ? (
              <p className="py-4 text-sm text-muted">Aucune consultation enregistrée.</p>
            ) : (
              <ListeBarres>
                {parType.map(([type, n], i) => (
                  <Barre
                    key={type}
                    index={i}
                    label={type}
                    valeur={n}
                    total={total}
                    couleur={type === "Urgence" ? "var(--sgp-danger)" : undefined}
                    href={`/sante/suivi-medical?type=${encodeURIComponent(type)}`}
                  />
                ))}
              </ListeBarres>
            )}
          </Bloc>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Bloc
            titre="Suivis à honorer"
            sousTitre="Rendez-vous programmés, les plus urgents d’abord"
            icone="calendar"
            flush
          >
            {aHonorer.length === 0 ? (
              <RienASignaler texte="Aucun suivi n’est programmé pour le moment." />
            ) : (
              <ListeActions>
                {aHonorer.slice(0, 5).map(({ suivi, jours }, i) => (
                  <LigneAction
                    key={suivi.id}
                    index={i}
                    repere={Math.abs(jours)}
                    uniteRepere={jours < 0 ? "j de retard" : jours > 1 ? "jours" : "jour"}
                    ton={jours < 0 ? "critique" : jours <= 2 ? "attention" : "teinte"}
                    titre={suivi.detenuNom}
                    detail={`${suivi.numeroEcrou} · ${tronquer(suivi.diagnostic, 30)} · ${formatDate(suivi.dateSuivi)}`}
                    href={`/detenus/${suivi.detenuId}?onglet=sante`}
                  />
                ))}
              </ListeActions>
            )}
          </Bloc>

          <Bloc titre="Dernières consultations" sousTitre="Les plus récentes" icone="file" flush>
            {recentes.length === 0 ? (
              <RienASignaler texte="Aucune consultation enregistrée." />
            ) : (
              <ListeActions>
                {recentes.map((s, i) => (
                  <LigneAction
                    key={s.id}
                    index={i}
                    repere={formatDate(s.dateConsultation).slice(0, 5)}
                    ton={s.typeConsultation === "Urgence" ? "critique" : "teinte"}
                    titre={s.detenuNom}
                    detail={`${s.typeConsultation} · ${tronquer(s.diagnostic, 34)}`}
                    href={`/detenus/${s.detenuId}?onglet=sante`}
                  />
                ))}
              </ListeActions>
            )}
          </Bloc>
        </div>

        <Raccourcis
          liens={[
            { href: "/sante/suivi-medical", label: "Consultations", aide: "Historique et saisie", icone: "sante" },
            { href: "/sante/suivi-medical?type=Urgence", label: "Urgences", aide: "Filtrer les urgences", icone: "alert" },
            { href: "/detenus", label: "Registre des détenus", aide: "Retrouver un dossier", icone: "detenus" },
          ]}
        />
      </CadreModule>
    </Page>
  );
}
