"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";

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
