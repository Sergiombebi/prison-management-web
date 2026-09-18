"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";
import { getProfil, peut } from "@/lib/session";

/** En démonstration rien n'est persisté : le message le dit. */
const suffixe = () =>
  modeDe("discipline") === "mock" ? " (démonstration : rien n’est enregistré)" : "";

/** Champ requis absent, signalé sous le champ comme le ferait l'API. */
function manquant(formulaire: FormData, champ: string, message: string): EtatAction {
  return { message, erreurs: { [champ]: [message] }, valeurs: valeursSaisies(formulaire) };
}

function rafraichir() {
  revalidatePath("/discipline", "layout");
  revalidatePath("/detenus", "layout");
}

export async function creerCellule(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const numero = texte(formulaire, "numero");
  const capacite = entier(formulaire, "capacite_max");

  try {
    await api.creerCellule({
      numero,
      bloc: optionnel(formulaire, "bloc"),
      typeCellule: optionnel(formulaire, "type_cellule"),
      capaciteMax: capacite ?? 0,
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return { ok: true, message: `Cellule ${numero} créée${suffixe()}.` };
}

/** Liée à l'identifiant par `.bind(null, id)` : il ne transite pas par un champ modifiable. */
export async function modifierCellule(
  celluleId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const numero = texte(formulaire, "numero");

  try {
    await api.majCellule(celluleId, {
      numero,
      bloc: optionnel(formulaire, "bloc"),
      typeCellule: optionnel(formulaire, "type_cellule"),
      capaciteMax: entier(formulaire, "capacite_max") ?? 0,
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return { ok: true, message: `Cellule ${numero} mise à jour${suffixe()}.` };
}

/**
 * Met fin à une sanction. L'API libère la cellule disciplinaire et laisse
 * volontairement le détenu sans cellule : son message rappelle laquelle était la
 * sienne, on le renvoie tel quel pour que l'écran propose la réaffectation.
 */
export async function terminerSanction(
  sanctionId: number,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { message } = await api.terminerSanction(sanctionId);
    rafraichir();
    return { ok: true, message };
  } catch (e) {
    return { ok: false, message: etatDepuisErreur(e).message ?? "La sanction n’a pas pu être terminée." };
  }
}

/** Annule une sanction saisie par erreur : la fiche reste dans l'historique. */
export async function annulerSanction(sanctionId: number): Promise<{ ok: boolean; message?: string }> {
  try {
    await api.desactiverSanction(sanctionId);
  } catch (e) {
    return { ok: false, message: etatDepuisErreur(e).message };
  }
  rafraichir();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Types de sanction — réservés à l'administration
// ---------------------------------------------------------------------------

/**
 * Un bouton caché n'empêche pas d'appeler la Server Action directement : ce contrôle
 * évite un aller-retour inutile vers l'API (qui refuse de toute façon, elle est seule
 * juge des droits) pour rendre le message d'erreur immédiat.
 */
async function refuserSansPermission(): Promise<EtatAction | null> {
  const profil = await getProfil();
  if (profil && peut(profil.permissions, "discipline.types_sanction.gerer")) return null;
  return { message: "Cette action nécessite la permission de gérer les types de sanction." };
}

export async function creerTypeSanction(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const refus = await refuserSansPermission();
  if (refus) return refus;

  const libelle = texte(formulaire, "libelle");
  if (!libelle) return manquant(formulaire, "libelle", "Le libellé est obligatoire.");

  try {
    await api.creerTypeSanction(libelle);
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return { ok: true, message: `Type « ${libelle} » ajouté${suffixe()}.` };
}

/**
 * Renomme ou (dés)active un type. Liée au seul identifiant, pour que l'action
 * reste la même d'un rendu à l'autre ; l'état visé arrive par le champ
 * `est_actif` du formulaire utilisé (renommer : inchangé, basculer : inversé).
 */
export async function majTypeSanction(
  typeId: number,
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const refus = await refuserSansPermission();
  if (refus) return refus;

  const libelle = texte(formulaire, "libelle");
  if (!libelle) return manquant(formulaire, "libelle", "Le libellé est obligatoire.");
  const estActif = texte(formulaire, "est_actif") === "1";

  try {
    await api.majTypeSanction(typeId, { libelle, estActif });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return { ok: true, message: `Type « ${libelle} » enregistré${suffixe()}.` };
}

export async function affecterDetenu(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const detenuId = entier(formulaire, "detenu_id");
  const celluleId = entier(formulaire, "cellule_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu à affecter.");
  if (!celluleId) return manquant(formulaire, "cellule_id", "Choisissez une cellule.");

  try {
    await api.affecterDetenu(detenuId, {
      celluleId,
      dateAffectation: optionnel(formulaire, "date_affectation"),
      motif: optionnel(formulaire, "motif_affectation"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return {
    ok: true,
    message: `Affectation enregistrée : l’affectation précédente du détenu est clôturée${suffixe()}.`,
  };
}

export async function prononcerSanction(_precedent: EtatAction, formulaire: FormData): Promise<EtatAction> {
  const detenuId = entier(formulaire, "detenu_id");
  const typeId = entier(formulaire, "type_sanction_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu sanctionné.");
  if (!typeId) return manquant(formulaire, "type_sanction_id", "Le type de sanction est obligatoire.");

  const cellule = entier(formulaire, "cellule_disciplinaire_id");

  try {
    await api.creerSanction(detenuId, {
      typeSanctionId: typeId,
      motif: texte(formulaire, "motif"),
      dateFaute: texte(formulaire, "date_faute"),
      dateDebut: texte(formulaire, "date_debut"),
      dateFin: optionnel(formulaire, "date_fin"),
      celluleDisciplinaireId: cellule,
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir();
  return {
    ok: true,
    message: cellule
      ? `Sanction prononcée. Le détenu a été déplacé en cellule disciplinaire${suffixe()}.`
      : `Sanction prononcée${suffixe()}.`,
  };
}
