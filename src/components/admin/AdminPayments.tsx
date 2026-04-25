import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Banknote, Shield, Calendar, AlertCircle, Eye, Euro, Clock, MapPin, CheckCircle2, Download, MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../store/DataContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { exportToCSV } from '../../utils/exportUtils';
import { toast } from 'sonner';
import { getWhatsAppLink } from '../../utils/whatsapp';

// Modal component for confirmation
const ConfirmationModal = ({ isOpen, onClose, onConfirm, refereeName, amount, period, title }: any) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm text-center border border-white relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Banknote className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-display font-black text-xl text-slate-900 mb-2 uppercase tracking-tight">{title || "Confirmar Entrega"}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">Verifica los datos antes de procesar</p>
            
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 space-y-4 text-left border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Entidad</span>
                <span className="text-xs font-bold text-slate-900">{refereeName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Periodo</span>
                <span className="text-xs font-bold text-slate-900">{period}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-emerald-600">{amount.toFixed(2)} €</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onClose} 
                className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm} 
                className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Modal for referee details
const RefereeDetailsModal = ({ isOpen, onClose, referee, matches, teams }: any) => {
  if (!isOpen) return null;
  const refMatches = matches.filter((m: any) => m.referee_id === referee.id);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Detalles del Árbitro: {referee.name}</h3>
        <div className="space-y-2">
          {refMatches.map((m: any) => {
            const teamA = teams.find((t: any) => t.id === m.team_a_id)?.name || 'Desconocido';
            const teamB = teams.find((t: any) => t.id === m.team_b_id)?.name || 'Desconocido';
            return (
              <div key={m.id} className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-200">
                <p className="font-medium text-gray-900">{teamA} vs {teamB}</p>
                <p className="text-gray-700">Fecha: {format(new Date(m.match_date), 'dd/MM/yyyy')} - Hora: {m.match_time} - Campo: {m.field}</p>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Cerrar</button>
      </div>
    </div>
  );
};

export default function AdminPayments() {
  const { matches, referees, teams, payments, addPayment, deliveries, addDelivery, settings } = useData();
  
  // Deduplicate payments to handle legacy duplicates in database
  const uniquePayments = React.useMemo(() => {
    const latestPayments: Record<string, any> = {};
    payments.forEach(p => {
      const key = `${p.match_id}_${p.team_id}`;
      if (!latestPayments[key] || new Date(p.created_at) > new Date(latestPayments[key].created_at)) {
        latestPayments[key] = p;
      }
    });
    return Object.values(latestPayments);
  }, [payments]);

  const [isRecaudacionOpen, setIsRecaudacionOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [isImpagosOpen, setIsImpagosOpen] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);
  const [expandedImpagoId, setExpandedImpagoId] = useState<string | null>(null);
  const regions = Array.from(new Set(matches.map(m => m.period || 'Sin Periodo'))).sort().reverse();
  const periods = React.useMemo(() => Array.from(new Set(matches.map(m => m.period || 'Sin Periodo'))).sort().reverse(), [matches]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // Set default period once matches are loaded
  React.useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periods[0]);
    }
  }, [periods]);
  const [modalData, setModalData] = useState<any>(null);
  const [refereeDetails, setRefereeDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Periodo Actual');

  const impagos = React.useMemo(() => {
    return matches
      .filter(m => m.status === 'Liquidado')
      .flatMap(m => [
        { teamId: m.team_a_id, id: `${m.id}-a`, equipo: teams.find(t => t.id === m.team_a_id)?.name || 'Desconocido', jornada: `J${m.match_round}`, fecha: m.match_date, campo: m.field, hora: m.match_time, arbitro: referees.find(r => r.id === m.referee_id)?.name || 'Sin Asignar', match_id: m.id, period: m.period },
        { teamId: m.team_b_id, id: `${m.id}-b`, equipo: teams.find(t => t.id === m.team_b_id)?.name || 'Desconocido', jornada: `J${m.match_round}`, fecha: m.match_date, campo: m.field, hora: m.match_time, arbitro: referees.find(r => r.id === m.referee_id)?.name || 'Sin Asignar', match_id: m.id, period: m.period }
      ])
      .map(item => {
         const teamPayments = uniquePayments.filter(p => p.match_id === item.match_id && p.team_id === item.teamId);
         const paidPayment = teamPayments.find(p => p.is_paid);
         const unpaidPayment = teamPayments.find(p => !p.is_paid);
         
         const effectivePayment = unpaidPayment || paidPayment;
         const rawMotivo = effectivePayment?.reason || 'Transferencia';

         let displayMotivo = (rawMotivo === 'Liquidación Administrador' ? 'Transferencia' : rawMotivo);
         if (paidPayment) {
            displayMotivo = 'Metálico';
         }

         return {
           ...item,
           pagado: !!paidPayment,
           fechaPago: paidPayment?.created_at ? format(new Date(paidPayment.created_at), 'dd/MM/yyyy') : '',
           motivo: displayMotivo
         }
      })
      .filter(item => !item.pagado);
  }, [matches, payments, teams, referees]);

  const handleLiquidate = (item: any) => {
    console.log('Liquidating:', item);
    addPayment({
      match_id: item.match_id,
      team_id: item.teamId,
      amount: 35,
      is_paid: true,
      reason: 'Transferencia'
    });
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'Periodo Actual': return 'text-indigo-600 border-indigo-500';
      case 'Seguimiento': return 'text-purple-600 border-purple-500';
      case 'Histórico': return 'text-amber-600 border-amber-500';
      default: return 'text-slate-600 border-slate-500';
    }
  };

  const renderTable = (data: typeof impagos, type: 'actual' | 'seguimiento' | 'historico') => {
    let sortedData = [...data];
    if (type === 'seguimiento') {
      sortedData.sort((a, b) => {
        if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
    } else if (type === 'historico') {
      sortedData.sort((a, b) => {
        if (a.pagado !== b.pagado) return a.pagado ? 1 : -1;
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      });
    }

    return (
      <div className="overflow-hidden bg-white border border-slate-100 rounded-[2rem] shadow-app">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-hide">
          <table className="w-full text-xs text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 shadow-sm">
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Equipo</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Jornada</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Fecha</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Campo</th>
                <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">Motivo</th>
                {type !== 'actual' && <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-center">{type === 'historico' ? 'Estado' : 'Acción'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedData.map((i, index) => (
                <React.Fragment key={i.id}>
                  <tr 
                    onClick={() => setExpandedImpagoId(expandedImpagoId === i.id ? null : i.id)}
                    className="hover:bg-slate-50/50 transition-all group animate-in fade-in slide-in-from-left-2 duration-300 cursor-pointer" 
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="px-6 py-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{(index + 1).toString().padStart(2, '0')}</span>
                        <span className="font-black text-slate-900 uppercase tracking-tight truncate max-w-[150px]">{i.equipo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-500 border-b border-slate-50 uppercase tracking-tighter">{i.jornada}</td>
                    <td className="px-6 py-4 font-bold text-slate-500 border-b border-slate-50 whitespace-nowrap">{format(new Date(i.fecha), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 font-bold text-indigo-600 border-b border-slate-50 uppercase tracking-tighter">{i.campo}</td>
                    <td className="px-6 py-4 border-b border-slate-50 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{i.motivo}</span>
                        {(i.motivo === 'Olvido' || i.motivo === 'Otros') && (
                          <div className="group relative">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500 cursor-help animate-pulse" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-32 bg-slate-900 text-white text-[10px] py-2 px-3 rounded-xl shadow-xl text-center z-30 font-black tracking-tight uppercase border border-white/10 backdrop-blur-md">
                              Seguimiento especial
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    {type !== 'actual' && (
                      <td className="px-6 py-4 border-b border-slate-50 text-center">
                        <div className="flex justify-center h-10 items-center">
                          {type === 'seguimiento' && (
                            !i.pagado ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleLiquidate(i); setModalData(null); }} 
                                className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95 border border-transparent hover:border-red-100 shadow-sm hover:shadow-md group/btn" 
                                title="Marcar como Liquidado"
                              >
                                <Euro className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                              </button>
                            ) : (
                              <motion.div 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-app-inner ring-4 ring-emerald-50/10"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Liquidado</span>
                              </motion.div>
                            )
                          )}
                          {type === 'historico' && (
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${i.pagado ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                              {i.pagado ? `Pagado: ${i.fechaPago}` : 'Pendiente'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  <AnimatePresence>
                    {expandedImpagoId === i.id && (
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <td colSpan={type === 'actual' ? 5 : 6} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden px-6 py-4"
                          >
                            <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-6 relative">
                              <button 
                                onClick={() => setExpandedImpagoId(null)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                  <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase flex items-center gap-3">
                                    <Shield className="w-6 h-6 text-indigo-500" />
                                    {i.equipo}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-500 mt-1">Tel: {teams.find(t => t.id === i.teamId)?.contact_phone || 'Sin registrar'}</p>
                                </div>
                                <div className="flex gap-3">
                                  {teams.find(t => t.id === i.teamId)?.contact_phone && (
                                    <a 
                                      href={getWhatsAppLink(teams.find(t => t.id === i.teamId)?.contact_phone || '', `Hola responsable del equipo ${i.equipo}. Tienes pagos de arbitrajes pendientes en las instalaciones. Por favor, revisa la situación lo antes posible.`)} 
                                      target="whatsapp_admin" 
                                      className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1DA851] transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                      Enviar Recordatorio
                                    </a>
                                  )}
                                </div>
                              </div>
                              
                              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Historial de Arbitrajes Pendientes
                                </h5>
                                <div className="space-y-3">
                                  {impagos
                                    .filter(imp => imp.teamId === i.teamId && !imp.pagado)
                                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                    .map(pending => (
                                      <div key={pending.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4 hover:border-indigo-200 hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-xs font-black text-red-600 border border-red-100 shadow-inner">
                                            {pending.jornada}
                                          </div>
                                          <div>
                                            <div className="text-sm font-black text-slate-900 flex items-center gap-2 mb-1">
                                              {format(new Date(pending.fecha), 'dd/MM/yyyy')} a las {pending.hora}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">{pending.campo}</span>
                                              <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                Motivo: {pending.motivo}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleLiquidate(pending); setModalData(null); }}
                                          className="w-full sm:w-auto px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                          <Euro className="w-4 h-4" /> Liquidar Ahora
                                        </button>
                                      </div>
                                    ))}
                                  {impagos.filter(imp => imp.teamId === i.teamId && !imp.pagado).length === 0 && (
                                    <div className="text-center py-6">
                                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Equipo al corriente de pago</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Helper to format period string YYYY-MM-DD_to_YYYY-MM-DD to DD/MM/AAAA - DD/MM/AAAA
  const formatPeriod = (period: string) => {
    if (period === 'Sin Periodo' || !period) return period || 'Sin Periodo';
    const [start, end] = period.split('_to_');
    if (!start || !end) return period;
    const formatDateStr = (dateStr: string) => {
       try { return format(new Date(dateStr), 'dd/MM/yyyy'); }
       catch(e) { return dateStr; }
    };
    return `${formatDateStr(start)} - ${formatDateStr(end)}`;
  };

  // Filter matches by period
  const filteredMatches = selectedPeriod === 'Todas las Semanas' || !selectedPeriod
    ? matches 
    : matches.filter(m => m.period === selectedPeriod);

  // Group matches by date
  const matchesByDate = filteredMatches.reduce((acc, match) => {
    const date = match.match_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {} as Record<string, typeof matches>);

  const sortedDates = Object.keys(matchesByDate).sort();

  const handleSaveDelivery = () => {
    if (modalData) {
      addDelivery({
        referee_id: referees.find(r => r.name === modalData.refereeName)?.id || '',
        amount: modalData.amount,
        date: new Date().toISOString(),
        period: selectedPeriod
      });
      setModalData(null);
    }
  };

  // Calculate KPIs
  const liquidatedMatches = filteredMatches.filter(m => m.status === 'Liquidado');

  const kpiMatches = {
    total: filteredMatches.length,
    liquidated: liquidatedMatches.length,
    pending: filteredMatches.filter(m => m.status !== 'Liquidado').length
  };

  const kpiTeams = {
    total: filteredMatches.reduce((acc, match) => {
      let count = 0;
      if (match.team_a_id) count++;
      if (match.team_b_id) count++;
      return acc + count;
    }, 0),
    paid: uniquePayments.filter(p => p.is_paid && liquidatedMatches.some(m => m.id === p.match_id)).length,
    unpaid: uniquePayments.filter(p => !p.is_paid && liquidatedMatches.some(m => m.id === p.match_id)).length
  };

  const kpiFinancial = {
    expected: filteredMatches.length * 70, // 35 per team
    liquidated: uniquePayments.filter(p => p.is_paid && liquidatedMatches.some(m => m.id === p.match_id)).reduce((acc, p) => acc + p.amount, 0),
    pending: uniquePayments.filter(p => !p.is_paid && liquidatedMatches.some(m => m.id === p.match_id)).reduce((acc, p) => acc + p.amount, 0)
  };

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 px-1">CONTROL FINANCIERO</p>
        <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">Liquidaciones</h2>
        <p className="text-sm text-slate-500 font-bold mt-1">Gestión centralizada de cobros y estados de pago.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-blue-50 border-b-8 border-r-8 border-blue-200 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="text-blue-500 w-5 h-5" />
            <h3 className="font-black text-blue-900 text-sm">Partidos</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-blue-800"><span>Totales</span><span className="font-black">{kpiMatches.total}</span></div>
            <div className="flex justify-between text-xs font-bold text-blue-800"><span>Liquidados</span><span className="font-black text-emerald-600">{kpiMatches.liquidated}</span></div>
            <div className="flex justify-between text-xs font-bold text-blue-800"><span>Sin liquidar</span><span className="font-black text-red-600">{kpiMatches.pending}</span></div>
          </div>
        </div>
        <div className="bg-purple-50 border-b-8 border-r-8 border-purple-200 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-purple-500 w-5 h-5" />
            <h3 className="font-black text-purple-900 text-sm">Equipos</h3>
          </div>
           <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-purple-800"><span>Totales</span><span className="font-black">{kpiTeams.total}</span></div>
            <div className="flex justify-between text-xs font-bold text-purple-800"><span>Pagan</span><span className="font-black text-emerald-600">{kpiTeams.paid}</span></div>
            <div className="flex justify-between text-xs font-bold text-purple-800"><span>No Pagan</span><span className="font-black text-red-600">{kpiTeams.unpaid}</span></div>
          </div>
        </div>
        <div className="bg-emerald-50 border-b-8 border-r-8 border-emerald-200 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
          <div className="flex items-center gap-3 mb-4">
            <Banknote className="text-emerald-600 w-5 h-5" />
            <h3 className="font-black text-emerald-900 text-sm">Recaudación (€)</h3>
          </div>
           <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-emerald-800"><span>Prevista</span><span className="font-black">{kpiFinancial.expected.toFixed(2)}€</span></div>
            <div className="flex justify-between text-xs font-bold text-emerald-800"><span>Liquidada</span><span className="font-black text-emerald-600">{kpiFinancial.liquidated.toFixed(2)}€</span></div>
            <div className="flex justify-between text-xs font-bold text-emerald-800"><span>No Liquidada</span><span className="font-black text-red-600">{kpiFinancial.pending.toFixed(2)}€</span></div>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-4 px-1 flex items-center gap-2">
             <Calendar className="w-3 h-3" /> Seleccionar Jornada
          </p>
          <div className="relative">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full bg-white border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 appearance-none focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
            >
              <option value="Todas las Semanas">Todas las Semanas</option>
              {periods.map(p => <option key={p as string} value={p as string}>{formatPeriod(p as string)}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => {
            exportToCSV(impagos, 'Reporte_Liquidaciones');
            toast.success('Reporte exportado como Excel');
          }}
          className="flex items-center px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </button>
      </div>

      {/* KPI Cards (omitted for brevity, keep existing) */}
      {/* ... */}
      
      {/* Accordion Sections */}
      <div className="space-y-6">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-app overflow-hidden">
          <button onClick={() => setIsRecaudacionOpen(!isRecaudacionOpen)} className="w-full p-6 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Banknote className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Recaudación Diaria</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Control por fecha</p>
              </div>
            </div>
            {isRecaudacionOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          {isRecaudacionOpen && (
            <div className="p-6 pt-0 border-t border-slate-50 space-y-4">
              {sortedDates.map(date => {
                const dayMatches = matchesByDate[date].filter(m => m.status === 'Liquidado');
                const totalAmount = uniquePayments
                  .filter(p => dayMatches.some(m => m.id === p.match_id) && p.is_paid)
                  .reduce((sum, p) => sum + p.amount, 0);
                const isExpanded = expandedDate === date;
                return (
                  <div key={date} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                           <Calendar className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="font-black text-slate-700 text-xs uppercase tracking-tight">
                          {format(new Date(date), 'EEEE d MMMM yyyy', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-emerald-600 tracking-tight">{totalAmount.toFixed(2)} €</span>
                        <button onClick={() => setExpandedDate(isExpanded ? null : date)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-5 space-y-4 pt-4 border-t border-slate-200/50">
                        {Array.from(new Set(dayMatches.map(m => m.referee_id))).map(refId => {
                          const ref = referees.find(r => r.id === refId);
                          const refMatches = dayMatches.filter(m => m.referee_id === refId);
                          return (
                            <div key={refId} className="space-y-3">
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                                {ref?.name || 'Sin Asignar'}
                              </p>
                              {refMatches.map(m => {
                                const teamA = teams.find((t: any) => t.id === m.team_a_id)?.name || 'Desconocido';
                                const teamB = teams.find((t: any) => t.id === m.team_b_id)?.name || 'Desconocido';
                                const paymentA = uniquePayments.find(p => p.match_id === m.id && p.team_id === m.team_a_id);
                                const paymentB = uniquePayments.find(p => p.match_id === m.id && p.team_id === m.team_b_id);
                                const totalPagado = (paymentA?.is_paid ? 35 : 0) + (paymentB?.is_paid ? 35 : 0);

                                // Determinar estado de liquidación para el equipo
                                const getTeamColor = (payment: any) => {
                                  if (m.status !== 'Liquidado') return 'text-slate-900';
                                  return payment?.is_paid ? 'text-emerald-600' : 'text-red-500';
                                };

                                return (
                                  <div key={m.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-900 border-r border-slate-100 pr-2 leading-none">{m.match_time}</span>
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                                          <span className={getTeamColor(paymentA)}>{teamA}</span>
                                          <span className="text-slate-300 font-black">VS</span>
                                          <span className={getTeamColor(paymentB)}>{teamB}</span>
                                        </div>
                                      </div>
                                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{m.field}</span>
                                    </div>
                                    <span className="font-black text-slate-900 tracking-tighter text-sm">{totalPagado} €</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-app overflow-hidden">
          <button onClick={() => setIsResumenOpen(!isResumenOpen)} className="w-full p-6 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Resumen por Árbitro</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Control de liquidaciones</p>
              </div>
            </div>
            {isResumenOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          {isResumenOpen && (
            <div className="p-6 pt-0 border-t border-slate-50 space-y-4">
              {[...referees].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(ref => {
                const refMatches = filteredMatches.filter(m => m.referee_id === ref.id);
                const liquidatedMatches = refMatches.filter(m => m.status === 'Liquidado');
                const totalAmount = uniquePayments
                  .filter(p => liquidatedMatches.some(m => m.id === p.match_id) && p.is_paid)
                  .reduce((sum, p) => sum + p.amount, 0);
                const isExpanded = expandedRefereeId === ref.id;
                const delivery = deliveries.find(d => d.referee_id === ref.id && d.period === selectedPeriod && d.amount >= totalAmount);
                
                // Determinar si es Liquidación Parcial o Total
                const hasLiquidatedMatches = liquidatedMatches.length > 0;
                const isTotalLiquidation = hasLiquidatedMatches && refMatches.every(m => m.status === 'Liquidado');
                
                return (
                  <div key={ref.id} className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="relative">
                          <img src={ref.photo_url || 'https://picsum.photos/80/80'} alt={ref.name} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                          {delivery && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>}
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{ref.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{refMatches.length} partidos asignados</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                           <span className="text-[10px] font-black text-slate-300 uppercase leading-none block">
                             {hasLiquidatedMatches
                               ? (isTotalLiquidation ? 'Liquidación Total' : 'Liquidación Parcial') 
                               : ''}
                           </span>
                           <span className="text-base font-black text-slate-900 block leading-none">{totalAmount.toFixed(2)}€</span>
                        </div>
                        <button className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm ${isExpanded ? 'text-white bg-indigo-600' : 'text-slate-400 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 border border-slate-100'}`} onClick={() => setExpandedRefereeId(isExpanded ? null : ref.id)}>
                          <Eye className="w-5 h-5" />
                        </button>
                        {delivery ? (
                            <div className="flex flex-col items-end text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 
                                <span className="text-[10px] font-black uppercase tracking-tighter">Entregado</span>
                              </div>
                              <span className="text-[8px] font-bold">{format(new Date(delivery.created_at), 'dd/MM/yy')}</span>
                            </div>
                        ) : (
                          <button 
                            onClick={() => setModalData({ 
                              refereeName: ref.name, 
                              amount: totalAmount, 
                              period: selectedPeriod === 'Todas las Semanas' ? 'Todas' : formatPeriod(selectedPeriod) 
                            })} 
                            className="w-10 h-10 flex items-center justify-center bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-slate-100 hover:border-emerald-100 shadow-sm"
                          >
                            <Euro className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-slate-200/50 pt-5">
                        {Array.from(new Set(refMatches.map(m => m.match_date))).sort().map(date => {
                          const dateMatches = refMatches.filter(m => m.match_date === date).sort((a, b) => a.match_time.localeCompare(b.match_time));
                          return (
                            <div key={date} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                {format(new Date(date as string), 'dd/MM/yy EEEE', { locale: es })}
                              </p>
                              <div className="space-y-2">
                                  {dateMatches.map(m => {
                                    const teamA = teams.find((t: any) => t.id === m.team_a_id)?.name || 'Desconocido';
                                    const teamB = teams.find((t: any) => t.id === m.team_b_id)?.name || 'Desconocido';
                                    const paymentA = uniquePayments.find(p => p.match_id === m.id && p.team_id === m.team_a_id);
                                    const paymentB = uniquePayments.find(p => p.match_id === m.id && p.team_id === m.team_b_id);
                                    const totalPagado = (paymentA?.is_paid ? 35 : 0) + (paymentB?.is_paid ? 35 : 0);
                                    
                                    // Determinar estado de liquidación para el equipo
                                    const getTeamColor = (payment: any) => {
                                      if (m.status !== 'Liquidado') return 'text-slate-900';
                                      return payment?.is_paid ? 'text-emerald-600' : 'text-red-500';
                                    };

                                    return (
                                      <div key={m.id} className="flex justify-between items-center p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 text-[11px] font-bold">
                                        <div className="text-slate-700 flex items-center gap-2">
                                          <span className="text-[10px] font-black">{m.match_time}</span>
                                          <span className={getTeamColor(paymentA)}>{teamA}</span>
                                          <span className="text-slate-300 font-black">VS</span>
                                          <span className={getTeamColor(paymentB)}>{teamB}</span>
                                        </div>
                                        <span className="font-black text-slate-900">{totalPagado}€</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-app overflow-hidden">
          <button onClick={() => setIsImpagosOpen(!isImpagosOpen)} className="w-full p-6 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Seguimiento Impagos</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Gestión de deudas</p>
              </div>
            </div>
            {isImpagosOpen ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </button>
          {isImpagosOpen && (
            <div className="p-6 pt-0 border-t border-slate-50">
              <div className="flex gap-1 mb-6 border-b border-slate-200">
                {['Periodo Actual', 'Seguimiento', 'Histórico'].map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                      activeTab === tab 
                        ? `${getTabColor(tab)}` 
                        : 'text-slate-400 border-transparent hover:text-slate-900 hover:border-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {activeTab === 'Periodo Actual' && renderTable(impagos.filter(i => !i.pagado && i.period === selectedPeriod), 'actual')}
              {activeTab === 'Seguimiento' && renderTable(impagos, 'seguimiento')}
              {activeTab === 'Histórico' && renderTable(impagos, 'historico')}
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal isOpen={!!modalData} onClose={() => setModalData(null)} onConfirm={handleSaveDelivery} {...modalData} />
      <RefereeDetailsModal isOpen={!!refereeDetails} onClose={() => setRefereeDetails(null)} referee={refereeDetails} matches={matches} teams={teams} />
    </div>
  );
}
