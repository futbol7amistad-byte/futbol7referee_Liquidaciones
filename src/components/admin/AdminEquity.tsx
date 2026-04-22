import React, { useState } from 'react';
import { useData } from '../../store/DataContext';
import { Scale, Sparkles, BarChart2, X } from 'lucide-react';

export default function AdminEquity() {
  const { referees, teams, matches } = useData();
  const [analysis, setAnalysis] = useState<string | null>(null);
  
  const sortedReferees = [...referees].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const sortedTeams = [...teams].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  // Counts: refereeId -> teamId -> count
  const counts: Record<string, Record<string, number>> = {};
  
  matches.forEach(m => {
    const refId = m.referee_id;
    if (!refId) return;
    if (!counts[refId]) counts[refId] = {};
    
    [m.team_a_id, m.team_b_id].forEach(teamId => {
      if (!teamId) return;
      counts[refId][teamId] = (counts[refId][teamId] || 0) + 1;
    });
  });

  const runAnalysis = () => {
    let report = "Análisis Detallado de Equidad:\n\n";
    const historyLimit = 10;
    const recurrencyLimit = 5;
    const recurrenceThreshold = 3;
    const consecutiveThreshold = 2;

    // 1. Análisis de Recurrencia (>=3 veces en los últimos 5 periodos)
    report += "--- Análisis de Recurrencia (>=3 veces en últimos 5 periodos) ---\n";
    let recurrencyIssues = false;
    // (Logic simplified for demonstration; requires period-based history analysis)
    report += "No procede su análisis (requiere historial cronológico).\n\n";

    // 2. Análisis de "Carencia de Arbitraje" (No arbitrado en los últimos 10 periodos)
    report += "--- Análisis de Carencia de Arbitraje (No arbitrado en últimos 10 periodos) ---\n";
    let coverageIssues = false;
    report += "No procede su análisis (requiere historial cronológico).\n\n";

    // 3. Análisis de Coincidencia Consecutiva (>=2 jornadas seguidas)
    report += "--- Análisis de Coincidencia Consecutiva (>=2 jornadas seguidas) ---\n";
    let consecutiveIssues = false;
    report += "No procede su análisis (requiere historial cronológico).\n\n";

    report += "\n*Nota: El análisis avanzado requiere historial de jornadas/periodos para calcular tendencias correctamente.";

    setAnalysis(report);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 px-1">CUADRANTE DE EQUIDAD</p>
          <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">HISTÓRICO DE DESIGNACIONES</h2>
        </div>
        <button 
          onClick={runAnalysis}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Analizar Equidad
        </button>
      </div>

      {analysis && (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-app text-slate-700 relative">
          <button 
            onClick={() => setAnalysis(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="whitespace-pre-line text-sm font-bold">
            <h3 className="text-lg font-black text-indigo-900 mb-4 uppercase tracking-tight">Análisis Detallado de Equidad</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500" /> A) Análisis de Recurrencia
                </h4>
                <p className="text-xs pl-4">— No procede su análisis (requiere historial cronológico).</p>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500" /> B) Análisis de Carencia de Arbitraje
                </h4>
                <p className="text-xs pl-4">— No procede su análisis (requiere historial cronológico).</p>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500" /> C) Análisis de Coincidencia Consecutiva
                </h4>
                <p className="text-xs pl-4">— No procede su análisis (requiere historial cronológico).</p>
              </div>
            </div>

            <p className="mt-8 text-[10px] text-slate-400 italic">* Nota: El análisis avanzado requiere historial de jornadas/periodos para calcular tendencias correctamente.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-app border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-xs text-left border-separate border-spacing-0">
            <thead className="bg-slate-50 sticky top-0 z-30 shadow-[0_2px_5px_rgba(0,0,0,0.05)]">
              <tr>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 sticky left-0 bg-slate-50 z-40 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Árbitro</th>
                {sortedTeams.map(t => (
                  <th key={t.id} className="px-4 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 text-center min-w-[60px]">{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedReferees.map((r, index) => (
                <tr 
                  key={r.id} 
                  className={`${index % 2 !== 0 ? 'bg-slate-100/50' : 'bg-white'} hover:bg-indigo-100/50 transition-colors group`}
                >
                  <td className="px-6 py-4 font-black uppercase tracking-tight text-slate-900 border-b border-slate-200 sticky left-0 bg-inherit z-10 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                    {r.name}
                  </td>
                  {sortedTeams.map(t => {
                    const count = counts[r.id]?.[t.id] || 0;
                    return (
                      <td 
                        key={t.id} 
                        className={`px-4 py-4 text-center font-bold border-b border-slate-200 ${count > 0 ? 'text-indigo-600' : 'text-slate-300'}`}
                      >
                        {count || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
