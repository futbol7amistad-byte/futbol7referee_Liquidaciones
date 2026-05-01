import React, { useState, useRef } from 'react';
import { useData } from '../../store/DataContext';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Calendar, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, ChevronDown, User, ArrowRight, RefreshCw, Shield, Trash2, ChevronLeft, ChevronRight, MessageSquare, GripVertical, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Match, Referee } from '../../types';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/formatters';
import { getWhatsAppLink } from '../../utils/whatsapp';
import { startOfMonth, endOfMonth, eachDayOfInterval, startOfISOWeek, endOfISOWeek, isSameMonth, isSameDay, isWithinInterval, format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import PublicCalendar from '../PublicCalendar';

export default function AdminCalendar() {
  const { matches: matchesRaw, referees, teams, importMatches, reassignReferee, clearMatchesInRange, deleteMatch, clearAllMatches, clearMatchesByPeriod, hiddenPeriods, updateMatchStatus, addSanction } = useData();
  const matches = matchesRaw.filter(m => !hiddenPeriods.includes(m.period || 'Sin periodo'));
  const [dragActive, setDragActive] = useState(false);
  const [tempMatches, setTempMatches] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Drag and Drop state
  const [draggingRefereeId, setDraggingRefereeId] = useState<string | null>(null);
  const [draggingOriginMatchId, setDraggingOriginMatchId] = useState<string | null>(null);
  const [dragOverMatchId, setDragOverMatchId] = useState<string | null>(null);

  const getRefereeColor = (id: string) => {
    const colors = [
      { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-600', dot: 'bg-white' },
      { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', dot: 'bg-white' },
      { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', dot: 'bg-white' },
      { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', dot: 'bg-white' },
      { bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-600', dot: 'bg-white' },
      { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', dot: 'bg-white' },
      { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600', dot: 'bg-white' },
      { bg: 'bg-fuchsia-500', text: 'text-white', border: 'border-fuchsia-600', dot: 'bg-white' },
      { bg: 'bg-lime-500', text: 'text-white', border: 'border-lime-600', dot: 'bg-white' },
      { bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-600', dot: 'bg-white' },
      { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600', dot: 'bg-white' },
      { bg: 'bg-yellow-500', text: 'text-white', border: 'border-yellow-600', dot: 'bg-white' },
      { bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-600', dot: 'bg-white' },
      { bg: 'bg-slate-700', text: 'text-white', border: 'border-slate-800', dot: 'bg-white' },
      { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', dot: 'bg-white' },
      { bg: 'bg-zinc-600', text: 'text-white', border: 'border-zinc-700', dot: 'bg-white' },
    ];
    
    // Create a stable sorted list to get the same index consistently
    const sortedRefs = [...referees].filter(r => r.status === 'active').sort((a,b) => a.name.localeCompare(b.name));
    let index = sortedRefs.findIndex(r => r.id === id);
    
    // Si no se encuentra (índice -1), usa el hash para un fallback determinista
    if (index === -1) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        index = Math.abs(hash);
    }
    
    return colors[index % colors.length];
  };

  const getDayColor = (day?: string) => {
    const d = day?.toLowerCase() || '';
    if (d.includes('lun')) return 'bg-sky-500 text-white';
    if (d.includes('mar')) return 'bg-emerald-600 text-white';
    if (d.includes('mie') || d.includes('mié')) return 'bg-amber-500 text-white';
    if (d.includes('jue')) return 'bg-indigo-600 text-white';
    if (d.includes('vie')) return 'bg-rose-600 text-white';
    if (d.includes('sab') || d.includes('sáb')) return 'bg-slate-900 text-white';
    if (d.includes('dom')) return 'bg-red-700 text-white';
    return 'bg-gray-500 text-white';
  };

  const handleShareWhatsApp = () => {
    // Ordenar por fecha -> campo -> hora
    const sorted = [...matches].sort((a, b) => {
      if (a.match_date !== b.match_date) return a.match_date.localeCompare(b.match_date);
      if (a.field !== b.field) return a.field.localeCompare(b.field);
      return a.match_time.localeCompare(b.match_time);
    });

    let message = "⚽ *DESIGNACIONES ARBITRALES*\n\n";
    let lastDate = "";
    
    sorted.forEach(m => {
      const dateStr = formatDateDisplay(m.match_date);
      if (dateStr !== lastDate) {
        message += `\n📅 *${dateStr} (${m.day_name || ''})*\n`;
        lastDate = dateStr;
      }
      const referee = referees.find(r => r.id === m.referee_id)?.name || "❌ SIN ASIGNAR";
      const teamA = teams.find(t => t.id === m.team_a_id)?.name || m.team_a_name;
      const teamB = teams.find(t => t.id === m.team_b_id)?.name || m.team_b_name;
      
      message += `• ${formatTimeDisplay(m.match_time)} | ${m.field} | ${teamA} vs ${teamB} ➔ *${referee}*\n`;
    });

    const refereeLink = "https://futbol7referee-liquidaciones.vercel.app/#/login";
    message += `\n\n🔗 *Portal del Árbitro:* ${refereeLink}\n`;
    message += `\n⚠️ *INSTRUCCIONES IMPORTANTES:*\n`;
    message += `1. Revisa detenidamente tus designaciones detalladas arriba.\n`;
    message += `2. Entra al enlace proporcionado con tu usuario y contraseña.\n`;
    message += `3. Cumplimenta el acta digital al finalizar el partido directamente desde el móvil en el campo.\n`;
    message += `4. Cierra el acta del partido para que el resultado quede registrado automáticamente.\n`;
    message += `5. Si tienes algún problema con tu asignación, contacta urgente con la organización.\n`;

    window.open(getWhatsAppLink('', message), 'whatsapp_admin');
  };

  const [showPublicPreview, setShowPublicPreview] = useState(false);

  const handleOpenPublicCalendar = () => {
    setShowPublicPreview(true);
  };

  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [pendingReassignData, setPendingReassignData] = useState<{matchId: string, refId: string, both: boolean} | null>(null);

  const handleDragStart = (e: React.DragEvent, refId: string, originMatchId?: string) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', refId);
      e.dataTransfer.effectAllowed = 'move';
    }
    setDraggingRefereeId(refId);
    if (originMatchId) {
      setDraggingOriginMatchId(originMatchId);
    } else {
      setDraggingOriginMatchId(null);
    }
  };

  const handleRefereeDrag = (e: React.DragEvent) => {
    const clientY = e.clientY;
    const threshold = 150; // pixels from top/bottom to start scrolling
    
    const scrollContainer = document.getElementById('main-scroll-container');
    if (!scrollContainer) return;

    // Check if dragging (clientY is 0 when drag ends)
    if (clientY > 0) {
      if (clientY < threshold) {
        scrollContainer.scrollBy({ top: -30, behavior: 'instant' });
      } else if (window.innerHeight - clientY < threshold) {
        scrollContainer.scrollBy({ top: 30, behavior: 'instant' });
      }
    }
  };

  const handleDropOnMatch = (matchId: string) => {
    if (draggingRefereeId) {
      const targetMatch = matches.find(m => m.id === matchId);
      if (targetMatch) {
          
        if (draggingOriginMatchId && draggingOriginMatchId !== matchId) {
            // WE ARE DRAGGING A REFEREE FROM ANOTHER MATCH (SWAP OR MOVE)
            const originMatch = matches.find(m => m.id === draggingOriginMatchId);
            
            if (originMatch) {
                // Determine if we should swap or just move. We swap if targetMatch has a referee.
                const targetHasRef = targetMatch.referee_id && targetMatch.referee_id !== '' && targetMatch.referee_id !== 'r-unassigned' && targetMatch.referee_id !== 'SIN ASIGNAR' && targetMatch.referee_id !== 'r-0';
                
                if (targetHasRef) {
                    // SWAP: origin gets target's ref, target gets origin's ref
                    const targetOriginalRefId = targetMatch.referee_id;
                    reassignReferee(originMatch.id, targetOriginalRefId);
                    reassignReferee(targetMatch.id, draggingRefereeId);
                    
                    setDraggingRefereeId(null);
                    setDraggingOriginMatchId(null);
                    setDragOverMatchId(null);
                    return;
                } else {
                    // JUST MOVE: origin gets empty, target gets the ref
                    reassignReferee(originMatch.id, '');
                    reassignReferee(targetMatch.id, draggingRefereeId);
                    
                    setDraggingRefereeId(null);
                    setDraggingOriginMatchId(null);
                    setDragOverMatchId(null);
                    return;
                }
            }
        }  
          
        // Normal assignment logic
        // Check if referee already has matches that day (exclude the match they are being dropped into if they were somehow already there, and exclude origin if they were just moved)
        const hasMatchThatDay = matches.some(m => m.match_date === targetMatch.match_date && m.referee_id === draggingRefereeId && m.id !== draggingOriginMatchId);
        
        if (hasMatchThatDay) {
          const refName = referees.find(r => r.id === draggingRefereeId)?.name || 'Este árbitro';
          setWarningMessage(`${refName} ya tiene partidos asignados el día ${formatDateDisplay(targetMatch.match_date)}. ¿Deseas asignarlo de todos modos?`);
          setPendingReassignData({ matchId, refId: draggingRefereeId, both: false });
          setShowWarningModal(true);
          setDraggingRefereeId(null);
          setDraggingOriginMatchId(null);
          setDragOverMatchId(null);
          return;
        }

        // Find if this match had an original referee who has a consecutive match
        const consecutive = matches.find(m => 
          m.id !== targetMatch.id &&
          m.match_date === targetMatch.match_date &&
          m.field === targetMatch.field &&
          m.referee_id === targetMatch.referee_id &&
          m.referee_id !== '' &&
          m.referee_id !== 'r-unassigned'
        );

        if (consecutive) {
          setReassignMatch(targetMatch);
          setNewRefereeId(draggingRefereeId);
          setConsecutiveMatch(consecutive);
          setShowConsecutiveModal(true);
        } else {
          reassignReferee(matchId, draggingRefereeId);
        }
      }
      setDraggingRefereeId(null);
      setDraggingOriginMatchId(null);
      setDragOverMatchId(null);
    }
  };

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
  const [showRefereeLoadModal, setShowRefereeLoadModal] = useState(false);
  const [showDeletePeriodModal, setShowDeletePeriodModal] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [matchToEditStatus, setMatchToEditStatus] = useState<Match | null>(null);
  const [statusToSave, setStatusToSave] = useState<'Programado' | 'Liquidado' | 'Suspendido' | 'Aplazado'>('Programado');
  const [applySanction, setApplySanction] = useState(false);
  const [sanctionTeamId, setSanctionTeamId] = useState<string>('');
  const [sanctionAmount, setSanctionAmount] = useState<number>(0);
  const [sanctionReason, setSanctionReason] = useState<string>('Incomparecencia');
  const [showErrorModal, setShowErrorModal] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportToExcel = () => {
    // Ordenar los partidos por Fecha + Campo + Hora
    const sortedMatches = [...matches].sort((a, b) => {
      // Comparar Fechas
      if (a.match_date !== b.match_date) {
        return a.match_date.localeCompare(b.match_date);
      }
      // Comparar Campos
      if (a.field !== b.field) {
        return a.field.localeCompare(b.field);
      }
      // Comparar Horas
      return a.match_time.localeCompare(b.match_time);
    });

    const exportData = sortedMatches.map(m => {
      const teamA = teams.find(t => t.id === m.team_a_id)?.name || m.team_a_name;
      const teamB = teams.find(t => t.id === m.team_b_id)?.name || m.team_b_name;
      const referee = referees.find(r => r.id === m.referee_id)?.name || 'SIN ASIGNAR';
      
      return {
        'Jornada': m.match_round,
        'Fecha': formatDateDisplay(m.match_date),
        'Día': m.day_name,
        'Hora': formatTimeDisplay(m.match_time),
        'Campo': m.field,
        'Competición': m.competition,
        'Local': teamA,
        'Visitante': teamB,
        'Árbitro': referee
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calendario");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Download file
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Calendario_Arbitros_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
  };

  const handleExportJSONForExtension = () => {
    const exportData = matches.map(m => {
      const referee = referees.find(r => r.id === m.referee_id)?.name || '';
      const teamA = teams.find(t => t.id === m.team_a_id)?.name || m.team_a_name;
      const teamB = teams.find(t => t.id === m.team_b_id)?.name || m.team_b_name;
      return {
        id: m.id,
        team_a: teamA,
        team_b: teamB,
        round: m.match_round,
        date: m.match_date, 
        time: m.match_time, 
        field: m.field,
        referee: referee
      };
    });

    try {
      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
        .then(() => setActionSuccessMessage("¡Datos copiados al portapapeles! Abre la web de gestión, haz clic en el icono de la extensión y pégalos."))
        .catch(() => fallbackJSONDownload(exportData));
    } catch {
      fallbackJSONDownload(exportData);
    }
  };

  const fallbackJSONDownload = (exportData: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "partidos_extension.json");
    document.body.appendChild(link);
    link.click();
    link.remove();
    setActionSuccessMessage("No se ha podido copiar al portapapeles por seguridad del navegador, pero se ha descargado un pequeño archivo .json con los datos listos para importar en la extensión.");
  };

  const addPdfHeader = (doc: jsPDF, docMatches: Match[]) => {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("CAMPEONATO DE FUTBOL 7 LA AMISTAD | SANTA CRUZ DE TENERIFE", 105, 12, { align: 'center' });
    doc.setFontSize(9);
    
    // Find min and max dates for accurate header
    let minDate = '';
    let maxDate = '';
    if (docMatches.length > 0) {
        const sortedDates = [...docMatches].map(m => m.match_date).sort();
        minDate = sortedDates[0];
        maxDate = sortedDates[sortedDates.length - 1];
    }
    
    doc.text(`Jornada correspondiente al periodo del ${formatDateDisplay(minDate)} al ${formatDateDisplay(maxDate)}`, 105, 18, { align: 'center' });
  };

  const handleGeneratePDFByField = () => {
    const doc = new jsPDF();
    const sortedMatches = [...matches].sort((a, b) => 
        a.field.localeCompare(b.field) || a.match_date.localeCompare(b.match_date) || a.match_time.localeCompare(b.match_time)
    );
    
    // Group by field
    const groupedMatches: Record<string, Match[]> = {};
    sortedMatches.forEach(m => {
        if (!groupedMatches[m.field]) groupedMatches[m.field] = [];
        groupedMatches[m.field].push(m);
    });

    let currentStartY = 22; // Initial position

    Object.entries(groupedMatches).forEach(([field, fieldMatches], index) => {
        if (index > 0) {
            currentStartY += 10; // Add space between sections
            if (currentStartY > 260) {
                doc.addPage();
                currentStartY = 22;
            }
        }

        addPdfHeader(doc, matches);
        
        const tableData = fieldMatches.map(m => {
             const teamA = teams.find(t => t.id === m.team_a_id)?.name || m.team_a_name;
             const teamB = teams.find(t => t.id === m.team_b_id)?.name || m.team_b_name;
             return [
                 m.match_round,
                 `${formatDateDisplay(m.match_date)} (${m.day_name || ''})`,
                 formatTimeDisplay(m.match_time),
                 m.field,
                 `${teamA} vs ${teamB}`
             ];
        });

        autoTable(doc, {
            head: [['J', 'Fecha (Día)', 'Hora', 'Campo', 'Encuentro']],
            body: tableData,
            startY: currentStartY,
            styles: { fontSize: 6, cellPadding: 0.8, overflow: 'linebreak' },
            headStyles: { fontSize: 6, cellPadding: 0.8, fillColor: [41, 128, 185] },
            margin: { top: 10, left: 5, right: 5 }
        });
        
        currentStartY = (doc as any).lastAutoTable.finalY;
    });

    doc.save(`Calendario_Por_Campo_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Header
    addPdfHeader(doc, matches);

    // Consistent sorting
    const sortedMatches = [...matches].sort((a, b) => {
        if (a.match_date !== b.match_date) return a.match_date.localeCompare(b.match_date);
        if (a.field !== b.field) return a.field.localeCompare(b.field);
        return a.match_time.localeCompare(b.match_time);
    });

    const weekdayColors: Record<string, [number, number, number]> = {
        'Lunes': [200, 230, 255], 'Martes': [200, 255, 210],
        'Miércoles': [255, 240, 200], 'Jueves': [230, 200, 255],
        'Viernes': [255, 200, 200], 'Sábado': [220, 220, 220], 'Domingo': [255, 100, 100]
    };
    
    // Create a unique, distinct, hardcoded color for each referee
    const refColorMap: Record<string, [number, number, number]> = {};
    const distinctColors: [number, number, number][] = [
        [255, 0, 0],    // Rojo
        [0, 128, 0],    // Verde oscuro
        [0, 0, 255],    // Azul
        [255, 165, 0],  // Naranja
        [128, 0, 128],  // Púrpura
        [255, 20, 147], // Rosa fuerte
        [0, 255, 255],  // Cian
        [139, 69, 19],  // Marrón
        [255, 215, 0],  // Oro
        [128, 128, 128],// Gris
        [0, 100, 0],    // Verde muy oscuro
        [165, 42, 42],  // Marrón rojizo
        [75, 0, 130],   // Indigo
        [255, 99, 71],  // Tomate
        [32, 178, 170]  // Verde mar
    ];
    
    // Sort referees alphabetically so color assignment is deterministic and permanent
    const sortedRefs = [...referees].sort((a, b) => a.id.localeCompare(b.id));
    
    // Add more distinct colors to handle larger teams
    const additionalColors: [number, number, number][] = [[0, 0, 0], [255, 192, 203], [0, 255, 127], [255, 69, 0], [47, 79, 79]];
    const expandedColors: [number, number, number][] = [...distinctColors, ...additionalColors];
    
    sortedRefs.forEach((r, idx) => {
        refColorMap[r.id] = expandedColors[idx % expandedColors.length];
    });

    const tableData: any[] = [];
    let lastDate = "";

    sortedMatches.forEach((m, index) => {
        const teamA = teams.find(t => t.id === m.team_a_id)?.name || m.team_a_name;
        const teamB = teams.find(t => t.id === m.team_b_id)?.name || m.team_b_name;
        const referee = referees.find(r => r.id === m.referee_id);
        
        // Abbreviate Fields
        const field = m.field.replace('Montaña Pacho', 'MP');

        // Add thin separator line
        if (lastDate && m.match_date !== lastDate) {
            tableData.push([{content: '', colSpan: 6, styles: {fillColor: [200, 200, 200], minCellHeight: 0.2}}]);
        }
        
        tableData.push([
            m.match_round,
            {content: `${formatDateDisplay(m.match_date)} (${m.day_name || ''})`, dayName: m.day_name},
            formatTimeDisplay(m.match_time),
            field,
            `${teamA} vs ${teamB}`,
            {content: referee?.name || 'SIN ASIGNAR', refereeId: m.referee_id}
        ]);
        lastDate = m.match_date;
    });

    autoTable(doc, {
        head: [['J', 'Fecha (Día)', 'Hora', 'Campo', 'Encuentro', 'Árbitro']],
        body: tableData,
        startY: 22, // Moved higher as the header is now more compact
        styles: { fontSize: 6, cellPadding: 0.8, overflow: 'linebreak' },
        headStyles: { fontSize: 6, cellPadding: 0.8, fillColor: [41, 128, 185] },
        margin: { top: 10, left: 5, right: 5 },
        didParseCell: (data) => {
            // Apply row shading based on weekday
            const dayName = (data.cell.raw as any)?.dayName;
            if (dayName) {
                const lowerDay = dayName.toLowerCase();
                if (lowerDay.includes('miércoles')) {
                    data.cell.styles.fillColor = [255, 255, 200]; // Soft Yellow
                } else if (weekdayColors && data.column.index === 1) {
                    const color = Object.keys(weekdayColors).find(d => lowerDay.includes(d.toLowerCase().slice(0,3)));
                    if (color) data.cell.styles.fillColor = weekdayColors[color];
                }
            }

            // Apply referee colors
            if (data.column.index === 5 && data.cell.section === 'body') {
                const refereeId = (data.cell.raw as any).refereeId;
                if (refereeId && refColorMap[refereeId]) {
                    data.cell.styles.fillColor = refColorMap[refereeId];
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.halign = 'center';
                }
            }
        }
    });

    // Add footer timestamp
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(7);
    doc.text(`Listado emitido el ${format(new Date(), 'dd/MM/yyyy')} a las ${format(new Date(), 'HH:mm')} horas.`, 105, 290, { align: 'center' });

    doc.save(`Calendario_Arbitros_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

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
          const index = headers.findIndex(h => possibleHeaders.some(ph => ph.toLowerCase() === h.toLowerCase()));
          const val = index !== -1 ? row[index] : '';
          return (val === undefined || val === null) ? '' : String(val).trim();
        };

        const teamAName = getVal(['EquipoA', 'Equipo A', 'Equipo Local', 'Local']);
        const teamBName = getVal(['EquipoB', 'Equipo B', 'Equipo Visitante', 'Visitante']);
        const refereeName = getVal(['Arbitro', 'Árbitro', 'Arbitro ', 'Referee']);
        const field = getVal(['Campo', 'Lugar', 'Pista']);
        const competition = getVal(['Categoría', 'Categoria', 'Division', 'Competicion', 'Grupo']);
        const round = getVal(['Jornada', 'Semana', 'Round']);
        const time = getVal(['Hora', 'Horario']);
        const dayNameRaw = getVal(['Dia de la Semana', 'Día de la Semana', 'Dia', 'Día', 'Día Sem.']);
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
        
        // Determinar el nombre del día a partir de la fecha si no viene en el Excel
        let dayName = dayNameRaw;
        if (!dayName && matchDate) {
            const dateObj = new Date(matchDate + 'T12:00:00'); // T12:00 para evitar problemas de zona horaria
            const daysMap = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sábado"];
            dayName = daysMap[dateObj.getDay()];
        }

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

      if (mappedMatches.length === 0) {
        setShowErrorModal('No se han encontrado encuentros en el archivo. Asegúrate de que las columnas tengan los nombres correctos (Equipo Local, Equipo Visitante, etc.).');
        return;
      }

      setTempMatches(mappedMatches);
      
      // Auto-set the date range based on the loaded matches
      if (mappedMatches.length > 0) {
        // Find valid dates
        const dates = mappedMatches.map(m => {
          // If match_date is in YYYY-MM-DD format
          const [y, mm, d] = m.match_date.split('-');
          if (y && mm && d) {
             return new Date(parseInt(y), parseInt(mm)-1, parseInt(d));
          }
          return new Date(m.match_date);
        }).filter(d => !isNaN(d.getTime()));
        
        if (dates.length > 0) {
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
          setStartDate(minDate);
          setEndDate(maxDate);
          setCurrentMonth(minDate);
        }
      }
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

  const confirmImport = async () => {
    if (!startDate || !endDate) return;
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    
    // Si estamos sustituyendo (hay conflictos), borrar antes
    const conflicts = matches.filter(m => m.match_date >= startStr && m.match_date <= endStr);
    if (conflicts.length > 0) {
        await clearMatchesInRange(startStr, endStr);
    }
    
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
    if (reassignMatch && newRefereeId) {
      // Check for day collision warning before final assign
      const hasMatchThatDay = matches.some(m => m.match_date === reassignMatch.match_date && m.referee_id === newRefereeId);
      
      if (hasMatchThatDay && !pendingReassignData) {
        const refName = referees.find(r => r.id === newRefereeId)?.name || 'Este árbitro';
        setWarningMessage(`${refName} ya tiene partidos asignados el día ${formatDateDisplay(reassignMatch.match_date)}. ¿Deseas asignarlo de todos modos?`);
        setPendingReassignData({ matchId: reassignMatch.id, refId: newRefereeId, both: reassignBoth });
        setShowWarningModal(true);
        return;
      }

      reassignReferee(reassignMatch.id, newRefereeId);
      if (reassignBoth && consecutiveMatch) {
        reassignReferee(consecutiveMatch.id, newRefereeId);
      }
      setReassignMatch(null);
      setConsecutiveMatch(null);
      setShowConsecutiveModal(false);
      setNewRefereeId('');
      setPendingReassignData(null);
    }
  };

  const handleSaveStatus = async () => {
    if (!matchToEditStatus) return;
    try {
      if (applySanction && (statusToSave === 'Suspendido' || statusToSave === 'Aplazado') && sanctionTeamId) {
        addSanction({
          team_id: sanctionTeamId,
          amount: sanctionAmount,
          round: matchToEditStatus.match_round ? parseInt(matchToEditStatus.match_round.toString()) : 0,
          date: new Date().toISOString().split('T')[0],
          reason: sanctionReason
        });
      }
      await updateMatchStatus(matchToEditStatus.id, statusToSave);
      setMatchToEditStatus(null);
      setApplySanction(false);
      setSanctionAmount(0);
      setSanctionReason('Incomparecencia');
      setSanctionTeamId('');
      setActionSuccessMessage('Estado actualizado correctamente');
    } catch (err) {
      setShowErrorModal('Error al actualizar el estado del partido');
    }
  };

  const handleConfirmWarning = () => {
    if (pendingReassignData) {
      reassignReferee(pendingReassignData.matchId, pendingReassignData.refId);
      if (pendingReassignData.both && consecutiveMatch) {
        reassignReferee(consecutiveMatch.id, pendingReassignData.refId);
      }
      setShowWarningModal(false);
      setPendingReassignData(null);
      setReassignMatch(null);
      setConsecutiveMatch(null);
      setShowConsecutiveModal(false);
      setNewRefereeId('');
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

  const refereeLoadData = React.useMemo(() => referees.map(ref => {
    const assignedMatches = matches.filter(m => m.referee_id === ref.id);
    let totalSlots = 0;
    if (ref.disponibilidad) {
        Object.values(ref.disponibilidad).forEach((slots) => {
          if (Array.isArray(slots)) {
            totalSlots += slots.length;
          }
        });
    }
    return {
      name: ref.name,
      assignedCount: assignedMatches.length,
      totalSlots,
      remaining: Math.max(0, totalSlots - assignedMatches.length)
    };
  }).sort((a, b) => b.remaining - a.remaining), [referees, matches]);

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
          <div className="flex gap-2">
            <button
              onClick={handleOpenPublicCalendar}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
              title="Ver cómo lo ven los árbitros"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Ver Calendario
            </button>
            <button
              onClick={handleExportToExcel}
              className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </button>
            <button
              onClick={handleGeneratePDF}
              className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Descargar PDF
            </button>
            <button
              onClick={handleGeneratePDFByField}
              className="flex items-center px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF por Campos
            </button>
            <button
              onClick={() => setShowRefereeLoadModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              <User className="w-4 h-4 mr-2" />
              Estado de Carga
            </button>
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar Todo
            </button>
          </div>
        </div>

        {/* Draggable Referees Bar */}
        <div className="sticky top-4 z-[40] mb-8 p-6 bg-slate-50/95 backdrop-blur shadow-md rounded-2xl border border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-blue-600" />
                Asignación Rápida (Arrastrar)
              </h4>
              <p className="text-[10px] text-slate-500 font-bold">Arrastra un árbitro a un partido para asignarlo</p>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-blue-100 rounded-full animate-pulse [animation-delay:0.4s]"></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {referees.filter(r => r.status === 'active').sort((a,b) => a.name.localeCompare(b.name)).map((ref, idx) => {
              const color = getRefereeColor(ref.id);
              return (
                <div
                  key={ref.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ref.id)}
                  onDrag={handleRefereeDrag}
                  onDragEnd={() => setDraggingRefereeId(null)}
                  className={`
                    px-4 py-2 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing 
                    flex items-center gap-2 transition-all group
                    ${color.bg} ${color.text} ${color.border}
                    ${draggingRefereeId === ref.id ? 'opacity-50 scale-95 border-blue-500 ring-2 ring-blue-100' : 'hover:shadow-md hover:brightness-95'}
                  `}
                >
                  <GripVertical className={`w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity`} />
                  <span className="text-xs font-black uppercase">{ref.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group matches by period */}
        {Array.from(new Set(matches.map(m => m.period || 'Sin periodo'))).map(period => {
          const periodMatches = matches
            .filter(m => (m.period || 'Sin periodo') === period)
            .sort((a, b) => {
              const dateComp = a.match_date.localeCompare(b.match_date);
              if (dateComp !== 0) return dateComp;
              const fieldComp = a.field.localeCompare(b.field);
              if (fieldComp !== 0) return fieldComp;
              return a.match_time.localeCompare(b.match_time);
            });
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
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {periodMatches.map((m, index) => {
                      const teamA = teams.find(t => t.id === m.team_a_id);
                      const teamB = teams.find(t => t.id === m.team_b_id);
                      const referee = referees.find(r => r.id === m.referee_id);
                      const currentStatus = m.status || 'Programado';
                      return (
                        <tr 
                          key={m.id} 
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverMatchId(m.id);
                          }}
                          onDragLeave={() => setDragOverMatchId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropOnMatch(m.id);
                          }}
                          className={`
                            text-xs font-medium text-gray-600 transition-all duration-200
                            ${dragOverMatchId === m.id ? 'bg-blue-50 scale-[1.01] shadow-inner ring-2 ring-blue-200 z-10' : 'hover:bg-gray-50'}
                          `}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="text-[10px] text-gray-400 mr-2 font-bold w-6">#{index + 1}</span>
                              {m.match_round}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{formatDateDisplay(m.match_date)}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-tighter ${getDayColor(m.day_name)}`}>
                                {m.day_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">{formatTimeDisplay(m.match_time)}</td>
                          <td className="px-4 py-3">{m.field}</td>
                          <td className="px-4 py-3 max-w-[150px] truncate">
                            {(m.competition || '').includes('-') ? (m.competition || '').split('-')[1].trim() : m.competition}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">{teamA?.name || 'Desconocido'}</td>
                          <td className="px-4 py-3 font-bold text-gray-900">{teamB?.name || 'Desconocido'}</td>
                          <td className="px-4 py-3">
                            {referee ? (
                              <div 
                                draggable
                                onDragStart={(e) => handleDragStart(e, referee.id, m.id)}
                                onDrag={handleRefereeDrag}
                                onDragEnd={() => {
                                  setDraggingRefereeId(null);
                                  setDraggingOriginMatchId(null);
                                }}
                                className={`inline-flex items-center px-3 py-1 rounded-lg border text-[10px] font-black uppercase cursor-grab active:cursor-grabbing transition-opacity ${draggingRefereeId === referee.id && draggingOriginMatchId === m.id ? 'opacity-50' : 'hover:opacity-90'} ${getRefereeColor(referee.id).bg} ${getRefereeColor(referee.id).text} ${getRefereeColor(referee.id).border}`}
                              >
                                <GripVertical className="w-3 h-3 mr-1 opacity-50" />
                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${getRefereeColor(referee.id).dot}`}></div>
                                {referee.name}
                              </div>
                            ) : (
                              <span className="text-red-500 font-black text-[10px] uppercase">SIN ASIGNAR</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${
                              currentStatus === 'Liquidado' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              currentStatus === 'Suspendido' ? 'bg-red-50 text-red-600 border-red-200' :
                              currentStatus === 'Aplazado' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              'bg-indigo-50 text-indigo-600 border-indigo-200'
                            }`}>
                              {currentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end items-center gap-1">
                              <button
                                onClick={() => {
                                  setMatchToEditStatus(m);
                                  setStatusToSave(m.status || 'Programado');
                                  setApplySanction(false);
                                  setSanctionAmount(0);
                                  setSanctionTeamId('');
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Cambiar Estado"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setMatchToDelete(m.id)}
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
        {/* Reassignment Warning Modal */}
        <AnimatePresence>
          {showWarningModal && (
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
                <h3 className="text-2xl font-black text-gray-900 mb-3">Atención</h3>
                <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                  {warningMessage}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleConfirmWarning}
                    className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all active:scale-95"
                  >
                    CONTINUAR Y ASIGNAR
                  </button>
                  <button
                    onClick={() => {
                        setShowWarningModal(false);
                        setPendingReassignData(null);
                    }}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                  >
                    CANCELAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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

        {matchToEditStatus && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
              <h3 className="text-2xl font-black text-gray-900 mb-6">Cambiar Estado</h3>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 justify-start uppercase tracking-widest mb-2 text-left">Estado del Partido</label>
                  <select
                    value={statusToSave}
                    onChange={(e) => setStatusToSave(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Programado">Programado</option>
                    <option value="Liquidado">Liquidado</option>
                    <option value="Suspendido">Suspendido</option>
                    <option value="Aplazado">Aplazado</option>
                  </select>
                </div>

                {(statusToSave === 'Suspendido' || statusToSave === 'Aplazado') && (
                  <div className="border border-red-100 bg-red-50/50 rounded-2xl p-4 space-y-4 mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={applySanction}
                          onChange={(e) => setApplySanction(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-5 h-5 rounded border border-red-300 bg-white peer-checked:bg-red-500 peer-checked:border-red-500 transition-colors"></div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white absolute inset-0 m-auto opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-sm font-bold text-red-900">Aplicar sanción por incomparecencia</span>
                    </label>

                    {applySanction && (
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Equipo a Sancionar</label>
                          <select
                            value={sanctionTeamId}
                            onChange={(e) => setSanctionTeamId(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <option value="">Selecciona un equipo...</option>
                            <option value={matchToEditStatus.team_a_id}>{teams.find(t => t.id === matchToEditStatus.team_a_id)?.name || 'Equipo A'}</option>
                            <option value={matchToEditStatus.team_b_id}>{teams.find(t => t.id === matchToEditStatus.team_b_id)?.name || 'Equipo B'}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Importe de la Sanción (€)</label>
                          <input
                            type="number"
                            value={sanctionAmount || ''}
                            onChange={(e) => setSanctionAmount(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-white border border-red-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="Ej: 50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleSaveStatus}
                  disabled={applySanction && (!sanctionTeamId || sanctionAmount <= 0)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  GUARDAR CAMBIOS
                </button>
                <button
                  onClick={() => {
                    setMatchToEditStatus(null);
                    setApplySanction(false);
                  }}
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
      
      {/* Referee Load Modal */}
      <AnimatePresence>
        {showRefereeLoadModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.3)] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col relative"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Estado de Carga de Árbitros</h3>
                  <p className="text-sm text-gray-500 font-medium">Relación de horas asignadas vs disponibles</p>
                </div>
                <button 
                  onClick={() => setShowRefereeLoadModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 italic">
                      <th className="pb-3">Árbitro</th>
                      <th className="pb-3 text-center">Asignados</th>
                      <th className="pb-3 text-center">Disponibles</th>
                      <th className="pb-3 text-center">Libres</th>
                      <th className="pb-3 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {refereeLoadData.map((ref, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-gray-900 text-sm uppercase">{ref.name}</td>
                        <td className="py-4 text-center font-bold text-blue-600 font-mono">{ref.assignedCount}h</td>
                        <td className="py-4 text-center font-bold text-gray-400 font-mono">{ref.totalSlots}h</td>
                        <td className={`py-4 text-center font-bold font-mono ${ref.remaining > 0 ? 'text-emerald-600 bg-emerald-50/50' : 'text-gray-300'}`}>
                          {ref.remaining}h
                        </td>
                        <td className="py-4 text-right">
                          {ref.remaining > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">
                              Con Huecos
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 uppercase">
                              Completo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowRefereeLoadModal(false)}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                >
                  CERRAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Public Calendar Preview Modal */}
      <AnimatePresence>
        {showPublicPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col"
          >
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shadow-2xl relative z-[10000]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider leading-tight">
                    FUTBOL 7 LA AMISTAD | SANTA CRUZ DE TENERIFE
                  </h3>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">
                    TEMPORADA 2025/2026
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Modo Vista Previa</p>
                  <p className="text-[9px] text-slate-500 font-medium">Así verán los árbitros el calendario compartido</p>
                </div>
                <button 
                  onClick={() => setShowPublicPreview(false)}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  CERRAR
                </button>
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto bg-slate-50">
              <div className="max-w-5xl mx-auto py-8 px-4">
                 <PublicCalendar />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Action Success Modal */}
      <AnimatePresence>
        {actionSuccessMessage && (
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
              <h3 className="text-2xl font-black text-gray-900 mb-3">¡Completado!</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 leading-relaxed">
                {actionSuccessMessage}
              </p>
              <button
                onClick={() => setActionSuccessMessage(null)}
                className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
              >
                ENTENDIDO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
