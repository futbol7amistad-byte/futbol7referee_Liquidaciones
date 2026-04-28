// types.ts
import { Match, Referee } from "../../types";

export interface AssignmentSession {
  matches: Match[];
  referees: Referee[];
  period: string;
  dynamicPairings: [string, string][]; // IDs de parejas dinámicas para este periodo
  history: Match[]; // Historial relevante (últimas 5 semanas)
  weeklySlots?: Record<string, Record<string, number>>; // refereeId -> { Lunes: 2, Martes: 0, etc }
  mandatoryDays?: Record<string, string[]>; // refereeId -> ['Lunes', 'Miércoles']
  forceReassignAll?: boolean;
}

export interface AssignmentResult {
  matchId: string;
  refereeId: string | null;
  score: number;
  reason: string;
}

export interface AssignmentStats {
  unassignedMatches: number;
  violations: number;
}
