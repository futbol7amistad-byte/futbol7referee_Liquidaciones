import React, { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Zap, Calendar, Upload, Check, X, FileSpreadsheet, Settings, Save, Pin } from 'lucide-react';
import { useData } from '../../store/DataContext';
import { useSeason } from '../../contexts/SeasonContext';
import { runAutoAssignment } from '../../services/auto_assigner/AutoAssigner';
import { db } from '../../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function AdminAutoAssigner() {
  const { currentSeason } = useSeason();
  const { matches: matchesRaw, referees, teams, assignmentResults, setAssignmentResults, hiddenPeriods, settings, updateSettings } = useData();
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [forceReassignAll, setForceReassignAll] = useState(false);
  
  const [weeklySlots, setWeeklySlots] = useState<Record<string, Record<string, number>>>(settings.autoAssignerConfig?.weeklySlots || {});
  const [inactiveRefs, setInactiveRefs] = useState<string[]>(settings.autoAssignerConfig?.inactiveRefs || []);
  const [mandatoryDays, setMandatoryDays] = useState<Record<string, string[]>>(settings.autoAssignerConfig?.mandatoryDays || {});

  React.useEffect(() => {
    if (settings.autoAssignerConfig) {
      setWeeklySlots(settings.autoAssignerConfig.weeklySlots || {});
      setInactiveRefs(settings.autoAssignerConfig.inactiveRefs || []);
      setMandatoryDays(settings.autoAssignerConfig.mandatoryDays || {});
    }
  }, [settings.autoAssignerConfig]);

  const handleSaveConfig = async () => {
      setLoading(true);
      try {
          await updateSettings({
              autoAssignerConfig: {
                  weeklySlots,
                  inactiveRefs,
                  mandatoryDays,
              }
          });
          toast.success('Configuración guardada correctamente');
          setShowConfigModal(false);
      } catch (error) {
          toast.error('Error al guardar la configuración');
      } finally {
          setLoading(false);
      }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => matchesRaw.filter(m => !hiddenPeriods.includes(m.period || 'Sin periodo')), [matchesRaw, hiddenPeriods]);

  const days = ['Lunes', 'Martes', 'Miercoles', 'Jueves'];

  const kpis = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const matchCounts = days.reduce((acc, day) => {
        const normDay = normalize(day);
        return { ...acc, [day]: matches.filter(m => normalize(m.day_name || '') === normDay).length };
    }, {} as Record<string, number>);

    const slotCounts = days.reduce((acc, day) => {
        const normDay = normalize(day);
        return { 
            ...acc, 
            [day]: referees.reduce((sum, r) => {
                if (inactiveRefs.includes(r.id)) return sum;
                if (weeklySlots[r.id] && weeklySlots[r.id][day] !== undefined) {
                    return sum + weeklySlots[r.id][day];
                }
                const disp = r.disponibilidad || {};
                const dispKey = Object.keys(disp).find(k => normalize(k) === normDay);
                const slots = dispKey ? disp[dispKey] : [];
                return sum + (Array.isArray(slots) ? slots.length : (slots ? 1 : 0));
            }, 0)
        };
    }, {} as Record<string, number>);
    const totalMatches = Object.values(matchCounts).reduce((a, b) => a + b, 0);
    const totalSlots = Object.values(slotCounts).reduce((a, b) => a + b, 0);
    return { matchCounts, slotCounts, totalMatches, totalSlots };
  }, [matches, referees, weeklySlots, inactiveRefs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const newSlots: Record<string, Record<string, number>> = {};
        let refsFound = 0;

        data.forEach((row: any) => {
            const rowStr = JSON.stringify(row).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            let ref = referees.find(r => {
                const normName = r.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                return rowStr.includes(normName);
            });

            if (!ref) {
                ref = referees.find(r => {
                     const parts = r.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(' ').filter(p => p.length > 2);
                     if (parts.length === 0) return false;
                     if (parts.length >= 2) {
                         return rowStr.includes(parts[0]) && rowStr.includes(parts[1]);
                     }
                     return rowStr.includes(parts[0]);
                });
            }

            if (!ref) {
                console.warn("No referee found for Excel row:", row);
                return;
            }

            const extractDay = (dayNames: string[]) => {
                for (const key of Object.keys(row)) {
                    if (dayNames.some(d => key.toLowerCase().includes(d))) {
                        return Number(row[key]) || 0;
                    }
                }
                return 0;
            };

            newSlots[ref.id] = {
                'Lunes': extractDay(['lunes', 'lun']),
                'Martes': extractDay(['martes', 'mar']),
                'Miercoles': extractDay(['miercoles', 'mie', 'miércoles']),
                'Jueves': extractDay(['jueves', 'jue'])
            };
            refsFound++;
        });

        if (refsFound > 0) {
            setWeeklySlots(newSlots);
            toast.success(`Cargada disponibilidad para ${refsFound} árbitros`);
        } else {
            toast.error('No se encontró ningún nombre de árbitro en el listado.');
        }
      } catch (err) {
          console.error(err);
          toast.error('Error al procesar el archivo Excel. Revisa el formato.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcess = (isRetry = false) => {
    setLoading(true);
    const newSeed = isRetry ? Math.floor(Math.random() * 1000) : 0;
    if (isRetry) setSeed(newSeed);

    // Obtener historial del mes actual (partidos asiganados previamente que no sean de esta semana u otro criterio)
    // Para simplificar, pasamos los partidos que YA tengan asignado este árbitro
    const historyMatches = matchesRaw.filter(m => m.referee_id && m.referee_id !== '' && m.referee_id !== 'r-unassigned' && m.referee_id !== 'SIN ASIGNAR' && m.referee_id !== 'r-0');

    const effectiveWeeklySlots: Record<string, Record<string, number>> = {};
    
    // Poblamos para TODOS los árbitros activos para que coincida con lo que ve el usuario en pantalla
    referees.forEach(ref => {
        if (ref.status !== 'active') return;
        const refSlots = weeklySlots[ref.id] || {};
        effectiveWeeklySlots[ref.id] = {};
        
        ['Lunes', 'Martes', 'Miercoles', 'Jueves'].forEach(day => {
            if (refSlots[day] !== undefined) {
                effectiveWeeklySlots[ref.id][day] = refSlots[day];
            } else {
                // Fallback to disponibilidad igual que en la UI
                const normDay = day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const dispKey = Object.keys(ref.disponibilidad || {}).find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normDay);
                let val = 0;
                if (dispKey && ref.disponibilidad) {
                    const slots = ref.disponibilidad[dispKey];
                    if (Array.isArray(slots)) {
                        val = slots.length;
                    }
                }
                effectiveWeeklySlots[ref.id][day] = val;
            }
        });
    });

    inactiveRefs.forEach(id => {
        effectiveWeeklySlots[id] = { Lunes: 0, Martes: 0, Miercoles: 0, Jueves: 0 };
    });

    const session = {
        matches: forceReassignAll ? matches.map(m => ({ ...m, referee_id: '' })) : matches,
        referees: referees,
        period: 'curr-period-1',
        dynamicPairings: [],
        history: historyMatches,
        weeklySlots: Object.keys(effectiveWeeklySlots).length > 0 || inactiveRefs.length > 0 ? effectiveWeeklySlots : undefined,
        mandatoryDays: Object.keys(mandatoryDays).length > 0 ? mandatoryDays : undefined,
        forceReassignAll
    };
    const assignments = runAutoAssignment(session, isRetry ? newSeed : seed);
    setAssignmentResults(assignments);
    setLoading(false);
    
    if (assignments.length === 0) {
        toast.error('No hay partidos sin asignar disponibles.');
    } else {
        toast.success(isRetry ? 'Nueva combinación generada' : 'Asignación automática completada');
    }
  };

  const handleConfirm = async () => {
    if (!currentSeason) return;
    setLoading(true);
    try {
        const batch = writeBatch(db);
        assignmentResults.forEach(res => {
            if (res.refereeId && res.matchId) {
                batch.update(doc(db, 'seasons', currentSeason.id, 'matches', res.matchId), { referee_id: res.refereeId });
            }
        });
        await batch.commit();
        setAssignmentResults([]);
        setShowSummaryModal(false);
        toast.success('Asignaciones confirmadas y aplicadas al sistema');
    } catch (error) {
        console.error(error);
        toast.error('Error al confirmar asignaciones');
    } finally {
        setLoading(false);
    }
  };

  const refereeSummary = useMemo(() => {
    const summary: Record<string, { id: string, name: string, matches: number, matchesPerDay: Record<string, number> }> = {};
    if (!assignmentResults) return [];

    // Initialize all active referees
    referees.forEach(ref => {
        if (ref.status === 'active') {
            const matchesPerDayInit = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
            summary[ref.id] = { id: ref.id, name: ref.name, matches: 0, matchesPerDay: matchesPerDayInit };
        }
    });

    assignmentResults.forEach(res => {
        if (!res.refereeId) return;
        const ref = referees.find(r => r.id === res.refereeId);
        const match = matches.find(m => m.id === res.matchId);
        if (!ref || !match) return;

        if (!summary[ref.id]) {
            const matchesPerDayInit = days.reduce((acc, day) => { acc[day] = 0; return acc; }, {} as Record<string, number>);
            summary[ref.id] = { id: ref.id, name: ref.name, matches: 0, matchesPerDay: matchesPerDayInit };
        }
        summary[ref.id].matches += 1;
        if (match.day_name) {
            const normDay = match.day_name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const foundDay = days.find(d => d.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normDay);
            if (foundDay) {
                summary[ref.id].matchesPerDay[foundDay] = (summary[ref.id].matchesPerDay[foundDay] || 0) + 1;
            }
        }
    });

    return Object.values(summary).sort((a,b) => a.name.localeCompare(b.name));
  }, [assignmentResults, referees, matches]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Asignaciones</h2>
        <p className="text-sm text-slate-500 font-bold mt-1">Generación inteligente con restricciones.</p>
        
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                  type="checkbox" 
                  checked={forceReassignAll}
                  onChange={(e) => setForceReassignAll(e.target.checked)}
                  className="peer sr-only"
              />
              <div className="w-6 h-6 rounded border-2 border-slate-300 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors flex items-center justify-center">
                  <Check className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
              </div>
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">Ignorar Asignaciones Existentes</span>
          </label>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-app">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Comparativa de Carga</h3>
        <div className="grid grid-cols-5 gap-4 mb-8">
            {days.map(day => {
                const deficit = kpis.slotCounts[day] < kpis.matchCounts[day];
                return (
                    <div key={day} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-default ${deficit ? 'bg-rose-50 border-rose-200 hover:shadow-rose-500/20 shadow-md shadow-rose-100' : 'bg-slate-50 border-slate-100 hover:shadow-indigo-500/10'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <p className={`text-[10px] font-black uppercase text-center w-full ${deficit ? 'text-rose-500' : 'text-slate-400'}`}>
                                {day}
                            </p>
                        </div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className={`text-xl font-black ${deficit ? 'text-rose-700' : 'text-indigo-600'}`}>{kpis.matchCounts[day]}</span>
                            <span className={`text-[10px] font-bold ${deficit ? 'text-rose-300' : 'text-slate-300'}`}>part.</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className={`text-xl font-black ${deficit ? 'text-rose-700' : 'text-emerald-500'}`}>{kpis.slotCounts[day]}</span>
                            <span className={`text-[10px] font-bold ${deficit ? 'text-rose-300' : 'text-slate-300'}`}>slots</span>
                        </div>
                    </div>
                );
            })}
            <div className={`p-4 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-default flex flex-col justify-center ${kpis.totalSlots < kpis.totalMatches ? 'bg-rose-100 border-rose-300 hover:shadow-rose-500/30 shadow-md shadow-rose-200' : 'bg-indigo-50 border-indigo-100 hover:shadow-indigo-500/20'}`}>
                <p className={`text-[10px] font-black uppercase mb-2 text-center ${kpis.totalSlots < kpis.totalMatches ? 'text-rose-600' : 'text-indigo-400'}`}>TOTALES</p>
                <div className="flex justify-between items-baseline mb-1">
                    <span className={`text-xl font-black ${kpis.totalSlots < kpis.totalMatches ? 'text-rose-800' : 'text-indigo-700'}`}>{kpis.totalMatches}</span>
                    <span className={`text-[10px] font-bold ${kpis.totalSlots < kpis.totalMatches ? 'text-rose-400' : 'text-indigo-300'}`}>part.</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className={`text-xl font-black ${kpis.totalSlots < kpis.totalMatches ? 'text-rose-800' : 'text-emerald-600'}`}>{kpis.totalSlots}</span>
                    <span className={`text-[10px] font-bold ${kpis.totalSlots < kpis.totalMatches ? 'text-rose-400' : 'text-indigo-300'}`}>slots</span>
                </div>
            </div>
        </div>

        <div className="flex flex-wrap gap-4">
            <button 
                onClick={() => handleProcess(false)}
                disabled={loading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50"
            >
                {loading ? 'Procesando...' : <><Zap className="w-5 h-5"/> Ejecutar Asignación Automática</>}
            </button>

            <button 
                onClick={() => setShowConfigModal(true)}
                disabled={loading}
                className="px-8 py-4 bg-white text-slate-700 rounded-xl font-black text-sm uppercase shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-3 disabled:opacity-50"
            >
                <Settings className="w-5 h-5"/> Configurar Horas
            </button>

            <label className="cursor-pointer px-8 py-4 bg-white text-indigo-600 rounded-xl font-black text-sm uppercase border border-indigo-200 hover:bg-indigo-50 transition-all flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5" /> Subir Excel
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                />
            </label>

            {assignmentResults.length > 0 && (
                <button 
                    onClick={() => handleProcess(true)}
                    disabled={loading}
                    className="px-8 py-4 bg-slate-100 text-slate-700 rounded-xl font-black text-sm uppercase border border-slate-200 hover:bg-slate-200 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    <Upload className="w-5 h-5 rotate-180"/> Intentar Otra Combinación
                </button>
            )}
            
            {assignmentResults.length > 0 && (
                <button 
                    onClick={() => setShowSummaryModal(true)}
                    disabled={loading}
                    className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    <Calendar className="w-5 h-5"/> Ver Resumen de Asignación
                </button>
            )}
        </div>
      </div>

      {assignmentResults.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-app">
             <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 static uppercase">J</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Día</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Hora</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Campo</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Cat.</th>
                        <th className="px-4 py-3 text-right text-[9px] font-black text-slate-400 uppercase">Equipo A</th>
                        <th className="px-4 py-3 text-center text-[9px] font-black text-slate-400 uppercase">-</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Equipo B</th>
                        <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 uppercase">Árbitro / Info</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {[...assignmentResults].sort((a,b) => {
                        const m1 = matches.find(m => m.id === a.matchId);
                        const m2 = matches.find(m => m.id === b.matchId);
                        if (!m1 || !m2) return 0;
                        return m1.match_date.localeCompare(m2.match_date) || m1.field.localeCompare(m2.field) || m1.match_time.localeCompare(m2.match_time);
                    }).map((res: any, index: number) => {
                        const match = matches.find(m => m.id === res.matchId);
                        const ref = referees.find(r => r.id === res.refereeId);
                        const teamA = teams.find(t => t.id === match?.team_a_id);
                        const teamB = teams.find(t => t.id === match?.team_b_id);
                        
                        const rawDate = match?.match_date || '';
                        const dateParts = rawDate.split('-');
                        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : rawDate;

                        // Simplificar categoría: obviar lo de antes del guion
                        const displayComp = match?.competition?.includes('-') 
                            ? match.competition.split('-').slice(1).join('-').trim()
                            : match?.competition || '';

                        return (
                        <tr key={`${res.matchId}-${index}`} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
                            <td className="px-4 py-2 text-[10px] font-black text-slate-800 whitespace-nowrap">{match?.match_round || ''}</td>
                            <td className="px-4 py-2 text-[10px] font-black text-slate-800 whitespace-nowrap">{formattedDate}</td>
                            <td className="px-4 py-2 text-[10px] font-bold text-slate-500 whitespace-nowrap uppercase">{match?.day_name || ''}</td>
                            <td className="px-4 py-2 text-[10px] font-black text-indigo-600 whitespace-nowrap">{match?.match_time || ''}</td>
                            <td className="px-4 py-2 text-[10px] font-bold text-slate-700 whitespace-nowrap">{match?.field || ''}</td>
                            <td className="px-4 py-2 text-[10px] font-medium text-slate-600 whitespace-nowrap max-w-[120px] truncate" title={match?.competition}>{displayComp}</td>
                            <td className="px-4 py-2 text-[10px] font-black text-slate-900 whitespace-nowrap text-right">{teamA?.name || '...'}</td>
                            <td className="px-4 py-2 text-[10px] font-bold text-slate-300 px-1 text-center font-mono">vs</td>
                            <td className="px-4 py-2 text-[10px] font-black text-slate-900 whitespace-nowrap text-left">{teamB?.name || '...'}</td>
                            <td className="px-4 py-2 text-[10px] font-black text-indigo-600 whitespace-nowrap flex items-center gap-1.5">
                                <span className={`inline-block min-w-[80px] ${!ref ? 'text-red-600 font-bold' : ''}`}>
                                    {ref ? ref.name.toUpperCase() : (res.refereeId || 'SIN ASIGNAR')}
                                </span>
                                {res.reason && (
                                    <span 
                                        className={`text-[8px] font-bold px-1 py-0.5 rounded border cursor-help uppercase ${res.refereeId ? 'text-slate-400 border-slate-100 bg-slate-50' : 'text-red-500 border-red-100 bg-red-50'}`}
                                        title={res.reason}
                                    >
                                        {res.refereeId ? 'OK' : 'ERR'}
                                    </span>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
             </table>
        </div>
      )}

      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-[2rem] shadow-2xl border border-slate-200 p-8 w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Resumen de Asignaciones</h3>
                        <p className="text-sm text-slate-500 font-bold mt-1">Total de horas asignadas a cada árbitro y por día.</p>
                    </div>
                    <button onClick={() => setShowSummaryModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto mb-6 custom-scrollbar rounded-2xl border border-blue-100 shadow-inner bg-slate-50/50">
                    <table className="min-w-full divide-y divide-blue-50 table-fixed">
                        <thead className="bg-blue-50/30 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-48 shrink-0 bg-blue-50/30">Árbitro</th>
                                {days.map(day => (
                                    <th key={day} className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 bg-blue-50/30">
                                        {day}
                                    </th>
                                ))}
                                <th className="px-4 py-4 text-center text-[10px] font-black text-indigo-600 uppercase tracking-widest w-28 bg-blue-100/30">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                            {refereeSummary.map(ref => {
                                return (
                                <tr key={ref.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-5 py-3 text-xs font-black text-slate-800 truncate">
                                        {ref.name}
                                    </td>
                                    {days.map(day => (
                                        <td key={day} className="px-4 py-3 text-center text-sm font-bold text-slate-700">
                                            {ref.matchesPerDay[day] || <span className="text-slate-300">-</span>}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center text-sm font-black text-indigo-600 bg-indigo-50/30">
                                        {ref.matches}
                                    </td>
                                </tr>
                                );
                            })}
                            {refereeSummary.length === 0 && (
                                <tr>
                                    <td colSpan={days.length + 2} className="px-4 py-8 text-center font-bold text-slate-400">
                                        No hay asignaciones para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-slate-50 sticky bottom-0 z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <td className="px-5 py-4 text-sm font-black text-slate-800 uppercase text-right">Totales:</td>
                                {days.map(day => {
                                    const colTotal = refereeSummary.reduce((sum, ref) => sum + (ref.matchesPerDay[day] || 0), 0);
                                    return (
                                        <td key={`total-${day}`} className="px-4 py-4 text-center text-sm font-black text-slate-800">
                                            {colTotal}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-4 text-center text-base font-black text-indigo-700 bg-indigo-50/50">
                                    {refereeSummary.reduce((sum, ref) => sum + ref.matches, 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end gap-3 mt-auto shrink-0 pt-4">
                    <button 
                        onClick={() => setShowSummaryModal(false)}
                        className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => { setShowSummaryModal(false); handleProcess(true); }}
                        disabled={loading}
                        className="px-6 py-3.5 bg-white text-slate-700 rounded-xl font-black text-xs uppercase shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Upload className="w-4 h-4 rotate-180"/> Intentar Otra Combinación
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={loading}
                        className="px-6 py-3.5 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : <><Check className="w-4 h-4"/> Confirmar y Guardar</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Settings className="w-6 h-6 text-indigo-500" />
                            Configurar Disponibilidad
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-2">Ajusta el número de partidos (horas) disponibles por día para cada árbitro. Los valores aquí introducidos priorizarán su disponibilidad base.</p>
                    </div>
                    <button onClick={() => setShowConfigModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors active:scale-95 bg-slate-50">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto mb-6 custom-scrollbar rounded-2xl border border-slate-200 shadow-inner bg-white">
                    <table className="min-w-full divide-y divide-slate-200 table-fixed">
                        <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest w-48 shrink-0 bg-slate-50">Árbitro</th>
                                <th className="px-3 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 bg-slate-50">Inactivo</th>
                                {days.map(day => (
                                    <th key={day} className="px-4 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest w-28 bg-slate-50">
                                        {day}
                                    </th>
                                ))}
                                <th className="px-4 py-4 text-center text-[10px] font-black text-indigo-600 uppercase tracking-widest w-28 bg-slate-50/50">Total Semanal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {referees.filter(r => r.status === 'active').sort((a,b) => a.name.localeCompare(b.name)).map(ref => {
                                const isInactive = inactiveRefs.includes(ref.id);

                                let rowTotal = 0;

                                return (
                                <tr key={ref.id} className={`hover:bg-slate-50/80 transition-colors ${isInactive ? 'opacity-50 grayscale bg-slate-50' : ''}`}>
                                    <td className="px-5 py-3 text-xs font-black text-slate-800 truncate" title={ref.name}>
                                        {ref.name}
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <input 
                                            type="checkbox"
                                            checked={isInactive}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                if (checked) {
                                                    setInactiveRefs(prev => [...prev, ref.id]);
                                                } else {
                                                    setInactiveRefs(prev => prev.filter(id => id !== ref.id));
                                                }
                                            }}
                                            className="w-4 h-4 text-rose-500 rounded focus:ring-rose-500 border-slate-300 cursor-pointer"
                                            title="Desactivar árbitro toda la semana"
                                        />
                                    </td>
                                    {days.map(day => {
                                        let val = 0;
                                        if (isInactive) {
                                            val = 0;
                                        } else if (weeklySlots[ref.id] && weeklySlots[ref.id][day] !== undefined) {
                                            val = weeklySlots[ref.id][day];
                                        } else {
                                            const normDay = day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                            const dispKey = Object.keys(ref.disponibilidad || {}).find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normDay);
                                            val = dispKey ? (ref.disponibilidad![dispKey]?.length || 0) : 0;
                                        }
                                        rowTotal += val;

                                        const isMandatory = mandatoryDays[ref.id] && mandatoryDays[ref.id].includes(day);
                                        return (
                                            <td key={day} className="px-4 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        disabled={isInactive}
                                                        value={val}
                                                        onChange={(e) => {
                                                            const newVal = parseInt(e.target.value) || 0;
                                                            setWeeklySlots(prev => ({
                                                                ...prev,
                                                                [ref.id]: {
                                                                    ...(prev[ref.id] || {}),
                                                                    [day]: newVal
                                                                }
                                                            }));
                                                        }}
                                                        className={`w-14 p-1.5 text-center text-sm font-bold border rounded-lg outline-none transition-all
                                                            ${isInactive ? 'bg-transparent border-transparent cursor-not-allowed' : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'}
                                                            ${val === 0 ? 'text-rose-500' : 'text-slate-700'}
                                                        `}
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={isInactive || val === 0}
                                                        onClick={() => {
                                                            setMandatoryDays(prev => {
                                                                const current = prev[ref.id] || [];
                                                                if (current.includes(day)) {
                                                                    return { ...prev, [ref.id]: current.filter(d => d !== day) };
                                                                } else {
                                                                    return { ...prev, [ref.id]: [...current, day] };
                                                                }
                                                            });
                                                        }}
                                                        className={`p-1 rounded-md transition-colors ${
                                                            isInactive || val === 0 ? 'opacity-30 cursor-not-allowed' :
                                                            isMandatory ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                        title="Marcar como día obligatorio"
                                                    >
                                                        <Pin className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    })}
                                    <td className="px-4 py-3 text-center bg-slate-50/50">
                                        <span className={`text-sm font-black ${rowTotal === 0 ? 'text-rose-500' : 'text-indigo-600'}`}>{rowTotal}</span>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 sticky bottom-0 z-20 shadow-[0_-1px_2px_rgba(0,0,0,0.05)] border-t border-slate-200">
                            <tr>
                                <td colSpan={2} className="px-5 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Total Horas por Día
                                </td>
                                {days.map(day => {
                                    const colTotal = referees.filter(r => r.status === 'active').reduce((sum, ref) => {
                                        if (inactiveRefs.includes(ref.id)) return sum;
                                        let val = 0;
                                        if (weeklySlots[ref.id] && weeklySlots[ref.id][day] !== undefined) {
                                            val = weeklySlots[ref.id][day];
                                        } else {
                                            const normDay = day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                            const dispKey = Object.keys(ref.disponibilidad || {}).find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normDay);
                                            val = dispKey ? (ref.disponibilidad![dispKey]?.length || 0) : 0;
                                        }
                                        return sum + val;
                                    }, 0);
                                    return (
                                        <td key={`total-${day}`} className={`px-4 py-4 text-center text-sm font-black ${colTotal === 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                                            {colTotal}
                                        </td>
                                    );
                                })}
                                <td className="px-4 py-4 text-center text-base font-black text-indigo-700 bg-indigo-50/50">
                                    {referees.filter(r => r.status === 'active').reduce((totalSum, ref) => {
                                        if (inactiveRefs.includes(ref.id)) return totalSum;
                                        return totalSum + days.reduce((sum, day) => {
                                            let val = 0;
                                            if (weeklySlots[ref.id] && weeklySlots[ref.id][day] !== undefined) {
                                                val = weeklySlots[ref.id][day];
                                            } else {
                                                const normDay = day.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                const dispKey = Object.keys(ref.disponibilidad || {}).find(k => k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normDay);
                                                val = dispKey ? (ref.disponibilidad![dispKey]?.length || 0) : 0;
                                            }
                                            return sum + val;
                                        }, 0);
                                    }, 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="flex justify-end gap-3 mt-auto shrink-0 pt-4">
                    <button 
                        onClick={() => setShowConfigModal(false)}
                        className="px-6 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-200 transition-colors active:scale-95"
                    >
                        Cerrar
                    </button>
                    <button 
                        onClick={handleSaveConfig}
                        disabled={loading}
                        className={`px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-[0_8px_16px_-6px_rgba(99,102,241,0.5)] transition-all flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 active:scale-95 hover:-translate-y-0.5'}`}
                    >
                        <Save className="w-4 h-4"/> Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
