import React, { useState } from 'react';
import { useData } from '../../store/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, MapPin, CheckCircle2, AlertCircle, Save, Calendar, TrendingUp, History, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateDisplay, formatTimeDisplay } from '../../utils/formatters';

export default function RefereeMatches() {
  const { matches, teams, payments, addPayment, updateMatchStatus, settings, referees } = useData();
  const { user } = useAuth();
  
  // Define periods first
  const periods = Array.from(new Set(matches.map(m => m.period || 'Sin periodo')))
    .sort((a,b) => b.localeCompare(a))
    .map(period => {
      if (period === 'Sin periodo') {
         return { id: period, label: 'Sin periodo' };
      }
      const [start, end] = (period as string).split('_to_');
      return {
        id: period,
        label: `Del ${formatDateDisplay(start)} al ${formatDateDisplay(end)}`
      };
    });

  const [selectedRound, setSelectedRound] = useState<string>(periods.length > 0 ? periods[0].id : 'all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDate = (date: string) => {
    const nextState = new Set(expandedDates);
    if (nextState.has(date)) {
      nextState.delete(date);
    } else {
      nextState.add(date);
    }
    setExpandedDates(nextState);
  };

  const isDayLiquidated = (date: string) => {
    return groupedMatches[date].every(match => match.status === 'Liquidado');
  };

  const myMatches = matches
    .filter(m => m.referee_id === user?.id || (referees.find(r => r.id === m.referee_id)?.name === user?.name))
    .sort((a, b) => {
      const dateA = new Date(`${a.match_date}T${a.match_time || '00:00'}`).getTime();
      const dateB = new Date(`${b.match_date}T${b.match_time || '00:00'}`).getTime();
      return dateA - dateB;
    });

  // Filter by period if selected
  const filteredMatches = selectedRound === 'all' 
    ? myMatches 
    : myMatches.filter(m => (m.period || 'Sin periodo') === selectedRound);

  // Group matches by date
  const groupedMatches = filteredMatches.reduce((groups: { [key: string]: any[] }, match) => {
    const date = match.match_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(match);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedMatches).sort();
  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'Desconocido';
  
  const getPaymentStatus = (matchId: string, teamId: string) => {
    return payments.find(p => p.match_id === matchId && p.team_id === teamId);
  };

  // KPIs
  const today = new Date().toISOString().split('T')[0];
  const todayMatches = myMatches.filter(m => m.match_date === today);
  const collectedToday = payments
    .filter(p => todayMatches.some(m => m.id === p.match_id) && p.is_paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const weekMatches = myMatches; // In this context, "week" is all assigned for now
  const collectedWeek = payments
    .filter(p => weekMatches.some(m => m.id === p.match_id) && p.is_paid)
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingMatches = myMatches.filter(m => m.status !== 'Liquidado').length;

  return (
    <div className="space-y-6 pb-10">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCardMobile title="Hoy" value={collectedToday} icon={TrendingUp} color="emerald" />
        <StatCardMobile title="Semana" value={collectedWeek} icon={TrendingUp} color="blue" />
        <StatCardMobile title="Pend." value={pendingMatches} icon={Clock} color="amber" />
      </div>

      {/* Period Selector */}
      <div className="bg-indigo-50 p-4 rounded-3xl shadow-app border border-indigo-100">
        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Seleccionar Periodo
        </p>
        <div className="relative">
          <select 
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="w-full bg-white border border-indigo-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 appearance-none focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-10">
        {sortedDates.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] shadow-app border border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-200" />
            </div>
            <p className="text-slate-400 font-bold text-balance">No hay partidos asignados para este periodo</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <button 
                onClick={() => toggleDate(date)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
              >
                <h3 className={`text-sm font-black uppercase tracking-wider flex items-center ${isDayLiquidated(date) ? 'text-emerald-700' : 'text-slate-900'}`}>
                  <Calendar className="w-4 h-4 mr-3 opacity-50" />
                  {groupedMatches[date][0].day_name} • {formatDateDisplay(date)}
                </h3>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedDates.has(date) ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {expandedDates.has(date) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-5 px-1 pt-2 overflow-hidden"
                  >
                    {groupedMatches[date].map((match) => (
                      <MatchCard 
                        key={match.id}
                        match={match} 
                        getTeamName={getTeamName}
                        getPaymentStatus={getPaymentStatus}
                        onSavePayment={addPayment}
                        onUpdateStatus={updateMatchStatus}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatCardMobile({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    emerald: 'bg-emerald-100/50 text-emerald-700 shadow-emerald-100',
    blue: 'bg-blue-100/50 text-blue-700 shadow-blue-100',
    amber: 'bg-amber-100 text-amber-700 shadow-amber-200'
  };
  return (
    <div className="bg-white p-4 rounded-3xl shadow-app border border-slate-50 flex flex-col items-center justify-center transition-transform active:scale-95">
      <div className={`w-8 h-8 ${colors[color]} rounded-xl flex items-center justify-center mb-2 shadow-sm`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-lg font-black text-slate-900 tracking-tight">{value}{typeof value === 'number' && title !== 'Pend.' ? '€' : ''}</p>
    </div>
  );
}

function MatchCard({ match, getTeamName, getPaymentStatus, onSavePayment, onUpdateStatus }: any) {
  const isLiquidated = match.status === 'Liquidado';
  const [isEditing, setIsEditing] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const paymentA = getPaymentStatus(match.id, match.team_a_id);
  const paymentB = getPaymentStatus(match.id, match.team_b_id);
  
  const [localPaymentA, setLocalPaymentA] = useState({ isPaid: paymentA?.is_paid ?? false, reason: paymentA?.reason ?? '' });
  const [localPaymentB, setLocalPaymentB] = useState({ isPaid: paymentB?.is_paid ?? false, reason: paymentB?.reason ?? '' });

  const canEdit = !isLiquidated || isEditing;

  const handleSave = () => {
    if ((!localPaymentA.isPaid && !localPaymentA.reason) || (!localPaymentB.isPaid && !localPaymentB.reason)) {
      setShowErrorModal(true);
      return;
    }

    onSavePayment({
      match_id: match.id,
      team_id: match.team_a_id,
      amount: 35,
      is_paid: localPaymentA.isPaid,
      reason: localPaymentA.isPaid ? 'Transferencia' : localPaymentA.reason
    });
    onSavePayment({
      match_id: match.id,
      team_id: match.team_b_id,
      amount: 35,
      is_paid: localPaymentB.isPaid,
      reason: localPaymentB.isPaid ? 'Transferencia' : localPaymentB.reason
    });
    onUpdateStatus(match.id, 'Liquidado');
    setIsEditing(false);
  };

  const totalCollected = isLiquidated ? (paymentA?.is_paid ? 35 : 0) + (paymentB?.is_paid ? 35 : 0) : 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-[2rem] shadow-app-lg border-2 transition-all overflow-hidden relative ${
        isLiquidated 
          ? 'bg-amber-50/60 border-slate-300 shadow-xl shadow-amber-50/50' 
          : 'bg-white border-slate-100'
      }`}
    >
      {!isLiquidated && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 shadow-[2px_0_10px_rgba(99,102,241,0.2)]"></div>
      )}

      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3 mr-1.5 text-slate-500" />
              <span className="text-xs font-black text-slate-900">{formatTimeDisplay(match.match_time)}</span>
            </div>
            <div className="flex items-center bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
              <MapPin className="w-3 h-3 mr-1.5 text-indigo-500" />
              <span className="text-[10px] font-black text-indigo-600 truncate max-w-[80px]">{match.field}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">J{match.match_round}</span>
              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-tight border active:scale-95 transition-transform ${
                isLiquidated 
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-100 text-amber-700 border-amber-300 animate-pulse shadow-sm shadow-amber-100'
              }`}>
                {isLiquidated ? '✓ LIQUIDADO' : '● PENDIENTE'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right ml-2 bg-white p-3 rounded-2xl shadow-app-inner border border-slate-50">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-tighter">Recaudación</p>
          <div className="text-xl font-black text-emerald-600 leading-none">{totalCollected}€</div>
          <div className="text-[10px] font-bold text-slate-300 tracking-tighter mt-0.5">de 70€</div>
        </div>
      </div>

      {/* Teams Section */}
      <div className="p-5 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <TeamPaymentRow 
            teamName={getTeamName(match.team_a_id)} 
            payment={localPaymentA} 
            onChange={(val: any) => setLocalPaymentA(val)}
            canEdit={canEdit}
          />
          <div className="h-px bg-slate-100 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-black text-slate-300 tracking-widest uppercase">vs</div>
          </div>
          <TeamPaymentRow 
            teamName={getTeamName(match.team_b_id)} 
            payment={localPaymentB} 
            onChange={(val: any) => setLocalPaymentB(val)}
            canEdit={canEdit}
          />
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isLiquidated && !isEditing ? (
            <button
              onClick={() => {
                setIsEditing(true);
                onUpdateStatus(match.id, 'Programado');
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <History className="w-4 h-4" />
              Editar Liquidación
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Guardar y Finalizar
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showErrorModal && <ErrorModal onClose={() => setShowErrorModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function TeamPaymentRow({ teamName, payment, onChange, canEdit }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px]">{teamName}</h4>
        <span className="text-xs font-bold text-slate-300">35.00€</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <button 
          disabled={!canEdit}
          onClick={() => onChange({ ...payment, isPaid: true })}
          className={`py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center transition-all border-2 active:scale-95 ${
            payment.isPaid 
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' 
              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Pagado
        </button>
        <button 
          disabled={!canEdit}
          onClick={() => onChange({ ...payment, isPaid: false })}
          className={`py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center transition-all border-2 active:scale-95 ${
            !payment.isPaid 
              ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-100' 
              : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          No Pagado
        </button>
      </div>

      <AnimatePresence>
        {!payment.isPaid && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 px-1">Motivo del impago</p>
            <div className="relative">
              <select 
                disabled={!canEdit}
                value={payment.reason}
                onChange={(e) => onChange({ ...payment, reason: e.target.value })}
                className="w-full bg-red-50/50 border border-red-100 rounded-2xl px-4 py-3 text-xs font-bold text-red-700 outline-none focus:ring-2 focus:ring-red-500/20 active:scale-[0.99] transition-all appearance-none"
              >
                <option value="">Selecciona una opción...</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Olvido">Olvido</option>
                <option value="Otros">Otros</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ErrorModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] p-10 shadow-2xl w-full max-w-sm text-center border border-white"
      >
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-red-50/50">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="font-display font-black text-xl text-slate-900 mb-3 uppercase tracking-tight">Acción Requerida</h3>
        <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
          Para garantizar la trazabilidad, es obligatorio seleccionar un motivo para los equipos con pagos pendientes.
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          Entendido
        </button>
      </motion.div>
    </div>
  );
}
