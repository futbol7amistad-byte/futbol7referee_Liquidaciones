// Scorer.ts
import { Match, Referee } from "../../types";
import { AssignmentSession } from "./types";
import { normalizeString } from "./Constraints";

export const calculateScore = (ref: Referee, match: Match, session: AssignmentSession): number => {
  if (!ref.preferences) return 0;
  
  let score = 0;

  // 1. Bonus por nivel (1=Alto, 2=Medio, 3=Bajo)
  const refLevel = ref.preferences.nivel || 1;
  const matchLevel = match.level || 1;
  
  if (refLevel === matchLevel) score += 10;
  else if (Math.abs(refLevel - matchLevel) === 1) score += 5; // Niveles adyacentes 1-2 o 2-3
  else score += 1; // Lejano 1-3

  // 2. Bonus por rotación (penalizar si ya arbitró a este equipo en jornadas anteriores)
  const recentMatchesWithTeams = session.history.filter(h => 
      h.referee_id === ref.id && 
      (h.team_a_id === match.team_a_id || h.team_a_id === match.team_b_id ||
       h.team_b_id === match.team_a_id || h.team_b_id === match.team_b_id)
  );

  // Cada repetición penaliza fuertemente (-15)
  score -= (recentMatchesWithTeams.length * 15);
  
  // 3. Distribución global en histórico
  const totalInHistory = session.history.filter(h => h.referee_id === ref.id).length;
  score -= (totalInHistory * 2);

  // 4. Rotación de Campos
  const normField = normalizeString(match.field);
  const recentInField = session.history.filter(h => h.referee_id === ref.id && normalizeString(h.field) === normField).length;
  score -= (recentInField * 5);

  return score;
};
