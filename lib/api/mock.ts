/**
 * Adaptateur MOCK — répond depuis les fixtures, avec une latence simulée pour que
 * les états de chargement soient réellement visibles pendant le développement.
 */

import "server-only";

import type {
  CategoriePenale,
  DetenuResume,
  FiltreDetenus,
  TableauDeBord,
} from "@/lib/domain/types";
import { LIBELLE_CATEGORIE } from "@/lib/domain/referentiels";
import {
  ApiErreur,
  type ApiClient,
  type MandatDetaille,
} from "./contract";
import * as fx from "./fixtures";
import { getProfil } from "@/lib/session";

const LATENCE_MS = Number(process.env.SGP_MOCK_LATENCE_MS ?? 250);

const attendre = () =>
  new Promise<void>((r) => setTimeout(r, LATENCE_MS + Math.random() * 120));

function resumer(detenuId: number): DetenuResume {
  const d = fx.detenus.find((x) => x.id === detenuId)!;
  const mandatsDuDetenu = fx.mandats.filter((m) => m.detenuId === d.id);
  const actifs = mandatsDuDetenu
    .filter((m) => fx.estMandatActif(m))
    .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration));
  const courant = actifs[0] ?? null;
  const aff = fx.affectations.find((a) => a.detenuId === d.id);
  const cellule = aff ? fx.cellules.find((c) => c.id === aff.celluleId) : null;

  return {
    ...d,
    categoriePenale: fx.categoriePenale(mandatsDuDetenu),
    nombreMandatsActifs: actifs.length,
    mandatCourant: courant
      ? {
          id: courant.id,
          dateIncarceration: courant.dateIncarceration,
          typeMandat: courant.typeMandat,
          motifDetention: courant.motifDetention,
          dateSortieMandat: courant.dateSortieMandat,
          typeStatutPenal: courant.typeStatutPenal,
        }
      : null,
    cellule: cellule
      ? { id: cellule.id, numero: cellule.numero, bloc: cellule.bloc }
      : null,
  };
}

function detailler(m: (typeof fx.mandats)[number]): MandatDetaille {
  const d = fx.detenus.find((x) => x.id === m.detenuId)!;
  return {
    ...m,
    detenuNom: d.nom,
    numeroEcrou: d.numeroEcrou,
    actif: fx.estMandatActif(m),
  };
}

function normaliser(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export const mockApi: ApiClient = {
  async connexion(identifiant, motDePasse) {
    await attendre();
    const u = fx.utilisateurs.find((x) => x.username === identifiant.trim());
    // Démo : le mot de passe est l'identifiant lui-même (ex. admin / admin).
    if (!u || motDePasse !== u.username) {
      throw new ApiErreur("Identifiant ou mot de passe incorrect.", 401, "IDENTIFIANTS");
    }
    if (!u.estActif) {
      throw new ApiErreur("Ce compte est désactivé.", 403, "COMPTE_INACTIF");
    }
    return { utilisateur: u, jeton: `mock.${u.id}.${Date.now()}` };
  },

  async deconnexion() {
    // Rien à révoquer : le jeton de démonstration n'existe que dans le cookie
  },

  async getUtilisateurCourant() {
    const profil = await getProfil();
    const u = profil ? fx.utilisateurs.find((x) => x.id === profil.id) : undefined;
    if (!u || !u.estActif) {
      throw new ApiErreur("Session invalide.", 401, "NON_AUTHENTIFIE");
    }
    return u;
  },

  async getTableauDeBord(): Promise<TableauDeBord> {
    await attendre();
    const maintenant = new Date();
    const resumes = fx.detenus.map((d) => resumer(d.id));
    const effectif = resumes.length;
    const capaciteTotale = fx.cellules.reduce((s, c) => s + c.capaciteMax, 0);

    const debutMoisProchain = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
    const finMoisProchain = new Date(maintenant.getFullYear(), maintenant.getMonth() + 2, 0);
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);

    const parCategorie = Object.fromEntries(
      (Object.keys(LIBELLE_CATEGORIE) as CategoriePenale[]).map((c) => [
        c,
        resumes.filter((r) => r.categoriePenale === c).length,
      ]),
    ) as Record<CategoriePenale, number>;

    const liberables = fx.mandats
      .filter((m) => {
        if (!m.dateSortieMandat) return false;
        const d = new Date(m.dateSortieMandat);
        return d >= maintenant && d <= finMois;
      })
      .sort((a, b) => a.dateSortieMandat!.localeCompare(b.dateSortieMandat!))
      .map((m) => {
        const d = fx.detenus.find((x) => x.id === m.detenuId)!;
        return {
          numeroEcrou: d.numeroEcrou,
          nom: d.nom,
          dateIncarceration: m.dateIncarceration,
          dateExpiration: m.dateSortieMandat!,
          statut: m.typeStatutPenal ?? "",
        };
      });

    const dansLesTrenteJours = (iso: string) =>
      (maintenant.getTime() - new Date(iso).getTime()) / 86_400_000 <= 30;

    const population = Array.from({ length: 6 }, (_, i) => {
      const mois = new Date(maintenant.getFullYear(), maintenant.getMonth() - (5 - i), 1);
      const fin = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
      const pop = fx.detenus.filter((d) => {
        const entree = fx.mandats
          .filter((m) => m.detenuId === d.id)
          .map((m) => m.dateIncarceration)
          .sort()[0];
        return entree && new Date(entree) <= fin;
      }).length;
      return {
        label: new Intl.DateTimeFormat("fr-FR", { month: "short" })
          .format(mois)
          .replace(".", ""),
        population: pop,
      };
    });

    return {
      genereLe: maintenant.toISOString(),
      effectif,
      capaciteTotale,
      tauxOccupation: capaciteTotale ? Math.round((effectif * 1000) / capaciteTotale) / 10 : 0,
      effectifMoisPrecedent: population.at(-2)?.population ?? effectif,
      visitesAujourdhui: fx.visites.filter(
        (v) => new Date(v.dateVisite).toDateString() === maintenant.toDateString(),
      ).length,
      sortiesPrevuesMoisProchain: fx.mandats.filter((m) => {
        if (!m.dateSortieMandat) return false;
        const d = new Date(m.dateSortieMandat);
        return d >= debutMoisProchain && d <= finMoisProchain;
      }).length,
      mandatsExpires: fx.mandats.filter((m) => !fx.estMandatActif(m)).length,
      sanctionsEnCours: fx.sanctions.filter((s) => s.statut === "En cours").length,
      mouvements: {
        incarcerations: fx.mandats.filter((m) => dansLesTrenteJours(m.dateIncarceration) && new Date(m.dateIncarceration) >= debutMois).length,
        liberations: fx.sorties.filter((s) => s.typeSortie === "LiberationNormale" && dansLesTrenteJours(s.dateSortie)).length,
        transferements: fx.sorties.filter((s) => s.typeSortie === "Transfert" && dansLesTrenteJours(s.dateSortie)).length,
        evasions: fx.sorties.filter((s) => s.typeSortie === "Evasion" && dansLesTrenteJours(s.dateSortie)).length,
        deces: fx.sorties.filter((s) => s.typeSortie === "Deces" && dansLesTrenteJours(s.dateSortie)).length,
      },
      effectifsParCategorie: parCategorie,
      populationDerniersMois: population,
      liberablesCeMois: liberables,
    };
  },

  async listDetenus(filtre: FiltreDetenus = {}) {
    await attendre();
    const {
      recherche = "",
      statut = "tous",
      categorie = "toutes",
      sexe = "tous",
      page = 1,
      parPage = 15,
      tri = "numeroEcrou",
      sens = "asc",
    } = filtre;

    const q = normaliser(recherche.trim());
    let items = fx.detenus.map((d) => resumer(d.id));

    if (q) {
      items = items.filter(
        (d) =>
          normaliser(d.nom).includes(q) ||
          normaliser(d.numeroEcrou).includes(q) ||
          normaliser(d.mandatCourant?.motifDetention ?? "").includes(q),
      );
    }
    if (statut !== "tous") items = items.filter((d) => d.statut === statut);
    if (categorie !== "toutes") items = items.filter((d) => d.categoriePenale === categorie);
    if (sexe !== "tous") items = items.filter((d) => d.sexe === sexe);

    const valeur = (d: DetenuResume): string => {
      switch (tri) {
        case "nom":
          return d.nom;
        case "dateIncarceration":
          return d.mandatCourant?.dateIncarceration ?? "";
        case "categorie":
          return d.categoriePenale ?? "~";
        default:
          return d.numeroEcrou;
      }
    };
    items.sort((a, b) => {
      const r = valeur(a).localeCompare(valeur(b), "fr");
      return sens === "asc" ? r : -r;
    });

    const total = items.length;
    const debut = (Math.max(1, page) - 1) * parPage;
    return { items: items.slice(debut, debut + parPage), total, page, parPage };
  },

  async getDossierDetenu(id) {
    await attendre();
    if (!fx.detenus.some((d) => d.id === id)) return null;
    return {
      detenu: resumer(id),
      mandats: fx.mandats
        .filter((m) => m.detenuId === id)
        .map(detailler)
        .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration)),
      affectations: fx.affectations.filter((a) => a.detenuId === id),
      sanctions: fx.sanctions.filter((s) => s.detenuId === id),
      visites: fx.visites.filter((v) => v.detenuId === id),
      suivisMedicaux: fx.suivisMedicaux.filter((s) => s.detenuId === id),
      sorties: fx.sorties.filter((s) => s.detenuId === id),
    };
  },

  async listDetenusNonLoges() {
    await attendre();
    const loges = new Set(fx.affectations.map((a) => a.detenuId));
    return fx.detenus.filter((d) => !loges.has(d.id)).map((d) => resumer(d.id));
  },

  async listMandats() {
    await attendre();
    return fx.mandats
      .map(detailler)
      .sort((a, b) => b.dateIncarceration.localeCompare(a.dateIncarceration));
  },

  async listMandatsExpires() {
    await attendre();
    return fx.mandats
      .filter((m) => !fx.estMandatActif(m))
      .map(detailler)
      .sort((a, b) => (b.dateSortieMandat ?? "").localeCompare(a.dateSortieMandat ?? ""));
  },

  async listParCategorie(categorie) {
    await attendre();
    return fx.detenus
      .map((d) => resumer(d.id))
      .filter((d) => d.categoriePenale === categorie)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  },

  async listCellules() {
    await attendre();
    return [...fx.cellules];
  },

  async listAffectations() {
    await attendre();
    return [...fx.affectations].sort((a, b) =>
      b.dateAffectation.localeCompare(a.dateAffectation),
    );
  },

  async listSanctions() {
    await attendre();
    return [...fx.sanctions].sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
  },

  async listSuivisMedicaux() {
    await attendre();
    return [...fx.suivisMedicaux].sort((a, b) =>
      b.dateConsultation.localeCompare(a.dateConsultation),
    );
  },

  async listVisites() {
    await attendre();
    return [...fx.visites].sort((a, b) => b.dateVisite.localeCompare(a.dateVisite));
  },

  async listSorties(type) {
    await attendre();
    return fx.sorties
      .filter((s) => !type || s.typeSortie === type)
      .sort((a, b) => b.dateSortie.localeCompare(a.dateSortie));
  },

  async listUtilisateurs() {
    await attendre();
    return [...fx.utilisateurs];
  },

  async getParametres() {
    await attendre();
    return { ...fx.parametres };
  },
};
