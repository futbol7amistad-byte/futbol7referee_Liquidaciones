// AutoAssigner.ts
import { AssignmentSession, AssignmentResult } from "./types";
import { isRefereeAvailable, normalizeString } from "./Constraints";
import { calculateScore } from "./Scorer";
import { Match, Referee } from "../../types";

export const runAutoAssignment = (session: AssignmentSession, seed: number = 0): AssignmentResult[] => {
  const results: AssignmentResult[] = [];
  
  // Función para aleatoriedad controlada por semilla
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const shuffle = <T>(array: T[]) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  
  // Inteligencia de Selección: Procesamos TODOS los partidos que estén sin árbitro real
  const unassignedMatches = session.matches.filter(m => 
    !m.referee_id || 
    m.referee_id === '' || 
    m.referee_id === 'r-unassigned' || 
    m.referee_id === 'SIN ASIGNAR' ||
    m.referee_id === 'r-0'
  );

  const getRefereeMaxLoad = (ref: Referee): number => {
    if (!ref.disponibilidad) return 0;
    let totalSlots = 0;
    Object.values(ref.disponibilidad).forEach(slots => {
        if (Array.isArray(slots)) {
            totalSlots += slots.length;
        } else if (slots && typeof slots === 'string') {
            totalSlots += 1;
        }
    });
    return totalSlots;
  };

  // 1. Inicializar carga base considerando SOLO los partidos que caen en las fechas que estamos tratando
  const refereeLoad: Record<string, number> = {};
  session.referees.forEach(r => refereeLoad[r.id] = 0);
  
  const matchDates = unassignedMatches.map(m => m.match_date);
  const minDate = matchDates.length > 0 ? matchDates.sort()[0] : null;
  const maxDate = matchDates.length > 0 ? matchDates.sort()[matchDates.length-1] : null;

  session.matches.forEach(m => {
    // Solo contamos carga si tiene un árbitro asignado real
    // Y SOLO si el partido está en el mismo rango de fechas que estamos asignando (carga semanal/periodo)
    if (m.referee_id && refereeLoad[m.referee_id] !== undefined && 
        m.referee_id !== 'r-unassigned' && m.referee_id !== 'SIN ASIGNAR' &&
        (!minDate || (m.match_date >= minDate && m.match_date <= maxDate))) {
      refereeLoad[m.referee_id]++;
    }
  });

  // Agrupar por (Fecha, Campo) para priorizar que el mismo árbitro pite ambos partidos si puede
  const groups: Record<string, Match[]> = {};
  unassignedMatches.forEach(m => {
    const key = `${m.match_date}_${m.field}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  // Ordenar grupos: Primero los de 2 partidos (más difíciles), luego los de 1. Aleatorizar dentro de cada grupo de tamaño.
  const groupKeys = Object.keys(groups);
  const sortedGroupKeys = shuffle(groupKeys).sort((a, b) => {
    return groups[b].length - groups[a].length; // Descendente por tamaño de grupo
  });

  for (const key of sortedGroupKeys) {
    const groupMatches = groups[key].sort((a, b) => a.match_time.localeCompare(b.match_time));
    const isSingleMatch = groupMatches.length === 1;
    
    // Intentar asignar el mismo árbitro a TODO el bloque del campo en ese día
    let bestGroupRef: Referee | null = null;
    let bestGroupScore = -Infinity;

    // Aleatorizar el orden de los árbitros para que no siempre gane el mismo si hay empate técnico
    const randomizedReferees = shuffle(session.referees);

    for (const ref of randomizedReferees) {
      if (ref.status !== 'active') continue;
      
      const maxLoad = getRefereeMaxLoad(ref);
      const currentLoad = refereeLoad[ref.id];
      const remainingLoad = maxLoad - currentLoad;

      if (remainingLoad < groupMatches.length) continue;

      // REGLA ESPECIAL: Si es un partido suelto (1 solo), priorizar a los que tienen horas impares o solo 1 hora restante
      // Pero NO penalizar excesivamente a los de 2 horas si no hay más opciones
      let specialBonus = 0;
      if (isSingleMatch) {
          // Si al árbitro le queda solo 1 hora en total, es el candidato ideal
          if (remainingLoad === 1) specialBonus += 500; // Mucho más bonus para asegurar el encaje
          
          // Si estamos en la fase individual, cualquier disponibilidad es buena
          specialBonus += 100;
          
          const mDay = normalizeString(groupMatches[0].day_name);
          const dispKey = Object.keys(ref.disponibilidad || {}).find(k => normalizeString(k) === mDay);
          const daySlotsCount = dispKey ? (ref.disponibilidad![dispKey] || []).length : 0;
          if (daySlotsCount === 1) specialBonus += 200;
      }

      // Debe estar disponible para TODOS los partidos del bloque
      const canDoAll = groupMatches.every(m => {
        const allCurrentMatches = [...session.matches.filter(sm => sm.referee_id === ref.id), ...results.filter(res => res.refereeId === ref.id).map(res => session.matches.find(sm => sm.id === res.matchId)!)];
        
        const hasCollision = allCurrentMatches.some(am => 
            am && am.match_date === m.match_date && 
            am.match_time === m.match_time && 
            am.field !== m.field
        );

        if (hasCollision) return false;
        return isRefereeAvailable(ref, m, session);
      });

      if (canDoAll) {
        let totalScore = 0;
        groupMatches.forEach(m => totalScore += calculateScore(ref, m, session));
        
        // Penalizar carga actual para favorecer uniformidad (pero menos que el specialBonus)
        totalScore -= (currentLoad * 10);
        totalScore += specialBonus;

        if (totalScore > bestGroupScore) {
          bestGroupScore = totalScore;
          bestGroupRef = ref;
        }
      }
    }

    if (bestGroupRef) {
      groupMatches.forEach(m => {
        results.push({ 
          matchId: m.id, 
          refereeId: bestGroupRef!.id, 
          score: bestGroupScore, 
          reason: isSingleMatch ? 'Partido Suelto' : 'Bloque de Campo' 
        });
        refereeLoad[bestGroupRef!.id]++;
      });
    } else {
      // Fallback: Individual si no se pudo el bloque de 2
      for (const m of groupMatches) {
        let bestRef: Referee | null = null;
        let bestScore = -Infinity;

        // Aleatorizar el orden de los árbitros para que no siempre gane el mismo
        const randomizedRefsForIndividual = shuffle(session.referees);

        for (const ref of randomizedRefsForIndividual) {
          if (ref.status !== 'active') continue;
          
          const maxLoad = getRefereeMaxLoad(ref);
          const currentLoad = refereeLoad[ref.id];
          const remainingLoad = maxLoad - currentLoad;

          if (remainingLoad < 1) continue;

          const allCurrentMatches = [...session.matches.filter(sm => sm.referee_id === ref.id), ...results.filter(res => res.refereeId === ref.id).map(res => session.matches.find(sm => sm.id === res.matchId)!)];
          const hasCollision = allCurrentMatches.some(am => 
              am && am.match_date === m.match_date && 
              am.match_time === m.match_time && 
              am.field !== m.field
          );
          if (hasCollision) continue;

          if (!isRefereeAvailable(ref, m, session)) continue;

          let score = calculateScore(ref, m, session);
          score -= (currentLoad * 10);
          
          // Mismo bonus que arriba para partidos sueltos
          if (remainingLoad === 1) score += 100;
          const mDay = normalizeString(m.day_name);
          const dispKey = Object.keys(ref.disponibilidad || {}).find(k => normalizeString(k) === mDay);
          const daySlotsCount = dispKey ? (ref.disponibilidad![dispKey] || []).length : 0;
          if (daySlotsCount === 1) score += 50;

          if (score > bestScore) {
            bestScore = score;
            bestRef = ref;
          }
        }

        if (bestRef) {
          results.push({ matchId: m.id, refereeId: bestRef.id, score: bestScore, reason: 'Individual' });
          refereeLoad[bestRef.id]++;
        } else {
          results.push({ matchId: m.id, refereeId: null, score: 0, reason: 'No hay árbitro disponible' });
        }
      }
    }
  }

  // 3. FASE DE PERMUTAS (Swaps): Para esos partidos que se quedaron "SIN ASIGNAR"
  const unassignedIndices = results.map((r, i) => r.refereeId === null ? i : -1).filter(i => i !== -1);
  
  if (unassignedIndices.length > 0) {
    for (const idx of unassignedIndices) {
      const matchToAssign = session.matches.find(m => m.id === results[idx].matchId);
      if (!matchToAssign) continue;

      let swapFound = false;
      let diagnosticReasons: string[] = [];
      
      // Intentar permuta con CUALQUIER árbitro activo
      const swapCandidates = shuffle(session.referees);

      for (const candidate of swapCandidates) {
        if (candidate.status !== 'active') continue;
        
        // ¿Tiene disponibilidad técnica para este partido?
        if (!isRefereeAvailable(candidate, matchToAssign, session)) {
            diagnosticReasons.push(`${candidate.name}: Sin disp.`);
            continue;
        }

        // Buscamos si ya tiene un partido a esa misma hora que le bloquea
        const colIndex = results.findIndex(r => {
           const rm = session.matches.find(sm => sm.id === r.matchId);
           return r.refereeId === candidate.id && rm && rm.match_date === matchToAssign.match_date && rm.match_time === matchToAssign.match_time;
        });

        if (colIndex !== -1) {
            // Caso 1: Hay colisión horaria. Intentamos encontrar un reemplazo para el partido bloqueante.
            const blockingMatch = session.matches.find(sm => sm.id === results[colIndex].matchId);
            if (!blockingMatch) continue;

            const replacements = shuffle(session.referees);
            for (const replacement of replacements) {
               if (replacement.id === candidate.id || replacement.id === '' || replacement.status !== 'active') continue;
               
               // El reemplazo sí aumentaría su carga
               if (refereeLoad[replacement.id] >= getRefereeMaxLoad(replacement)) continue;
               if (!isRefereeAvailable(replacement, blockingMatch, session)) continue;

               // Comprobar si el reemplazo tiene colisión para el partido bloqueante
               const hasCol = results.some(r => {
                  const rm = session.matches.find(sm => sm.id === r.matchId);
                  return r.refereeId === replacement.id && rm && rm.match_date === blockingMatch.match_date && rm.match_time === blockingMatch.match_time;
               });

               if (!hasCol) {
                 // ¡PERMUTA ÉXITO!
                 results[colIndex].refereeId = replacement.id;
                 results[colIndex].reason = `Permuta exitosa (libre vía ${candidate.name})`;
                 refereeLoad[replacement.id]++;
                 
                 results[idx].refereeId = candidate.id;
                 results[idx].reason = `Asignado por reequilibrio`;
                 swapFound = true;
                 break;
               }
            }
        } else {
            // Caso 2: No hay colisión horaria, pero no se asignó antes (probablemente por carga máxima).
            // Si el candidato ya tiene carga máxima, no podemos asignarlo directamente.
            // Pero podríamos intentar mover uno de sus partidos actuales a OTRO árbitro.
            if (refereeLoad[candidate.id] >= getRefereeMaxLoad(candidate)) {
                // Buscamos uno de sus partidos actuales que OTRA persona pueda pitar
                const candidateMatches = results.filter(r => r.refereeId === candidate.id);
                for (const cmEntry of candidateMatches) {
                    const cmMatch = session.matches.find(sm => sm.id === cmEntry.matchId);
                    if (!cmMatch) continue;

                    const replacements = shuffle(session.referees);
                    for (const replacement of replacements) {
                        if (replacement.id === candidate.id || replacement.status !== 'active') continue;
                        if (refereeLoad[replacement.id] >= getRefereeMaxLoad(replacement)) continue;
                        if (!isRefereeAvailable(replacement, cmMatch, session)) continue;

                        const hasCol = results.some(r => {
                            const rm = session.matches.find(sm => sm.id === r.matchId);
                            return r.refereeId === replacement.id && rm && rm.match_date === cmMatch.match_date && rm.match_time === cmMatch.match_time;
                        });

                        if (!hasCol) {
                            // Liberamos el slot del candidato moviendo su partido al reemplazo
                            const cmIdx = results.findIndex(r => r.matchId === cmEntry.matchId);
                            results[cmIdx].refereeId = replacement.id;
                            results[cmIdx].reason = `Reequilibrio (libre vía ${candidate.name})`;
                            refereeLoad[replacement.id]++;
                            // refereeLoad[candidate.id] no cambia neto aún, pero ahora le asignamos el nuevo match
                            
                            results[idx].refereeId = candidate.id;
                            results[idx].reason = `Asignado tras liberar carga`;
                            swapFound = true;
                            break;
                        }
                    }
                    if (swapFound) break;
                }
            }
        }
        if (swapFound) break;
      }

      if (!swapFound) {
          const uniqueReasons = Array.from(new Set(diagnosticReasons)).slice(0, 3).join(' | ');
          results[idx].reason = uniqueReasons || 'Sin hueco viable (carga/disp)';
      }
    }
  }
  
  // 4. FASE DE EMERGENCIA: Si aún queda algo sin asignar, forzar asignación ignorando rankings
  const stillUnassigned = results.map((r, i) => r.refereeId === null ? i : -1).filter(i => i !== -1);
  if (stillUnassigned.length > 0) {
    for (const idx of stillUnassigned) {
      const m = session.matches.find(sm => sm.id === results[idx].matchId);
      if (!m) continue;
      
      const emergencyCandidate = shuffle(session.referees).find(ref => {
        if (ref.status !== 'active') return false;
        
        const maxL = getRefereeMaxLoad(ref);
        if (refereeLoad[ref.id] >= maxL) return false;
        if (!isRefereeAvailable(ref, m, session)) return false;
        
        // Comprobar colisión TOTAL (tanto en lo nuevo como en lo ya existente en el calendario)
        const hasCollision = session.matches.some(sm => 
          sm.referee_id === ref.id && 
          sm.match_date === m.match_date && 
          sm.match_time === m.match_time
        ) || results.some(r => {
          const rm = session.matches.find(sm => sm.id === r.matchId);
          return r.refereeId === ref.id && rm && rm.match_date === m.match_date && rm.match_time === m.match_time;
        });

        return !hasCollision;
      });
      
      if (emergencyCandidate) {
        results[idx].refereeId = emergencyCandidate.id;
        results[idx].reason = 'Asignación de emergencia (cobertura total)';
        refereeLoad[emergencyCandidate.id]++;
      }
    }
  }

  return results;
};
