import { describe, expect, it } from "vitest";
import {
  ACCUEIL,
  aAcces,
  exigenceDe,
  libelleExigence,
  memesPermissions,
  pageDArrivee,
} from "@/lib/acces";
import {
  CLES_MODULES,
  MODULES_METIER,
  PERMISSION_SOCLE,
  TOUTES_PERMISSIONS,
  aLeModule,
  estAdministrateur,
  moduleMetier,
  modulesAccordes,
  permissionsPourAcces,
  roleImplicite,
  type CleModule,
} from "@/lib/domain/modules";
import { permissionsDuCookie } from "@/lib/session-cookies";
import { MODULES, peutVoirModule } from "@/lib/navigation";
import { PERMISSIONS } from "@/lib/domain/referentiels";

/*
 * Habilitation par module.
 *
 * L'administrateur n'attribue plus un rôle mais l'accès à un ou plusieurs modules
 * métier. Ces cas figent les deux propriétés dont tout le reste dépend : une
 * sélection de modules se retrouve intacte après un aller-retour par l'API, et
 * aucun écran visible ne mène à un refus.
 */

const AGENT_REGISTRE = permissionsPourAcces(["detenus"], false);
const SURVEILLANT = permissionsPourAcces(["discipline", "visites"], false);
const MEDECIN = permissionsPourAcces(["sante"], false);
const ADMIN = permissionsPourAcces([], true);

describe("permissionsPourAcces", () => {
  it("ouvre tout le module, pas une partie", () => {
    for (const p of moduleMetier("discipline").permissions) {
      expect(SURVEILLANT).toContain(p);
    }
  });

  it("ajoute le socle de lecture du registre à tout module", () => {
    // Sans lui, le sélecteur de détenus des formulaires reste vide : c'est la
    // dépendance croisée qui faisait tomber l'écran Suivi médical sur un 403.
    expect(MEDECIN).toContain(PERMISSION_SOCLE);
    expect(SURVEILLANT).toContain(PERMISSION_SOCLE);
  });

  it("n’ouvre rien de plus que les modules demandés", () => {
    expect(MEDECIN).not.toContain("visites.consulter");
    expect(MEDECIN).not.toContain("discipline.cellules.consulter");
    expect(SURVEILLANT).not.toContain("sante.consultations.consulter");
    // Les rubriques transverses ne s'attribuent pas module par module.
    expect(SURVEILLANT).not.toContain("tableau_bord.consulter");
    expect(SURVEILLANT).not.toContain("etats.consulter");
    expect(SURVEILLANT).not.toContain("administration.personnel.gerer");
  });

  it("donne tout à l’administrateur, y compris les rubriques transverses", () => {
    expect(ADMIN).toEqual(TOUTES_PERMISSIONS);
    expect(ADMIN).toContain("tableau_bord.consulter");
    expect(ADMIN).toContain("etats.consulter");
    expect(ADMIN).toContain("administration.parametres.gerer");
  });

  it("ne donne rien du tout quand aucun module n’est coché", () => {
    expect(permissionsPourAcces([], false)).toEqual([]);
  });

  it("produit une liste stable, indépendante de l’ordre de sélection", () => {
    // Deux enregistrements identiques doivent donner la même liste, sinon le layout
    // croit à un changement de droits et force une reconnexion.
    expect(permissionsPourAcces(["visites", "discipline"], false)).toEqual(
      permissionsPourAcces(["discipline", "visites"], false),
    );
  });

  it("ne produit que des permissions du catalogue de l’API", () => {
    const catalogue = PERMISSIONS.flatMap((g) => g.permissions.map((p) => p.cle));
    for (const cle of TOUTES_PERMISSIONS) expect(catalogue).toContain(cle);
  });
});

describe("modulesAccordes", () => {
  it("retrouve exactement la sélection enregistrée", () => {
    // La propriété qui compte : cocher, enregistrer, rouvrir la fiche.
    for (const combinaison of [
      ["detenus"],
      ["sante"],
      ["discipline", "visites"],
      ["detenus", "discipline", "sante", "visites"],
    ] as CleModule[][]) {
      expect(modulesAccordes(permissionsPourAcces(combinaison, false))).toEqual(
        CLES_MODULES.filter((c) => combinaison.includes(c)),
      );
    }
  });

  it("ne confond pas le socle avec le module Détenus", () => {
    // Un médecin détient `detenus.consulter` sans avoir le module : sinon le
    // registre s'afficherait dans sa sidebar.
    expect(MEDECIN).toContain(PERMISSION_SOCLE);
    expect(aLeModule(MEDECIN, "detenus")).toBe(false);
    expect(modulesAccordes(MEDECIN)).toEqual(["sante"]);
  });

  it("reconnaît un compte ancien qui ne détient qu’une partie d’un module", () => {
    expect(modulesAccordes(["discipline.sanctions.consulter"])).toEqual(["discipline"]);
  });

  it("donne les quatre modules à l’administrateur", () => {
    expect(modulesAccordes(ADMIN)).toEqual(CLES_MODULES);
  });
});

describe("estAdministrateur", () => {
  it("ne se déduit d’aucun module métier", () => {
    expect(estAdministrateur(AGENT_REGISTRE)).toBe(false);
    expect(estAdministrateur(SURVEILLANT)).toBe(false);
    expect(estAdministrateur(ADMIN)).toBe(true);
  });
});

describe("roleImplicite", () => {
  it("déduit pour l’API un rôle que l’interface ne demande plus", () => {
    expect(roleImplicite([], true)).toBe("admin");
    expect(roleImplicite(["sante"], false)).toBe("medecin");
    expect(roleImplicite(["detenus"], false)).toBe("agent");
    expect(roleImplicite(["sante", "visites"], false)).toBe("agent");
    expect(roleImplicite([], false)).toBe("agent");
  });
});

describe("exigenceDe", () => {
  it("laisse ouverts les écrans sans exigence propre", () => {
    expect(exigenceDe("/accueil")).toBeNull();
    expect(exigenceDe("/profil")).toBeNull();
    expect(exigenceDe("/acces-refuse")).toBeNull();
  });

  it("rattache un écran et tous ses sous-écrans au même module", () => {
    // Un module s'accorde en bloc : ses écrans ouvrent ensemble ou pas du tout.
    for (const chemin of [
      "/detenus",
      "/detenus/42",
      "/detenus/apercu",
      "/detenus/nouveau",
      "/detenus/42/modifier",
      "/detenus/42/mandats/7",
      "/detenus/liberation/evasion",
      "/detenus/mandats/prevenus",
    ]) {
      expect([chemin, exigenceDe(chemin)]).toEqual([chemin, "detenus"]);
    }
    expect(exigenceDe("/discipline")).toBe("discipline");
    expect(exigenceDe("/discipline/sanctions/types")).toBe("discipline");
    expect(exigenceDe("/sante/suivi-medical/apercu")).toBe("sante");
    expect(exigenceDe("/sante/visites/12")).toBe("visites");
  });

  it("réserve les rubriques transverses", () => {
    expect(exigenceDe("/tableau-de-bord")).toBe("tableau-de-bord");
    expect(exigenceDe("/etats/fiches-avis")).toBe("etats");
    expect(exigenceDe("/administration/personnel")).toBe("administration");
  });

  it("ne déborde pas sur un chemin qui partage seulement le début du segment", () => {
    expect(exigenceDe("/detenus-archives")).toBeNull();
  });

  it("ne confond pas les deux modules sous /sante", () => {
    expect(exigenceDe("/sante/suivi-medical")).toBe("sante");
    expect(exigenceDe("/sante/visites")).toBe("visites");
  });
});

describe("aAcces", () => {
  it("ouvre tout le module à qui l’a reçu", () => {
    expect(aAcces(AGENT_REGISTRE, "/detenus")).toBe(true);
    expect(aAcces(AGENT_REGISTRE, "/detenus/nouveau")).toBe(true);
    expect(aAcces(AGENT_REGISTRE, "/detenus/liberation/evasion")).toBe(true);
    expect(aAcces(SURVEILLANT, "/discipline/sanctions")).toBe(true);
    expect(aAcces(SURVEILLANT, "/sante/visites/3")).toBe(true);
    expect(aAcces(MEDECIN, "/sante/suivi-medical/apercu")).toBe(true);
  });

  it("ferme ce qui n’a pas été accordé", () => {
    expect(aAcces(MEDECIN, "/detenus")).toBe(false);
    expect(aAcces(MEDECIN, "/sante/visites")).toBe(false);
    expect(aAcces(AGENT_REGISTRE, "/discipline")).toBe(false);
    expect(aAcces(SURVEILLANT, "/sante/suivi-medical")).toBe(false);
  });

  it("réserve les trois rubriques transverses à l’administrateur", () => {
    for (const profil of [AGENT_REGISTRE, SURVEILLANT, MEDECIN]) {
      expect(aAcces(profil, "/tableau-de-bord")).toBe(false);
      expect(aAcces(profil, "/etats/fiches-avis")).toBe(false);
      expect(aAcces(profil, "/administration/personnel")).toBe(false);
    }
    expect(aAcces(ADMIN, "/tableau-de-bord")).toBe(true);
    expect(aAcces(ADMIN, "/etats/fiches-avis")).toBe(true);
    expect(aAcces(ADMIN, "/administration/parametres")).toBe(true);
  });

  it("laisse l’accueil et le profil ouverts, même sans aucun accès", () => {
    expect(aAcces([], "/accueil")).toBe(true);
    expect(aAcces([], "/profil")).toBe(true);
    expect(aAcces([], "/acces-refuse")).toBe(true);
  });

  it("ignore la chaîne de requête", () => {
    expect(aAcces(AGENT_REGISTRE, "/detenus?recherche=KAMGA")).toBe(true);
    expect(aAcces(MEDECIN, "/tableau-de-bord?onglet=stats")).toBe(false);
  });
});

describe("pageDArrivee", () => {
  it("mène au tableau de bord complet pour l’administrateur", () => {
    expect(pageDArrivee(ADMIN)).toBe("/tableau-de-bord");
  });

  it("mène droit au module quand il n’y en a qu’un", () => {
    expect(pageDArrivee(MEDECIN)).toBe(moduleMetier("sante").accueil);
    expect(pageDArrivee(AGENT_REGISTRE)).toBe(moduleMetier("detenus").accueil);
  });

  it("passe par le hall quand il y en a plusieurs, ou aucun", () => {
    expect(pageDArrivee(SURVEILLANT)).toBe(ACCUEIL);
    expect(pageDArrivee([])).toBe(ACCUEIL);
    expect(pageDArrivee(null)).toBe(ACCUEIL);
  });

  it("ne mène jamais vers un écran interdit", () => {
    for (const profil of [AGENT_REGISTRE, SURVEILLANT, MEDECIN, ADMIN, []]) {
      expect(aAcces(profil, pageDArrivee(profil))).toBe(true);
    }
  });
});

describe("libelleExigence", () => {
  it("nomme un module dans les mots de l’utilisateur, pas en clés techniques", () => {
    expect(libelleExigence("detenus")).toContain("Gestion des détenus");
    expect(libelleExigence("administration")).toContain("administration");
  });
});

describe("cohérence avec la navigation", () => {
  it("n’affiche jamais un module que l’on ne pourrait pas ouvrir", () => {
    for (const profil of [AGENT_REGISTRE, SURVEILLANT, MEDECIN, ADMIN, []]) {
      for (const mod of MODULES) {
        if (peutVoirModule(profil, mod)) {
          expect([mod.id, aAcces(profil, mod.href)]).toEqual([mod.id, true]);
        }
      }
    }
  });

  it("chaque lien de sous-navigation d’un module visible est ouvrable", () => {
    for (const profil of [AGENT_REGISTRE, SURVEILLANT, MEDECIN, ADMIN]) {
      for (const mod of MODULES) {
        if (!peutVoirModule(profil, mod)) continue;
        for (const groupe of mod.groupes ?? []) {
          for (const lien of groupe.liens) {
            expect([lien.href, aAcces(profil, lien.href)]).toEqual([lien.href, true]);
          }
        }
      }
    }
  });

  it("chaque module métier a un sous-tableau de bord et un écran de travail distincts", () => {
    for (const m of MODULES_METIER) {
      expect(m.accueil).not.toBe(m.travail);
      expect(exigenceDe(m.accueil)).toBe(m.cle);
      expect(exigenceDe(m.travail)).toBe(m.cle);
    }
  });
});

describe("memesPermissions", () => {
  it("ne dépend pas de l’ordre", () => {
    expect(memesPermissions(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("repère un droit ajouté ou retiré", () => {
    expect(memesPermissions(["a", "b"], ["a"])).toBe(false);
    expect(memesPermissions(["a"], ["a", "b"])).toBe(false);
    expect(memesPermissions([], [])).toBe(true);
  });
});

describe("permissionsDuCookie", () => {
  it("lit les permissions d’un cookie de profil valide", () => {
    expect(
      permissionsDuCookie(JSON.stringify({ id: 1, permissions: ["detenus.consulter"] })),
    ).toEqual(["detenus.consulter"]);
  });

  it("répond « je ne sais pas » plutôt que « aucun droit » sur un cookie inutilisable", () => {
    // Renvoyer [] ferait bloquer le proxy sur tous les écrans, connexion comprise.
    expect(permissionsDuCookie(undefined)).toBeNull();
    expect(permissionsDuCookie("pas du json")).toBeNull();
    expect(permissionsDuCookie(JSON.stringify({ id: 1 }))).toBeNull();
  });

  it("distingue un compte sans aucun accès d’un cookie illisible", () => {
    expect(permissionsDuCookie(JSON.stringify({ id: 1, permissions: [] }))).toEqual([]);
  });
});
