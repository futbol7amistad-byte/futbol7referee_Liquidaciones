import React, { useState, useRef } from 'react';
import { useData } from '../../store/DataContext';
import { Calendar, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ChevronDown, User, ArrowRight, RefreshCw, Shield, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Match, Referee } from '../../types';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/formatters';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfISOWeek, endOfISOWeek, isSameMonth, isSameDay, isWithinInterval, format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminCalendar() {
  const { matches: matchesRaw, referees, teams, importMatches, reassignReferee, clearMatchesInRange, deleteMatch, clearAllMatches, clearMatchesByPeriod, hiddenPeriods } = useData();
  const matches = matchesRaw.filter(m => !hiddenPeriods.includes(m.period || 'Sin periodo'));
  const [dragActive, setDragActive] = useState(false);
  const [tempMatches, setTempMatches] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Helper to generate calendar days
  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start: startOfISOWeek(start), end: endOfISOWeek(end) });
  };

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (date < startDate) {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  };
  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [reassignMatch, setReassignMatch] = useState<Match | null>(null);
  const [consecutiveMatch, setConsecutiveMatch] = useState<Match | null>(null);
  const [showConsecutiveModal, setShowConsecutiveModal] = useState(false);
  const [newRefereeId, setNewRefereeId] = useState('');

  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Use header: 1 to get all rows as arrays for more control
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (rows.length < 2) return;

      const headers = rows[0].map(h => String(h || '').trim());
      const dataRows = rows.slice(1);
      
      const mappedMatches = dataRows.filter(row => row.length > 0).map((row: any[]) => {
        const getVal = (possibleHeaders: string[]) => {
          const index = headers.findIndex(h => possibleHeaders.includes(h));
          const val = index !== -1 ? row[index] : '';
          return (val === undefined || val === null) ? '' : String(val).trim();
        };

        const teamAName = getVal(['EquipoA', 'Equipo A', 'Equipo Local', 'Local']);
        const teamBName = getVal(['EquipoB', 'Equipo B', 'Equipo Visitante', 'Visitante']);
        const refereeName = getVal(['Arbitro', 'Árbitro', 'Arbitro ', 'Referee']);
        const field = getVal(['Campo', 'Lugar', 'Pista']);
        const competition = getVal(['Categoría', 'Categoria', 'Division', 'Competicion']);
        const round = getVal(['Jornada', 'Semana', 'Round']);
        const time = getVal(['Hora', 'Horario']);
        const dayName = getVal(['Dia de la Semana', 'Día de la Semana', 'Dia', 'Día']);
        const dateRaw = getVal(['Fecha', 'Date']);

        // Find team IDs by name (for preview)
        const teamA = teams.find(t => t.name.toLowerCase() === teamAName.toLowerCase())?.id || 't-unknown';
        const teamB = teams.find(t => t.name.toLowerCase() === teamBName.toLowerCase())?.id || 't-unknown';
        const referee = referees.find(r => r.name.toLowerCase() === refereeName.toLowerCase())?.id || 'r-unassigned';
        
        // Normalize Date to YYYY-MM-DD for internal storage
        let matchDate = dateRaw;
        const formattedDate = formatDateDisplay(dateRaw);
        if (formattedDate.includes('/')) {
          const [d, m, y] = formattedDate.split('/');
          matchDate = `${y}-${m}-${d}`;
        }

        // Normalize Time to HH:MM for internal storage
        const matchTime = formatTimeDisplay(time);

        return {
          match_round: round,
          match_date: matchDate,
          match_time: matchTime,
          field: field,
          competition: competition,
          team_a_id: teamA,
          team_b_id: teamB,
          referee_id: referee,
          team_a_name: teamAName,
          team_b_name: teamBName,
          referee_name: refereeName,
          day_name: dayName
        };
      }).filter(m => m.team_a_name && m.team_b_name); // Only keep valid matches

      setTempMatches(mappedMatches);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadMatches = () => {
    if (!startDate || !endDate) {
      setShowErrorModal('Por favor, selecciona un rango de fechas.');
      return;
    }

    // Convert Date objects to YYYY-MM-DD strings
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    // Check for conflicts
    const conflicts = matches.filter(m => m.match_date >= startStr && m.match_date <= endStr);
    if (conflicts.length > 0) {
      setShowConflictModal(true);
    } else {
      confirmImport();
    }
  };

  const confirmImport = () => {
    if (!startDate || !endDate) return;
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    importMatches(tempMatches, `${startStr}_to_${endStr}`, startStr, endStr);
    setShowConflictModal(false);
    setShowSuccessModal(true);
    setTempMatches([]);
  };

  const handleReassign = (match: Match) => {
    setReassignMatch(match);
    setShowConflictModal(false); // Reuse modal logic or create new
  };

  const confirmReassignment = (reassignBoth: boolean = false) => {
    console.log('confirmReassignment called');
    console.log('reassignMatch:', reassignMatch);
    console.log('newRefereeId:', newRefereeId);
    if (reassignMatch && newRefereeId) {
      console.log('Reassigning match:', reassignMatch.id, 'to referee:', newRefereeId);
      reassignReferee(reassignMatch.id, newRefereeId);
      if (reassignBoth && consecutiveMatch) {
        console.log('Reassigning consecutive match:', consecutiveMatch.id, 'to referee:', newRefereeId);
        reassignReferee(consecutiveMatch.id, newRefereeId);
      }
      setReassignMatch(null);
      setConsecutiveMatch(null);
      setShowConsecutiveModal(false);
      setNewRefereeId('');
    } else {
      console.log('Missing reassignMatch or newRefereeId in confirmReassignment');
    }
  };

  const handleInitialReassignRequest = () => {
    console.log('handleInitialReassignRequest called');
    console.log('reassignMatch:', reassignMatch);
    console.log('newRefereeId:', newRefereeId);
    if (!reassignMatch || !newRefereeId) {
      console.log('Missing reassignMatch or newRefereeId');
      return;
    }

    // Find consecutive match: same day, same field, same ORIGINAL referee
    const consecutive = matches.find(m => 
      m.id !== reassignMatch.id &&
      m.match_date === reassignMatch.match_date &&
      m.field === reassignMatch.field &&
      m.referee_id === reassignMatch.referee_id
    );

    console.log('consecutive match found:', consecutive);

    if (consecutive) {
      setConsecutiveMatch(consecutive);
      setShowConsecutiveModal(true);
    } else {
      confirmReassignment(false);
    }
  };

  const selectedRefereeMatches = matches.filter(m => m.referee_id === selectedRefereeId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-6 h-6 mr-3 text-blue-600" />
          Gestión de Calendario
        </h2>
        <p className="text-gray-500 font-medium">Importa partidos desde Excel y gestiona designaciones arbitrales</p>
      </div>

      {/* Step 1: Planning Period */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          Paso 1: Configurar Período de Planificación
        </h3>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Define las fechas para las que deseas generar los horarios automáticamente
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"><ChevronLeft className="w-5 h-5" /></button>
            <h4 className="font-bold text-lg capitalize text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h4>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg text-gray-900"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="text-center font-bold text-xs text-gray-400">{d}</div>)}
            {getDaysInMonth(currentMonth).map(day => (
              <button 
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`p-2 rounded-lg text-sm font-bold transition-colors ${
                  isSameDay(day, startDate || new Date(0)) || isSameDay(day, endDate || new Date(0)) 
                    ? 'bg-blue-600 text-white' 
                    : isWithinInterval(day, { start: startDate || new Date(0), end: endDate || new Date(0) }) 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {format(day, 'd')}
              </button>
            ))}
          </div>
        </div>
        
        {startDate && endDate && (
          <div className="mt-4 flex items-center bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 shadow-sm">
            <Calendar className="w-4 h-4 text-emerald-600 mr-3" />
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider leading-none mb-1">Periodo Seleccionado</p>
              <p className="text-xs font-bold text-emerald-800">Del {format(startDate, 'dd/MM/yyyy')} al {format(endDate, 'dd/MM/yyyy')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Upload */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-blue-600" />
          Paso 2: Cargar Calendario Maestro
        </h3>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Sube el fichero .xlsx con las columnas: Jornada, Fecha, Dia de la Semana, Hora, Campo, Categoría, EquipoA, EquipoB y Arbitro
        </p>

        <div 
          className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleChange}
          />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-gray-900 mb-1">Arrastra el archivo Excel aquí</p>
            <p className="text-sm text-gray-400 font-medium mb-4">o haz clic para seleccionar</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Seleccionar Archivo
            </button>
          </div>
        </div>

        {tempMatches.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm font-bold text-gray-600">
                Encuentros en memoria: <span className="ml-2 text-blue-600">{tempMatches.length}</span>
                <span className="ml-4 flex items-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Todos válidos
                </span>
              </div>
              <button
                onClick={handleLoadMatches}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all"
              >
                Cargar Encuentros
              </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">J</th>
                    <th className="px-4 py-3 text-left">Fecha / Día</th>
                    <th className="px-4 py-3 text-left">Hora</th>
                    <th className="px-4 py-3 text-left">Campo</th>
                    <th className="px-4 py-3 text-left">Categoría</th>
                    <th className="px-4 py-3 text-left">Equipo A</th>
                    <th className="px-4 py-3 text-left">Equipo B</th>
                    <th className="px-4 py-3 text-left">Árbitro</th>
                    <th className="px-4 py-3 text-center">✓</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {tempMatches.map((m, i) => (
                    <tr key={i} className="text-xs font-medium text-gray-600">
                      <td className="px-4 py-3">{m.match_round}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{formatDateDisplay(m.match_date)}</span>
                          <span className="text-[10px] text-gray-400 uppercase">{m.day_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatTimeDisplay(m.match_time)}</td>
                      <td className="px-4 py-3">{m.field}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate">{m.competition}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{m.team_a_name}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{m.team_b_name}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{m.referee_name}</td>
                      <td className="px-4 py-3 text-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Referee Reassignment */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-blue-600" />
          Reasignación de Árbitros
        </h3>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Selecciona un árbitro para ver sus partidos asignados y reasignarlos
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Seleccionar Árbitro</label>
            <div className="relative">
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-inner appearance-none text-gray-900 font-bold"
                value={selectedRefereeId}
                onChange={(e) => setSelectedRefereeId(e.target.value)}
              >
                <option value="">-- Selecciona un árbitro --</option>
                {referees.map(ref => (
                  <option key={ref.id} value={ref.id}>{ref.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {selectedRefereeId && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-700">Partidos asignados: {selectedRefereeMatches.length}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRefereeMatches.map(match => {
                  const teamA = teams.find(t => t.id === match.team_a_id);
                  const teamB = teams.find(t => t.id === match.team_b_id);
                  return (
                    <div key={match.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center text-xs font-bold text-gray-900 mb-1">
                          <Shield className="w-3 h-3 mr-1.5 text-emerald-500" />
                          {teamA?.name} vs {teamB?.name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">
                          Jornada {match.match_round} · {formatDateDisplay(match.match_date)} · {formatTimeDisplay(match.match_time)} · {match.field}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleReassign(match)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-all"
                      >
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        Reasignar
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Matches Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Partidos Cargados en el Sistema</h3>
            <p className="text-sm text-gray-500 font-medium">Total: {matches.length} partidos</p>
          </div>
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Borrar Todo
          </button>
        </div>

        {/* Group matches by period */}
        {Array.from(new Set(matches.map(m => m.period || 'Sin periodo'))).map(period => {
          const periodMatches = matches.filter(m => (m.period || 'Sin periodo') === period);
          return (
            <div key={period} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                  {period === 'Sin periodo' ? 'Sin periodo' : `Periodo: ${(period as string).split('_to_').map(formatDateDisplay).join(' al ')}`}
                </h4>
                <button
                  onClick={() => setShowDeletePeriodModal(period)}
                  className="flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Limpiar Periodo
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-gray-100 mb-4">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">J</th>
                      <th className="px-4 py-3 text-left">Fecha</th>
                      <th className="px-4 py-3 text-left">Hora</th>
                      <th className="px-4 py-3 text-left">Campo</th>
                      <th className="px-4 py-3 text-left">Categoría</th>
                      <th className="px-4 py-3 text-left">Equipo A</th>
                      <th className="px-4 py-3 text-left">Equipo B</th>
                      <th className="px-4 py-3 text-left">Árbitro</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {periodMatches.map((m, index) => {
                      const teamA = teams.find(t => t.id === m.team_a_id);
                      const teamB = teams.find(t => t.id === m.team_b_id);
                      const referee = referees.find(r => r.id === m.referee_id);
                      return (
                        <tr key={m.id} className="text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="text-[10px] text-gray-400 mr-2 font-bold w-6">#{index + 1}</span>
                              {m.match_round}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{formatDateDisplay(m.match_date)}</span>
                              <span className="text-[10px] text-gray-400 uppercase font-bold">{m.day_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">{formatTimeDisplay(m.match_time)}</td>
                          <td className="px-4 py-3">{m.field}</td>
                          <td className="px-4 py-3 max-w-[150px] truncate">{m.competition}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{teamA?.name || 'Desconocido'}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{teamB?.name || 'Desconocido'}</td>
                          <td className="px-4 py-3 font-bold text-blue-600">{referee?.name || 'SIN ASIGNAR'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setMatchToDelete(m.id)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Partidos existentes detectados</h3>
              <p className="text-gray-500 font-medium mb-6">
                Ya existen partidos en el rango de fechas {format(startDate || new Date(), 'dd/MM/yyyy')} - {format(endDate || new Date(), 'dd/MM/yyyy')}.
                <br /><br />
                ¿Deseas eliminar los partidos existentes y reemplazarlos con los nuevos?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConflictModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmImport}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold shadow-md hover:bg-amber-700 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {/* Delete All Confirmation */}
        {showDeleteAllModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">¿Borrar todo?</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                Esta acción eliminará <strong>todos los partidos</strong> del sistema de forma permanente.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    clearAllMatches();
                    setShowDeleteAllModal(false);
                  }}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                >
                  SÍ, BORRAR TODO
                </button>
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Period Confirmation */}
        {showDeletePeriodModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">¿Limpiar periodo?</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                Esta acción limpiará la pantalla de los partidos de este periodo. Los datos permanecerán guardados.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    clearMatchesByPeriod(showDeletePeriodModal);
                    setShowDeletePeriodModal(null);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                >
                  SÍ, LIMPIAR PERIODO
                </button>
                <button
                  onClick={() => setShowDeletePeriodModal(null)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Single Match Confirmation */}
        {matchToDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">¿Borrar partido?</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                ¿Estás seguro de que deseas eliminar este encuentro del sistema?
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    deleteMatch(matchToDelete);
                    setMatchToDelete(null);
                  }}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
                >
                  ELIMINAR PARTIDO
                </button>
                <button
                  onClick={() => setMatchToDelete(null)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">Atención</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">{showErrorModal}</p>
              <button
                onClick={() => setShowErrorModal(null)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.3)] w-full max-w-sm text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3">¡Éxito!</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                Los partidos han sido importados correctamente al sistema.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
              >
                ACEPTAR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reassign Modal */}
      <AnimatePresence>
        {reassignMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Reasignar Árbitro</h3>
                <button onClick={() => setReassignMatch(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Partido:</p>
                  <p className="text-sm font-bold text-gray-900">
                    {teams.find(t => t.id === reassignMatch.team_a_id)?.name} vs {teams.find(t => t.id === reassignMatch.team_b_id)?.name}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">{reassignMatch.match_date} · {reassignMatch.match_time}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nuevo árbitro (disponibles este día)</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-inner appearance-none text-gray-900 font-bold"
                      value={newRefereeId}
                      onChange={(e) => setNewRefereeId(e.target.value)}
                    >
                      <option value="">-- Selecciona un árbitro --</option>
                      {referees
                        .filter(ref => {
                          // Exclude current referee
                          if (ref.id === reassignMatch.referee_id) return false;
                          // Exclude referees with matches on the same day
                          const hasMatchThatDay = matches.some(m => 
                            m.match_date === reassignMatch.match_date && 
                            m.referee_id === ref.id
                          );
                          return !hasMatchThatDay;
                        })
                        .map(ref => (
                          <option key={ref.id} value={ref.id}>{ref.name}</option>
                        ))
                      }
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setReassignMatch(null)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInitialReassignRequest}
                    disabled={!newRefereeId}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold shadow-md transition-all ${
                      newRefereeId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-200 text-blue-50 cursor-not-allowed'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Consecutive Match Modal */}
      <AnimatePresence>
        {showConsecutiveModal && consecutiveMatch && reassignMatch && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-md text-center"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Partidos consecutivos detectados</h3>
              <p className="text-gray-500 font-medium mb-6">
                El árbitro actual tiene otro partido asignado en el mismo campo y día:
                <br />
                <span className="text-blue-600 font-bold">
                  {teams.find(t => t.id === consecutiveMatch.team_a_id)?.name} vs {teams.find(t => t.id === consecutiveMatch.team_b_id)?.name}
                </span>
                <br />
                <span className="text-xs">({consecutiveMatch.match_time} en {consecutiveMatch.field})</span>
                <br /><br />
                ¿Deseas reasignar ambos partidos al nuevo árbitro o solo el seleccionado?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => confirmReassignment(true)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                  Reasignar los dos partidos
                </button>
                <button
                  onClick={() => confirmReassignment(false)}
                  className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Solo el partido seleccionado
                </button>
                <button
                  onClick={() => setShowConsecutiveModal(false)}
                  className="w-full py-2 text-xs text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  Cancelar reasignación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
