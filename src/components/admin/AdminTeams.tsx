import React, { useState } from 'react';
import { useData } from '../../store/DataContext';
import { Users, Shield, Banknote, Plus, Search, ChevronDown, ChevronUp, AlertTriangle, History, X, CheckCircle2, Trash2 } from 'lucide-react';
import { Team, Sanction } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatDateDisplay } from '../../utils/formatters';

export default function AdminTeams() {
  const { teams, sanctions, addSanction, markSanctionAsPaid, clearSanctions } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isTeamsOpen, setIsTeamsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const filteredTeams = teams
    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalSanctionsAmount = sanctions.reduce((acc, s) => acc + s.amount, 0);
  const totalCollectedAmount = sanctions.filter(s => s.is_paid).reduce((acc, s) => acc + s.amount, 0);
  const sanctionedTeamsCount = teams.filter(t => t.pending_amount > 0).length;

  const handleOpenSanctionModal = (team: Team) => {
    setSelectedTeam(team);
    setShowSanctionModal(true);
  };

  const handleSaveSanction = (data: any) => {
    if (selectedTeam) {
      addSanction({
        team_id: selectedTeam.id,
        amount: data.amount,
        round: data.round,
        date: data.date,
        reason: 'Incomparecencia'
      });
      setShowSanctionModal(false);
      setShowSuccessModal(true);
    }
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 px-1">GESTIÓN ORGANIZATIVA</p>
          <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight flex items-center">
            Gestión de Equipos
          </h2>
          <p className="text-sm text-slate-500 font-bold mt-1">Control de sanciones y estados económicos por equipo.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={clearSanctions}
            className="flex items-center px-6 py-4 bg-white border border-red-100 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:bg-red-50 transition-all active:scale-95"
          >
            <Trash2 className="w-5 h-5 mr-3" />
            Limpiar Sanciones
          </button>
          <button
            className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
          >
            <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform" />
            Nuevo Equipo
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Equipos" value={teams.length.toString()} icon={Users} color="indigo" />
        <StatCard title="Equipos Sancionados" value={sanctionedTeamsCount.toString()} icon={AlertTriangle} color="amber" />
        <StatCard title="Total Sanciones" value={`${totalSanctionsAmount.toFixed(2)}€`} icon={Banknote} color="red" />
        <StatCard title="Total Recaudado" value={`${totalCollectedAmount.toFixed(2)}€`} icon={CheckCircle2} color="emerald" />
      </div>

      {/* Accordions */}
      <div className="grid grid-cols-1 gap-8">
        {/* Teams List Card */}
        <div className="bg-white rounded-[2.5rem] shadow-app border border-slate-100 overflow-hidden">
          <button
            onClick={() => setIsTeamsOpen(!isTeamsOpen)}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50 group-hover:scale-110 transition-transform duration-500">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">Directorio de Equipos</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{teams.length} COMPETIDORES REGISTRADOS</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              {isTeamsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          <AnimatePresence>
            {isTeamsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="p-8 pt-4 space-y-6">
                  <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input
                      type="text"
                      placeholder="Filtrar escuadras..."
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 shadow-app-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Pos</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Club / Entidad</th>
                          <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estatus Sanciones</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Operaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTeams.map((team, index) => (
                          <tr key={team.id} className="hover:bg-slate-50/20 transition-all">
                            <td className="px-6 py-5 whitespace-nowrap text-xs font-black text-slate-300">{(index + 1).toString().padStart(2, '0')}</td>
                            <td className="px-6 py-5 whitespace-nowrap text-sm font-black text-slate-900 uppercase tracking-tight">{team.name}</td>
                            <td className="px-6 py-5 whitespace-nowrap text-center">
                              <div className="inline-flex flex-col items-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{team.total_sanctions} REC.</span>
                                <span className={`text-xs font-black ${team.pending_amount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {team.pending_amount.toFixed(2)} €
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleOpenSanctionModal(team)}
                                className="inline-flex items-center px-5 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                                Sancionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* History Card */}
        {sanctions.length > 0 && (
          <div className="bg-white rounded-[2.5rem] shadow-app border border-slate-100 overflow-hidden">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100/50 group-hover:scale-110 transition-transform duration-500">
                  <History className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">LOG DE INCIDENCIAS</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">REGISTRO DE SANCIONES REGULATORIAS</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                {isHistoryOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>

            <AnimatePresence>
              {isHistoryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="p-8 pt-0 grid grid-cols-1 gap-4">
                    {sanctions.map((sanction) => {
                      const team = teams.find(t => t.id === sanction.team_id);
                      return (
                        <div key={sanction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all hover:bg-white hover:shadow-app hover:border-white">
                          <div className="flex items-center gap-4 mb-4 sm:mb-0">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-sm ${sanction.is_paid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                              {sanction.amount} <span className="text-[10px] ml-0.5">€</span>
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 uppercase tracking-tight">{team?.name}</h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                <span className="text-slate-500">Jornada {sanction.round}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span>{formatDateDisplay(sanction.date)}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span className="text-red-400">{sanction.reason}</span>
                              </div>
                            </div>
                          </div>
                          {sanction.is_paid ? (
                            <div className="flex items-center px-4 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 shadow-sm">
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              ABONADA
                            </div>
                          ) : (
                            <button
                              onClick={() => markSanctionAsPaid(sanction.id)}
                              className="flex items-center justify-center px-6 py-3 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-200 shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95"
                            >
                              <Banknote className="w-4 h-4 mr-2" />
                              LIQUIDAR AHORA
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Sanction Modal */}
      <AnimatePresence>
        {showSanctionModal && selectedTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                <div>
                  <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">Emitir Sanción</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Protocolo por incomparecencia</p>
                </div>
                <button onClick={() => setShowSanctionModal(false)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-600 shadow-sm">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Equipo sancionado:</p>
                    <p className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">{selectedTeam.name}</p>
                  </div>
                </div>

                <SanctionForm onCancel={() => setShowSanctionModal(false)} onSave={handleSaveSanction} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3rem] p-10 shadow-3xl w-full max-w-sm text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-app-lg">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight mb-2">Registro Exitoso</h3>
              <p className="text-sm text-slate-500 font-bold mb-10 leading-relaxed px-4">La sanción económica ha sido procesada y vinculada al registro del equipo.</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                Cerrar Protocolo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap = {
    indigo: "bg-indigo-600 text-white shadow-indigo-100",
    amber: "bg-amber-500 text-white shadow-amber-100",
    red: "bg-red-600 text-white shadow-red-100",
    emerald: "bg-emerald-500 text-white shadow-emerald-100"
  };

  return (
    <div className="group relative bg-white rounded-[2rem] p-8 shadow-app border border-slate-100 overflow-hidden hover:shadow-app-lg transition-all duration-500">
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{title}</p>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">{value}</p>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:scale-110 ${colorMap[color as keyof typeof colorMap]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50/50 rounded-full blur-3xl group-hover:bg-slate-100 transition-all duration-500"></div>
    </div>
  );
}

function SanctionForm({ onCancel, onSave }: { onCancel: () => void, onSave: (data: any) => void }) {
  const [amount, setAmount] = useState('50');
  const [round, setRound] = useState('5');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Importe Multa (€)</label>
          <div className="relative">
            <Banknote className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              type="number"
              className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-red-500/10 outline-none transition-all placeholder:text-slate-300 shadow-app-inner"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Jornada</label>
          <input
            type="number"
            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300 shadow-app-inner"
            value={round}
            onChange={(e) => setRound(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Fecha de Registro Oficial</label>
        <input
          type="date"
          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-app-inner"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] px-1 text-center">La liquidación se computará al recibir el abono físico o digital</p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
        >
          Anular
        </button>
        <button
          type="button"
          onClick={() => onSave({ amount: parseFloat(amount), round: parseInt(round), date })}
          className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
        >
          Confirmar Sanción
        </button>
      </div>
    </div>
  );
}
