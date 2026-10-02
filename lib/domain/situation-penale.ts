import type { Mandas } from "./types";

export interface EtapeJudiciaire {
  titre: string;
  tribunal: string | null;
  date: string | null;
  decision: string | null;
}

/**
 * Cascade jugement → appel → cassation d'un mandat : ne garde que les étapes réellement
 * renseignées, dans l'ordre. Un prévenu n'a aucune étape ; un condamné a le jugement ; un
 * appelant a jugement + appel ; un cassationnaire a les trois — piloté par la présence
 * réelle des données de chaque étape, pas par le statut pénal courant du mandat (qui peut
 * évoluer indépendamment de l'historique déjà consigné).
 */
export function etapesJudiciaires(m: Mandas): EtapeJudiciaire[] {
  const etapes: EtapeJudiciaire[] = [];

  if (m.tribunalJugement || m.peinePrononcee || m.dateJugement) {
    etapes.push({ titre: "Jugement", tribunal: m.tribunalJugement, date: m.dateJugement, decision: m.peinePrononcee });
  }
  if (m.tribunalAppel || m.decisionAppel || m.dateAppel) {
    etapes.push({ titre: "Appel", tribunal: m.tribunalAppel, date: m.dateAppel, decision: m.decisionAppel });
  }
  if (m.tribunalCassation || m.decisionCassation || m.dateCassation) {
    etapes.push({ titre: "Cassation", tribunal: m.tribunalCassation, date: m.dateCassation, decision: m.decisionCassation });
  }

  return etapes;
}
