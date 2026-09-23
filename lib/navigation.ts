/**
 * Arborescence de navigation.
 *
 * Seule source de vérité pour la sidebar, le fil d'Ariane et les titres de page :
 * ajouter une route ici la fait apparaître partout.
 *
 * Les quatre modules métier tirent leur habilitation de `lib/domain/modules.ts` —
 * on ne redit pas ici quelles permissions les composent. Les trois rubriques
 * transverses (tableau de bord général, édition d'états, administration) ne
 * s'attribuent pas : seul l'administrateur les détient, et leurs permissions
 * suffisent à les filtrer.
 */

import { t } from "@/lib/i18n/fr";
import { moduleMetier } from "@/lib/domain/modules";

export type IconName =
  | "dashboard"
  | "detenus"
  | "discipline"
  | "sante"
  | "door"
  | "etats"
  | "administration";

export interface LienNav {
  href: string;
  label: string;
  /** Phrase affichée sous le titre de page. */
  description?: string;
}

export interface GroupeNav {
  label: string;
  liens: LienNav[];
}

export interface ModuleNav {
  id: string;
  /** Où mène le module : son sous-tableau de bord pour les quatre modules métier. */
  href: string;
  label: string;
  icone: IconName;
  description: string;
  /**
   * Chemins que ce module couvre. Explicite, et non deviné depuis `href` : deux
   * modules distincts partagent le préfixe /sante, et le sous-tableau de bord d'un
   * module n'est pas la racine de ses écrans.
   */
  racines: string[];
  /** Sous-navigation affichée dans le module, en onglets ou en sections. */
  groupes?: GroupeNav[];
  /** `true` pour la section « Administration » de la sidebar. */
  administratif?: boolean;
  /**
   * Permission(s) requises pour voir ce module dans la navigation — un tableau se
   * lit comme un « ou ». Pour un module métier, c'est l'ensemble de ses droits
   * propres : en détenir un, c'est avoir le module.
   */
  permissionRequise: string | string[];
}

export const MODULES: ModuleNav[] = [
  {
    id: "tableau-de-bord",
    href: "/tableau-de-bord",
    label: t.modules.tableauDeBord,
    icone: "dashboard",
    description: "Situation de l'établissement au jour d'aujourd'hui",
    racines: ["/tableau-de-bord"],
    permissionRequise: "tableau_bord.consulter",
  },
  {
    id: "detenus",
    href: moduleMetier("detenus").accueil,
    label: t.modules.detenus,
    icone: "detenus",
    description: "Écrou, mandats et procédures de sortie",
    racines: ["/detenus"],
    permissionRequise: moduleMetier("detenus").permissions,
    groupes: [
      {
        label: "Fichiers des détenus",
        liens: [
          {
            href: "/detenus/apercu",
            label: "Vue d’ensemble",
            description: "Situation du registre d'écrou aujourd'hui",
          },
          {
            href: "/detenus",
            label: "Liste des détenus",
            description: "Registre d'écrou de l'établissement",
          },
          {
            href: "/detenus/nouveau",
            label: "Nouvel enregistrement",
            description: "Fiche d'enregistrement d'un détenu entrant",
          },
        ],
      },
      {
        label: "Gestion des mandats",
        liens: [
          {
            href: "/detenus/mandats",
            label: "Tous les mandats",
            description: "Mandats de dépôt, gardes à vue et arrêtés",
          },
          {
            href: "/detenus/mandats/prevenus",
            label: "Prévenus",
            description: "Détenus dont tous les mandats actifs sont provisoires",
          },
          {
            href: "/detenus/mandats/condamnes",
            label: "Condamnés",
            description: "Détenus avec un unique mandat d'exécution de peine",
          },
          {
            href: "/detenus/mandats/appellants",
            label: "Appellants",
            description: "Détenus dont une décision est frappée d'appel",
          },
          {
            href: "/detenus/mandats/cassationnaires",
            label: "Cassationnaires",
            description: "Détenus ayant formé un pourvoi en cassation",
          },
          {
            href: "/detenus/mandats/dpac",
            label: "DPAC",
            description:
              "Détenus cumulant plusieurs mandats actifs dont une exécution de peine",
          },
        ],
      },
      {
        label: "Libération",
        liens: [
          {
            href: "/detenus/liberation/normale",
            label: "Libération normale",
            description: "Levée d'écrou à l'expiration du titre de détention",
          },
          {
            href: "/detenus/liberation/transfert",
            label: "Transfert",
            description: "Transfèrement vers un autre établissement",
          },
          {
            href: "/detenus/liberation/evasion",
            label: "Évasion",
            description: "Constat d'évasion et avis aux autorités ampliataires",
          },
          {
            href: "/detenus/liberation/deces",
            label: "Décès",
            description: "Constat de décès en détention",
          },
        ],
      },
    ],
  },
  {
    id: "discipline",
    href: moduleMetier("discipline").accueil,
    label: t.modules.discipline,
    icone: "discipline",
    description: "Logement, affectations et sanctions disciplinaires",
    racines: ["/discipline"],
    permissionRequise: moduleMetier("discipline").permissions,
    groupes: [
      {
        label: "Discipline",
        liens: [
          {
            href: "/discipline",
            label: "Vue d’ensemble",
            description: "Occupation des cellules et mesures en cours",
          },
          {
            href: "/discipline/cellules",
            label: "Logement & cellules",
            description: "Capacités, effectifs et taux d'occupation par cellule",
          },
          {
            href: "/discipline/affectations",
            label: "Affectations",
            description: "Attribution des détenus aux cellules",
          },
          {
            href: "/discipline/sanctions",
            label: "Sanctions",
            description: "Fautes constatées et sanctions prononcées",
          },
        ],
      },
    ],
  },
  {
    id: "suivi-medical",
    href: moduleMetier("sante").accueil,
    label: t.modules.suiviMedical,
    icone: "sante",
    description: "Consultations, diagnostics et traitements prescrits",
    racines: ["/sante/suivi-medical", "/sante/evacuations", "/sante/traitements"],
    permissionRequise: moduleMetier("sante").permissions,
    groupes: [
      {
        label: "Suivi médical",
        liens: [
          {
            href: "/sante/suivi-medical/apercu",
            label: "Vue d’ensemble",
            description: "Activité de l'infirmerie aujourd'hui",
          },
          {
            href: "/sante/suivi-medical",
            label: "Consultations",
            description: "Historique des consultations",
          },
          {
            href: "/sante/traitements",
            label: "Traitements",
            description: "Prescriptions en cours, terminées et arrêtées",
          },
          {
            href: "/sante/evacuations",
            label: "Évacuations sanitaires",
            description: "Détenus évacués vers une structure hospitalière extérieure",
          },
        ],
      },
    ],
  },
  {
    id: "visites",
    href: moduleMetier("visites").accueil,
    label: t.modules.visites,
    icone: "door",
    description: "Parloirs, visiteurs et contrôles de sécurité",
    racines: ["/sante/visites"],
    permissionRequise: moduleMetier("visites").permissions,
    groupes: [
      {
        label: "Visites",
        liens: [
          {
            href: "/sante/visites/apercu",
            label: "Vue d’ensemble",
            description: "Parloirs du jour et affluence de la semaine",
          },
          {
            href: "/sante/visites",
            label: "Registre des visites",
            description: "Toutes les visites enregistrées",
          },
        ],
      },
    ],
  },
  {
    id: "etats",
    href: "/etats/fiches-avis",
    label: t.modules.etats,
    icone: "etats",
    description: "Fiches, extraits de registre et états statistiques",
    racines: ["/etats"],
    permissionRequise: "etats.consulter",
    groupes: [
      {
        label: "Édition d'états",
        liens: [
          {
            href: "/etats/fiches-avis",
            label: "Fiches & avis divers",
            description: "Fiche signalétique, extrait de registre, attestations",
          },
          {
            href: "/etats/categories",
            label: "Dossier par catégorie",
            description: "État nominatif par catégorie pénale",
          },
          {
            href: "/etats/mandats-expires",
            label: "Mandats expirés",
            description: "Titres de détention dont la validité est dépassée",
          },
          {
            href: "/etats/remises-de-peine",
            label: "Remises de peine",
            description: "Réductions de peine accordées",
          },
        ],
      },
    ],
  },
  {
    id: "administration",
    href: "/administration/personnel",
    label: t.modules.administration,
    icone: "administration",
    administratif: true,
    description: "Comptes du personnel et paramètres de l'établissement",
    racines: ["/administration"],
    permissionRequise: ["administration.personnel.gerer", "administration.parametres.gerer"],
    groupes: [
      {
        label: "Administration",
        liens: [
          {
            href: "/administration/personnel",
            label: "Personnel",
            description: "Comptes utilisateurs et accès aux modules",
          },
          {
            href: "/administration/parametres",
            label: "Paramètres",
            description:
              "En-têtes des états, logo, âge de majorité, autorités ampliataires",
          },
        ],
      },
    ],
  },
];

export const MODULES_PRINCIPAUX = MODULES.filter((m) => !m.administratif);
export const MODULES_ADMIN = MODULES.filter((m) => m.administratif);

/**
 * Hall d'accueil des comptes qui ont plusieurs modules sans être administrateurs.
 *
 * Hors de `MODULES` à dessein : il n'exige aucune permission, et il ne doit
 * apparaître dans la sidebar que lorsque le tableau de bord n'y est pas — jamais
 * les deux, qui seraient deux « accueils » concurrents.
 */
export const MODULE_ACCUEIL: ModuleNav = {
  id: "accueil",
  href: "/accueil",
  label: "Accueil",
  icone: "dashboard",
  description: "Vos modules et vos indicateurs du jour",
  racines: ["/accueil"],
  permissionRequise: [],
};

/** Refus d'accès : absent de la sidebar, mais nommé dans le fil d'Ariane. */
export const MODULE_ACCES_REFUSE: ModuleNav = {
  id: "acces-refuse",
  href: "/acces-refuse",
  label: "Accès refusé",
  icone: "administration",
  description: "Accès manquant pour l'écran demandé",
  racines: ["/acces-refuse"],
  permissionRequise: [],
};

/** Un module s'affiche dès que l'une de ses permissions requises est accordée. */
export function peutVoirModule(permissions: string[], module: ModuleNav): boolean {
  const requises = Array.isArray(module.permissionRequise)
    ? module.permissionRequise
    : [module.permissionRequise];
  return requises.some((cle) => permissions.includes(cle));
}

/** Tous les liens à plat — utilisé pour retrouver le titre d'une route. */
const TOUS_LES_LIENS: LienNav[] = MODULES.flatMap((m) =>
  (m.groupes ?? []).flatMap((g) => g.liens),
);

/** Le module auquel appartient un chemin. */
export function moduleDe(pathname: string): ModuleNav | undefined {
  const couvre = (m: ModuleNav) =>
    m.racines.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  // Écrans sans permission propre : absents de MODULES, donc traités à part pour
  // que le fil d'Ariane les nomme au lieu de rester vide.
  return [MODULE_ACCUEIL, MODULE_ACCES_REFUSE].find(couvre) ?? MODULES.find(couvre);
}

/** Le lien de sous-navigation correspondant le plus précisément au chemin. */
export function lienActif(pathname: string): LienNav | undefined {
  return TOUS_LES_LIENS.filter(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}

export interface Miette {
  label: string;
  href?: string;
}

/** Fil d'Ariane : module → groupe → écran courant. */
export function filAriane(pathname: string): Miette[] {
  const mod = moduleDe(pathname);
  if (!mod) return [];

  const miettes: Miette[] = [{ label: mod.label, href: mod.href }];
  if (!mod.groupes) return miettes;

  const lien = lienActif(pathname);
  if (!lien) return miettes;

  const groupe = mod.groupes.find((g) => g.liens.includes(lien));
  if (groupe && mod.groupes.length > 1) miettes.push({ label: groupe.label });

  if (lien.href !== mod.href) miettes.push({ label: lien.label, href: lien.href });

  return miettes;
}
