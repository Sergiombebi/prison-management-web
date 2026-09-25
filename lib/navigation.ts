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
 *
 * Les libellés dépendent de la langue : `construireModules()` prend le
 * dictionnaire de messages en paramètre plutôt qu'une constante figée à
 * l'import, pour rester correct quelle que soit la locale de la requête.
 */

import type { Messages } from "@/lib/i18n/fr";
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

/** Les modules métier et transverses affichés dans la sidebar, dans la langue de `t`. */
export function construireModules(t: Messages): ModuleNav[] {
  const nav = t.navigation;

  return [
    {
      id: "tableau-de-bord",
      href: "/tableau-de-bord",
      label: t.modules.tableauDeBord,
      icone: "dashboard",
      description: nav.tableauDeBord.description,
      racines: ["/tableau-de-bord"],
      permissionRequise: "tableau_bord.consulter",
    },
    {
      id: "detenus",
      href: moduleMetier("detenus").accueil,
      label: t.modules.detenus,
      icone: "detenus",
      description: nav.detenus.description,
      racines: ["/detenus"],
      permissionRequise: moduleMetier("detenus").permissions,
      groupes: [
        {
          label: nav.detenus.groupeFichiers,
          liens: [
            { href: "/detenus/apercu", ...nav.detenus.apercu },
            { href: "/detenus", ...nav.detenus.liste },
            { href: "/detenus/nouveau", ...nav.detenus.nouveau },
          ],
        },
        {
          label: nav.detenus.groupeMandats,
          liens: [
            { href: "/detenus/mandats", ...nav.detenus.tousLesMandats },
            { href: "/detenus/mandats/prevenus", ...nav.detenus.prevenus },
            { href: "/detenus/mandats/condamnes", ...nav.detenus.condamnes },
            { href: "/detenus/mandats/appellants", ...nav.detenus.appellants },
            { href: "/detenus/mandats/cassationnaires", ...nav.detenus.cassationnaires },
            { href: "/detenus/mandats/dpac", ...nav.detenus.dpac },
          ],
        },
        {
          label: nav.detenus.groupeLiberation,
          liens: [
            { href: "/detenus/liberation/normale", ...nav.detenus.liberationNormale },
            { href: "/detenus/liberation/transfert", ...nav.detenus.transfert },
            { href: "/detenus/liberation/evasion", ...nav.detenus.evasion },
            { href: "/detenus/liberation/deces", ...nav.detenus.deces },
          ],
        },
      ],
    },
    {
      id: "discipline",
      href: moduleMetier("discipline").accueil,
      label: t.modules.discipline,
      icone: "discipline",
      description: nav.discipline.description,
      racines: ["/discipline"],
      permissionRequise: moduleMetier("discipline").permissions,
      groupes: [
        {
          label: nav.discipline.groupe,
          liens: [
            { href: "/discipline", ...nav.discipline.apercu },
            { href: "/discipline/cellules", ...nav.discipline.cellules },
            { href: "/discipline/affectations", ...nav.discipline.affectations },
            { href: "/discipline/sanctions", ...nav.discipline.sanctions },
          ],
        },
      ],
    },
    {
      id: "suivi-medical",
      href: moduleMetier("sante").accueil,
      label: t.modules.suiviMedical,
      icone: "sante",
      description: nav.suiviMedical.description,
      racines: ["/sante/suivi-medical", "/sante/evacuations", "/sante/traitements"],
      permissionRequise: moduleMetier("sante").permissions,
      groupes: [
        {
          label: nav.suiviMedical.groupe,
          liens: [
            { href: "/sante/suivi-medical/apercu", ...nav.suiviMedical.apercu },
            { href: "/sante/suivi-medical", ...nav.suiviMedical.consultations },
            { href: "/sante/traitements", ...nav.suiviMedical.traitements },
            { href: "/sante/evacuations", ...nav.suiviMedical.evacuations },
          ],
        },
      ],
    },
    {
      id: "visites",
      href: moduleMetier("visites").accueil,
      label: t.modules.visites,
      icone: "door",
      description: nav.visites.description,
      racines: ["/sante/visites"],
      permissionRequise: moduleMetier("visites").permissions,
      groupes: [
        {
          label: nav.visites.groupe,
          liens: [
            { href: "/sante/visites/apercu", ...nav.visites.apercu },
            { href: "/sante/visites", ...nav.visites.registre },
          ],
        },
      ],
    },
    {
      id: "etats",
      href: "/etats/fiches-avis",
      label: t.modules.etats,
      icone: "etats",
      description: nav.etats.description,
      racines: ["/etats"],
      permissionRequise: "etats.consulter",
      groupes: [
        {
          label: nav.etats.groupe,
          liens: [
            { href: "/etats/fiches-avis", ...nav.etats.fichesAvis },
            { href: "/etats/categories", ...nav.etats.categories },
            { href: "/etats/mandats-expires", ...nav.etats.mandatsExpires },
            { href: "/etats/remises-de-peine", ...nav.etats.remisesDePeine },
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
      description: nav.administration.description,
      racines: ["/administration"],
      permissionRequise: ["administration.personnel.gerer", "administration.parametres.gerer"],
      groupes: [
        {
          label: nav.administration.groupe,
          liens: [
            { href: "/administration/personnel", ...nav.administration.personnel },
            { href: "/administration/parametres", ...nav.administration.parametres },
          ],
        },
      ],
    },
  ];
}

/**
 * Hall d'accueil des comptes qui ont plusieurs modules sans être administrateurs.
 *
 * Hors de `construireModules()` à dessein : il n'exige aucune permission, et il ne doit
 * apparaître dans la sidebar que lorsque le tableau de bord n'y est pas — jamais
 * les deux, qui seraient deux « accueils » concurrents.
 */
export function construireModuleAccueil(t: Messages): ModuleNav {
  return {
    id: "accueil",
    href: "/accueil",
    label: t.navigation.accueil.label,
    icone: "dashboard",
    description: t.navigation.accueil.description,
    racines: ["/accueil"],
    permissionRequise: [],
  };
}

/** Refus d'accès : absent de la sidebar, mais nommé dans le fil d'Ariane. */
export function construireModuleAccesRefuse(t: Messages): ModuleNav {
  return {
    id: "acces-refuse",
    href: "/acces-refuse",
    label: t.navigation.accesRefuse.label,
    icone: "administration",
    description: t.navigation.accesRefuse.description,
    racines: ["/acces-refuse"],
    permissionRequise: [],
  };
}

/** Un module s'affiche dès que l'une de ses permissions requises est accordée. */
export function peutVoirModule(permissions: string[], module: ModuleNav): boolean {
  const requises = Array.isArray(module.permissionRequise)
    ? module.permissionRequise
    : [module.permissionRequise];
  return requises.some((cle) => permissions.includes(cle));
}

/**
 * Le module auquel appartient un chemin. `modules` doit inclure les modules de
 * `construireModules()` et, si pertinent pour l'écran appelant, l'accueil et le
 * refus d'accès — ces deux derniers sont traités à part de la sidebar (voir
 * plus haut) mais doivent rester trouvables pour que le fil d'Ariane les nomme.
 */
export function moduleDe(pathname: string, modules: ModuleNav[]): ModuleNav | undefined {
  return modules.find((m) => m.racines.some((r) => pathname === r || pathname.startsWith(`${r}/`)));
}

/** Le lien de sous-navigation correspondant le plus précisément au chemin. */
export function lienActif(pathname: string, modules: ModuleNav[]): LienNav | undefined {
  const tousLesLiens = modules.flatMap((m) => (m.groupes ?? []).flatMap((g) => g.liens));
  return tousLesLiens
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export interface Miette {
  label: string;
  href?: string;
}

/** Fil d'Ariane : module → groupe → écran courant. */
export function filAriane(pathname: string, modules: ModuleNav[]): Miette[] {
  const mod = moduleDe(pathname, modules);
  if (!mod) return [];

  const miettes: Miette[] = [{ label: mod.label, href: mod.href }];
  if (!mod.groupes) return miettes;

  const lien = lienActif(pathname, modules);
  if (!lien) return miettes;

  const groupe = mod.groupes.find((g) => g.liens.includes(lien));
  if (groupe && mod.groupes.length > 1) miettes.push({ label: groupe.label });

  if (lien.href !== mod.href) miettes.push({ label: lien.label, href: lien.href });

  return miettes;
}
