import React, { useState } from 'react';
import { useData } from '../store/DataContext';
import { Calendar as CalendarIcon, MapPin, Clock, Users, ArrowLeft, Shield } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfISOWeek, endOfISOWeek, addMonths, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateDisplay, formatTimeDisplay } from '../utils/formatters';

export default function PublicCalendar() {
  const { matches, referees, teams, hiddenPeriods, settings } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [searchRefereeId, setSearchRefereeId] = useState('');
  
  // Filter out hidden periods
  const visibleMatches = matches.filter(m => !hiddenPeriods.includes(m.period || 'Sin periodo'));

  const periodDates = React.useMemo(() => {
    if (visibleMatches.length === 0) return null;
    const sorted = [...visibleMatches].sort((a, b) => a.match_date.localeCompare(b.match_date));
    return {
      start: sorted[0].match_date,
      end: sorted[sorted.length - 1].match_date
    };
  }, [visibleMatches]);

  const days = React.useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const calendarStart = startOfISOWeek(start);
    const calendarEnd = endOfISOWeek(end);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const matchesByDay = (date: Date) => {
    return visibleMatches.filter(m => isSameDay(new Date(m.match_date + 'T12:00:00'), date));
  };

  const filteredMatches = React.useMemo(() => {
    let result = [...visibleMatches];
    
    // Sort by Date, then Field, then Time
    result.sort((a, b) => {
      const dateComp = a.match_date.localeCompare(b.match_date);
      if (dateComp !== 0) return dateComp;
      const fieldComp = a.field.localeCompare(b.field);
      if (fieldComp !== 0) return fieldComp;
      return a.match_time.localeCompare(b.match_time);
    });

    if (searchRefereeId) {
      return result.filter(m => m.referee_id === searchRefereeId);
    }
    
    if (selectedDate) {
      return result.filter(m => isSameDay(new Date(m.match_date + 'T12:00:00'), selectedDate));
    }

    return [];
  }, [visibleMatches, searchRefereeId, selectedDate]);

  const getRefereeColor = (id: string) => {
    const colors = [
      { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
      { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
      { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500' },
      { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500' },
      { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500' },
      { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
      { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
      { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
      { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-600' },
      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300', dot: 'bg-zinc-600' },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getDayColor = (day?: string) => {
    const d = day?.toLowerCase() || '';
    if (d.includes('lun')) return 'bg-blue-100 text-blue-700';
    if (d.includes('mar')) return 'bg-emerald-100 text-emerald-700';
    if (d.includes('mie') || d.includes('mié')) return 'bg-amber-100 text-amber-700';
    if (d.includes('jue')) return 'bg-violet-100 text-violet-700';
    if (d.includes('vie')) return 'bg-rose-100 text-rose-700';
    if (d.includes('sab') || d.includes('sáb')) return 'bg-slate-800 text-white';
    if (d.includes('dom')) return 'bg-red-600 text-white';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40 px-4 py-8 shadow-sm">
        {settings?.logo_url && (
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <img 
                  src={settings.logo_url} 
                  alt="Logo Campeonato" 
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-sm"
                  referrerPolicy="no-referrer"
                />
            </div>
        )}
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
          <div className="flex flex-col items-center gap-4">
            <div>
              <h1 className="text-base md:text-xl font-black text-gray-900 tracking-tighter leading-tight uppercase">
                FUTBOL 7 LA AMISTAD | SANTA CRUZ DE TENERIFE 
                <span className="block text-blue-600 mt-1">TEMPORADA 2025/2026</span>
              </h1>
              {periodDates && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                    CALENDARIO CON DESIGNACIONES DEL PERIODO: <span className="text-slate-600 font-black">Del {formatDateDisplay(periodDates.start)} al {formatDateDisplay(periodDates.end)}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete('view');
                url.searchParams.delete('public');
                url.hash = '/login';
                window.location.href = url.toString();
              }}
              className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Busca a tu Árbitro</label>
              <div className="relative">
                <select
                  value={searchRefereeId}
                  onChange={(e) => {
                    setSearchRefereeId(e.target.value);
                    if (e.target.value) setSelectedDate(null);
                  }}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                >
                  <option value="">-- Todos los Árbitros --</option>
                  {referees
                    .filter(r => r.status === 'active')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((r, idx) => (
                      <option key={`pubcal-ref-${r.id || 'no-id'}-${idx}`} value={r.id}>{r.name}</option>
                    ))
                  }
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {searchRefereeId && (
              <button
                onClick={() => {
                  setSearchRefereeId('');
                  setSelectedDate(new Date());
                }}
                className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
              >
                Limpiar Filtros y Volver al Calendario
              </button>
            )}
          </div>
        </div>

        {!searchRefereeId && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-gray-400 py-2">{d}</div>
              ))}
              {days.map((day) => {
                const hasMatches = matchesByDay(day).length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all active:scale-95
                      ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'hover:bg-gray-50'}
                      ${!isCurrentMonth && !isSelected ? 'opacity-30' : ''}
                    `}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{format(day, 'd')}</span>
                    {hasMatches && !isSelected && (
                      <div className="absolute bottom-1.5 w-1 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {searchRefereeId ? (
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                Partidos asignados a: 
                <span className={`text-[10px] px-3 py-1 rounded-full uppercase font-black ${getRefereeColor(searchRefereeId).bg} ${getRefereeColor(searchRefereeId).text}`}>
                  {referees.find(r => r.id === searchRefereeId)?.name}
                </span>
              </h3>
            ) : (
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                {selectedDate ? format(selectedDate, "eeee d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                {selectedDate && (
                  <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter ${getDayColor(format(selectedDate, 'eeee', { locale: es }))}`}>
                    {format(selectedDate, 'eeee', { locale: es })}
                  </span>
                )}
              </h3>
            )}
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
              {filteredMatches.length} Resultado{filteredMatches.length !== 1 ? 's' : ''}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {filteredMatches.length > 0 ? (
              <motion.div 
                key={searchRefereeId || selectedDate?.toISOString()}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="grid gap-3"
              >
                {filteredMatches.map((match, mi) => {
                  const referee = referees.find(r => r.id === match.referee_id);
                  const teamA = teams.find(t => t.id === match.team_a_id);
                  const teamB = teams.find(t => t.id === match.team_b_id);

                  return (
                    <div key={`m-${match.id || 'no-id'}-${mi}`} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                            <span className="text-sm font-black text-gray-900">{formatTimeDisplay(match.match_time)}</span>
                          </div>
                          {searchRefereeId && (
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-700 uppercase">{formatDateDisplay(match.match_date)}</span>
                             </div>
                          )}
                        </div>
                        <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{match.field}</span>
                          {match.day_name && (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black ml-1 ${getDayColor(match.day_name)}`}>
                              {match.day_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex-1 text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Local</p>
                          <p className="text-sm font-black text-gray-900 leading-tight">{teamA?.name || match.team_a_name}</p>
                        </div>
                        <div className="text-[10px] font-black text-gray-300 italic">VS</div>
                        <div className="flex-1 text-center">
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Visitante</p>
                          <p className="text-sm font-black text-gray-900 leading-tight">{teamB?.name || match.team_b_name}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {referee?.photo_url ? (
                            <img src={referee.photo_url} alt={referee.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                              <Users className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase">Designación</p>
                            {referee ? (
                              <div className={`inline-flex items-center px-1.5 py-0 rounded-lg border text-[10px] font-black uppercase ${getRefereeColor(referee.id).bg} ${getRefereeColor(referee.id).text} ${getRefereeColor(referee.id).border}`}>
                                <div className={`w-1 h-1 rounded-full mr-1.5 ${getRefereeColor(referee.id).dot}`}></div>
                                {referee.name}
                              </div>
                            ) : (
                              <p className="text-[10px] font-black text-red-500 italic uppercase">Pendiente</p>
                            )}
                          </div>
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                          Jornada {match.match_round}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200"
              >
                <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold text-sm">
                  {searchRefereeId ? 'Este árbitro no tiene partidos asignados' : 'No hay partidos programados para este día'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
