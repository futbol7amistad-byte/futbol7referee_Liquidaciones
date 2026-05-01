import React, { useState, useMemo } from 'react';
import { 
  Banknote, 
  Euro, 
  MapPin, 
  Calendar, 
  Shield, 
  Search, 
  Download, 
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingDown,
  Building2
} from 'lucide-react';
import { useData } from '../../store/DataContext';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function AdminSettlements() {
  const { matches, referees, teams, economicSettings, error, accounts, addTransaction, refereeAdvances, addRefereeAdvance, deleteRefereeAdvance } = useData();
  
  if (error && error.includes('Quota exceeded') && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-[2.5rem] border border-rose-100 shadow-xl shadow-rose-50/50 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 border border-rose-100">
          <Shield className="w-10 h-10 text-rose-500 animate-pulse" />
        </div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">Cuota de Base de Datos Excedida</h2>
        <p className="text-sm text-slate-500 max-w-md font-medium leading-relaxed">
          Has alcanzado el límite de lecturas gratuitas de Firebase para hoy. 
          Los datos se restablecerán mañana a las 09:00 AM (CET).
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95"
        >
          Reintentar Carga
        </button>
      </div>
    );
  }

  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<'liquidations' | 'analytics' | 'audit'>('liquidations');
  const [confirmModalType, setConfirmModalType] = useState<'referees' | 'fields' | null>(null);
  const [isProcessingJournal, setIsProcessingJournal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceRefereeId, setAdvanceRefereeId] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<number | ''>('');
  const [advanceDate, setAdvanceDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [advanceNotes, setAdvanceNotes] = useState<string>('');

  // Rates from economicSettings
  const REFEREE_FEE = economicSettings?.referee_payment_standard ?? 25; 
  const venueCosts = economicSettings?.venue_costs ?? [];

  const getFieldRate = (fieldName: string) => {
    if (!fieldName || !venueCosts.length) return 0;
    const normalizedSearch = fieldName.toLowerCase().trim();
    const venue = venueCosts.find((v: any) => 
      v.venue_name?.toLowerCase().trim() === normalizedSearch
    );
    return venue ? Number(venue.hourly_rate) : 0;
  };

  // Filter matches by date range and search term - safely
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      try {
        if (!m.match_date) return false;
        const matchDate = parseISO(m.match_date);
        const start = startOfDay(parseISO(dateRange.start));
        const end = endOfDay(parseISO(dateRange.end));
        
        const withinDate = isWithinInterval(matchDate, { start, end });
        if (!withinDate) return false;

        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        const referee = referees.find(r => r.id === m.referee_id)?.name?.toLowerCase() || '';
        const field = m.field?.toLowerCase() || '';
        const teamA = teams.find(t => t.id === m.team_a_id)?.name?.toLowerCase() || '';
        const teamB = teams.find(t => t.id === m.team_b_id)?.name?.toLowerCase() || '';

        return referee.includes(searchLower) || 
               field.includes(searchLower) || 
               teamA.includes(searchLower) || 
               teamB.includes(searchLower);
      } catch (e) {
        return false;
      }
    });
  }, [matches, dateRange, searchTerm, referees, teams]);

  // Calculate referee totals
  const refereeSettlements = useMemo(() => {
    return referees.map(ref => {
      const refMatches = filteredMatches.filter(m => m.referee_id === ref.id);
      const totalMatchAmount = refMatches.length * REFEREE_FEE;
      
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      
      const refAdvances = (refereeAdvances || []).filter(a => {
        if (a.referee_id !== ref.id) return false;
        try {
          return isWithinInterval(parseISO(a.date), { start, end });
        } catch (e) {
          return false;
        }
      });
      const totalAdvances = refAdvances.reduce((sum, a) => sum + a.amount, 0);
      
      const totalAmount = totalMatchAmount - totalAdvances;

      return {
        ...ref,
        matchCount: refMatches.length,
        totalMatchAmount,
        totalAdvances,
        totalAmount
      };
    }).filter(r => r.matchCount > 0 || r.totalAdvances > 0)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [referees, filteredMatches, REFEREE_FEE, refereeAdvances, dateRange]);

  // Calculate field totals
  const fieldSettlements = useMemo(() => {
    const fieldsSet = Array.from(new Set(matches.map(m => m.field))).filter(Boolean) as string[];
    return fieldsSet.map((fieldName: string) => {
      const fieldMatches = filteredMatches.filter(m => m.field === fieldName);
      const rate = getFieldRate(fieldName);
      const totalAmount = fieldMatches.length * rate;
      return {
        name: fieldName,
        matchCount: fieldMatches.length,
        rate,
        totalAmount
      };
    }).filter(f => f.matchCount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [matches, filteredMatches, venueCosts]);

  const totalRefereeExpense = useMemo(() => refereeSettlements.reduce((sum, r) => sum + r.totalAmount, 0), [refereeSettlements]);
  const totalFieldExpense = useMemo(() => fieldSettlements.reduce((sum, f) => sum + f.totalAmount, 0), [fieldSettlements]);

  const handleRegisterJournalClick = (type: 'referees' | 'fields') => {
    if (type === 'referees' && totalRefereeExpense <= 0) return toast.error('No hay gastos de árbitros en este periodo');
    if (type === 'fields' && totalFieldExpense <= 0) return toast.error('No hay gastos de campos en este periodo');
    setConfirmModalType(type);
  };

  const executeRegisterJournal = async () => {
    if (!confirmModalType) return;
    const type = confirmModalType;
    setIsProcessingJournal(true);
    
    const formattedStartDate = format(parseISO(dateRange.start), 'dd/MM/yyyy');
    const formattedEndDate = format(parseISO(dateRange.end), 'dd/MM/yyyy');
    
    if (type === 'referees') {
        let accountId = '';
        const refereeAccount = accounts?.find(a => a?.name?.toLowerCase().includes('arbitraje') && a?.type === 'Gasto');
        if (refereeAccount) accountId = refereeAccount.id;
        
        if (!accountId) {
             setIsProcessingJournal(false);
             return toast.error('No se ha encontrado ninguna cuenta de gasto compatible (con "arbitraje" en el nombre)');
        }
        
        try {
            await addTransaction({
                date: dateRange.end,
                amount: totalRefereeExpense,
                accountId,
                description: `Pagos Arbitros periodo (${formattedStartDate} al ${formattedEndDate})`,
                isAutomated: false,
                type: 'Gasto'
            });
            toast.success('Gasto de árbitros registrado en el Libro Diario');
            setConfirmModalType(null);
        } catch (err) {
             toast.error('Error al registrar en el Libro Diario');
        }
    } else if (type === 'fields') {
        let accountId = '';
        // Look for accounts with 'alquiler' or 'instalaciones' in the name
        const fieldAccount = accounts?.find(a => (a?.name?.toLowerCase().includes('alquiler') || a?.name?.toLowerCase().includes('instalacion') || a?.name?.toLowerCase().includes('instalación')) && a?.type === 'Gasto');
        if (fieldAccount) accountId = fieldAccount.id;
        
        if (!accountId) {
             setIsProcessingJournal(false);
             return toast.error('No se ha encontrado ninguna cuenta de gasto compatible (con "alquiler" o "instalacion" en el nombre)');
        }
        
        try {
            await addTransaction({
                date: dateRange.end,
                amount: totalFieldExpense,
                accountId,
                description: `Alquiler campos periodo (${formattedStartDate} al ${formattedEndDate})`,
                isAutomated: false,
                type: 'Gasto'
            });
            toast.success('Gasto de campos registrado en el Libro Diario');
            setConfirmModalType(null);
        } catch (err) {
             toast.error('Error al registrar en el Libro Diario');
        }
    }
    setIsProcessingJournal(false);
  };

  const handleDownloadPDF = async (type: 'referees' | 'fields' | 'full') => {
    const doc = new jsPDF();
    
    // Helper to add the shared header
    const addSharedHeader = (doc: any) => {
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('CAMPEONATO DE FUTBOL 7 LA AMISTAD | SANTA CRUZ DE TENERIFE', 40, 15);
      doc.setFontSize(10);
      doc.text(`Jornada correspondiente al periodo del ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} al ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, 40, 22);
      
      // Logo 
      if (economicSettings?.logo_url) {
        try {
          doc.addImage(economicSettings.logo_url, undefined, 14, 10, 20, 20);
        } catch (e) {
          doc.setDrawColor(200);
          doc.setFillColor(240);
          doc.rect(14, 10, 20, 20, 'FD');
          doc.setFontSize(8);
          doc.text('LOGO', 18, 20);
        }
      } else {
        doc.setDrawColor(200);
        doc.setFillColor(240);
        doc.rect(14, 10, 20, 20, 'FD');
        doc.setFontSize(8);
        doc.text('LOGO', 18, 20);
      }
    };

    const title = type === 'referees' ? 'LIQUIDACIÓN DE ÁRBITROS' : 
                  type === 'fields' ? 'LIQUIDACIÓN DE CAMPOS' : 
                  'RESUMEN GENERAL DE LIQUIDACIONES';
    
    addSharedHeader(doc);

    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text(title, 14, 40);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 48);

    if (type === 'referees' || type === 'full') {
      autoTable(doc, {
        startY: 55,
        head: [['ÁRBITRO', 'PARTIDOS', 'TARIFA', 'TOTAL']],
        body: refereeSettlements.map(r => [
          String(r.name || '').toUpperCase(),
          r.matchCount,
          `${REFEREE_FEE} €`,
          `${r.totalAmount.toFixed(2)} €`
        ]),
        foot: [[{ content: 'TOTAL GASTO ÁRBITROS', colSpan: 3, styles: { halign: 'right' } }, `${totalRefereeExpense.toFixed(2)} €`]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
        footStyles: { fillColor: [15, 23, 42] }
      });
    }

    if (type === 'fields' || type === 'full') {
      let startY = type === 'full' ? (doc as any).lastAutoTable?.finalY + 15 : 60;

      if (type === 'full') {
         doc.setFontSize(16);
         doc.setTextColor(16, 185, 129);
         doc.text('RESUMEN DE CAMPOS', 14, startY);
         startY += 10;
      }
      
      autoTable(doc, {
        startY,
        head: [['CAMPO', 'HORAS / PARTIDOS', 'TARIFA / HORA', 'TOTAL LIQUIDACIÓN']],
        body: fieldSettlements.map(f => [
          f.name,
          f.matchCount.toString(),
          `${f.rate.toFixed(2)} €`,
          `${f.totalAmount.toFixed(2)} €`
        ]),
        foot: [[{ content: 'TOTAL GASTO CAMPOS', colSpan: 3, styles: { halign: 'right' } }, `${totalFieldExpense.toFixed(2)} €`]],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        footStyles: { fillColor: [15, 23, 42] }
      });
    }

    doc.save(`Liquidaciones_${type}_${dateRange.start}_${dateRange.end}.pdf`);
    toast.success('Documento PDF generado con éxito');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 px-1">Módulo de Gastos Operativos</p>
          <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">Liquidaciones Operativas</h2>
          <p className="text-xs text-slate-500 font-bold mt-1">Cálculo automático según tarifas configuradas.</p>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
              onClick={() => handleDownloadPDF('full')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Resumen Completo PDF
            </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['liquidations', 'analytics', 'audit'] as const).map(view => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeView === view 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
            }`}
          >
            {view === 'liquidations' ? 'Liquidaciones' : 
             view === 'analytics' ? 'Análisis de Rentabilidad' : 
             'Auditoría Contable'}
          </button>
        ))}
      </div>

      {activeView === 'liquidations' && (
        <>
          {/* Filters Card */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-app relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Fecha Inicio</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input 
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Fecha Fin</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input 
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Buscador Rápido</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Árbitro, campo o equipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Referee Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  Árbitros
                </h3>
                <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                  Total: {totalRefereeExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-app overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Árbitro</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Partidos</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Adelantos</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">A Pagar</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {refereeSettlements.map((ref) => (
                        <tr key={ref.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img src={ref.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ref.name)}&background=random`} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                              <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{ref.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-[10px] font-black text-slate-600" title={`${ref.totalMatchAmount} € generados`}>
                              {ref.matchCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <span className={`text-xs font-black tracking-tighter ${ref.totalAdvances > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                              {ref.totalAdvances > 0 ? '-' : ''}{ref.totalAdvances.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <span className="text-xs font-black text-indigo-600 tracking-tighter">
                              {ref.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                setAdvanceRefereeId(ref.id);
                                setShowAdvanceModal(true);
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all uppercase tracking-widest"
                            >
                              Adelanto
                            </button>
                          </td>
                        </tr>
                      ))}
                      {refereeSettlements.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay datos en este periodo</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-slate-50">
                    <button 
                      onClick={() => handleDownloadPDF('referees')}
                      className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-600 hover:text-white transition-all active:scale-[0.98] shadow-md shadow-indigo-100/50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Liquidación Árbitros
                    </button>
                    <button 
                      onClick={() => handleRegisterJournalClick('referees')}
                      className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-600 hover:text-white transition-all active:scale-[0.98] shadow-md shadow-rose-100/50"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Registrar en Diario
                    </button>
                </div>
              </div>
            </div>

            {/* Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Campos
                </h3>
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                  Total: {totalFieldExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-app overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Localización / Campo</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Horas/Partidos</th>
                        <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {fieldSettlements.map((field) => (
                        <tr key={field.name} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-tight whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="leading-none">{field.name}</p>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">TARIFA: {field.rate}€</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                              {field.matchCount}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <span className="text-xs font-black text-emerald-600 tracking-tighter">
                              {field.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                            </span>
                          </td>
                        </tr>
                      ))}
                      {fieldSettlements.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center">
                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay datos en este periodo</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-6 flex flex-col sm:flex-row items-center justify-center gap-3 border-t border-slate-50">
                    <button 
                       onClick={() => handleDownloadPDF('fields')}
                      className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 rounded-full hover:bg-emerald-600 hover:text-white transition-all active:scale-[0.98] shadow-md shadow-emerald-100/50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar Liquidación Campos
                    </button>
                    <button 
                      onClick={() => handleRegisterJournalClick('fields')}
                      className="w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 border border-rose-100 rounded-full hover:bg-rose-600 hover:text-white transition-all active:scale-[0.98] shadow-md shadow-rose-100/50"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Registrar en Diario
                    </button>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {activeView === 'analytics' && <ProfitabilityAnalytics matches={filteredMatches} teams={teams} settings={economicSettings} />}
      
      {activeView === 'audit' && <AccountingAudit transactions={useData().transactions} accounts={useData().accounts} />}

      {/* Bottom Summary Insights - Redesigned for Clarity and Elegance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 group-hover:rotate-6 transition-transform">
                  <Banknote className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gastos Totales</p>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Árbitros + Alquiler</p>
                </div>
              </div>
              <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                {(totalRefereeExpense + totalFieldExpense).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-indigo-600 text-2xl font-black ml-1">€</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                Consolidado del periodo
              </div>
           </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 relative overflow-hidden group hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-500">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:-rotate-6 transition-transform">
                  <TrendingDown className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Costo Medio</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Ratio Por Partido</p>
                </div>
              </div>
              <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                {filteredMatches.length > 0 
                  ? ((totalRefereeExpense + totalFieldExpense) / filteredMatches.length).toFixed(2) 
                  : 0} <span className="text-emerald-500 text-2xl font-black ml-1">€</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                Eficiencia operativa
              </div>
           </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
           <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mb-24 -mr-24 group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 text-indigo-400">
                  <Filter className="w-5 h-5" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Métrica de Actividad</p>
                </div>
                <div className="text-5xl font-black text-white tracking-tighter tabular-nums">
                  {filteredMatches.length}
                </div>
                <p className="text-[10px] font-bold text-indigo-300 mt-1 uppercase tracking-[0.2em]">Partidos Auditados</p>
              </div>
              
              <div className="mt-8 space-y-2">
                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  <span>Progreso Periodo</span>
                  <span>100%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      {confirmModalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                <Banknote className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Registrar en Diario</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
                ¿Estás seguro de que deseas registrar este movimiento en bloque en el Libro Diario? 
                <br/><br/>
                <span className="font-black text-slate-600">Periodo:</span> {format(parseISO(dateRange.start), 'dd/MM/yyyy')} al {format(parseISO(dateRange.end), 'dd/MM/yyyy')}
                <br/>
                <span className="font-black text-slate-600">Importe:</span> {confirmModalType === 'referees' ? totalRefereeExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : totalFieldExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModalType(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer"
                  disabled={isProcessingJournal}
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeRegisterJournal}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 cursor-pointer disabled:opacity-50"
                  disabled={isProcessingJournal}
                >
                  {isProcessingJournal ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdvanceModal && advanceRefereeId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-inner">
                <Banknote className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Adelanto</h3>
                <p className="text-xs font-bold text-slate-400 capitalize">
                  {referees.find(r => r.id === advanceRefereeId)?.name}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Importe (€)</label>
                <div className="relative">
                  <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    type="number"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    min="1"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input
                    type="date"
                    value={advanceDate}
                    onChange={(e) => setAdvanceDate(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Concepto (Opcional)</label>
                <input
                  type="text"
                  value={advanceNotes}
                  onChange={(e) => setAdvanceNotes(e.target.value)}
                  placeholder="Ej. Adelanto 15 Mayo"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowAdvanceModal(false)}
                className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (typeof advanceAmount !== 'number' || advanceAmount <= 0) {
                    toast.error('Introduzca un importe válido');
                    return;
                  }
                  if (!advanceDate) {
                    toast.error('Seleccione una fecha');
                    return;
                  }
                  
                  addRefereeAdvance({
                    referee_id: advanceRefereeId,
                    amount: advanceAmount,
                    date: advanceDate,
                    notes: advanceNotes
                  });
                  toast.success('Adelanto registrado correctamente');
                  setShowAdvanceModal(false);
                  setAdvanceAmount('');
                  setAdvanceNotes('');
                }}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ProfitabilityAnalytics({ matches, teams, settings }: any) {
  const REFEREE_FEE = settings?.referee_payment_standard ?? 25;
  const venueCosts = settings?.venue_costs ?? [];

  const getFieldRate = (fieldName: string) => {
    if (!fieldName || !venueCosts.length) return 0;
    const venue = venueCosts.find((v: any) => 
      v.venue_name?.toLowerCase().trim() === fieldName.toLowerCase().trim()
    );
    return venue ? Number(venue.hourly_rate) : 0;
  };

  // Calculate profitability per team (Income from team vs Expense of team matches)
  const teamAnalysis = useMemo(() => {
    return teams.map((team: any) => {
      const teamMatches = matches.filter((m: any) => m.team_a_id === team.id || m.team_b_id === team.id);
      
      // Expenses for this team's matches (half the cost of referee/field per team per match)
      const expense = teamMatches.reduce((sum: number, m: any) => {
        const fieldCost = getFieldRate(m.field);
        return sum + ((REFEREE_FEE + fieldCost) / 2);
      }, 0);

      return {
        id: team.id,
        name: team.name,
        matchCount: teamMatches.length,
        expense
      };
    }).filter((t: any) => t.matchCount > 0).sort((a: any, b: any) => b.expense - a.expense);
  }, [teams, matches, REFEREE_FEE, venueCosts]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-app">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-500" />
          Proyección de Gastos por Equipo
        </h3>
        
        <div className="space-y-4">
          {teamAnalysis.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.name}</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.matchCount} PARTIDAS DISPUTADAS</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-rose-600 tracking-tighter">{t.expense.toFixed(2)} €</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">COSTO OPERATIVO</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full -mb-32 -mr-32"></div>
        <div className="relative z-10">
          <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">Nota de Análisis</h4>
          <p className="text-sm font-medium leading-relaxed opacity-80">
            Este desglose muestra el gasto directo generado por la participación de cada equipo (Árbitros + Alquileres). 
            Un balance equilibrado requiere que las inscripciones y cuotas cubran estos gastos operativos variables.
          </p>
        </div>
      </div>
    </div>
  );
}

function AccountingAudit({ transactions, accounts }: any) {
  const automated = transactions.filter((t: any) => t.isAutomated);
  const manual = transactions.filter((t: any) => !t.isAutomated);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 px-1">Movimientos del Sistema</p>
          <div className="text-3xl font-black text-indigo-900">{automated.length}</div>
          <p className="text-xs font-bold text-indigo-400 mt-1 uppercase tracking-tight">Cargas automáticas detectadas</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Registros Manuales</p>
          <div className="text-3xl font-black text-slate-900">{manual.length}</div>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">Asientos generados por admón.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-app overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Log de Auditoría Contable (Últimos 15)</h3>
          <Shield className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Origen</th>
                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.slice(0, 15).map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{format(parseISO(t.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${t.isAutomated ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                      {t.isAutomated ? 'Auto' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-700 uppercase tracking-tight">{t.description}</td>
                  <td className={`px-6 py-4 text-right text-xs font-black ${t.type === 'Ingreso' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {t.type === 'Ingreso' ? '+' : '-'}{t.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
