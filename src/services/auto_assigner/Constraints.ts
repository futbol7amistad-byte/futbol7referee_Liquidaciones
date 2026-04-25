// Constraints.ts
import { Match, Referee } from "../../types";
import { AssignmentSession } from "./types";

export const getDayName = (dateStr: string): string => {
    const daysMap = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sábado"];
    const date = new Date(dateStr);
    return daysMap[date.getDay()];
};

export const normalizeString = (s: any) => {
  if (!s) return '';
  return String(s).trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[.,-]/g, ':') // Convert . , - to : for times
    .replace(/[^\w\s:]/g, '') // Remove everything else
    .replace(/\s/g, ''); // Remove all spaces
};

export const isRefereeAvailable = (ref: Referee, match: Match, session: AssignmentSession): boolean => {
  const prefs = ref.preferences || { nivel: 3, camposVetados: [], equiposVetados: [] };
  const disp = ref.disponibilidad || {};

  const dayName = normalizeString(match.day_name);
  const dispKey = Object.keys(disp).find(k => normalizeString(k) === dayName);
  
  if (!dispKey) return false;
  
  const refereeAvailability = disp[dispKey] || [];
  const normalizedMatchTime = normalizeString(match.match_time);
  
  // Búsqueda flexible: exacta, contenida o por proximidad horaria simple (HH:MM)
  const isTimeMatch = refereeAvailability.some(t => {
      const nt = normalizeString(t);
      if (nt === normalizedMatchTime || nt.includes(normalizedMatchTime)) return true;
      
      // Si el formato es un rango "20:30-22:30"
      if (nt.includes(':') && nt.length > 5) {
          const parts = t.split(/[-–—]/);
          if (parts.length === 2) {
              const start = normalizeString(parts[0]);
              const end = normalizeString(parts[1]);
              return normalizedMatchTime >= start && normalizedMatchTime <= end;
          }
      }
      return false;
  });

  if (!isTimeMatch) return false;

  // 2. Check fields vetoed (with normalization)
  const normField = normalizeString(match.field);
  if (prefs.camposVetados && prefs.camposVetados.some(v => normalizeString(v) === normField)) {
      return false;
  }

  // 3. Check teams vetoed (with normalization)
  const teamA = normalizeString(match.team_a_id);
  const teamB = normalizeString(match.team_b_id);
  if (prefs.equiposVetados && prefs.equiposVetados.some(v => {
      const nv = normalizeString(v);
      return nv === teamA || nv === teamB;
  })) {
      return false;
  }

  return true;
};
