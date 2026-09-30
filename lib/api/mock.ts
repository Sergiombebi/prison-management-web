/**
 * Adaptateur MOCK — répond depuis les fixtures, avec une latence simulée pour que
 * les états de chargement soient réellement visibles pendant le développement.
 */

import "server-only";

import type {
  CategoriePenale,
  DetenuResume,
  FiltreDetenus,
  FiltreEvacuation,
  FiltrePrescription,
  FiltreSuiviMedical,
  FiltreVisite,
  StatsDetenus,
  StatsEvacuation,
  StatsPrescription,
  StatsSuiviMedical,
  StatsVisite,
  TableauDeBord,
} from "@/lib/domain/types";
import { LIBELLE_CATEGORIE, TYPES_SANCTION } from "@/lib/domain/referentiels";
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
  const evacuation = fx.evacuations.find((e) => e.detenuId === d.id && !e.dateRetour);
  const prescriptionsActives = fx.prescriptions
    .filter((p) => p.detenuId === d.id)
    .map((p) => fx.avecStatut(p))
    .filter((p) => p.statut === "en_cours");

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
    evacuationActive: evacuation
      ? { id: evacuation.id, dateDepart: evacuation.dateDepart, structureDestination: evacuation.structureDestination, motif: evacuation.motif }
      : null,
    traitementEnCours: prescriptionsActives.length
      ? prescriptionsActives.map((p) => `${p.medicament} (${p.posologie})`).join(", ")
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
    // Les fixtures ne désactivent jamais un mandat : seule l'échéance compte
    ouvert: true,
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

  async majProfil() {
    await attendre();
  },

  async changerMonMotDePasse() {
    await attendre();
  },

  async verifierIdentiteDetenu() {
    await attendre();
    return { disponible: true };
  },

  async creerDetenu(entree) {
    await attendre();
    // On rejoue le seul contrôle que l'API ferait à coup sûr : l'unicité de l'écrou
    const existe = fx.detenus.some(
      (d) => d.numeroEcrou.toLowerCase() === entree.numeroEcrou.trim().toLowerCase(),
    );
    if (existe) {
      const message = "Ce numéro d'écrou est déjà utilisé par un autre détenu.";
      throw new ApiErreur(message, 422, "VALIDATION", { numero_ecrou: [message] });
    }
    // En démonstration rien n'est persisté : on renvoie un dossier existant pour
    // que le lien « Voir le dossier » mène quelque part.
    return { id: fx.detenus[0].id };
  },

  // En démonstration, les écritures ne persistent rien : elles répondent comme l'API
  // pour que les parcours restent testables de bout en bout.
  async majDetenu() {
    await attendre();
  },

  async majDossierMedical() {
    await attendre();
  },

  async desactiverDetenu() {
    await attendre();
  },

  async restaurerDetenu() {
    await attendre();
  },

  async televerserPhotos() {
    await attendre();
    // Aucun stockage en démonstration : la fiche est créée sans photo
    return {};
  },

  async creerMandat(detenuId) {
    await attendre();
    return { id: fx.mandats.find((m) => m.detenuId === detenuId)?.id ?? fx.mandats[0].id };
  },

  async getMandat(mandatId) {
    await attendre();
    const m = fx.mandats.find((x) => x.id === mandatId);
    return m ? detailler(m) : null;
  },

  async majMandat() {
    await attendre();
  },

  async desactiverMandat() {
    await attendre();
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

    // La date de sortie EFFECTIVE (calculée, jamais l'alerte dateSortieMandat)
    // pilote ce widget, comme côté API.
    const liberables = fx.mandats
      .filter((m) => {
        if (!m.dateSortieEffective) return false;
        const d = new Date(m.dateSortieEffective);
        return d >= maintenant && d <= finMois;
      })
      .sort((a, b) => a.dateSortieEffective!.localeCompare(b.dateSortieEffective!))
      .map((m) => {
        const d = fx.detenus.find((x) => x.id === m.detenuId)!;
        return {
          numeroEcrou: d.numeroEcrou,
          nom: d.nom,
          dateIncarceration: m.dateIncarceration,
          dateSortie: m.dateSortieEffective!,
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
        if (!m.dateSortieEffective) return false;
        const d = new Date(m.dateSortieEffective);
        return d >= debutMoisProchain && d <= finMoisProchain;
      }).length,
      mandatsExpires: fx.mandats.filter((m) => !fx.estMandatActif(m)).length,
      sanctionsEnCours: fx.sanctions.filter((s) => s.statut === "En cours").length,
      traitementsARenouveler: fx.prescriptions.filter((p) => {
        if (p.arreteLe !== null || p.dateFin === null) return false;
        const dans3Jours = new Date(maintenant);
        dans3Jours.setDate(dans3Jours.getDate() + 3);
        return new Date(p.dateFin) >= maintenant && new Date(p.dateFin) <= dans3Jours;
      }).length,
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
      sansCellule = false,
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
    if (sansCellule) items = items.filter((d) => !d.cellule);

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

    let stats: StatsDetenus | undefined;
    if (filtre.avecStats) {
      const tous = fx.detenus.map((d) => resumer(d.id));
      const presents = tous.filter((d) => d.statut === "Present");
      const dans30j = new Date(Date.now() + 30 * 86_400_000);
      const parCategorie = {
        Prevenu: 0, Condamne: 0, Appellant: 0, Cassationnaire: 0, Dpac: 0,
      } as StatsDetenus["parCategorie"];
      for (const d of presents) if (d.categoriePenale) parCategorie[d.categoriePenale]++;
      const maintenant = new Date();

      stats = {
        effectif: presents.length,
        entrees30j: 0,
        sansCellule: presents.filter((d) => !d.cellule).length,
        parCategorie,
        mandatsExpires: presents.filter(
          (d) => d.mandatCourant?.dateSortieMandat && new Date(d.mandatCourant.dateSortieMandat) < maintenant,
        ).length,
        echeances: presents
          .filter((d) => d.mandatCourant?.dateSortieMandat && new Date(d.mandatCourant.dateSortieMandat) <= dans30j)
          .sort((a, b) => (a.mandatCourant?.dateSortieMandat ?? "").localeCompare(b.mandatCourant?.dateSortieMandat ?? ""))
          .slice(0, 20)
          .map((d) => ({
            detenuId: d.id,
            numeroEcrou: d.numeroEcrou,
            nom: d.nom,
            dateExpirationMandat: d.mandatCourant?.dateSortieMandat ?? "",
          })),
      };
    }

    return { items: items.slice(debut, debut + parPage), total, page, parPage, stats };
  },

  async listOptionsDetenus(recherche, decalage = 0) {
    await attendre();
    const terme = recherche.trim().toLowerCase();
    const tous = fx.detenus
      .filter(
        (d) =>
          d.statut === "Present" &&
          (terme === "" || d.nom.toLowerCase().includes(terme) || d.numeroEcrou.toLowerCase().includes(terme)),
      )
      .map((d) => ({
        id: d.id,
        numeroEcrou: d.numeroEcrou,
        nom: d.nom,
        cellule: resumer(d.id).cellule,
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    return {
      items: tous.slice(decalage, decalage + 20),
      aPlus: tous.length > decalage + 20,
    };
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
      evacuations: fx.evacuations.filter((e) => e.detenuId === id),
      prescriptions: fx.prescriptions.filter((p) => p.detenuId === id).map((p) => fx.avecStatut(p)),
    };
  },

  async getDossierMedical(id) {
    await attendre();
    const d = fx.detenus.find((x) => x.id === id);
    if (!d) return null;
    const resume = resumer(id);
    return {
      detenu: {
        id: d.id,
        numeroEcrou: d.numeroEcrou,
        nom: d.nom,
        sexe: d.sexe,
        dateNaissance: d.dateNaissance,
        age: d.age,
        lieuNaissance: d.lieuNaissance,
        photoFaceUrl: d.photoFaceUrl,
        estPresent: d.statut === "Present",
        groupeSanguin: d.groupeSanguin,
        allergies: d.allergies,
        maladiesChroniques: d.maladiesChroniques,
        traitementEnCours: resume.traitementEnCours,
        cellule: resume.cellule,
        mandatCourant: resume.mandatCourant
          ? {
              typeStatutPenal: resume.mandatCourant.typeStatutPenal,
              dateIncarceration: resume.mandatCourant.dateIncarceration,
              motifDetention: resume.mandatCourant.motifDetention,
              dateExpirationMandat: resume.mandatCourant.dateSortieMandat,
            }
          : null,
        categoriePenale: resume.categoriePenale,
        evacuationActive: resume.evacuationActive ?? null,
      },
      suivisMedicaux: fx.suivisMedicaux.filter((s) => s.detenuId === id),
      evacuations: fx.evacuations.filter((e) => e.detenuId === id),
      prescriptions: fx.prescriptions.filter((p) => p.detenuId === id).map((p) => fx.avecStatut(p)),
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

  async listMandatsExpires(filtre: { page?: number; parPage?: number } = {}) {
    await attendre();
    const parPage = Math.max(1, Math.min(100, filtre.parPage ?? 20));
    const page = Math.max(1, filtre.page ?? 1);
    const tous = fx.mandats
      .filter((m) => !fx.estMandatActif(m))
      .map(detailler)
      .sort((a, b) => (b.dateSortieMandat ?? "").localeCompare(a.dateSortieMandat ?? ""));
    const debut = (page - 1) * parPage;
    const maintenant = new Date();
    const ilYa30j = new Date(maintenant.getTime() - 30 * 86_400_000);
    return {
      items: tous.slice(debut, debut + parPage),
      total: tous.length,
      page,
      parPage,
      stats: {
        detenusConcernes: new Set(tous.map((m) => m.detenuId)).size,
        echusPlus30Jours: tous.filter((m) => m.dateSortieMandat && new Date(m.dateSortieMandat) < ilYa30j).length,
      },
    };
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

  async listOptionsCellules() {
    await attendre();
    return fx.cellules.map((c) => ({
      id: c.id,
      numero: c.numero,
      bloc: c.bloc,
      capaciteMax: c.capaciteMax,
    }));
  },

  async creerCellule() {
    await attendre();
    return { id: fx.cellules[0].id };
  },

  async majCellule(id, entree) {
    await attendre();
    const cellule = fx.cellules.find((c) => c.id === id);
    if (cellule && entree.capaciteMax < cellule.effectifReel) {
      const message = `Impossible de fixer la capacité à ${entree.capaciteMax} : ${cellule.effectifReel} détenu(s) occupent déjà cette cellule.`;
      throw new ApiErreur(message, 422, "VALIDATION", { capacite_max: [message] });
    }
  },

  async affecterDetenu(_detenuId, entree) {
    await attendre();
    const cellule = fx.cellules.find((c) => c.id === entree.celluleId);
    if (cellule && cellule.effectifReel >= cellule.capaciteMax) {
      const message = `La cellule ${cellule.numero} est complète (${cellule.effectifReel}/${cellule.capaciteMax}).`;
      throw new ApiErreur(message, 422, "VALIDATION", { cellule_id: [message] });
    }
  },

  async listTypesSanction() {
    await attendre();
    return TYPES_SANCTION.map((libelle, i) => ({ id: i + 1, libelle, estActif: true }));
  },

  async getCellule(id) {
    await attendre();
    const cellule = fx.cellules.find((c) => c.id === id);
    return cellule ?? null;
  },

  async listDetenusCellule(celluleId, filtre = {}) {
    await attendre();
    const { page = 1 } = filtre;
    const parPage = 10;

    const detenuIds = [
      ...new Set(
        fx.affectations
          .filter((a) => a.celluleId === celluleId && !a.dateFin)
          .map((a) => a.detenuId),
      ),
    ];
    const items = detenuIds.map((id) => resumer(id)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

    const total = items.length;
    const debut = (Math.max(1, page) - 1) * parPage;
    return { items: items.slice(debut, debut + parPage), total, page, parPage };
  },

  async terminerSanction() {
    await attendre();
    return { message: "Sanction terminée." };
  },

  async desactiverSanction() {
    await attendre();
  },

  async creerSuiviMedical() {
    await attendre();
    return { id: fx.suivisMedicaux[0]?.id ?? 1 };
  },

  async listEvacuations(filtre: FiltreEvacuation = {}) {
    await attendre();
    const q = normaliser((filtre.recherche ?? "").trim());
    let items = [...fx.evacuations].sort((a, b) => b.dateDepart.localeCompare(a.dateDepart));
    if (filtre.statut === "en-cours") items = items.filter((e) => !e.dateRetour);
    if (filtre.statut === "rentre") items = items.filter((e) => Boolean(e.dateRetour));
    if (q) {
      items = items.filter(
        (e) =>
          normaliser(e.detenuNom).includes(q) ||
          normaliser(e.numeroEcrou).includes(q) ||
          normaliser(e.structureDestination).includes(q),
      );
    }

    const total = items.length;
    const page = filtre.page ?? 1;
    const parPage = filtre.parPage ?? 10;
    const debut = (Math.max(1, page) - 1) * parPage;

    let stats: StatsEvacuation | undefined;
    if (filtre.avecStats) {
      const tous = fx.evacuations;
      const ilYa30j = new Date(Date.now() - 30 * 86_400_000);
      stats = {
        total: tous.length,
        enCours: tous.filter((e) => !e.dateRetour).length,
        trenteJours: tous.filter((e) => new Date(e.dateDepart) >= ilYa30j).length,
      };
    }

    return { items: items.slice(debut, debut + parPage), total, page, parPage, stats };
  },

  async creerEvacuation() {
    await attendre();
    return { id: fx.evacuations[0]?.id ?? 1 };
  },

  async enregistrerRetourEvacuation() {
    await attendre();
  },

  async listPrescriptions(filtre: FiltrePrescription = {}) {
    await attendre();
    const q = normaliser((filtre.recherche ?? "").trim());
    let items = fx.prescriptions.map((p) => fx.avecStatut(p)).sort((a, b) => b.dateDebut.localeCompare(a.dateDebut));
    if (filtre.statut && filtre.statut !== "tous") items = items.filter((p) => p.statut === filtre.statut);
    if (q) {
      items = items.filter(
        (p) =>
          normaliser(p.detenuNom).includes(q) ||
          normaliser(p.numeroEcrou).includes(q) ||
          normaliser(p.medicament).includes(q),
      );
    }

    const total = items.length;
    const page = filtre.page ?? 1;
    const parPage = filtre.parPage ?? 10;
    const debut = (Math.max(1, page) - 1) * parPage;

    let stats: StatsPrescription | undefined;
    if (filtre.avecStats) {
      const tous = fx.prescriptions.map((p) => fx.avecStatut(p));
      const maintenant = new Date();
      const dans3Jours = new Date(maintenant.getTime() + 3 * 86_400_000);
      stats = {
        total: tous.length,
        enCours: tous.filter((p) => p.statut === "en_cours").length,
        aRenouveler: tous.filter(
          (p) => p.statut === "en_cours" && p.dateFin && new Date(p.dateFin) >= maintenant && new Date(p.dateFin) <= dans3Jours,
        ).length,
      };
    }

    return { items: items.slice(debut, debut + parPage), total, page, parPage, stats };
  },

  async creerPrescription() {
    await attendre();
    return { id: fx.prescriptions[0]?.id ?? 1 };
  },

  async arreterPrescription() {
    await attendre();
  },

  async creerVisite() {
    await attendre();
    return { id: fx.visites[0]?.id ?? 1 };
  },

  async creerTypeSanction(libelle) {
    await attendre();
    if ((TYPES_SANCTION as readonly string[]).some((t) => t.toLowerCase() === libelle.trim().toLowerCase())) {
      const message = "Ce type de sanction existe déjà.";
      throw new ApiErreur(message, 422, "VALIDATION", { libelle: [message] });
    }
    return { id: TYPES_SANCTION.length + 1 };
  },

  async majTypeSanction() {
    await attendre();
  },

  async creerSanction() {
    await attendre();
    return { id: fx.sanctions[0]?.id ?? 1 };
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

  async listSuivisMedicaux(filtre: FiltreSuiviMedical = {}) {
    await attendre();
    const q = normaliser((filtre.recherche ?? "").trim());
    let items = [...fx.suivisMedicaux].sort((a, b) => b.dateConsultation.localeCompare(a.dateConsultation));
    if (filtre.type && filtre.type !== "tous") items = items.filter((s) => s.typeConsultation === filtre.type);
    if (q) {
      items = items.filter(
        (s) =>
          normaliser(s.detenuNom).includes(q) ||
          normaliser(s.numeroEcrou).includes(q) ||
          normaliser(s.diagnostic ?? "").includes(q),
      );
    }

    const total = items.length;
    const page = filtre.page ?? 1;
    const parPage = filtre.parPage ?? 10;
    const debut = (Math.max(1, page) - 1) * parPage;

    let stats: StatsSuiviMedical | undefined;
    if (filtre.avecStats) {
      const tous = fx.suivisMedicaux;
      const maintenant = new Date();
      const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
      const ilYa7j = new Date(maintenant.getTime() - 7 * 86_400_000);
      const cleJour = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const parJour = new Map<string, number>();
      for (const s of tous) {
        const cle = s.dateConsultation.slice(0, 10);
        parJour.set(cle, (parJour.get(cle) ?? 0) + 1);
      }
      const parType: Record<string, number> = {};
      for (const s of tous) parType[s.typeConsultation] = (parType[s.typeConsultation] ?? 0) + 1;

      stats = {
        total: tous.length,
        ceMois: tous.filter((s) => new Date(s.dateConsultation) >= debutMois).length,
        urgences7j: tous.filter((s) => s.typeConsultation === "Urgence" && new Date(s.dateConsultation) >= ilYa7j).length,
        suivisPrevus: tous.filter((s) => s.dateSuivi && new Date(s.dateSuivi) >= maintenant).length,
        serie14j: Array.from({ length: 14 }, (_, i) => {
          const jour = new Date(maintenant.getTime() - (13 - i) * 86_400_000);
          const cle = cleJour(jour);
          return { date: cle, total: parJour.get(cle) ?? 0 };
        }),
        parType,
        aHonorer: tous
          .filter((s) => s.dateSuivi)
          .sort((a, b) => (a.dateSuivi ?? "").localeCompare(b.dateSuivi ?? ""))
          .slice(0, 20),
        recentes: [...tous].sort((a, b) => b.dateConsultation.localeCompare(a.dateConsultation)).slice(0, 5),
      };
    }

    return { items: items.slice(debut, debut + parPage), total, page, parPage, stats };
  },

  async listVisites(filtre: FiltreVisite = {}) {
    await attendre();
    const q = normaliser((filtre.recherche ?? "").trim());
    const aujourdhui = new Date().toDateString();
    const ilYa7jCle = new Date(Date.now() - 7 * 86_400_000);
    let items = [...fx.visites].sort((a, b) => b.dateVisite.localeCompare(a.dateVisite));
    if (filtre.periode === "aujourdhui") items = items.filter((v) => new Date(v.dateVisite).toDateString() === aujourdhui);
    if (filtre.periode === "semaine") items = items.filter((v) => new Date(v.dateVisite) >= ilYa7jCle);
    if (filtre.type && filtre.type !== "tous") items = items.filter((v) => v.typeVisite === filtre.type);
    if (q) {
      items = items.filter(
        (v) =>
          normaliser(v.detenuNom).includes(q) ||
          normaliser(v.nomVisiteur).includes(q) ||
          normaliser(v.numeroEcrou).includes(q),
      );
    }

    const total = items.length;
    const page = filtre.page ?? 1;
    const parPage = filtre.parPage ?? 10;
    const debut = (Math.max(1, page) - 1) * parPage;

    let stats: StatsVisite | undefined;
    if (filtre.avecStats) {
      const tous = fx.visites;
      const ilYa7j = new Date(Date.now() - 7 * 86_400_000);
      const cleJour = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const parJour = new Map<string, number>();
      for (const v of tous) {
        const cle = v.dateVisite.slice(0, 10);
        parJour.set(cle, (parJour.get(cle) ?? 0) + 1);
      }
      const parType: Record<string, number> = {};
      for (const v of tous) parType[v.typeVisite] = (parType[v.typeVisite] ?? 0) + 1;
      const maintenant = Date.now();

      stats = {
        total: tous.length,
        duJour: tous.filter((v) => new Date(v.dateVisite).toDateString() === aujourdhui).length,
        semaine: tous.filter((v) => new Date(v.dateVisite) >= ilYa7j).length,
        sansAutorisation: tous.filter((v) => !v.autorisationPrealable && new Date(v.dateVisite) >= ilYa7j).length,
        enCours: tous.filter((v) => v.heureDebut && !v.heureFin).length,
        serie7j: Array.from({ length: 7 }, (_, i) => {
          const jour = new Date(maintenant - (6 - i) * 86_400_000);
          const cle = cleJour(jour);
          return { date: cle, total: parJour.get(cle) ?? 0 };
        }),
        parType,
        duJourDetail: tous
          .filter((v) => new Date(v.dateVisite).toDateString() === aujourdhui)
          .sort((a, b) => a.heureArrivee.localeCompare(b.heureArrivee))
          .slice(0, 20),
        recentes: [...tous]
          .sort((a, b) => `${b.dateVisite}${b.heureArrivee}`.localeCompare(`${a.dateVisite}${a.heureArrivee}`))
          .slice(0, 5),
      };
    }

    return { items: items.slice(debut, debut + parPage), total, page, parPage, stats };
  },

  async getVisite(visiteId) {
    await attendre();
    return fx.visites.find((v) => v.id === visiteId) ?? null;
  },

  async listSorties(type) {
    await attendre();
    return fx.sorties
      .filter((s) => !type || s.typeSortie === type)
      .sort((a, b) => b.dateSortie.localeCompare(a.dateSortie));
  },

  async getSortie(sortieId) {
    await attendre();
    return fx.sorties.find((s) => s.id === sortieId) ?? null;
  },

  async majSortie() {
    await attendre();
  },

  async reintegrerEvasion(sortieId, entree) {
    await attendre();
    const sortie = fx.sorties.find((s) => s.id === sortieId) ?? fx.sorties[0];
    const dureeEvasionJours =
      entree.dureeEvasionJours ??
      Math.max(0, Math.round((new Date(entree.dateReintegration).getTime() - new Date(sortie.dateSortie).getTime()) / 86_400_000));
    return {
      ...sortie,
      dateReintegration: entree.dateReintegration,
      dureeEvasionJours,
      lieuReintegration: entree.lieuReintegration ?? null,
      autoriteReintegration: entree.autoriteReintegration ?? null,
      observationsReintegration: entree.observationsReintegration ?? null,
    };
  },

  async enregistrerSortie(detenuId, entree) {
    await attendre();
    const autresMandats = fx.mandats.filter(
      (m) => m.detenuId === detenuId && fx.estMandatActif(m) && (entree.type !== "LiberationNormale" || m.id !== entree.mandatId),
    );
    return {
      id: fx.sorties[0]?.id ?? 1,
      definitive: entree.type !== "LiberationNormale" || autresMandats.length === 0,
    };
  },

  async listUtilisateurs() {
    await attendre();
    return [...fx.utilisateurs];
  },

  async creerUtilisateur(entree) {
    await attendre();
    if (fx.utilisateurs.some((u) => u.username === entree.username)) {
      const message = "Ce nom d'utilisateur est déjà pris.";
      throw new ApiErreur(message, 422, "VALIDATION", { username: [message] });
    }
    if (fx.utilisateurs.some((u) => u.email === entree.email)) {
      const message = "Cet email est déjà associé à un compte.";
      throw new ApiErreur(message, 422, "VALIDATION", { email: [message] });
    }
    return { id: fx.utilisateurs.length + 1 };
  },

  async majUtilisateur() {
    await attendre();
  },

  async desactiverUtilisateur() {
    await attendre();
  },

  async restaurerUtilisateur() {
    await attendre();
  },

  async reinitialiserMotDePasse() {
    await attendre();
  },

  async getParametres() {
    await attendre();
    return { ...fx.parametres };
  },

  async majParametres() {
    await attendre();
  },

  async televerserLogo() {
    await attendre();
    // Aucun stockage en démonstration : les paramètres gardent leur logo actuel
    return { url: "", publicId: "" };
  },
};
