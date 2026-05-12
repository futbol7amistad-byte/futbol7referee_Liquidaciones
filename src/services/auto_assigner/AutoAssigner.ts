// AutoAssigner.ts
import { AssignmentSession, AssignmentResult } from "./types";
import { isRefereeAvailable, normalizeString, getDayName } from "./Constraints";
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
  
  // Inteligencia de Selección: Procesamos TODOS los partidos que estén sin árbitro real, o todos si se fuerza la reasignación
  const unassignedMatches = session.matches.filter(m => 
    (session.forceReassignAll ||
    !m.referee_id || 
    m.referee_id === '' || 
    m.referee_id === 'r-unassigned' || 
    m.referee_id === 'SIN ASIGNAR' ||
    m.referee_id === 'r-0') &&
    m.status !== 'Suspendido' &&
    m.status !== 'Aplazado'
  );

  const getRefereeMaxLoad = (ref: Referee): number => {
    if (!ref.disponibilidad && !(session.weeklySlots && session.weeklySlots[ref.id])) return 0;
    
    const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves'];
    let totalSlots = 0;
    
    for (const day of days) {
        const normDay = normalizeString(day);
        let daySlots = 0;
        if (session.weeklySlots && session.weeklySlots[ref.id] && session.weeklySlots[ref.id][day] !== undefined) {
            daySlots = session.weeklySlots[ref.id][day];
        } else if (ref.disponibilidad) {
            const dispKey = Object.keys(ref.disponibilidad).find(k => normalizeString(k) === normDay);
            if (dispKey) {
                const slots = ref.disponibilidad[dispKey];
                daySlots = Array.isArray(slots) ? slots.length : (slots ? 1 : 0);
            }
        }
        totalSlots += daySlots;
    }
    return totalSlots;
  };

  const getRefereeMaxDailyLoad = (ref: Referee, day: string, matchDate?: string): number => {
    let normDay = normalizeString(day);
    if (!normDay && matchDate) {
        normDay = normalizeString(getDayName(matchDate));
    }
    const baseDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
    const ogDay = baseDays.find(d => normalizeString(d) === normDay) || day;

    if (session.weeklySlots && session.weeklySlots[ref.id] && session.weeklySlots[ref.id][ogDay] !== undefined) {
      return session.weeklySlots[ref.id][ogDay];
    }
    // Fallback to original disponibilidad
    const dispKey = Object.keys(ref.disponibilidad || {}).find(k => normalizeString(k) === normDay);
    if (!dispKey || !ref.disponibilidad) return 0;
    const slots = ref.disponibilidad[dispKey];
    return Array.isArray(slots) ? slots.length : (slots ? 1 : 0);
  };

  const getPartnerBonus = (ref: Referee, matchesToAssign: Match[]): number => {
      let bonus = 0;
      if (!ref.preferences?.partner_referee_id) return bonus;
      
      matchesToAssign.forEach(m => {
          // Find if this venue has a linked venue
          const mVenue = session.venues?.find(v => v.name === m.field);
          const hasLinkedVenue = !!mVenue?.linked_venue_id || session.venues?.some(v => v.linked_venue_id === mVenue?.id);
          
          if (hasLinkedVenue) {
              // Buscar todos los partidos asignados ACTUALMENTE (en sesión y en results) para el compañero en ese día
              const partnerId = ref.preferences!.partner_referee_id;
              
              const allAssigned = [
                  ...session.matches.filter(sm => sm.referee_id === partnerId),
                  ...results.map(r => ({ ...session.matches.find(sm => sm.id === r.matchId)!, referee_id: r.refereeId })).filter(r => r && r.referee_id === partnerId)
              ];

              const partnerMatchesSameDay = allAssigned.filter(pm => pm.match_date === m.match_date);
              
              for (const pm of partnerMatchesSameDay) {
                  const pVenue = session.venues?.find(v => v.name === pm.field);
                  // They are linked if mVenue links to pVenue OR pVenue links to mVenue
                  const isLinked = (mVenue?.linked_venue_id && mVenue.linked_venue_id === pVenue?.id) || 
                                   (pVenue?.linked_venue_id && pVenue.linked_venue_id === mVenue?.id);

                  if (isLinked) {
                      bonus += 1000000; // Bono masivo
                      if (pm.match_time === m.match_time) {
                          bonus += 5000000; // Bono súper masivo por ser a la misma hora en la otra pista
                      }
                  }
              }
          }
      });
      return bonus;
  };

  // 1. Inicializar carga base considerando SOLO los partidos que caen en las fechas que estamos tratando
  const refereeLoad: Record<string, number> = {};
  const refereeDailyLoad: Record<string, Record<string, number>> = {};
  session.referees.forEach(r => {
      refereeLoad[r.id] = 0;
      refereeDailyLoad[r.id] = {};
  });
  
  const matchDates = unassignedMatches.map(m => m.match_date);
  const minDate = matchDates.length > 0 ? matchDates.sort()[0] : null;
  const maxDate = matchDates.length > 0 ? matchDates.sort()[matchDates.length-1] : null;

  session.matches.forEach(m => {
    // Solo contamos carga si tiene un árbitro asignado real
    // Y SOLO si el partido está en el mismo rango de fechas que estamos asignando (carga semanal/periodo)
    if (m.referee_id && refereeLoad[m.referee_id] !== undefined && 
        m.referee_id !== 'r-unassigned' && m.referee_id !== 'SIN ASIGNAR' &&
        m.status !== 'Suspendido' && m.status !== 'Aplazado' &&
        (!minDate || (m.match_date >= minDate && m.match_date <= maxDate))) {
      refereeLoad[m.referee_id]++;
      const mDayNorm = normalizeString(m.day_name || getDayName(m.match_date));
      refereeDailyLoad[m.referee_id][mDayNorm] = (refereeDailyLoad[m.referee_id][mDayNorm] || 0) + 1;
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

  const passes = [2, 4, Infinity];
  let unassignedGroupKeys = [...sortedGroupKeys];

  for (const maxLoadCap of passes) {
    const nextUnassignedKeys: string[] = [];

    for (const key of unassignedGroupKeys) {
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
        if (maxLoad <= 0) continue;
        
        const currentLoad = refereeLoad[ref.id];
        const remainingLoad = maxLoad - currentLoad;

        if (remainingLoad < groupMatches.length) continue;
        if (currentLoad + groupMatches.length > maxLoadCap) continue; // LOAD CAP ENFORCEMENT

      // Check daily max load for ALL matches in the group
      let dailyLoadOk = true;
      const robustDayName = groupMatches[0].day_name || getDayName(groupMatches[0].match_date);
      const mDay = normalizeString(robustDayName);
      const maxDaily = getRefereeMaxDailyLoad(ref, robustDayName, groupMatches[0].match_date);
      const currentDaily = (refereeDailyLoad[ref.id][mDay] || 0);
      
      if (currentDaily + groupMatches.length > maxDaily) {
          dailyLoadOk = false;
      }
      if (!dailyLoadOk) continue;

      // REGLA ESPECIAL: Si es un partido suelto (1 solo), priorizar a los que tienen horas impares o solo 1 hora restante
      // Pero NO penalizar excesivamente a los de 2 horas si no hay más opciones
      let specialBonus = 0;
      const mDayRobust = groupMatches[0].day_name || getDayName(groupMatches[0].match_date);
      const mDayNorm = normalizeString(mDayRobust);
      if (session.mandatoryDays && session.mandatoryDays[ref.id] && session.mandatoryDays[ref.id].some(d => normalizeString(d) === mDayNorm)) {
          specialBonus += 5000000; // Mandatory day explicitly set
      }

      if (isSingleMatch) {
          const maxDaily = getRefereeMaxDailyLoad(ref, mDayRobust, groupMatches[0].match_date);
          const currentDaily = (refereeDailyLoad[ref.id][mDayNorm] || 0);
          const remainingDaily = maxDaily - currentDaily;
          
          let hadExplicitSlot = false;
          const ogDay = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
              .find(d => normalizeString(d) === normalizeString(mDayRobust)) || mDayRobust;
          if (session.weeklySlots && session.weeklySlots[ref.id] && session.weeklySlots[ref.id][ogDay] !== undefined) {
             hadExplicitSlot = true;
          }

          // FIX: The user wants to avoid referees having an ODD number of matches assigned in a day/week.
          const newDailyLoad = currentDaily + groupMatches.length;
          const newTotalLoad = currentLoad + groupMatches.length;
          
          if (newDailyLoad > 0 && newDailyLoad % 2 === 0) {
              specialBonus += 5000000000; // Prioridad MÁXIMA para terminar con un número PAR de horas el mismo día
              if (hadExplicitSlot) specialBonus += 9000000000;
          } else if (newTotalLoad > 0 && newTotalLoad % 2 === 0) {
              specialBonus += 2000000000; // Prioridad ALTA para terminar con total semanal PAR
          } else {
              // Si el árbitro terminaría con un número IMPAR de horas, penalizar.
              specialBonus -= 100000000;
          }

          if (remainingDaily === 1) {
              specialBonus += 20000000; 
          }
          
          if (maxLoad % 2 !== 0) specialBonus += 1000000;
          specialBonus += 100;
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
        
        // Equidad absoluta: todos deben llegar a 2, luego a 4, luego a 6...
        // Restar una penalización fija muy grande por cada partido que ya tengan (currentLoad)
        totalScore -= (Math.pow(currentLoad, 2) * 50000000);

        // Penalizar también por carga RELATIVA para forzar distribución equitativa basada en su disponibilidad (porcentaje llenado)
        const loadPercentage = currentLoad / maxLoad;
        totalScore -= (loadPercentage * 100000);
        
        totalScore += specialBonus;
        totalScore += getPartnerBonus(ref, groupMatches);

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
        const mDayRobust = m.day_name || getDayName(m.match_date) || 'Sin Dia';
        const mDay = normalizeString(mDayRobust);
        refereeDailyLoad[bestGroupRef!.id][mDay] = (refereeDailyLoad[bestGroupRef!.id][mDay] || 0) + 1;
      });
    } else {
        // Fallback: Individual si no se pudo el bloque de 2
        let allAssignedInGroup = true;
        
        // Remove matches from group that we successfully assign individually 
        const unassignedInThisGroup = [];

        for (const m of groupMatches) {
          let bestRef: Referee | null = null;
          let bestScore = -Infinity;

          // Aleatorizar el orden de los árbitros para que no siempre gane el mismo
          const randomizedRefsForIndividual = shuffle(session.referees);

          for (const ref of randomizedRefsForIndividual) {
            if (ref.status !== 'active') continue;
            
            const maxLoad = getRefereeMaxLoad(ref);
            if (maxLoad <= 0) continue;
            
            const currentLoad = refereeLoad[ref.id];
            const remainingLoad = maxLoad - currentLoad;

            if (remainingLoad < 1) continue;
            if (currentLoad + 1 > maxLoadCap) continue; // LOAD CAP ENFORCEMENT

          const mDayRobust = m.day_name || getDayName(m.match_date);
          const mDay = normalizeString(mDayRobust);
          const maxDaily = getRefereeMaxDailyLoad(ref, mDayRobust, m.match_date);
          const currentDaily = (refereeDailyLoad[ref.id][mDay] || 0);
          if (currentDaily + 1 > maxDaily) continue;

          const allCurrentMatches = [...session.matches.filter(sm => sm.referee_id === ref.id), ...results.filter(res => res.refereeId === ref.id).map(res => session.matches.find(sm => sm.id === res.matchId)!)];
          const hasCollision = allCurrentMatches.some(am => 
              am && am.match_date === m.match_date && 
              am.match_time === m.match_time && 
              am.field !== m.field
          );
          if (hasCollision) continue;

          if (!isRefereeAvailable(ref, m, session)) continue;

          let score = calculateScore(ref, m, session);
          
          // Equidad absoluta
          score -= (Math.pow(currentLoad, 2) * 50000000);

          // Fuerte penalización por carga RELATIVA para asegurar reparto equitativo
          const loadPercentage = currentLoad / maxLoad;
          score -= (loadPercentage * 100000);
          
          if (session.mandatoryDays && session.mandatoryDays[ref.id] && session.mandatoryDays[ref.id].some(d => normalizeString(d) === mDay)) {
              score += 5000000;
          }

          // NORMA SAGRADA para partidos individuales (Fallback)
          const remainingDailyFb = maxDaily - currentDaily;
          let hadExplicitSlotFb = false;
          const ogDayFb = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo']
              .find(d => normalizeString(d) === normalizeString(mDayRobust)) || mDayRobust;
          if (session.weeklySlots && session.weeklySlots[ref.id] && session.weeklySlots[ref.id][ogDayFb] !== undefined) {
             hadExplicitSlotFb = true;
          }

          const newDailyLoadFb = currentDaily + 1;
          const newTotalLoadFb = currentLoad + 1;

          if (newDailyLoadFb > 0 && newDailyLoadFb % 2 === 0) {
              score += 5000000000; // Prioridad absoluta para terminar con un número PAR de horas el mismo día
              if (hadExplicitSlotFb) {
                  score += 9000000000;
              }
          } else if (newTotalLoadFb > 0 && newTotalLoadFb % 2 === 0) {
              score += 2000000000; // Prioridad alta para terminar con semana PAR
          } else {
              score -= 100000000; // Penalización por dejarle con número IMPAR
          }

          if (remainingDailyFb === 1) {
              score += 20000000;
          }

          if (maxLoad % 2 !== 0) score += 1000000;
          score += 100;
          score += getPartnerBonus(ref, [m]);

          if (score > bestScore) {
            bestScore = score;
            bestRef = ref;
          }
        }

        if (bestRef) {
          results.push({ matchId: m.id, refereeId: bestRef.id, score: bestScore, reason: 'Individual' });
          refereeLoad[bestRef.id]++;
          const mDayRobust = m.day_name || getDayName(m.match_date) || 'Sin Dia';
          const mDay = normalizeString(mDayRobust);
          refereeDailyLoad[bestRef.id][mDay] = (refereeDailyLoad[bestRef.id][mDay] || 0) + 1;
        } else {
          allAssignedInGroup = false;
          unassignedInThisGroup.push(m);
        }
      }
      
      groups[key] = unassignedInThisGroup;

      if (!allAssignedInGroup) {
         nextUnassignedKeys.push(key);
      }
    }
  }
  unassignedGroupKeys = nextUnassignedKeys;
}

// En este punto, si quedaron partidos en grupos[], los añadimos sin árbitro a results
  for (const key of unassignedGroupKeys) {
      const remainingMatches = groups[key];
      for (const m of remainingMatches) {
          // Asegurarnos de no duplicar si ya estaba en results
          if (!results.some(r => r.matchId === m.id)) {
              results.push({ matchId: m.id, refereeId: null, score: 0, reason: 'No hay árbitro disponible' });
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
        if (getRefereeMaxLoad(candidate) <= 0) continue;
        
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
               
               const repMaxLoad = getRefereeMaxLoad(replacement);
               if (repMaxLoad <= 0) continue;
               
               // El reemplazo sí aumentaría su carga
               if (refereeLoad[replacement.id] >= repMaxLoad) continue;
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
                        
                        const repMaxLoad = getRefereeMaxLoad(replacement);
                        if (repMaxLoad <= 0) continue;
                        
                        if (refereeLoad[replacement.id] >= repMaxLoad) continue;
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
        if (maxL <= 0 || refereeLoad[ref.id] >= maxL) return false;
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

  // 5. FASE DE REEQUILIBRIO PARIDAD DIARIA (Daily Parity Rebalancing)
  // Intentar asegurar que todos los árbitros terminen con un total de horas PAR por DÍA.
  const allDays = Array.from(new Set(session.matches.map(m => normalizeString(m.day_name || getDayName(m.match_date) || 'Sin Dia'))));
  
  for (const mDay of allDays) {
      if (!mDay) continue;
      let oddRefereesDaily = session.referees.filter(r => (refereeDailyLoad[r.id]?.[mDay] || 0) % 2 !== 0);
      let attemptsDaily = 0;
      
      while (oddRefereesDaily.length >= 2 && attemptsDaily < 10) {
          attemptsDaily++;
          oddRefereesDaily.sort((a, b) => (refereeDailyLoad[b.id]?.[mDay] || 0) - (refereeDailyLoad[a.id]?.[mDay] || 0)); // Del de mayor al de menor
          
          let swapMade = false;
          
          for (let i = 0; i < oddRefereesDaily.length; i++) {
              for (let j = oddRefereesDaily.length - 1; j > i; j--) {
                  const donor = oddRefereesDaily[i];
                  const receiver = oddRefereesDaily[j];
                  
                  // Intentamos mover un partido del donor al receiver, de ESE DÍA
                  const donorMatchesOnDay = results.filter(r => {
                      if (r.refereeId !== donor.id) return false;
                      const rm = session.matches.find(m => m.id === r.matchId);
                      return rm && normalizeString(rm.day_name || getDayName(rm.match_date) || 'Sin Dia') === mDay;
                  });

                  
                  for (const dm of donorMatchesOnDay) {
                      const match = session.matches.find(m => m.id === dm.matchId);
                      if (!match) continue;
                      
                      // ¿Puede el receiver pillarlo?
                      const matchDayRobust = match.day_name || getDayName(match.match_date);
                      const maxDaily = getRefereeMaxDailyLoad(receiver, matchDayRobust, match.match_date);
                      const currentDaily = (refereeDailyLoad[receiver.id][mDay] || 0);
                      
                      if (currentDaily + 1 > maxDaily) continue;
                      if (refereeLoad[receiver.id] >= getRefereeMaxLoad(receiver)) continue;
                      if (!isRefereeAvailable(receiver, match, session)) continue;
                      
                      const hasCollision = session.matches.some(sm => sm.referee_id === receiver.id && sm.match_date === match.match_date && sm.match_time === match.match_time) 
                         || results.some(r => r.refereeId === receiver.id && session.matches.find(sm => sm.id === r.matchId)?.match_date === match.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === match.match_time);
                      
                      if (!hasCollision) {
                          dm.refereeId = receiver.id;
                          dm.reason = `Daily Parity Rebalance (vía ${donor.name})`;
                          refereeLoad[donor.id]--;
                          refereeDailyLoad[donor.id][mDay]--;
                          refereeLoad[receiver.id]++;
                          refereeDailyLoad[receiver.id][mDay] = (refereeDailyLoad[receiver.id][mDay] || 0) + 1;
                          swapMade = true;
                          break;
                      }
                  }
                  
                  if (swapMade) break;

                  // Al revés: intentar mover del receiver al donor
                  const receiverMatchesOnDay = results.filter(r => {
                      if (r.refereeId !== receiver.id) return false;
                      const rm = session.matches.find(m => m.id === r.matchId);
                      return rm && normalizeString(rm.day_name || getDayName(rm.match_date) || 'Sin Dia') === mDay;
                  });
                  
                  for (const rm of receiverMatchesOnDay) {
                      const match = session.matches.find(m => m.id === rm.matchId);
                      if (!match) continue;
                      
                      const matchDayRobust = match.day_name || getDayName(match.match_date);
                      const maxDaily = getRefereeMaxDailyLoad(donor, matchDayRobust, match.match_date);
                      const currentDaily = (refereeDailyLoad[donor.id][mDay] || 0);
                      
                      if (currentDaily + 1 > maxDaily) continue;
                      if (refereeLoad[donor.id] >= getRefereeMaxLoad(donor)) continue;
                      if (!isRefereeAvailable(donor, match, session)) continue;
                      
                      const hasCollision = session.matches.some(sm => sm.referee_id === donor.id && sm.match_date === match.match_date && sm.match_time === match.match_time) 
                         || results.some(r => r.refereeId === donor.id && session.matches.find(sm => sm.id === r.matchId)?.match_date === match.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === match.match_time);
                      
                      if (!hasCollision) {
                          rm.refereeId = donor.id;
                          rm.reason = `Daily Parity Rebalance (vía ${receiver.name})`;
                          refereeLoad[receiver.id]--;
                          refereeDailyLoad[receiver.id][mDay]--;
                          refereeLoad[donor.id]++;
                          refereeDailyLoad[donor.id][mDay] = (refereeDailyLoad[donor.id][mDay] || 0) + 1;
                          swapMade = true;
                          break;
                      }
                  }
                  
                  if (swapMade) break;
              }
              if (swapMade) break;
          }
          
          oddRefereesDaily = session.referees.filter(r => (refereeDailyLoad[r.id]?.[mDay] || 0) % 2 !== 0);
      }
  }

  // 6. GLOBAL PARITY ENFORCEMENT
  // Asegurar que, globalmente, los totales sean pares (salvo capacidad IMPAR inherente).
  let oddGlobalRefs = session.referees.filter(r => refereeLoad[r.id] % 2 !== 0);
  let globalAttempts = 0;
  
  while (oddGlobalRefs.length >= 2 && globalAttempts < 20) {
      globalAttempts++;
      // Ordenamos para que los árbitros con maxLoad IMPAR queden al final.
      oddGlobalRefs.sort((a, b) => {
          const aMaxOdd = getRefereeMaxLoad(a) % 2 !== 0 ? 1 : 0;
          const bMaxOdd = getRefereeMaxLoad(b) % 2 !== 0 ? 1 : 0;
          if (aMaxOdd !== bMaxOdd) {
              return aMaxOdd - bMaxOdd; 
          }
          return refereeLoad[b.id] - refereeLoad[a.id];
      });

      let globalSwapMade = false;
      
      for (let i = 0; i < oddGlobalRefs.length; i++) {
          for (let j = oddGlobalRefs.length - 1; j > i; j--) {
              const donor = oddGlobalRefs[i];
              const receiver = oddGlobalRefs[j];
              
              const donorMatches = results.filter(r => r.refereeId === donor.id);
              
              for (const dm of donorMatches) {
                  const match = session.matches.find(m => m.id === dm.matchId);
                  if (!match) continue;
                  
                  const matchDayRobust = match.day_name || getDayName(match.match_date) || 'Sin Dia';
                  const mDay = normalizeString(matchDayRobust);
                  const maxDaily = getRefereeMaxDailyLoad(receiver, matchDayRobust, match.match_date);
                  const currentDaily = (refereeDailyLoad[receiver.id]?.[mDay] || 0);
                  
                  if (currentDaily + 1 > maxDaily) continue;
                  if (refereeLoad[receiver.id] >= getRefereeMaxLoad(receiver)) continue;
                  if (!isRefereeAvailable(receiver, match, session)) continue;
                  
                  const hasCollision = session.matches.some(sm => sm.referee_id === receiver.id && sm.match_date === match.match_date && sm.match_time === match.match_time) 
                     || results.some(r => r.refereeId === receiver.id && session.matches.find(sm => sm.id === r.matchId)?.match_date === match.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === match.match_time);
                  
                  if (!hasCollision) {
                      dm.refereeId = receiver.id;
                      dm.reason = `Global Parity Rebalance (vía ${donor.name})`;
                      refereeLoad[donor.id]--;
                      refereeDailyLoad[donor.id][mDay]--;
                      refereeLoad[receiver.id]++;
                      refereeDailyLoad[receiver.id][mDay] = (refereeDailyLoad[receiver.id][mDay] || 0) + 1;
                      globalSwapMade = true;
                      break;
                  }
              }
              
              if (globalSwapMade) break;

              const receiverMatches = results.filter(r => r.refereeId === receiver.id);
              for (const rm of receiverMatches) {
                  const match = session.matches.find(m => m.id === rm.matchId);
                  if (!match) continue;
                  
                  const matchDayRobust = match.day_name || getDayName(match.match_date) || 'Sin Dia';
                  const mDay = normalizeString(matchDayRobust);
                  const maxDaily = getRefereeMaxDailyLoad(donor, matchDayRobust, match.match_date);
                  const currentDaily = (refereeDailyLoad[donor.id]?.[mDay] || 0);
                  
                  if (currentDaily + 1 > maxDaily) continue;
                  if (refereeLoad[donor.id] >= getRefereeMaxLoad(donor)) continue;
                  if (!isRefereeAvailable(donor, match, session)) continue;
                  
                  const hasCollision = session.matches.some(sm => sm.referee_id === donor.id && sm.match_date === match.match_date && sm.match_time === match.match_time) 
                     || results.some(r => r.refereeId === donor.id && session.matches.find(sm => sm.id === r.matchId)?.match_date === match.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === match.match_time);
                  
                  if (!hasCollision) {
                      rm.refereeId = donor.id;
                      rm.reason = `Global Parity Rebalance (vía ${receiver.name})`;
                      refereeLoad[receiver.id]--;
                      refereeDailyLoad[receiver.id][mDay]--;
                      refereeLoad[donor.id]++;
                      refereeDailyLoad[donor.id][mDay] = (refereeDailyLoad[donor.id][mDay] || 0) + 1;
                      globalSwapMade = true;
                      break;
                  }
              }
              
              if (globalSwapMade) break;
          }
          if (globalSwapMade) break;
      }
      
      oddGlobalRefs = session.referees.filter(r => refereeLoad[r.id] % 2 !== 0);
  }

  // 7. DEEP DAILY PARITY ENFORCEMENT & CONSOLIDATION
  // Reduce day-level odds (1 match/day) as much as possible for EVERY ref, 
  // ESPECIALLY for refs whose global total is EVEN.
  let consolidationMade = true;
  let consolAttempts = 0;
  while (consolidationMade && consolAttempts < 60) {
      consolidationMade = false;
      consolAttempts++;
      
      for (const day of allDays) {
          const refsWithOddDay = session.referees.filter(r => (refereeDailyLoad[r.id]?.[day] || 0) % 2 !== 0);
          
          // If we have 2 refs with an odd day, we just pass one match from one to the other!
          if (refsWithOddDay.length >= 2) {
             const donor = refsWithOddDay[0];
             const receiver = refsWithOddDay[1];
             
             const donorMatches = results.filter(r => r.refereeId === donor.id && normalizeString(session.matches.find(m => m.id === r.matchId)?.day_name || getDayName(session.matches.find(m => m.id === r.matchId)?.match_date || '') || 'Sin Dia') === day);
             if (donorMatches.length === 0) continue;
             
             for (const dm of donorMatches) {
                 const matchObj = session.matches.find(m => m.id === dm.matchId);
                 if (!matchObj) continue;
                 
                 const maxDailyRec = getRefereeMaxDailyLoad(receiver, day, matchObj.match_date);
                 if ((refereeDailyLoad[receiver.id][day] || 0) + 1 > maxDailyRec) continue;
                 // Don't violate receiver's GLOBAL total unless they have a lot of space. 
                 // Even if they exceed, we can try. But let's be strict:
                 if (refereeLoad[receiver.id] + 1 > getRefereeMaxLoad(receiver)) continue;
                 
                 if (!isRefereeAvailable(receiver, matchObj, session)) continue;
                 const hasCol = session.matches.some(sm => sm.referee_id === receiver.id && sm.match_date === matchObj.match_date && sm.match_time === matchObj.match_time) 
                     || results.some(r => r.refereeId === receiver.id && session.matches.find(sm => sm.id === r.matchId)?.match_date === matchObj.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === matchObj.match_time);
                 if (hasCol) continue;
                 
                 dm.refereeId = receiver.id;
                 dm.reason = `Agrupación impar ${day}`;
                 refereeLoad[donor.id]--; refereeDailyLoad[donor.id][day]--;
                 refereeLoad[receiver.id]++; refereeDailyLoad[receiver.id][day]++;
                 consolidationMade = true;
                 break;
             }
          }
      }
      
      // Now ensure referees with EVEN global totals don't have scattered 1s (e.g. 1 on Martes, 1 on Jueves = 2)
      if (!consolidationMade) {
          for (const ref of session.referees) {
              if (refereeLoad[ref.id] % 2 !== 0) continue; // Sólo árbitros con total PAR
              
              const myOddDays = allDays.filter(d => (refereeDailyLoad[ref.id]?.[d] || 0) % 2 !== 0);
              if (myOddDays.length < 2) continue; // ej. [Martes, Jueves]
              
              const dayFrom = myOddDays[0];
              const dayTo = myOddDays[1];
              const myMatchesFrom = results.filter(r => r.refereeId === ref.id && normalizeString(session.matches.find(m => m.id === r.matchId)?.day_name || getDayName(session.matches.find(m => m.id === r.matchId)?.match_date || '') || 'Sin Dia') === dayFrom);
              
              if (myMatchesFrom.length === 0) continue;
              
              for (const otherRef of session.referees) {
                  if (otherRef.id === ref.id) continue;
                  
                  const otherMatchesTo = results.filter(r => r.refereeId === otherRef.id && normalizeString(session.matches.find(m => m.id === r.matchId)?.day_name || getDayName(session.matches.find(m => m.id === r.matchId)?.match_date || '') || 'Sin Dia') === dayTo);
                  if (otherMatchesTo.length === 0) continue;
                  
                  for (const matchToSteal of otherMatchesTo) {
                      const mStealObj = session.matches.find(m => m.id === matchToSteal.matchId);
                      const mGiveObj = session.matches.find(m => m.id === myMatchesFrom[0].matchId);
                      if (!mStealObj || !mGiveObj) continue;
                      
                      const maxDailyTo_ref = getRefereeMaxDailyLoad(ref, dayTo, mStealObj.match_date);
                      if ((refereeDailyLoad[ref.id][dayTo] || 0) + 1 > maxDailyTo_ref) continue;
                      if (!isRefereeAvailable(ref, mStealObj, session)) continue;
                      const colRef = session.matches.some(sm => sm.referee_id === ref.id && sm.match_date === mStealObj.match_date && sm.match_time === mStealObj.match_time) 
                         || results.some(r => r.refereeId === ref.id && r.matchId !== myMatchesFrom[0].matchId && session.matches.find(sm => sm.id === r.matchId)?.match_date === mStealObj.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === mStealObj.match_time);
                      if (colRef) continue;
                      
                      const maxDailyFrom_other = getRefereeMaxDailyLoad(otherRef, dayFrom, mGiveObj.match_date);
                      if ((refereeDailyLoad[otherRef.id][dayFrom] || 0) + 1 > maxDailyFrom_other) continue;
                      if (!isRefereeAvailable(otherRef, mGiveObj, session)) continue;
                      const colOther = session.matches.some(sm => sm.referee_id === otherRef.id && sm.match_date === mGiveObj.match_date && sm.match_time === mGiveObj.match_time) 
                         || results.some(r => r.refereeId === otherRef.id && r.matchId !== matchToSteal.matchId && session.matches.find(sm => sm.id === r.matchId)?.match_date === mGiveObj.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === mGiveObj.match_time);
                      if (colOther) continue;
                      
                      const oddBefore = allDays.filter(d => (refereeDailyLoad[otherRef.id]?.[d] || 0) % 2 !== 0).length;
                      let simDFrom = (refereeDailyLoad[otherRef.id][dayFrom] || 0) + 1;
                      let simDTo = (refereeDailyLoad[otherRef.id][dayTo] || 0) - 1;
                      let oddAfter = oddBefore;
                      if ((refereeDailyLoad[otherRef.id][dayFrom] || 0) % 2 !== 0 && simDFrom % 2 === 0) oddAfter--;
                      if ((refereeDailyLoad[otherRef.id][dayFrom] || 0) % 2 === 0 && simDFrom % 2 !== 0) oddAfter++;
                      if ((refereeDailyLoad[otherRef.id][dayTo] || 0) % 2 !== 0 && simDTo % 2 === 0) oddAfter--;
                      if ((refereeDailyLoad[otherRef.id][dayTo] || 0) % 2 === 0 && simDTo % 2 !== 0) oddAfter++;
                      
                      if (refereeLoad[otherRef.id] % 2 === 0 && oddAfter > oddBefore) continue; // No romper a otro PAR
                      if (refereeLoad[otherRef.id] % 2 !== 0 && oddAfter > oddBefore + 1) continue; 
                      
                      myMatchesFrom[0].refereeId = otherRef.id;
                      myMatchesFrom[0].reason = `Cross consolidación para evitar 1s a ${ref.name}`;
                      matchToSteal.refereeId = ref.id;
                      matchToSteal.reason = `Cross consolidación para evitar 1s a ${ref.name}`;
                      
                      refereeDailyLoad[ref.id][dayFrom]--; refereeDailyLoad[ref.id][dayTo]++;
                      refereeDailyLoad[otherRef.id][dayFrom]++; refereeDailyLoad[otherRef.id][dayTo]--;
                      
                      consolidationMade = true;
                      break;
                  }
                  if (consolidationMade) break;
              }
              if (consolidationMade) break;
          }
      }
  }

  // 7.5 MACRO GLOBAL BALANCE ENFORCEMENT
  // Prevent some users from having 6 while others have 2 if at all possible.
  let macroBalanceMade = true;
  let macroAttempts = 0;
  while (macroBalanceMade && macroAttempts < 10) {
      macroBalanceMade = false;
      macroAttempts++;
      
      const activeLoad = session.referees.filter(r => r.status === 'active').map(r => ({ ref: r, load: refereeLoad[r.id] }));
      activeLoad.sort((a,b) => b.load - a.load);
      
      const highestLog = activeLoad[0];
      const lowestLog = activeLoad[activeLoad.length - 1];
      
      if (highestLog.load - lowestLog.load >= 4) {
          // Try to migrate 2 matches from highest to lowest.
          const highRef = highestLog.ref;
          const lowRef = lowestLog.ref;
          
          if (refereeLoad[lowRef.id] + 2 > getRefereeMaxLoad(lowRef)) break;
          
          const highMatches = results.filter(r => r.refereeId === highRef.id);
          const daysForHigh = [...new Set(highMatches.map(r => normalizeString(session.matches.find(m => m.id === r.matchId)?.day_name || getDayName(session.matches.find(m => m.id === r.matchId)?.match_date || '') || 'Sin Dia')))];
          
          for (const day of daysForHigh) {
              const myDayMatches = highMatches.filter(r => normalizeString(session.matches.find(m => m.id === r.matchId)?.day_name || getDayName(session.matches.find(m => m.id === r.matchId)?.match_date || '') || 'Sin Dia') === day);
              
              if (myDayMatches.length >= 2) {
                  // Try to transfer these 2 matches to lowRef
                  const match1Record = myDayMatches[0];
                  const match2Record = myDayMatches[1];
                  const m1Obj = session.matches.find(m => m.id === match1Record.matchId)!;
                  const m2Obj = session.matches.find(m => m.id === match2Record.matchId)!;
                  
                  const rDayRobust = m1Obj.day_name || getDayName(m1Obj.match_date);
                  const maxDaily = getRefereeMaxDailyLoad(lowRef, rDayRobust, m1Obj.match_date);
                  const currentDaily = (refereeDailyLoad[lowRef.id][day] || 0);
                  
                  if (currentDaily + 2 > maxDaily) continue;
                  if (!isRefereeAvailable(lowRef, m1Obj, session) || !isRefereeAvailable(lowRef, m2Obj, session)) continue;
                  
                  const hasCollision = session.matches.some(sm => sm.referee_id === lowRef.id && (
                     (sm.match_date === m1Obj.match_date && sm.match_time === m1Obj.match_time) ||
                     (sm.match_date === m2Obj.match_date && sm.match_time === m2Obj.match_time)
                  )) || results.some(r => r.refereeId === lowRef.id && (
                     (session.matches.find(sm => sm.id === r.matchId)?.match_date === m1Obj.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === m1Obj.match_time) ||
                     (session.matches.find(sm => sm.id === r.matchId)?.match_date === m2Obj.match_date && session.matches.find(sm => sm.id === r.matchId)?.match_time === m2Obj.match_time)
                  ));
                  
                  if (!hasCollision) {
                      match1Record.refereeId = lowRef.id;
                      match1Record.reason = `Macro Balance (-2 de ${highRef.name})`;
                      match2Record.refereeId = lowRef.id;
                      match2Record.reason = `Macro Balance (-2 de ${highRef.name})`;
                      
                      refereeLoad[highRef.id] -= 2;
                      refereeDailyLoad[highRef.id][day] -= 2;
                      refereeLoad[lowRef.id] += 2;
                      refereeDailyLoad[lowRef.id][day] += 2;
                      macroBalanceMade = true;
                      break;
                  }
              }
          }
      }
  }

  return results;
};
