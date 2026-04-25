import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Zap, Calendar, Upload, Check } from 'lucide-react';
import { useData } from '../../store/DataContext';
import { runAutoAssignment } from '../../services/auto_assigner/AutoAssigner';
import { db } from '../../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';

export default function AdminAutoAssigner() {
  const { matches, referees, teams, assignmentResults, setAssignmentResults } = useData();
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);

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
  }, [matches, referees]);

  const handleProcess = (isRetry = false) => {
    setLoading(true);
    const newSeed = isRetry ? Math.floor(Math.random() * 1000) : 0;
    if (isRetry) setSeed(newSeed);

    const session = {
        matches: matches,
        referees: referees,
        period: 'curr-period-1',
        dynamicPairings: [],
        history: [] 
    };
    const assignments = runAutoAssignment(session, isRetry ? newSeed : seed);
    setAssignmentResults(assignments);
    setLoading(false);
    toast.success(isRetry ? 'Nueva combinación generada' : 'Asignación automática completada');
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
        const batch = writeBatch(db);
        assignmentResults.forEach(res => {
            if (res.refereeId && res.matchId) {
                batch.update(doc(db, 'matches', res.matchId), { referee_id: res.refereeId });
            }
        });
        await batch.commit();
        setAssignmentResults([]);
        toast.success('Asignaciones confirmadas y aplicadas al sistema');
    } catch (error) {
        console.error(error);
        toast.error('Error al confirmar asignaciones');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Asignaciones</h2>
        <p className="text-sm text-slate-500 font-bold mt-1">Generación inteligente con restricciones.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-app">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Comparativa de Carga</h3>
        <div className="grid grid-cols-5 gap-4 mb-8">
            {days.map(day => (
                <div key={day} className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/10 cursor-default">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-center">{day}</p>
                    <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xl font-black text-indigo-600">{kpis.matchCounts[day]}</span>
                        <span className="text-[10px] font-bold text-slate-300">part.</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xl font-black text-emerald-500">{kpis.slotCounts[day]}</span>
                        <span className="text-[10px] font-bold text-slate-300">slots</span>
                    </div>
                </div>
            ))}
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20 cursor-default flex flex-col justify-center">
                <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 text-center">TOTALES</p>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xl font-black text-indigo-700">{kpis.totalMatches}</span>
                    <span className="text-[10px] font-bold text-indigo-300">part.</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-xl font-black text-emerald-600">{kpis.totalSlots}</span>
                    <span className="text-[10px] font-bold text-indigo-300">slots</span>
                </div>
            </div>
        </div>

        <div className="flex gap-4">
            <button 
                onClick={() => handleProcess(false)}
                disabled={loading}
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50"
            >
                {loading ? 'Procesando...' : <><Zap className="w-5 h-5"/> Ejecutar Asignación Automática</>}
            </button>

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
                    onClick={handleConfirm}
                    disabled={loading}
                    className="px-8 py-4 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                    <Check className="w-5 h-5"/> Confirmar y Guardar Asignaciones
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
                    }).map((res: any, idx: number) => {
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
                        <tr key={idx} className="hover:bg-slate-50 border-b border-slate-50 last:border-0">
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
    </div>
  );
}
