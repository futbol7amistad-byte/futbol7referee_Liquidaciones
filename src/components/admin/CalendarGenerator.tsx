import React, { useState, useEffect } from 'react';
import { Settings, Play, Upload, X, ShieldAlert, CheckCircle2, Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, eachDayOfInterval, isWeekend, isSameDay, startOfMonth, endOfMonth, startOfISOWeek, endOfISOWeek, isSameMonth, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Team, Match } from '../../types';
import { useData } from '../../store/DataContext';

interface CalendarGeneratorProps {
  teams: Team[];
  onGenerate: (matches: any[]) => void;
  onCancel: () => void;
}

export default function CalendarGenerator({ teams, onGenerate, onCancel }: CalendarGeneratorProps) {
  const { venues } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [sortedVenues] = useState(() => [...venues].sort((a,b) => a.name.localeCompare(b.name)));
  const [activeVenues] = useState(() => venues.filter(v => v.is_active !== false));
  const [fields, setFields] = useState<string[]>(activeVenues.map(v => v.name));
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [mode, setMode] = useState<'range' | 'veto'>('range'); // toggle to select range vs select holidays
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const modalTopRef = React.useRef<HTMLDivElement>(null);

  const availableHours = React.useMemo(() => {
    if (!startDate || !endDate) return 0;
    
    let count = 0;
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    const holidayDates = holidays.map(h => new Date(h).getTime());

    dates.forEach(d => {
        const dayNameStr = format(d, 'EEEE', { locale: es }).toLowerCase();
        if (dayNameStr === 'viernes' || dayNameStr === 'sábado' || dayNameStr === 'domingo' || dayNameStr === 'sabado') return;
        if (holidayDates.some(hd => isSameDay(new Date(hd), d))) return;

        const dayNameCapitalized = dayNameStr.charAt(0).toUpperCase() + dayNameStr.slice(1).toLowerCase();

        fields.forEach(f => {
            const venue = activeVenues.find(v => v.name === f);
            if (venue && venue.available_slots) {
                const vSlot = venue.available_slots.find(s => s.day === dayNameCapitalized);
                if (vSlot) {
                    count += vSlot.hours.length;
                }
            } else {
                // Heuristica por defecto si no hay slot detallado pero está seleccionado
                count += 2;
            }
        });
    });
    return count;
  }, [startDate, endDate, holidays, fields, activeVenues]);

  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start: startOfISOWeek(start), end: endOfISOWeek(end) });
  };

  const handleDateClick = (day: Date) => {
     if (mode === 'range') {
        if (!startDate || (startDate && endDate)) {
          setStartDate(day);
          setEndDate(null);
        } else if (day >= startDate) {
          setEndDate(day);
        } else {
          setStartDate(day);
          setEndDate(null);
        }
     } else {
        // Veto mode
        setHolidays(prev => {
           const existingIndex = prev.findIndex(h => isSameDay(h, day));
           if (existingIndex >= 0) {
              const clone = [...prev];
              clone.splice(existingIndex, 1);
              return clone;
           } else {
              return [...prev, day];
           }
        });
     }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
        processFile(droppedFile);
    }
  };

  const processFile = (file: File) => {
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet) as any[];
        
        const mapped = json.map(row => {
            const getVal = (keys: string[]) => {
                const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
                return key ? row[key] : '';
            };
            return {
                match_round: getVal(['jornada', 'j', 'round']),
                category: getVal(['categoría', 'categoria', 'cat', 'grupo', 'serie']),
                team_a_name: getVal(['equipo local', 'equipo a', 'local']),
                team_b_name: getVal(['equipo visitante', 'equipo b', 'visitante', 'visita'])
            };
        }).filter(m => m.team_a_name && m.team_b_name);

        if (mapped.length === 0) {
           toast.error("No se ha detectado ningún enfrentamiento. Asegúrate de tener al menos las columnas para Jornada y los Equipos.");
           setErrorInfo("No se ha detectado ningún enfrentamiento. Asegúrate de tener al menos las columnas para Jornada y los Equipos.");
        } else {
           toast.success(`${mapped.length} partidos cargados con éxito del fichero`);
           setErrorInfo(null);
        }

        setParsedData(mapped);
      } catch (err) {
        toast.error("Error al leer Excel. Asegúrate de tener al menos las columnas para Jornada y los Equipos.");
        setErrorInfo("Error al leer Excel. Asegúrate de tener al menos las columnas para Jornada y los Equipos.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset file input so that same file can be uploaded again
    e.target.value = '';
  };

  const handleGenerate = () => {
     if (!startDate || !endDate) {
         toast.error("Debes especificar la fecha de inicio y fin del torneo.");
         setErrorInfo("Debes especificar la fecha de inicio y fin del torneo.");
         return;
     }
     if (parsedData.length === 0) {
         toast.error("No hay partidos cargados desde el Excel.");
         setErrorInfo("No hay partidos cargados desde el Excel.");
         modalTopRef.current?.scrollIntoView({ behavior: 'smooth' });
         return;
     }

     setIsGenerating(true);
     setErrorInfo(null);
     
     setTimeout(() => {
         try {
            const generated = executeGenerationAlgorithm();
            onGenerate(generated);
         } catch (e: any) {
             toast.error(`Error de Generación: ${e.message}`);
             setErrorInfo(`Error de Generación: ${e.message}`);
             modalTopRef.current?.scrollIntoView({ behavior: 'smooth' });
         } finally {
             setIsGenerating(false);
         }
     }, 100);
  };

  const executeGenerationAlgorithm = () => {
      // 1. Resolve Teams
      const matchesToAssign = parsedData.map((m, index) => {
          const tA = teams.find(t => t.name.toLowerCase() === m.team_a_name.toLowerCase());
          const tB = teams.find(t => t.name.toLowerCase() === m.team_b_name.toLowerCase());
          return {
              ...m,
              team_a_id: tA?.id || `temp-a-${index}`,
              team_b_id: tB?.id || `temp-b-${index}`,
              tA_obj: tA || { name: m.team_a_name }, // mock obj
              tB_obj: tB || { name: m.team_b_name }  // mock obj
          };
      });

      // Validations (Removed unmapped check since we auto-handle it)

      // 2. Generate Available Days
      let sDate = new Date(startDate);
      let eDate = new Date(endDate);
      const allDays = eachDayOfInterval({ start: sDate, end: eDate });
      
      const holidayDates = holidays.map(h => new Date(h).getTime());
      
      // Filter out weekends and holidays
      const validDates = allDays.filter(d => {
          const dayName = format(d, 'EEEE', { locale: es }).toLowerCase();
          if (dayName === 'viernes' || dayName === 'sábado' || dayName === 'domingo' || dayName === 'sabado') return false;
          if (holidayDates.some(hd => isSameDay(new Date(hd), d))) return false;
          return true;
      });

      // Build slots: Date -> Field -> Hour
      // Flatten into array of available slots to easily allocate
      let availableSlots: any[] = [];
      validDates.forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          const dayNameStr = format(d, 'EEEE', { locale: es });
          const dayNameCapitalized = dayNameStr.charAt(0).toUpperCase() + dayNameStr.slice(1).toLowerCase();

          fields.forEach(f => {
              const venue = activeVenues.find(v => v.name === f);
              let possibleHours = ['20:30', '21:30']; // fallback
              if (venue?.available_slots) {
                  const vSlot = venue.available_slots.find(s => s.day === dayNameCapitalized);
                  possibleHours = vSlot ? vSlot.hours : [];
              }
              
              possibleHours.forEach(h => {
                  availableSlots.push({ date: dStr, dayName: dayNameStr, field: f, hour: h, assigned: null });
              });
          });
      });

      // Quick capacity check
      if (matchesToAssign.length > availableSlots.length) {
          throw new Error(`Capacidad insuficiente. Hay ${matchesToAssign.length} partidos y solo ${availableSlots.length} huecos disponibles en el periodo y campos seleccionados.`);
      }

      // Helper function to check Constraints
      const checkConstraints = (match: any, slot: any) => {
          const tA = match.tA_obj;
          const tB = match.tB_obj;
          const dayNameCapitalized = slot.dayName.charAt(0).toUpperCase() + slot.dayName.slice(1).toLowerCase();
          
          // Check team A availability
          let isAvailableA = true;
          if (tA?.available_slots) {
             const daySlot = tA.available_slots.find((s: any) => s.day === dayNameCapitalized);
             isAvailableA = !!daySlot && daySlot.hours.includes(slot.hour);
          } else {
             // Fallback
             const aDaysA = tA?.available_days || [];
             const aHrsA = tA?.available_hours || [];
             if (aDaysA.length > 0 && !aDaysA.includes(dayNameCapitalized)) isAvailableA = false;
             if (aHrsA.length > 0 && !aHrsA.includes(slot.hour)) isAvailableA = false;
          }
          if (!isAvailableA) return false;

          // Check team B availability
          let isAvailableB = true;
          if (tB?.available_slots) {
             const daySlot = tB.available_slots.find((s: any) => s.day === dayNameCapitalized);
             isAvailableB = !!daySlot && daySlot.hours.includes(slot.hour);
          } else {
             // Fallback
             const aDaysB = tB?.available_days || [];
             const aHrsB = tB?.available_hours || [];
             if (aDaysB.length > 0 && !aDaysB.includes(dayNameCapitalized)) isAvailableB = false;
             if (aHrsB.length > 0 && !aHrsB.includes(slot.hour)) isAvailableB = false;
          }
          if (!isAvailableB) return false;

          const vFieldsA = tA?.vetoed_fields || [];
          const vFieldsB = tB?.vetoed_fields || [];
          if (vFieldsA.some((vf: string) => slot.field.toLowerCase().includes(vf.toLowerCase()))) return false;
          if (vFieldsB.some((vf: string) => slot.field.toLowerCase().includes(vf.toLowerCase()))) return false;

          // Linked Teams check is harder. Wait, if this team has a linked team, we must ensure they play SAME day, SAME field, DIFF hour.
          // This greedy approach will just ensure it doesn't break *already assigned* linked teams.
          return true;
      };

      // 3. Assignment Greedy Logic
      // Group by Round so we process round by round
      const rounds = Array.from(new Set(matchesToAssign.map(m => m.match_round)));
      let finalMatches: any[] = [];

      for (const round of rounds) {
         let roundMatches = matchesToAssign.filter(m => m.match_round === round);
         
         // Sort matches to prioritize those with most constraints (e.g., fewer available slots)
         roundMatches.sort((a,b) => {
             const getAvailableCount = (t: any) => {
                if (t?.available_slots) {
                   return t.available_slots.reduce((acc: number, cur: any) => acc + cur.hours.length, 0);
                }
                const daysCount = t?.available_days?.length || 4;
                const hrsCount = t?.available_hours?.length || 2;
                return daysCount * hrsCount;
             };
             const cA = getAvailableCount(a.tA_obj) + getAvailableCount(a.tB_obj);
             const cB = getAvailableCount(b.tA_obj) + getAvailableCount(b.tB_obj);
             return cA - cB; // Lower score = fewer slots = higher priority
         });

         for (const match of roundMatches) {
             let assigned = false;
             
             // Check if any linked team is already assigned in THIS round
             const linkedA = match.tA_obj?.linked_team_id;
             const linkedB = match.tB_obj?.linked_team_id;
             let requiredSlotDate = null;
             let requiredSlotField = null;

             if (linkedA || linkedB) {
                 const linkedIds = [linkedA, linkedB].filter(Boolean);
                 const existingLinkedMatchSlot = finalMatches.find(fm => 
                     fm.match_round === round && 
                     (linkedIds.includes(fm.team_a_id) || linkedIds.includes(fm.team_b_id))
                 );
                 if (existingLinkedMatchSlot) {
                     requiredSlotDate = existingLinkedMatchSlot.match_date;
                     requiredSlotField = existingLinkedMatchSlot.field;
                 }
             }

             // Find available slot for this match
             for (const slot of availableSlots) {
                 if (slot.assigned) continue;
                 
                 // Team cannot play twice in the same day (should be covered by round but just in case)
                 const teamAlreadyPlaysDate = finalMatches.some(fm => 
                     fm.match_date === slot.date && 
                     (fm.team_a_id === match.team_a_id || fm.team_b_id === match.team_b_id || fm.team_a_id === match.team_b_id || fm.team_b_id === match.team_a_id)
                 );
                 if (teamAlreadyPlaysDate) continue;

                 // Strict check for Linked Teams
                 if (requiredSlotDate && requiredSlotField) {
                     if (slot.date !== requiredSlotDate || slot.field !== requiredSlotField) continue;
                 }

                 if (checkConstraints(match, slot)) {
                     // We found a slot!
                     slot.assigned = match;
                     finalMatches.push({
                         ...match,
                         match_date: slot.date,
                         day_name: slot.dayName,
                         match_time: slot.hour,
                         field: slot.field,
                         id: `gen-${Math.random().toString(36).substring(2,9)}`, // temp id
                         match_round: String(match.match_round)
                     });
                     assigned = true;
                     break;
                 }
             }

             if (!assigned) {
                 throw new Error(`Imposible encontrar hueco para Jornada ${round}: ${match.team_a_name} vs ${match.team_b_name} con sus restricciones vigentes. Amplia campos o modifica disponibilidad.`);
             }
         }
      }

      return finalMatches;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-xl font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-950 border border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden text-slate-100 flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
               <Settings className="text-blue-500" />
               Motor de Calendarización
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Generación algorítmica por restricciones</p>
          </div>
          <button onClick={onCancel} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar" ref={modalTopRef}>

          {errorInfo && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-4">
               <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
               <p className="text-sm font-bold text-red-400 leading-relaxed">{errorInfo}</p>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h4 className="text-[12px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">1</span>
               Matriz de Enfrentamientos
            </h4>
            <div 
               className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-950 group hover:border-blue-500 transition-colors relative overflow-hidden"
               onDragOver={(e) => e.preventDefault()}
               onDrop={handleFileDrop}
            >
               <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               />
               <Upload className="w-10 h-10 text-slate-600 group-hover:text-blue-500 transition-colors mb-4" />
               <p className="text-sm font-bold text-slate-300">Sube el fichero Excel (.xlsx)</p>
               <p className="text-xs text-slate-500 mt-2 text-center max-w-sm">
                  Columnas requeridas: <span className="font-mono text-slate-400">Jornada, Categoría, Equipo Local, Equipo Visitante</span>
               </p>
               
               {parsedData.length > 0 && (
                   <div className="absolute bottom-0 left-0 w-full bg-blue-600 text-white text-xs font-black p-2 text-center flex items-center justify-center gap-2 uppercase tracking-widest">
                       <CheckCircle2 className="w-4 h-4" /> {parsedData.length} Encuentros Memorizados
                   </div>
               )}
            </div>
          </div>

          {parsedData.length > 0 && startDate && endDate && (
            <div className={`p-4 rounded-full border flex flex-col md:flex-row items-center justify-center gap-6 text-sm font-black uppercase tracking-widest ${
              availableHours - parsedData.length < 0 
                ? 'bg-rose-500/10 border-rose-500/30' 
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
               <div className="flex items-center gap-2">
                 <span className={`${availableHours - parsedData.length < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                   Horas Necesarias: {parsedData.length}
                 </span>
               </div>
               <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
               <div className="flex items-center gap-2">
                 <span className={`${availableHours - parsedData.length < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                   Nº Horas de Instalaciones Disponibles: {availableHours}
                 </span>
               </div>

               {availableHours - parsedData.length < 0 && (
                 <>
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                   <div className="flex items-center gap-2 text-rose-500 animate-pulse">
                     <ShieldAlert className="w-4 h-4" />
                     INVIABLE: ¡Faltan {parsedData.length - availableHours} horas!
                   </div>
                 </>
               )}
            </div>
          )}

          {/* STEP 2: PARAMS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <h4 className="text-[12px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">2</span>
               Parámetros del Torneo
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2 flex flex-col xl:flex-row gap-6">
                 {/* Visual Calendar */}
                 <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-6">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl">
                        <button 
                          onClick={() => setMode('range')}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${mode === 'range' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          Periodo
                        </button>
                        <button 
                          onClick={() => setMode('veto')}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${mode === 'veto' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          Festivos
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
                        <h4 className="font-bold text-sm capitalize text-white min-w-[100px] text-center">
                          {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        </h4>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronRight className="w-5 h-5" /></button>
                      </div>
                   </div>

                   <div className="grid grid-cols-7 gap-2">
                     {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="text-center font-bold text-[10px] text-slate-500 uppercase">{d}</div>)}
                     {getDaysInMonth(currentMonth).map((day, dIdx) => {
                       const isVetoed = holidays.some(h => isSameDay(h, day));
                       const isStart = startDate && isSameDay(day, startDate);
                       const isEnd = endDate && isSameDay(day, endDate);
                       const isInRange = startDate && endDate && isWithinInterval(day, { start: startDate, end: endDate });
                       
                       let btnClass = 'hover:bg-slate-800 text-slate-300';
                       if (isVetoed) {
                         btnClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                       } else if (isStart || isEnd) {
                         btnClass = 'bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20';
                       } else if (isInRange) {
                         btnClass = 'bg-indigo-500/20 text-indigo-300';
                       }

                       return (
                         <button 
                           key={`cal-day-${day.toISOString()}-${dIdx}`}
                           onClick={() => handleDateClick(day)}
                           className={`p-2 rounded-xl text-xs font-bold transition-all ${btnClass}`}
                         >
                           {format(day, 'd')}
                         </button>
                       );
                     })}
                   </div>

                   {(startDate && endDate) && (
                     <div className="mt-6 flex flex-col gap-2">
                       <div className="flex flex-wrap gap-2">
                         <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                           Inicio: {format(startDate, 'dd/MM/yyyy')}
                         </span>
                         <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                           Fin: {format(endDate, 'dd/MM/yyyy')}
                         </span>
                         {holidays.length > 0 && (
                           <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-md text-[10px] font-black text-rose-400 uppercase tracking-widest">
                             {holidays.length} Festivos
                           </span>
                         )}
                       </div>
                       {holidays.length > 0 && (
                         <div className="flex flex-wrap gap-1 mt-2">
                           <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center mr-2">Fechas:</span>
                           {holidays.map((h, i) => (
                              <span key={i} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] text-rose-400">
                                {format(h, 'dd/MM/yyyy')}
                              </span>
                           ))}
                         </div>
                       )}
                     </div>
                   )}
                 </div>

                 {/* Fields Configuration */}
                 <div className="w-full xl:w-96 flex flex-col gap-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Campos a utilizar
                        </label>
                        <button 
                           onClick={() => {
                             if (fields.length === activeVenues.length) setFields([]);
                             else setFields(activeVenues.map(v => v.name));
                           }}
                           className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase underline decoration-blue-500/30 underline-offset-4"
                        >
                          {fields.length === activeVenues.length ? 'Ninguno' : 'Seleccionar Todos'}
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                         {sortedVenues.length === 0 && (
                           <p className="text-xs text-slate-500 italic">No hay campos disponibles.</p>
                         )}
                         {sortedVenues.map(venue => {
                           const isSelected = fields.includes(venue.name);
                           const isActive = venue.is_active !== false;
                           return (
                             <button
                               key={venue.id}
                               disabled={!isActive}
                               onClick={() => {
                                 setFields(prev => 
                                   isSelected ? prev.filter(f => f !== venue.name) : [...prev, venue.name]
                                 );
                               }}
                               className={`w-full flex items-center p-3 rounded-xl border transition-all text-left ${!isActive ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800' : isSelected 
                                   ? 'bg-blue-500/10 border-blue-500/30' 
                                   : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                               }`}
                             >
                               <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${!isActive ? 'bg-slate-800 border-slate-700 border' : isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 border-slate-700 border'}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                               </div>
                               <div>
                                 <p className={`text-sm font-bold ${!isActive ? 'text-slate-500' : isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                                   {venue.name} {!isActive && <span className="text-[10px] text-rose-500 ml-1">(INACTIVO)</span>}
                                 </p>
                               </div>
                             </button>
                           );
                         })}
                      </div>
                    </div>

                    <div className="border border-blue-900/30 bg-blue-500/5 p-4 rounded-xl text-xs font-bold text-blue-400 leading-relaxed shadow-inner">
                      Nota Algorítmica: El generador distribuirá automáticamente los partidos de Lunes a Jueves, en los campos especificados, priorizando los slots de 20:30 y 21:30. Evaluará en tiempo real las restricciones operativas de cada equipo.
                    </div>
                 </div>
               </div>
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center">
            {isGenerating ? (
                <div className="flex-1 flex justify-center items-center py-4 text-sm font-black text-blue-400 uppercase tracking-widest gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Procesando Permutaciones...
                </div>
            ) : (
                <>
                <button
                    onClick={onCancel}
                    className="w-full md:w-auto px-8 py-4 bg-transparent border border-slate-700 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all focus:outline-none"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleGenerate}
                    className="flex-1 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:shadow-blue-900/40 hover:scale-[1.02] transition-all focus:outline-none flex items-center justify-center gap-2 group"
                >
                    <Play className="w-4 h-4 text-blue-200 group-hover:text-white" />
                    Iniciar Renderizado de Calendario
                </button>
                </>
            )}
        </div>
      </motion.div>
    </div>
  );
}
