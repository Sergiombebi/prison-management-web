"use server";

import { revalidatePath } from "next/cache";
import { api, modeDe } from "@/lib/api";
import { entier, etatDepuisErreur, optionnel, texte, type EtatAction } from "@/lib/api/actions";
import { valeursSaisies } from "@/lib/api/formulaires";

const suffixe = () => (modeDe("sante") === "mock" ? " (démonstration : rien n’est enregistré)" : "");

function manquant(formulaire: FormData, champ: string, message: string): EtatAction {
  return { message, erreurs: { [champ]: [message] }, valeurs: valeursSaisies(formulaire) };
}

function rafraichir(detenuId: number) {
  revalidatePath("/sante", "layout");
  revalidatePath(`/detenus/${detenuId}`);
  revalidatePath("/tableau-de-bord");
}

export async function enregistrerConsultation(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const detenuId = entier(formulaire, "detenu_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu consulté.");

  try {
    await api.creerSuiviMedical(detenuId, {
      dateConsultation: texte(formulaire, "date_consultation"),
      typeConsultation: texte(formulaire, "type_consultation"),
      nomMedecin: texte(formulaire, "nom_medecin"),
      symptomes: texte(formulaire, "symptomes"),
      diagnostic: texte(formulaire, "diagnostic"),
      temperature: optionnel(formulaire, "temperature"),
      tensionArterielle: optionnel(formulaire, "tension_arterielle"),
      poids: optionnel(formulaire, "poids"),
      medicamentsPrescrits: optionnel(formulaire, "medicaments_prescrits"),
      dureeTraitement: optionnel(formulaire, "duree_traitement"),
      dateSuivi: optionnel(formulaire, "date_suivi"),
      observations: optionnel(formulaire, "observations"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  return { ok: true, message: `Consultation enregistrée${suffixe()}.` };
}

export async function enregistrerVisite(
  _precedent: EtatAction,
  formulaire: FormData,
): Promise<EtatAction> {
  const detenuId = entier(formulaire, "detenu_id");
  if (!detenuId) return manquant(formulaire, "detenu_id", "Choisissez le détenu visité.");
  const duree = entier(formulaire, "duree_prevue_minutes");
  if (!duree) return manquant(formulaire, "duree_prevue_minutes", "Choisissez la durée prévue.");

  try {
    await api.creerVisite(detenuId, {
      dateVisite: texte(formulaire, "date_visite"),
      heureArrivee: texte(formulaire, "heure_arrivee"),
      dureePrevueMinutes: duree,
      typeVisite: texte(formulaire, "type_visite"),
      // Cases à cocher : absentes du formulaire quand elles ne sont pas cochées
      autorisationPrealable: formulaire.get("autorisation_prealable") !== null,
      fouilleCorporelle: formulaire.get("fouille_corporelle") !== null,
      nomVisiteur: texte(formulaire, "nom_visiteur"),
      sexeVisiteur: texte(formulaire, "sexe_visiteur") === "Féminin" ? "Féminin" : "Masculin",
      typePieceIdentite: texte(formulaire, "type_piece_identite"),
      numeroPieceIdentite: texte(formulaire, "numero_piece_identite"),
      lienParente: texte(formulaire, "lien_parente"),
      agentControle: texte(formulaire, "agent_controle"),
      lieuVisite: optionnel(formulaire, "lieu_visite"),
      telephoneVisiteur: optionnel(formulaire, "telephone_visiteur"),
      adresseVisiteur: optionnel(formulaire, "adresse_visiteur"),
      objetsDeposes: optionnel(formulaire, "objets_deposes"),
      observationsSecurite: optionnel(formulaire, "observations_securite"),
      heureDebut: optionnel(formulaire, "heure_debut"),
      heureFin: optionnel(formulaire, "heure_fin"),
      observationsVisite: optionnel(formulaire, "observations_visite"),
    });
  } catch (e) {
    return etatDepuisErreur(e, formulaire);
  }

  rafraichir(detenuId);
  return { ok: true, message: `Visite enregistrée${suffixe()}.` };
}
