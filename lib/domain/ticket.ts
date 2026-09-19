import type { Visite } from "@/lib/domain/types";

export interface DonneesTicket {
  id: number;
  detenuNom: string;
  detenuNumeroEcrou: string;
  nomVisiteur: string;
  lienParente: string;
  typePieceIdentite: string;
  numeroPieceIdentite: string;
  dateVisite: string;
  heureArrivee: string;
  dureePrevueMinutes: string;
  typeVisite: string;
  lieuVisite: string;
  agentControle: string;
}

/** Ticket d'une visite déjà enregistrée : mêmes champs, lus depuis le registre. */
export function ticketDepuisVisite(visite: Visite): DonneesTicket {
  return {
    id: visite.id,
    detenuNom: visite.detenuNom,
    detenuNumeroEcrou: visite.numeroEcrou,
    nomVisiteur: visite.nomVisiteur,
    lienParente: visite.lienParente,
    typePieceIdentite: visite.typePieceIdentite,
    numeroPieceIdentite: visite.numeroPieceIdentite,
    dateVisite: visite.dateVisite,
    heureArrivee: visite.heureArrivee,
    dureePrevueMinutes: String(visite.dureePrevueMinutes),
    typeVisite: visite.typeVisite,
    lieuVisite: visite.lieuVisite,
    agentControle: visite.agentControle,
  };
}
