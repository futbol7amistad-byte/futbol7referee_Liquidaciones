import React, { useState, useEffect } from 'react';
import { useData } from '../../store/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Calculator, 
  FileText, 
  PieChart, 
  Settings, 
  Users, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Pencil,
  Warehouse,
  Check,
  AlertTriangle,
  Target,
  LayoutDashboard,
  Wallet,
  Activity,
  CreditCard,
  Building,
  X,
  ArrowUpDown,
  Printer
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { getWhatsAppLink } from '../../utils/whatsapp';

type EconomicTab = 'dashboard' | 'journal' | 'summary' | 'teams' | 'accounts' | 'config' | 'budget';

export default function AdminEconomic() {
  const { user } = useAuth();
  const { 
    accounts, 
    transactions, 
    economicSettings, 
    teamEconomicStatus, 
    teams,
    matches,
    addAccountingAccount,
    updateAccountingAccount,
    deleteAccountingAccount,
    addTransaction,
    updateEconomicSettings,
    updateTeamEconomicStatus
  } = useData();

  const [activeTab, setActiveTab] = useState<EconomicTab>(user?.role === 'collaborator' ? 'teams' : 'dashboard');

  // Tabs Navigation with role check
  const allTabs = [
    { id: 'dashboard', name: 'Panel', icon: LayoutDashboard, roles: ['admin'] },
    { id: 'journal', name: 'Libro Diario', icon: FileText, roles: ['admin'] },
    { id: 'summary', name: 'LIBRO MAYOR', icon: PieChart, roles: ['admin'] },
    { id: 'teams', name: 'Cuotas y Licencias', icon: Users, roles: ['admin', 'collaborator'] },
    { id: 'accounts', name: 'Plan de Cuentas', icon: Calculator, roles: ['admin'] },
    { id: 'budget', name: 'Presupuesto', icon: Target, roles: ['admin'] },
    { id: 'config', name: 'Configuración', icon: Settings, roles: ['admin'] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes(user?.role || ''));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Gestión Económica</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Control financiero y contabilidad simple</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-1 scrollbar-hide gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EconomicTab)}
              className={`flex items-center px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600'
              }`}
            >
              <tab.icon className={`w-4 h-4 mr-2.5 ${isActive ? 'text-white' : 'text-slate-300'}`} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab transactions={transactions} accounts={accounts} teams={teams} teamStatus={teamEconomicStatus} />}
        {activeTab === 'journal' && <JournalTab transactions={transactions} accounts={accounts} addTransaction={addTransaction} matches={matches} economicSettings={economicSettings} />}
        {activeTab === 'summary' && <SummaryTab transactions={transactions} accounts={accounts} />}
        {activeTab === 'budget' && <BudgetTab accounts={accounts} teams={teams} settings={economicSettings} matches={matches} updateSettings={updateEconomicSettings} />}
        {activeTab === 'teams' && (
          <TeamsEconomicTab 
            teams={teams} 
            status={teamEconomicStatus} 
            settings={economicSettings} 
            updateStatus={updateTeamEconomicStatus} 
            addTransaction={addTransaction}
            accounts={accounts}
          />
        )}
        {activeTab === 'accounts' && (
          <AccountsTab 
            accounts={accounts} 
            addAccount={addAccountingAccount} 
            updateAccount={updateAccountingAccount} 
            deleteAccount={deleteAccountingAccount} 
          />
        )}
        {activeTab === 'config' && (
          <ConfigEconomicTab 
            settings={economicSettings} 
            updateSettings={updateEconomicSettings} 
          />
        )}
      </div>
    </div>
  );
}

// Sub-components for Tabs

function JournalTab({ transactions, accounts, addTransaction, matches, economicSettings }: any) {
  const { syncMatchAccounting } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [showPeriodicModal, setShowPeriodicModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [sortBy, setSortBy] = useState<'date' | 'account'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const uniquePeriods = Array.from(new Set(matches.map((m: any) => m.period).filter(Boolean))) as string[];

  const formatPeriodRange = (periodStr: string) => {
    if (!periodStr || !periodStr.includes('_to_')) return periodStr;
    const [start, end] = periodStr.split('_to_');
    try {
      return `${format(parseISO(start), 'dd/MM/yyyy')} - ${format(parseISO(end), 'dd/MM/yyyy')}`;
    } catch (e) {
      return periodStr;
    }
  };

  const handleConfirmFixed = async () => {
    setIsProcessing(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthName = format(parseISO(today), 'MMMM yyyy', { locale: es });
      let count = 0;

      // 1. Arrendamiento / Alquiler Sede
      if (economicSettings.headquarters_rent && economicSettings.headquarters_rent > 0) {
        const account = accounts.find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('arrendamiento') && a.type === 'Gasto');
        if (account) {
          await addTransaction({
            date: today,
            amount: economicSettings.headquarters_rent,
            accountId: account.id,
            description: `Gasto Fijo Mensual: Arrendamiento Sede Social (${monthName})`,
            isAutomated: true,
            type: 'Gasto'
          });
          count++;
        }
      }

      // 2. Voluntario Administrativo
      if (economicSettings.collaborator_monthly_cost && economicSettings.collaborator_monthly_cost > 0) {
        const account = accounts.find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('voluntario administrativo') && a.type === 'Gasto');
        if (account) {
          await addTransaction({
            date: today,
            amount: economicSettings.collaborator_monthly_cost,
            accountId: account.id,
            description: `Gasto Fijo Mensual: Voluntario Administrativo (${monthName})`,
            isAutomated: true,
            type: 'Gasto'
          });
          count++;
        }
      }

      // 3. Mantenimiento MyGol
      if (economicSettings.mygol_monthly_cost && economicSettings.mygol_monthly_cost > 0) {
        const account = accounts.find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('mygol') && a.type === 'Gasto');
        if (account) {
          await addTransaction({
            date: today,
            amount: economicSettings.mygol_monthly_cost,
            accountId: account.id,
            description: `Gasto Fijo Mensual: Mantenimiento MyGol (${monthName})`,
            isAutomated: true,
            type: 'Gasto'
          });
          count++;
        }
      }

      // 4. Membresía AEMF (just in case they need it monthly or it was missing)
      if (economicSettings.aemf_membership && economicSettings.aemf_membership > 0) {
        const account = accounts.find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('aemf') && a.type === 'Gasto');
        if (account) {
          await addTransaction({
            date: today,
            amount: economicSettings.aemf_membership,
            accountId: account.id,
            description: `Gasto Fijo: Membresía AEMF (${monthName})`,
            isAutomated: true,
            type: 'Gasto'
          });
          count++;
        }
      }

      toast.success(`Se han generado ${count} asientos de gastos fijos.`);
      setShowFixedModal(false);
    } catch (err) {
      toast.error('Error al generar gastos fijos');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPeriodic = async () => {
    if (!selectedPeriod) {
      toast.error('Debes seleccionar un periodo');
      return;
    }
    setIsProcessing(true);
    try {
      const periodMatches = matches.filter((m: any) => m.period === selectedPeriod);
      
      if (periodMatches.length === 0) {
        toast.error('No hay partidos en este periodo');
        setIsProcessing(false);
        return;
      }

      // Sincronizar cada partido del periodo de forma masiva
      for (const m of periodMatches) {
        await syncMatchAccounting(m.id);
      }

      toast.success(`Sincronización completada para ${periodMatches.length} partidos.`);
      setShowPeriodicModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al sincronizar jornada');
    } finally {
      setIsProcessing(false);
    }
  };

  const safeTransactions = transactions || [];
  const safeAccounts = accounts || [];

  const handleSort = (field: 'date' | 'account') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'date' ? 'desc' : 'asc');
    }
  };

  const filteredTransactions = safeTransactions.filter((t: any) => {
    return t.date >= dateRange.start && t.date <= dateRange.end;
  }).sort((a: any, b: any) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    if (sortBy === 'date') {
      return (parseISO(a.date).getTime() - parseISO(b.date).getTime()) * modifier;
    } else if (sortBy === 'account') {
      const aAccount = safeAccounts.find((acc: any) => acc.id === a.accountId);
      const bAccount = safeAccounts.find((acc: any) => acc.id === b.accountId);
      const aCode = aAccount ? aAccount.code : '';
      const bCode = bAccount ? bAccount.code : '';
      return aCode.localeCompare(bCode) * modifier;
    }
    return 0;
  });

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    accountId: '',
    description: '',
    type: 'Ingreso' as 'Ingreso' | 'Gasto'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      ...formData,
      isAutomated: false
    });
    setShowAddModal(false);
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      accountId: '',
      description: '',
      type: 'Ingreso'
    });
  };

  const generatePDF_Journal = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('LIBRO DIARIO', 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, 14, 21);

    const tableData = filteredTransactions.map((t: any) => {
      const account = safeAccounts.find((a: any) => a.id === t.accountId);
      const isIngreso = t.type === 'Ingreso';
      const formattedAmount = `${isIngreso ? '+' : '-'}${t.amount.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      return [
        format(parseISO(t.date), 'dd/MM/yyyy'),
        t.description + (t.isAutomated ? ' [AUTO]' : ''),
        account ? account.name : 'N/A',
        isIngreso ? 'IN' : 'out',
        formattedAmount
      ];
    });

    autoTable(doc, {
      startY: 25,
      head: [['Fecha', 'Descripción', 'Cuenta', 'Tipo', 'Importe']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 40 },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 25, halign: 'right' },
      },
    });

    doc.save(`libro_diario_${dateRange.start}_${dateRange.end}.pdf`);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 print:hidden">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Asientos Contables</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Registro cronológico de movimientos financieros</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
            <span className="text-[9px] text-slate-400 uppercase">Desde</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
              className="bg-transparent text-[11px] outline-none text-slate-700"
            />
            <span className="text-[9px] text-slate-400 uppercase ml-2">Hasta</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
              className="bg-transparent text-[11px] outline-none text-slate-700"
            />
          </div>

          <button 
            onClick={generatePDF_Journal}
            className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-slate-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Generar PDF
          </button>

          <button 
            onClick={() => setShowFixedModal(true)}
            className="flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            <Warehouse className="w-4 h-4 mr-2 text-indigo-400" />
            Gastos Fijos Mes
          </button>

          <button 
            onClick={() => setShowPeriodicModal(true)}
            className="flex items-center px-4 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Gastos Periódicos
          </button>

          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Asiento
          </button>
        </div>
      </div>

      {/* Título solo visible en impresión para el Libro Diario */}
      <div className="hidden print:block mb-4 text-center pb-2 border-b border-black">
        <h2 className="text-lg font-black uppercase tracking-widest text-black">Libro Diario</h2>
        <p className="text-[10px] font-bold text-gray-600 mt-1">Periodo: {format(parseISO(dateRange.start), 'dd/MM/yyyy')} - {format(parseISO(dateRange.end), 'dd/MM/yyyy')}</p>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-left border-collapse print:text-[9px]">
          <thead className="print:table-header-group">
            <tr className="bg-slate-50/50 border-y border-slate-100 print:bg-transparent print:border-black mb-2 print:mb-0">
              <th 
                className="px-6 py-4 print:px-2 print:py-1.5 text-[10px] print:text-[8px] font-black text-slate-400 print:text-black uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-2">
                  Fecha <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-4 print:px-2 print:py-1.5 text-[10px] print:text-[8px] font-black text-slate-400 print:text-black uppercase tracking-widest">Descripción</th>
              <th 
                className="px-6 py-4 print:px-2 print:py-1.5 text-[10px] print:text-[8px] font-black text-slate-400 print:text-black uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleSort('account')}
              >
                <div className="flex items-center gap-2">
                  Cuenta <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="px-6 py-4 print:px-2 print:py-1.5 text-[10px] print:text-[8px] font-black text-slate-400 print:text-black uppercase tracking-widest hidden print:table-cell">Tipo</th>
              <th className="px-6 py-4 print:px-2 print:py-1.5 text-[10px] print:text-[8px] font-black text-slate-400 print:text-black uppercase tracking-widest text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="space-y-2 print:space-y-0 before:content-[''] before:block before:h-2 print:before:hidden">
            {filteredTransactions.map((t: any) => {
              const account = safeAccounts.find((a: any) => a.id === t.accountId);
              const isIngreso = t.type === 'Ingreso';
              return (
                <tr 
                  key={t.id} 
                  className={`
                    group transition-all duration-200 border-l-[3px] shadow-sm print:shadow-none print:border-l-0 print:border-b print:border-black/20
                    ${isIngreso 
                      ? 'border-l-emerald-500 bg-white hover:bg-emerald-50/50 print:bg-transparent' 
                      : 'border-l-rose-500 bg-white hover:bg-rose-50/50 print:bg-transparent'}
                  `}
                >
                  <td className="px-6 py-4 print:px-2 print:py-1 border-b border-slate-50 print:border-transparent">
                    <div className="flex flex-col">
                      <span className="text-sm print:text-[9px] font-black text-slate-900 print:text-black">{format(parseISO(t.date), 'dd/MM/yyyy')}</span>
                      <span className="text-[10px] print:hidden font-bold text-slate-400 uppercase tracking-widest hidden md:inline-block">
                        {format(parseISO(t.date), 'EEEE', { locale: es })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 print:px-2 print:py-1 border-b border-slate-50 print:border-transparent max-w-[200px] print:max-w-[150px]">
                    <div className="flex flex-col gap-1 print:gap-0">
                      <span className="text-sm print:text-[9px] font-bold text-slate-700 print:text-black break-words leading-tight">{t.description}</span>
                      {t.isAutomated && (
                        <span className="inline-flex items-center self-start px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[9px] print:text-[7px] font-black uppercase tracking-widest border border-indigo-100 print:border-black/10 print:bg-transparent print:text-black print:px-0">
                          <Settings className="w-2.5 h-2.5 mr-1" />
                          Automático
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 print:px-2 print:py-1 border-b border-slate-50 print:border-transparent">
                    {account ? (
                      <div className="flex flex-col">
                        <span className="text-xs print:text-[8px] font-black text-slate-900 print:text-black">{account.code}</span>
                        <span className="text-[10px] print:text-[7px] font-bold text-slate-500 print:text-black/80 uppercase tracking-tighter truncate max-w-[150px] print:max-w-[100px]">{account.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs print:text-[8px] font-bold text-slate-400 print:text-black italic">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 print:px-2 print:py-1 border-b border-slate-50 print:border-transparent hidden print:table-cell">
                    <span className="text-[9px] font-bold uppercase">{isIngreso ? 'IN' : 'out'}</span>
                  </td>
                  <td className="px-6 py-4 print:hidden border-b border-slate-50 print:border-transparent">
                    <div className={`inline-flex items-center justify-center p-2 rounded-xl border ${isIngreso ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                      {isIngreso ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                  </td>
                  <td className={`px-6 py-4 print:px-2 print:py-1 border-b border-slate-50 print:border-transparent text-right`}>
                    <span className={`text-base print:text-[10px] font-black tabular-nums tracking-tight ${isIngreso ? 'text-emerald-600 print:text-black' : 'text-rose-600 print:text-black'}`}>
                      {isIngreso ? '+' : '-'}{t.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-12 h-12 mb-3 text-slate-200" />
                    <span className="text-xs font-black uppercase tracking-widest">No hay movimientos en este rango</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Introducción de Datos</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                <div className="flex gap-2">
                  {(['Ingreso', 'Gasto'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        formData.type === type 
                          ? type === 'Ingreso' ? 'bg-emerald-600 text-white shadow-md' : 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Fecha</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Importe (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cuenta Contable</label>
                <select 
                  value={formData.accountId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  required
                >
                  <option value="">Seleccionar cuenta...</option>
                  {safeAccounts.filter((a:any) => a.type === formData.type).sort((a: any, b: any) => (a.code || '').localeCompare(b.code || '')).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  rows={2}
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 mt-2"
              >
                Guardar Asiento
              </button>
            </form>
          </div>
        </div>
      )}

      {showFixedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                <Warehouse className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Generar Gastos Fijos</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
                Se generarán los asientos contables mensuales para los siguientes conceptos configurados:
              </p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-xs font-bold text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                  Arrendamiento Sede Social: {economicSettings.headquarters_rent || 0} €
                </li>
                <li className="flex items-center text-xs font-bold text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                  Membresía AEMF: {economicSettings.aemf_membership || 0} €
                </li>
                <li className="flex items-center text-xs font-bold text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                  Voluntario Administrativo: {economicSettings.collaborator_monthly_cost || 0} €
                </li>
                <li className="flex items-center text-xs font-bold text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2" />
                  Mantenimiento MyGol: {economicSettings.mygol_monthly_cost || 0} €
                </li>
              </ul>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFixedModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmFixed}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPeriodicModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Conciliación de Jornada</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
                Selecciona un periodo para resincronizar todos los asientos contables automáticos (Árbitros, Campos e Ingresos) y asegurar que coinciden con los datos actuales.
              </p>
              
              <div className="mb-8">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Seleccionar Periodo</label>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                >
                  <option value="">Elegir periodo...</option>
                  {uniquePeriods.map(p => (
                    <option key={p} value={p}>{formatPeriodRange(p)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPeriodicModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  disabled={isProcessing}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmPeriodic}
                  disabled={!selectedPeriod || isProcessing}
                  className="flex-1 py-4 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-100"
                >
                  {isProcessing ? 'Sincronizando...' : 'Sincronizar Jornada'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTab({ transactions, accounts }: any) {
  const { economicSettings, addTransaction } = useData();
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const safeTransactions = transactions || [];
  const safeAccounts = accounts || [];

  const filteredTransactions = safeTransactions.filter((t: any) => {
    return t.date >= dateRange.start && t.date <= dateRange.end;
  });

  const totalIncome = filteredTransactions.filter((t: any) => t?.type === 'Ingreso').reduce((acc: number, t: any) => acc + (t?.amount || 0), 0);
  const totalExpense = filteredTransactions.filter((t: any) => t?.type === 'Gasto').reduce((acc: number, t: any) => acc + (t?.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const selectedAccount = safeAccounts.find((a: any) => a.id === selectedAccountId);
  const accountTransactions = filteredTransactions
    .filter((t: any) => t.accountId === selectedAccountId)
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  // Budget vs Actual calculation
  const totalBudgetedIncome = 25000; // Placeholder for theoretical season income
  const progressPercent = Math.min(100, (totalIncome / totalBudgetedIncome) * 100);

  const generatePDF_Resumen = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE CUENTAS / MAYORES AUXILIARES', 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, 14, 21);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN PERIODO', 14, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ingresos Periodo: ${totalIncome.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 14, 36);
    doc.text(`Gastos Periodo: ${totalExpense.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 14, 42);
    doc.text(`Balance Periodo: ${balance.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 14, 48);

    const incomeAccounts = safeAccounts.filter((a: any) => a.type === 'Ingreso').map((acc: any) => {
      const amount = filteredTransactions.filter((t: any) => t.accountId === acc.id).reduce((sum: number, t: any) => sum + t.amount, 0);
      return amount > 0 ? [acc.name, `${amount.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`] : null;
    }).filter(Boolean);

    autoTable(doc, {
      startY: 55,
      head: [['Cuenta de Ingresos', 'Total']],
      body: incomeAccounts as any,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
    });

    const expenseAccounts = safeAccounts.filter((a: any) => a.type === 'Gasto').map((acc: any) => {
      const amount = filteredTransactions.filter((t: any) => t.accountId === acc.id).reduce((sum: number, t: any) => sum + t.amount, 0);
      return amount > 0 ? [acc.name, `${amount.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`] : null;
    }).filter(Boolean);

    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY || 55;

    autoTable(doc, {
      startY: finalY + 10,
      head: [['Cuenta de Gastos', 'Total']],
      body: expenseAccounts as any,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 40, halign: 'right' } }
    });

    doc.save(`resumen_cuentas_${dateRange.start}_${dateRange.end}.pdf`);
  };

  const generatePDF_Mayor = () => {
    if (!selectedAccount) return;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`LIBRO MAYOR: ${selectedAccount.name.toUpperCase()}`, 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periodo: ${format(parseISO(dateRange.start), 'dd/MM/yyyy')} - ${format(parseISO(dateRange.end), 'dd/MM/yyyy')}`, 14, 21);

    const tableData = accountTransactions.map((t: any) => {
      const formattedAmount = `${t.type === 'Ingreso' ? '+' : '-'}${t.amount.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
      return [
        format(parseISO(t.date), 'dd/MM/yyyy'),
        t.description + (t.isAutomated ? ' [AUTO]' : ''),
        formattedAmount
      ];
    });

    const totalAccumulated = accountTransactions.reduce((acc: number, t: any) => acc + t.amount, 0);
    const formattedTotal = `${totalAccumulated.toLocaleString('de-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

    tableData.push(['', 'TOTAL ACUMULADO', formattedTotal]);

    autoTable(doc, {
      startY: 25,
      head: [['Fecha', 'Descripción', 'Importe']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [40, 40, 40] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fillColor = [250, 250, 250];
        }
      }
    });

    doc.save(`libro_mayor_${selectedAccount.name.replace(/\s+/g, '_').toLowerCase()}_${dateRange.start}_${dateRange.end}.pdf`);
  };

  return (
    <div className="p-6 space-y-8 print:p-0 print:space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold">
          <span className="text-[9px] text-slate-400 uppercase">Filtrar Periodo</span>
          <input 
            type="date" 
            value={dateRange.start}
            onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
            className="bg-transparent text-[11px] outline-none text-slate-700"
          />
          <span className="text-slate-300">/</span>
          <input 
            type="date" 
            value={dateRange.end}
            onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
            className="bg-transparent text-[11px] outline-none text-slate-700"
          />
        </div>
        
        <button 
          onClick={generatePDF_Resumen}
          className="flex items-center px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-slate-100"
        >
          <Download className="w-4 h-4 mr-2" />
          Generar PDF (Resumen)
        </button>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${selectedAccountId ? 'print:hidden' : ''}`}>
        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ingresos Periodo</p>
            <p className="text-2xl font-black text-emerald-900">{totalIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-600">
            <TrendingUp />
          </div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Gastos Periodo</p>
            <p className="text-2xl font-black text-rose-900">{totalExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-rose-600">
            <TrendingDown />
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Balance Neto</p>
            <p className="text-2xl font-black text-indigo-900">{balance.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
          </div>
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
            <Calculator />
          </div>
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm ${selectedAccountId ? 'print:hidden' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Ejecución Presupuestaria (Ingresos)</h4>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Estimado temporada: {totalBudgetedIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
          </div>
          <span className="text-xs font-black text-indigo-600 tabular-nums">{progressPercent.toFixed(1)}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      
      {/* Chart Placeholders or Breakdowns would go here */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${selectedAccountId ? 'print:hidden' : ''}`}>
          <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mayores Auxiliares (Ingresos)</h4>
              <div className="bg-slate-50/50 rounded-2xl p-2 space-y-1">
                  {safeAccounts.filter((a: any) => a.type === 'Ingreso').map((acc: any) => {
                      const amount = filteredTransactions.filter((t: any) => t.accountId === acc.id).reduce((sum: number, t: any) => sum + t.amount, 0);
                      const percent = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                      if (amount === 0) return null;
                      return (
                          <div 
                            key={acc.id} 
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedAccountId === acc.id 
                                ? 'bg-indigo-600 border-indigo-600 shadow-md transform scale-[1.02]' 
                                : 'bg-white border-slate-100 hover:border-slate-300'
                            } flex items-center justify-between gap-4`}
                          >
                              <span className={`text-xs font-bold whitespace-nowrap ${selectedAccountId === acc.id ? 'text-white' : 'text-slate-600'}`}>
                                {acc.name}
                              </span>
                              <div className={`flex-1 border-b-2 border-dotted mt-1.5 ${selectedAccountId === acc.id ? 'border-indigo-400/50' : 'border-slate-200'}`}></div>
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                  <span className={`text-xs font-black ${selectedAccountId === acc.id ? 'text-white' : 'text-slate-900'}`}>
                                    {amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                  </span>
                                  <div className={`w-12 h-1.5 rounded-full overflow-hidden shrink-0 ${selectedAccountId === acc.id ? 'bg-indigo-400' : 'bg-slate-100'}`}>
                                      <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }} />
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
          <div className="space-y-4">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mayores Auxiliares (Gastos)</h4>
               <div className="bg-slate-50/50 rounded-2xl p-2 space-y-1">
                  {safeAccounts.filter((a: any) => a.type === 'Gasto').map((acc: any) => {
                      const amount = filteredTransactions.filter((t: any) => t.accountId === acc.id).reduce((sum: number, t: any) => sum + t.amount, 0);
                      const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                      if (amount === 0) return null;
                      return (
                          <div 
                            key={acc.id} 
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedAccountId === acc.id 
                                ? 'bg-indigo-600 border-indigo-600 shadow-md transform scale-[1.02]' 
                                : 'bg-white border-slate-100 hover:border-slate-300'
                            } flex items-center justify-between gap-4`}
                          >
                              <span className={`text-xs font-bold whitespace-nowrap ${selectedAccountId === acc.id ? 'text-white' : 'text-slate-600'}`}>
                                {acc.name}
                              </span>
                              <div className={`flex-1 border-b-2 border-dotted mt-1.5 ${selectedAccountId === acc.id ? 'border-indigo-400/50' : 'border-slate-200'}`}></div>
                              <div className="flex items-center gap-3 whitespace-nowrap">
                                  <span className={`text-xs font-black ${selectedAccountId === acc.id ? 'text-white' : 'text-slate-900'}`}>
                                    {amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                  </span>
                                  <div className={`w-12 h-1.5 rounded-full overflow-hidden shrink-0 ${selectedAccountId === acc.id ? 'bg-indigo-400' : 'bg-slate-100'}`}>
                                      <div className="h-full bg-rose-500" style={{ width: `${percent}%` }} />
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* Detalle de Cuenta Seleccionada (Libro Mayor) */}
      {selectedAccountId && selectedAccount && (
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 print:p-0 print:bg-transparent print:border-none animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 print:mb-2">
            <div className="print:border-b print:border-black print:pb-2 print:w-full">
              <h4 className="text-sm font-black text-slate-900 print:text-black print:text-lg uppercase tracking-widest">
                Libro Mayor: {selectedAccount.name}
              </h4>
              <p className="text-[10px] font-bold text-slate-400 print:text-gray-600 print:mt-1 uppercase tracking-tight mt-0.5">
                Movimientos entre: {format(parseISO(dateRange.start), 'dd/MM/yyyy')} - {format(parseISO(dateRange.end), 'dd/MM/yyyy')}
              </p>
            </div>
            
            <div className="flex items-center gap-3 print:hidden">
              <button 
                onClick={generatePDF_Mayor}
                className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Generar PDF (Mayor)
              </button>
              <button 
                onClick={() => setSelectedAccountId(null)}
                className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 print:border-none print:shadow-none overflow-hidden shadow-sm">
            <table className="w-full text-left print:text-[10px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 print:bg-transparent print:border-black">
                  <th className="px-4 py-3 print:px-2 print:py-1.5 text-[9px] font-black text-slate-400 print:text-black uppercase tracking-widest">Fecha</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5 text-[9px] font-black text-slate-400 print:text-black uppercase tracking-widest">Descripción</th>
                  <th className="px-4 py-3 print:px-2 print:py-1.5 text-[9px] font-black text-slate-400 print:text-black uppercase tracking-widest text-right">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                {accountTransactions.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 print:px-2 print:py-1.5 text-xs print:text-[10px] font-bold text-slate-500 print:text-black tabular-nums">
                      {format(parseISO(t.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 print:px-2 print:py-1.5 text-xs print:text-[10px] font-medium text-slate-700 print:text-black">
                      {t.description}
                      {t.isAutomated && (
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-black uppercase">AUTO</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 print:px-2 print:py-1.5 text-xs font-black text-right tabular-nums print:text-[10px] print:text-black ${t.type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'Ingreso' ? '+' : '-'}{t.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))}
                {accountTransactions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400 print:text-black text-[10px] font-bold uppercase tracking-widest">
                      No hay movimientos en este periodo
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="print:bg-transparent">
                <tr className="bg-slate-50 border-t border-slate-100 print:bg-transparent print:border-black">
                  <td colSpan={2} className="px-4 py-3 print:px-2 print:py-1.5 text-[10px] font-black text-slate-900 print:text-black uppercase text-right">Total Acumulado:</td>
                  <td className={`px-4 py-3 print:px-2 print:py-1.5 text-xs font-black text-right print:text-[10px] tabular-nums print:text-black ${selectedAccount.type === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {accountTransactions.reduce((acc: number, t: any) => acc + t.amount, 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamsEconomicTab({ teams, status, settings, updateStatus, addTransaction, accounts }: any) {
  const [searchTerm, setSearchTerm] = useState('');

  const safeTeams = teams || [];
  const safeAccounts = accounts || [];

  const filteredTeams = safeTeams.filter((t: any) => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadTeamPDF = (team: any) => {
    const teamStatus = status.find((s: any) => s.team_id === team.id) || { registration_paid: false, licenses_count_type1: 0, licenses_count_type2: 0, licenses_count_type3: 0 };
    
    const regFee = settings.registration_fee || 0;
    const lCost1 = settings.license_cost_type1 || 0;
    const lCost2 = settings.license_cost_type2 || 0;
    const lCost3 = settings.license_cost_type3 || 0;
    
    const lCount1 = teamStatus.licenses_count_type1 || 0;
    const lCount2 = teamStatus.licenses_count_type2 || 0;
    const lCount3 = teamStatus.licenses_count_type3 || 0;

    const totalGenerated = (teamStatus.registration_paid ? regFee : 0) + 
                         (lCount1 * lCost1) + 
                         (lCount2 * lCost2) +
                         (lCount3 * lCost3);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text('INFORME ECONÓMICO DE EQUIPO', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Temporada: ${settings.season || '2025/2026'}`, 14, 35);

    // Team Info
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(team.name.toUpperCase(), 14, 50);
    
    // Table
    autoTable(doc, {
      startY: 60,
      head: [['CONCEPTO', 'CANTIDAD', 'P. UNITARIO', 'SUBTOTAL']],
      body: [
        [
          'CUOTA INSCRIPCIÓN', 
          teamStatus.registration_paid ? '1' : '0 (Pendiente)', 
          `${regFee} €`, 
          `${teamStatus.registration_paid ? regFee : 0} €`
        ],
        [
          'LICENCIAS TIPO 1', 
          lCount1.toString(), 
          `${lCost1} €`, 
          `${(lCount1 * lCost1).toFixed(2)} €`
        ],
        [
          'LICENCIAS TIPO 2', 
          lCount2.toString(), 
          `${lCost2} €`, 
          `${(lCount2 * lCost2).toFixed(2)} €`
        ],
        [
          'LICENCIAS TIPO 3', 
          lCount3.toString(), 
          `${lCost3} €`, 
          `${(lCount3 * lCost3).toFixed(2)} €`
        ],
      ],
      foot: [[{ content: 'TOTAL GENERADO', colSpan: 3, styles: { halign: 'right' } }, `${totalGenerated.toFixed(2)} €`]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [248, 250, 252], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Footer note
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('Este documento es un resumen informativo del estado económico del equipo.', 14, finalY + 20);
    doc.text('Para cualquier reclamación, contacte con la administración de Futbol 7 Amistad.', 14, finalY + 25);

    doc.save(`Estado_Economico_${team.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDownloadAllTeamsPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));
    const regFee = settings.registration_fee || 0;
    const lCost1 = settings.license_cost_type1 || 0;
    const lCost2 = settings.license_cost_type2 || 0;
    const lCost3 = settings.license_cost_type3 || 0;

    const body = sortedTeams.map(team => {
      const teamStatus = status.find((s: any) => s.team_id === team.id) || { registration_paid: false, licenses_count_type1: 0, licenses_count_type2: 0, licenses_count_type3: 0 };
      const lCount1 = teamStatus.licenses_count_type1 || 0;
      const lCount2 = teamStatus.licenses_count_type2 || 0;
      const lCount3 = teamStatus.licenses_count_type3 || 0;
      const total = (teamStatus.registration_paid ? regFee : 0) + (lCount1 * lCost1) + (lCount2 * lCost2) + (lCount3 * lCost3);
      
      return [
        team.name.toUpperCase(),
        teamStatus.registration_paid ? 'PAGADO' : 'PENDIENTE',
        teamStatus.registration_paid ? `${regFee} €` : '0 €',
        `${lCount1} (${(lCount1 * lCost1).toFixed(2)} €)`,
        `${lCount2} (${(lCount2 * lCost2).toFixed(2)} €)`,
        `${lCount3} (${(lCount3 * lCost3).toFixed(2)} €)`,
        `${total.toFixed(2)} €`
      ];
    });

    const grandTotal = body.reduce((acc, row) => acc + parseFloat(row[6].replace(' €', '')), 0);

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text('RESUMEN GENERAL CUOTAS Y LICENCIAS', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28);
    doc.text(`Temporada: ${settings.season || '2025/2026'}`, 14, 33);

    autoTable(doc, {
      startY: 40,
      head: [['EQUIPO', 'ESTADO INSCR.', 'CUOTA', 'LICENCIAS T1', 'LICENCIAS T2', 'LICENCIAS T3', 'TOTAL']],
      body: body,
      foot: [[{ content: 'TOTAL GLOBAL RECAUDADO', colSpan: 6, styles: { halign: 'right' } }, `${grandTotal.toFixed(2)} €`]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 }
    });

    doc.save(`Resumen_General_Economico_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingTeamsList, setPendingTeamsList] = useState<any[]>([]);

  const handleNotifyPending = () => {
    const pendingTeams = teams.filter((t: any) => {
        const teamStatus = status.find((s: any) => s.team_id === t.id);
        return !teamStatus || !teamStatus.registration_paid;
    });
    
    if (pendingTeams.length === 0) {
        toast.success('No hay equipos con inscripción pendiente.');
        return;
    }

    setPendingTeamsList(pendingTeams);
    setShowPendingModal(true);
  };

  return (
    <div className="p-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Estado por Equipos</h3>
          <div className="flex gap-2 mt-2">
            <button 
                onClick={handleDownloadAllTeamsPDF}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
            >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                Resumen PDF
            </button>
            <button 
                onClick={handleNotifyPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
            >
                <AlertCircle className="w-3.5 h-3.5" />
                Notificar Pendientes
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group min-w-[240px]">
            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text"
              placeholder="BUSCAR EQUIPO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Registro de Pagos y Licencias</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-y border-slate-100">
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Inscripción</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Licencias T1</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Licencias T2</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Licencias T3</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Generado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...filteredTeams].sort((a,b) => a.name.localeCompare(b.name)).map((team: any) => {
              const teamStatus = status.find((s: any) => s.team_id === team.id) || { registration_paid: false, licenses_count_type1: 0, licenses_count_type2: 0, licenses_count_type3: 0 };
              return (
                <TeamEconomicRow
                  key={team.id}
                  team={team}
                  status={teamStatus}
                  settings={settings}
                  accounts={accounts}
                  updateStatus={updateStatus}
                  addTransaction={addTransaction}
                  onDownloadPDF={() => handleDownloadTeamPDF(team)}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {showPendingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Avisos Pendientes</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">{pendingTeamsList.length} equipos con inscripción impagada</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPendingModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
                Esta herramienta te ayuda a contactar con los delegados de los equipos para recordarles el pago de la cuota de inscripción a la liga.
                Genera un enlace rápido para enviarles un mensaje automático a través de WhatsApp.
              </p>
              
              <div className="space-y-3">
                {pendingTeamsList.map((team: any) => {
                  const urlMsg = `Hola responsable del equipo ${team.name}. Te recordamos que la cuota de inscripción de la liga, por importe de ${settings.registration_fee || 0}€, está pendiente de abono. ¡Por favor, regulariza la situación lo antes posible!`;
                  const whLink = team.contact_phone ? getWhatsAppLink(team.contact_phone, urlMsg) : '#';

                  return (
                    <div key={team.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
                      <div>
                         <div className="text-sm font-black text-slate-900">{team.name}</div>
                         <div className="text-xs font-bold text-slate-500 mt-1">Tel: {team.contact_phone || 'Sin número registrado'}</div>
                      </div>
                      
                      {team.contact_phone ? (
                        <a 
                           href={whLink}
                           target="whatsapp_admin"
                           rel="noopener noreferrer"
                           className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#1DA851] transition-colors shadow-sm shadow-[#25D366]/20 flex items-center gap-2"
                        >
                           Mandar WhatsApp
                        </a>
                      ) : (
                        <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                           Sin Teléfono
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
              <button 
                onClick={() => setShowPendingModal(false)}
                className="w-full px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors text-xs"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TeamEconomicRow({ team, status, settings, accounts, updateStatus, addTransaction, onDownloadPDF }: any) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<null | 't1' | 't2' | 't3'>(null);
  
  const [count1, setCount1] = useState(status.licenses_count_type1 || 0);
  const [count2, setCount2] = useState(status.licenses_count_type2 || 0);
  const [count3, setCount3] = useState(status.licenses_count_type3 || 0);
  
  const [lastCommitted1, setLastCommitted1] = useState(status.licenses_count_type1 || 0);
  const [lastCommitted2, setLastCommitted2] = useState(status.licenses_count_type2 || 0);
  const [lastCommitted3, setLastCommitted3] = useState(status.licenses_count_type3 || 0);

  useEffect(() => {
    setCount1(status.licenses_count_type1 || 0);
    setLastCommitted1(status.licenses_count_type1 || 0);
    setCount2(status.licenses_count_type2 || 0);
    setLastCommitted2(status.licenses_count_type2 || 0);
    setCount3(status.licenses_count_type3 || 0);
    setLastCommitted3(status.licenses_count_type3 || 0);
  }, [status.licenses_count_type1, status.licenses_count_type2, status.licenses_count_type3]);

  const regFee = settings.registration_fee || 0;
  const lCost1 = settings.license_cost_type1 || 0;
  const lCost2 = settings.license_cost_type2 || 0;
  const lCost3 = settings.license_cost_type3 || 0;

  const totalGenerated = (status.registration_paid ? regFee : 0) + 
                       (count1 * lCost1) + 
                       (count2 * lCost2) +
                       (count3 * lCost3);

  useEffect(() => {
    if (count1 === lastCommitted1) return;
    
    setSyncing('t1');
    const timer = setTimeout(async () => {
      const diff = count1 - lastCommitted1;
      if (diff === 0) return;

      try {
        await updateStatus(team.id, { licenses_count_type1: count1 });
        
        if (diff > 0 && lCost1 > 0) {
          const account = (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && (a.name.toLowerCase().includes('t1') || a.name.toLowerCase().includes('tipo 1')) && a.type === 'Ingreso') || (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && a.type === 'Ingreso');
          if (account) {
            await addTransaction({
              date: format(new Date(), 'yyyy-MM-dd'),
              amount: diff * lCost1,
              accountId: account.id,
              description: `Lote de ${diff} Licencia(s) Tipo 1: ${team.name}`,
              relatedTeamId: team.id,
              isAutomated: true,
              type: 'Ingreso'
            });
          }
        }
        setLastCommitted1(count1);
      } finally {
        setSyncing(null);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [count1, lastCommitted1, team.id, team.name, lCost1, accounts, addTransaction, updateStatus]);

  useEffect(() => {
    if (count2 === lastCommitted2) return;
    
    setSyncing('t2');
    const timer = setTimeout(async () => {
      const diff = count2 - lastCommitted2;
      if (diff === 0) return;

      try {
        await updateStatus(team.id, { licenses_count_type2: count2 });
        
        if (diff > 0 && lCost2 > 0) {
          const account = (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && (a.name.toLowerCase().includes('t2') || a.name.toLowerCase().includes('tipo 2')) && a.type === 'Ingreso') || (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && a.type === 'Ingreso');
          if (account) {
            await addTransaction({
              date: format(new Date(), 'yyyy-MM-dd'),
              amount: diff * lCost2,
              accountId: account.id,
              description: `Lote de ${diff} Licencia(s) Tipo 2: ${team.name}`,
              relatedTeamId: team.id,
              isAutomated: true,
              type: 'Ingreso'
            });
          }
        }
        setLastCommitted2(count2);
      } finally {
        setSyncing(null);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [count2, lastCommitted2, team.id, team.name, lCost2, accounts, addTransaction, updateStatus]);

  useEffect(() => {
    if (count3 === lastCommitted3) return;
    
    setSyncing('t3');
    const timer = setTimeout(async () => {
      const diff = count3 - lastCommitted3;
      if (diff === 0) return;

      try {
        await updateStatus(team.id, { licenses_count_type3: count3 });
        
        if (diff > 0 && lCost3 > 0) {
          const account = (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && (a.name.toLowerCase().includes('t3') || a.name.toLowerCase().includes('tipo 3')) && a.type === 'Ingreso') || (accounts || []).find((a: any) => a && typeof a.name === 'string' && a.name.toLowerCase().includes('licencia') && a.type === 'Ingreso');
          if (account) {
            await addTransaction({
              date: format(new Date(), 'yyyy-MM-dd'),
              amount: diff * lCost3,
              accountId: account.id,
              description: `Lote de ${diff} Licencia(s) Tipo 3: ${team.name}`,
              relatedTeamId: team.id,
              isAutomated: true,
              type: 'Ingreso'
            });
          }
        }
        setLastCommitted3(count3);
      } finally {
        setSyncing(null);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [count3, lastCommitted3, team.id, team.name, lCost3, accounts, addTransaction, updateStatus]);

  const handleToggleRegistration = async () => {
    setLoading(true);
    try {
      const newState = !status.registration_paid;
      await updateStatus(team.id, { registration_paid: newState });
      
      if (newState && regFee > 0) {
        const account = (accounts || []).find((a: any) => a && typeof a.name === 'string' && (a.name.toLowerCase().includes('inscripción') || a.name.toLowerCase().includes('inscripcion')) && a.type === 'Ingreso');
        if (account) {
          await addTransaction({
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: regFee,
            accountId: account.id,
            description: `Cuota Inscripción: ${team.name} (Temporada ${settings.season || '25-26'})`,
            relatedTeamId: team.id,
            isAutomated: true,
            type: 'Ingreso'
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr key={team.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-4">
        <span className="text-sm font-black text-slate-900 block">{team.name}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {team.id.slice(0,8)}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <button
          onClick={handleToggleRegistration}
          disabled={loading}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            status.registration_paid
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin mr-1.5" />
          ) : (
            <Plus className={`w-3 h-3 mr-1.5 ${status.registration_paid ? 'hidden' : 'block'}`} />
          )}
          {status.registration_paid ? 'Pagado' : 'Pendiente'}
        </button>
        <div className="mt-1 text-[10px] font-bold text-slate-400">{regFee} €</div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <button 
                  onClick={() => setCount1(Math.max(0, count1 - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >-</button>
              <span className="mx-3 text-xs font-black text-slate-900 w-4 text-center tabular-nums">{count1}</span>
              <button 
                  onClick={() => setCount1(count1 + 1)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >+</button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{(count1 * lCost1).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            {syncing === 't1' && <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />}
            {count1 !== lastCommitted1 && !syncing && <Check className="w-2.5 h-2.5 text-emerald-500" />}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <button 
                  onClick={() => setCount2(Math.max(0, count2 - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >-</button>
              <span className="mx-3 text-xs font-black text-slate-900 w-4 text-center tabular-nums">{count2}</span>
              <button 
                  onClick={() => setCount2(count2 + 1)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >+</button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{(count2 * lCost2).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            {syncing === 't2' && <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />}
            {count2 !== lastCommitted2 && !syncing && <Check className="w-2.5 h-2.5 text-emerald-500" />}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <button 
                  onClick={() => setCount3(Math.max(0, count3 - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >-</button>
              <span className="mx-3 text-xs font-black text-slate-900 w-4 text-center tabular-nums">{count3}</span>
              <button 
                  onClick={() => setCount3(count3 + 1)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-400 transition-colors"
              >+</button>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{(count3 * lCost3).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            {syncing === 't3' && <RefreshCw className="w-2.5 h-2.5 text-amber-500 animate-spin" />}
            {count3 !== lastCommitted3 && !syncing && <Check className="w-2.5 h-2.5 text-emerald-500" />}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-right flex items-center justify-end gap-3">
        <span className="text-sm font-black text-slate-900 tabular-nums">{totalGenerated.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
        <button
          onClick={onDownloadPDF}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95"
          title="Descargar PDF Detallado"
        >
          <Download className="w-3.5 h-3.5" />
          PDF
        </button>
      </td>
    </tr>
  );
}

function AccountsTab({ accounts, addAccount, updateAccount, deleteAccount }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({ code: '', name: '', type: 'Ingreso', category: 'Variable' });
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

  const seedDefaultAccounts = async () => {
    const defaults = [
      { code: 'G001', name: 'Pago de Arbitrajes', type: 'Gasto', category: 'Fijo' },
      { code: 'G002', name: 'Alquiler de Instalaciones', type: 'Gasto', category: 'Fijo' },
      { code: 'G003', name: 'Voluntario Administrativo', type: 'Gasto', category: 'Fijo' },
      { code: 'G004', name: 'Arrendamientos Sede Social', type: 'Gasto', category: 'Fijo' },
      { code: 'G005', name: 'Membresía AEMF', type: 'Gasto', category: 'Fijo' },
      { code: 'G006', name: 'Suministro (Agua)', type: 'Gasto', category: 'Fijo' },
      { code: 'G007', name: 'Suministro (Luz)', type: 'Gasto', category: 'Fijo' },
      { code: 'G008', name: 'Suministro (Internet)', type: 'Gasto', category: 'Fijo' },
      { code: 'G009', name: 'Coste Licencias Tipo 1', type: 'Gasto', category: 'Variable' },
      { code: 'G010', name: 'Coste Licencias Tipo 2', type: 'Gasto', category: 'Variable' },
      { code: 'G011', name: 'Coste Licencias Tipo 3', type: 'Gasto', category: 'Variable' },
      { code: 'G012', name: 'Mantenimiento mensual MyGol', type: 'Gasto', category: 'Fijo' },
      { code: 'I001', name: 'Inscripciones', type: 'Ingreso', category: 'Fijo' },
      { code: 'I002', name: 'Licencia Asociativa T1', type: 'Ingreso', category: 'Variable' },
      { code: 'I003', name: 'Licencia Asociativa T2', type: 'Ingreso', category: 'Variable' },
      { code: 'I004', name: 'Licencia Asociativa T3', type: 'Ingreso', category: 'Variable' },
      { code: 'I005', name: 'Partidos', type: 'Ingreso', category: 'Variable' },
      { code: 'I006', name: 'Patrocinios', type: 'Ingreso', category: 'Variable' },
      { code: 'I007', name: 'Subvenciones', type: 'Ingreso', category: 'Variable' }
    ];

    let addedCount = 0;
    for (const acc of defaults) {
      // Verificar tanto por código como por nombre para evitar duplicados reales
      const existingAccount = (accounts || []).find((a: any) => 
        a && (a.code === acc.code || (typeof a.name === 'string' && a.name.toLowerCase() === acc.name.toLowerCase()))
      );
      
      if (existingAccount) {
        // If it exists but name is different, update it
        if (typeof existingAccount.name === 'string' && existingAccount.name !== acc.name) {
          await updateAccount(existingAccount.id, { ...existingAccount, name: acc.name });
          addedCount++;
        }
      } else {
        await addAccount(acc);
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      alert(`Se han sincronizado ${addedCount} cuentas nuevas (incluyendo suministros y cuotas).`);
    } else {
      alert('Tu plan de cuentas ya está actualizado con todas las cuentas necesarias.');
    }
  };

  const types = ['Ingreso', 'Gasto'];
  const categories = ['Fijo', 'Variable'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      updateAccount(editingAccount.id, formData);
      setEditingAccount(null);
    } else {
      addAccount(formData);
      setShowAdd(false);
    }
    setFormData({ code: '', name: '', type: 'Ingreso', category: 'Variable' });
  };

  const handleEdit = (acc: any) => {
    setEditingAccount(acc);
    setFormData({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      category: acc.category
    });
  };

  return (
    <div className="p-6">
      {accountToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-center text-slate-900 mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-center text-slate-500 mb-8 font-medium">
              ¿Estás seguro de que deseas eliminar esta cuenta? Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setAccountToDelete(null)}
                className="py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  deleteAccount(accountToDelete);
                  setAccountToDelete(null);
                }}
                className="py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
       <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Plan de Cuentas</h3>
        <div className="flex gap-2">
          <button 
            onClick={seedDefaultAccounts}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar Cuentas
          </button>
          {!showAdd && !editingAccount && (
            <button 
              onClick={() => setShowAdd(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Cuenta
            </button>
          )}
        </div>
      </div>

      {(showAdd || editingAccount) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  {editingAccount ? 'Editar Cuenta' : 'Añadir Nueva Cuenta'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                  {editingAccount ? 'Modifica los datos de la cuenta existente.' : 'Crea una nueva cuenta para registrar ingresos o gastos.'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowAdd(false);
                  setEditingAccount(null);
                  setFormData({ code: '', name: '', type: 'Ingreso', category: 'Variable' });
                }} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Código</label>
                <input 
                  value={formData.code} 
                  onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  placeholder="Ej: G001, I001" 
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nombre de la Cuenta</label>
                <input 
                  value={formData.name} 
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" 
                  placeholder="Ej: Alquiler de Instalaciones" 
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tipo</label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 mt-2"
              >
                {editingAccount ? 'Actualizar Cuenta' : 'Añadir Cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Ingresos */}
        <div className="overflow-hidden border border-emerald-100 rounded-2xl bg-white shadow-sm flex flex-col">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Cuentas de Ingreso</h4>
          </div>
          <table className="w-full text-left flex-1 block">
            <thead className="block w-full">
              <tr className="bg-slate-50 border-b border-slate-100 flex w-full">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Código</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Cuenta</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 block w-full">
              {[...(accounts || [])]
                .filter((a: any) => a?.type === 'Ingreso')
                .sort((a: any, b: any) => String(a?.code || '').localeCompare(String(b?.code || '')))
                .map((acc: any) => (
                <tr key={acc.id} className="hover:bg-emerald-50/30 transition-colors flex w-full items-center">
                  <td className="px-4 py-3 text-xs font-black text-emerald-900 w-1/4">{acc.code}</td>
                  <td className="px-4 py-3 w-full flex-1">
                     <span className="text-xs font-bold text-slate-700 block">{acc.name}</span>
                     <span className="text-[9px] font-black uppercase text-slate-400 mt-0.5 block">{acc.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 w-1/4 flex justify-end">
                    <button 
                      onClick={() => handleEdit(acc)} 
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAccountToDelete(acc.id)} 
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              { (accounts || []).filter((a: any) => a.type === 'Ingreso').length === 0 && (
                <tr className="w-full flex">
                  <td colSpan={3} className="py-8 text-center bg-slate-50/30 w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin cuentas de ingreso</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Panel Gastos */}
        <div className="overflow-hidden border border-rose-100 rounded-2xl bg-white shadow-sm flex flex-col">
          <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest">Cuentas de Gasto</h4>
          </div>
          <table className="w-full text-left flex-1 block">
            <thead className="block w-full">
              <tr className="bg-slate-50 border-b border-slate-100 flex w-full">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Código</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest flex-1">Cuenta</th>
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 block w-full">
              {[...(accounts || [])]
                .filter((a: any) => a?.type === 'Gasto')
                .sort((a: any, b: any) => String(a?.code || '').localeCompare(String(b?.code || '')))
                .map((acc: any) => (
                <tr key={acc.id} className="hover:bg-rose-50/30 transition-colors flex w-full items-center">
                  <td className="px-4 py-3 text-xs font-black text-rose-900 w-1/4">{acc.code}</td>
                  <td className="px-4 py-3 w-full flex-1">
                     <span className="text-xs font-bold text-slate-700 block">{acc.name}</span>
                     <span className="text-[9px] font-black uppercase text-slate-400 mt-0.5 block">{acc.category}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 w-1/4 flex justify-end">
                    <button 
                      onClick={() => handleEdit(acc)} 
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setAccountToDelete(acc.id)} 
                      className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              { (accounts || []).filter((a: any) => a.type === 'Gasto').length === 0 && (
                <tr className="w-full flex">
                  <td colSpan={3} className="py-8 text-center bg-slate-50/30 w-full">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sin cuentas de gasto</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigEconomicTab({ settings, updateSettings }: any) {
  const { matches, clearAllEconomicData } = useData();
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({ 
    registration_fee: typeof settings.registration_fee === 'number' && !isNaN(settings.registration_fee) ? settings.registration_fee : 0,
    license_cost_type1: typeof settings.license_cost_type1 === 'number' && !isNaN(settings.license_cost_type1) ? settings.license_cost_type1 : 0,
    license_base_cost_type1: typeof settings.license_base_cost_type1 === 'number' && !isNaN(settings.license_base_cost_type1) ? settings.license_base_cost_type1 : 0,
    license_cost_type2: typeof settings.license_cost_type2 === 'number' && !isNaN(settings.license_cost_type2) ? settings.license_cost_type2 : 0,
    license_base_cost_type2: typeof settings.license_base_cost_type2 === 'number' && !isNaN(settings.license_base_cost_type2) ? settings.license_base_cost_type2 : 0,
    license_cost_type3: typeof settings.license_cost_type3 === 'number' && !isNaN(settings.license_cost_type3) ? settings.license_cost_type3 : 0,
    license_base_cost_type3: typeof settings.license_base_cost_type3 === 'number' && !isNaN(settings.license_base_cost_type3) ? settings.license_base_cost_type3 : 0,
    referee_payment_standard: typeof settings.referee_payment_standard === 'number' && !isNaN(settings.referee_payment_standard) ? settings.referee_payment_standard : 0,
    headquarters_rent: typeof settings.headquarters_rent === 'number' && !isNaN(settings.headquarters_rent) ? settings.headquarters_rent : 0,
    aemf_membership: typeof settings.aemf_membership === 'number' && !isNaN(settings.aemf_membership) ? settings.aemf_membership : 0,
    collaborator_monthly_cost: typeof settings.collaborator_monthly_cost === 'number' && !isNaN(settings.collaborator_monthly_cost) ? settings.collaborator_monthly_cost : 0,
    mygol_monthly_cost: typeof settings.mygol_monthly_cost === 'number' && !isNaN(settings.mygol_monthly_cost) ? settings.mygol_monthly_cost : 0
  });

  const [venueCosts, setVenueCosts] = useState<any[]>(settings.venue_costs || []);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sincronizar formData cuando cambian los ajustes desde Firebase
  useEffect(() => {
    console.log("ConfigEconomicTab settings updated:", settings);
    setFormData({
      registration_fee: typeof settings.registration_fee === 'number' && !isNaN(settings.registration_fee) ? settings.registration_fee : 0,
      license_cost_type1: typeof settings.license_cost_type1 === 'number' && !isNaN(settings.license_cost_type1) ? settings.license_cost_type1 : 0,
      license_base_cost_type1: typeof settings.license_base_cost_type1 === 'number' && !isNaN(settings.license_base_cost_type1) ? settings.license_base_cost_type1 : 0,
      license_cost_type2: typeof settings.license_cost_type2 === 'number' && !isNaN(settings.license_cost_type2) ? settings.license_cost_type2 : 0,
      license_base_cost_type2: typeof settings.license_base_cost_type2 === 'number' && !isNaN(settings.license_base_cost_type2) ? settings.license_base_cost_type2 : 0,
      license_cost_type3: typeof settings.license_cost_type3 === 'number' && !isNaN(settings.license_cost_type3) ? settings.license_cost_type3 : 0,
      license_base_cost_type3: typeof settings.license_base_cost_type3 === 'number' && !isNaN(settings.license_base_cost_type3) ? settings.license_base_cost_type3 : 0,
      referee_payment_standard: typeof settings.referee_payment_standard === 'number' && !isNaN(settings.referee_payment_standard) ? settings.referee_payment_standard : 0,
      headquarters_rent: typeof settings.headquarters_rent === 'number' && !isNaN(settings.headquarters_rent) ? settings.headquarters_rent : 0,
      aemf_membership: typeof settings.aemf_membership === 'number' && !isNaN(settings.aemf_membership) ? settings.aemf_membership : 0,
      collaborator_monthly_cost: typeof settings.collaborator_monthly_cost === 'number' && !isNaN(settings.collaborator_monthly_cost) ? settings.collaborator_monthly_cost : 0,
      mygol_monthly_cost: typeof settings.mygol_monthly_cost === 'number' && !isNaN(settings.mygol_monthly_cost) ? settings.mygol_monthly_cost : 0
    });
    // También sincronizar las tarifas de instalaciones cuando cambian en Firebase
    if (settings.venue_costs) {
      setVenueCosts(settings.venue_costs);
    }
  }, [settings]);

  const venuesFromMatches = Array.from(new Set([...matches.map(m => m.field), 'Los Gladiolos'])).filter(Boolean).sort() as string[];

  // Asegurar que "Los Gladiolos" y otros campos tengan una entrada por defecto si no existen
  useEffect(() => {
    let changed = false;
    const newVenueCosts = [...venueCosts];
    
    venuesFromMatches.forEach(venue => {
      if (!newVenueCosts.find(v => v.venue_name === venue)) {
        newVenueCosts.push({ 
          venue_name: venue, 
          hourly_rate: venue === 'Los Gladiolos' ? 20 : 0 
        });
        changed = true;
      }
    });
    
    if (changed) {
      setVenueCosts(newVenueCosts);
    }
  }, [venuesFromMatches]);

  const handleSave = () => {
    console.log("Saving settings to Firebase:", { ...formData, venue_costs: venueCosts });
    updateSettings({ ...formData, venue_costs: venueCosts });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleUpdateVenueRate = (venue: string, rate: number) => {
    setVenueCosts(prev => {
      const existing = prev.find(v => v.venue_name === venue);
      if (existing) {
        return prev.map(v => v.venue_name === venue ? { ...v, hourly_rate: rate } : v);
      }
      return [...prev, { venue_name: venue, hourly_rate: rate }];
    });
  };

  return (
    <>
      {/* Notificación de Éxito */}
      {showSuccess && (
        <div className="fixed top-24 right-6 z-[200] animate-in fade-in slide-in-from-right duration-500">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl shadow-emerald-200 flex items-center gap-3 border border-emerald-400">
            <div className="bg-white/20 p-1.5 rounded-full">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">Configuración Guardada</p>
          </div>
        </div>
      )}

      <div className="p-6 max-w-2xl">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Parámetros Globales</h3>
            <button
              onClick={() => setShowVenueModal(true)}
              className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
            >
              <Warehouse className="w-3.5 h-3.5 mr-2" />
              Tarifas de Instalaciones
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cuota Inscripción Equipos (€)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={formData.registration_fee}
                  onChange={(e) => setFormData(p => ({ ...p, registration_fee: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Se usará como valor defecto para nuevos registros.</p>
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Licencias Tipo 1</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Coste (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_base_cost_type1}
                      onChange={(e) => setFormData(p => ({ ...p, license_base_cost_type1: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">PVP (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_cost_type1}
                      onChange={(e) => setFormData(p => ({ ...p, license_cost_type1: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
              </div>
              {formData.license_cost_type1 > formData.license_base_cost_type1 && (
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Beneficio: {(formData.license_cost_type1 - formData.license_base_cost_type1).toFixed(2)}€ / ud</p>
              )}
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Licencias Tipo 2</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Coste (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_base_cost_type2}
                      onChange={(e) => setFormData(p => ({ ...p, license_base_cost_type2: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">PVP (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_cost_type2}
                      onChange={(e) => setFormData(p => ({ ...p, license_cost_type2: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
              </div>
              {formData.license_cost_type2 > formData.license_base_cost_type2 && (
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Beneficio: {(formData.license_cost_type2 - formData.license_base_cost_type2).toFixed(2)}€ / ud</p>
              )}
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2">Licencias Tipo 3</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">Coste (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_base_cost_type3}
                      onChange={(e) => setFormData(p => ({ ...p, license_base_cost_type3: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">PVP (€)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formData.license_cost_type3}
                      onChange={(e) => setFormData(p => ({ ...p, license_cost_type3: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold" 
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">€</span>
                  </div>
                </div>
              </div>
              {formData.license_cost_type3 > formData.license_base_cost_type3 && (
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Beneficio: {(formData.license_cost_type3 - formData.license_base_cost_type3).toFixed(2)}€ / ud</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pago Arbitraje Estándar (€)</label>
              <div className="relative">
                <input 
                  type="number" 
                  value={formData.referee_payment_standard}
                  onChange={(e) => setFormData(p => ({ ...p, referee_payment_standard: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Coste base de un arbitraje para liquidaciones automáticas.</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Gastos Fijos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arrendamiento Sede Social (€)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={formData.headquarters_rent}
                    onChange={(e) => setFormData(p => ({ ...p, headquarters_rent: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Membresía AEMF (€)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={formData.aemf_membership}
                    onChange={(e) => setFormData(p => ({ ...p, aemf_membership: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voluntario Administrativo (€ / mes)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={formData.collaborator_monthly_cost || 0}
                    onChange={(e) => setFormData(p => ({ ...p, collaborator_monthly_cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mantenimiento MyGol (€ / mes)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={formData.mygol_monthly_cost || 0}
                    onChange={(e) => setFormData(p => ({ ...p, mygol_monthly_cost: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 pr-8" 
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-600 p-1.5 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest">Zona de Peligro</h4>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-tight">Acciones irreversibles sobre la gestión económica</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/50 rounded-2xl border border-rose-100/50">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Reiniciar Gestión Económica</p>
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed max-w-md italic">
                  Esta acción eliminará permanentemente todos los ingresos, gastos, entregas de efectivo de árbitros y estados de pago de equipos de la base de datos. Los equipos y árbitros NO se borrarán.
                </p>
              </div>
              <button 
                onClick={() => setShowResetModal(true)}
                className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 whitespace-nowrap"
              >
                Limpiar Datos Económicos
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
           <button 
            onClick={handleSave}
            className="flex items-center px-8 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </button>
        </div>
      </div>

      {showVenueModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Alquiler de Instalaciones</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Define el coste por hora de alquiler para cada campo.</p>
              </div>
              <button 
                onClick={() => setShowVenueModal(false)} 
                className="text-slate-400 hover:text-slate-600 transition-colors"
                type="button"
              >✕</button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {venuesFromMatches.length === 0 ? (
                <div className="text-center py-8">
                  <Warehouse className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    No se han detectado instalaciones.<br/>Carga partidos en el calendario para que aparezcan aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {venuesFromMatches.map(venue => {
                    const currentRate = venueCosts.find(v => v.venue_name === venue)?.hourly_rate || 0;
                    return (
                      <div key={venue} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                        <div className="flex-grow pr-4">
                          <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{venue}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input 
                              type="number"
                              step="0.01"
                              value={currentRate}
                              onChange={(e) => handleUpdateVenueRate(venue, parseFloat(e.target.value) || 0)}
                              className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 text-right pr-6"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">€/h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  handleSave();
                  setShowVenueModal(false);
                }}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                Guardar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">¡ADVERTENCIA CRÍTICA!</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed mb-6">
                Estás a punto de borrar <span className="text-rose-600">TODOS</span> los datos financieros de esta temporada. Esta acción es irreversible y no se puede deshacer.
              </p>
              
              <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Para confirmar, escribe "BORRAR" abajo</p>
                <input 
                  type="text" 
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Escribe BORRAR..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-center text-sm font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirm('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  disabled={isResetting}
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (resetConfirm === 'BORRAR') {
                      setIsResetting(true);
                      try {
                        await clearAllEconomicData();
                        toast.success('Gestión económica reiniciada con éxito');
                        setShowResetModal(false);
                        setResetConfirm('');
                      } catch (err) {
                        toast.error('Error al reiniciar los datos');
                        console.error(err);
                      } finally {
                        setIsResetting(false);
                      }
                    }
                  }}
                  disabled={resetConfirm !== 'BORRAR' || isResetting}
                  className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${
                    resetConfirm === 'BORRAR' && !isResetting
                      ? 'bg-rose-600 text-white shadow-rose-100 hover:bg-rose-700' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isResetting ? 'Borrando...' : 'Borrar Todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FormattedCurrencyInput({ value, onChange, className }: { value: number; onChange: (val: number) => void; className?: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value ? value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    // Convert common Spanish formatted '1.200,50' to '1200.50'
    const cleanStr = localValue.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    setLocalValue(value ? value.toString() : '');
  };

  return (
    <input
      type={isEditing ? 'number' : 'text'}
      step="0.01"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="0,00"
      className={className}
    />
  );
}

function BudgetTab({ accounts, teams, settings, updateSettings }: any) {
  const safeAccounts = accounts || [];
  const safeTeams = teams || [];

  const [numTeams, setNumTeams] = useState<number>(safeTeams.length || 0);

  const [estimations, setEstimations] = useState(() => {
    return settings?.budget_estimations || {
      playersPerTeam: 15,
      type1Percent: 50,
      type2Percent: 50,
      type3Players: 0,
      type3Months: 8,
      seasonMonths: 8
    };
  });

  const [budgetValues, setBudgetValues] = useState<Record<string, number>>(() => {
    return settings?.budget_manual_values || {};
  });

  // Keep a ref to avoid recreating the debounce function too often, or just use a timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSettings({
        ...settings,
        budget_manual_values: budgetValues,
        budget_estimations: estimations
      });
    }, 500); // Check if we should debounce saving
    return () => clearTimeout(timer);
  }, [budgetValues, estimations]);

  useEffect(() => {
    let totalMatchesGlobal = 0;
    let totalRefereeCostGlobal = 0;
    let totalPitchCostGlobal = 0;

    try {
      const stored = localStorage.getItem('utilidades_competitions');
      if (stored) {
        const competitions = JSON.parse(stored);
        const refereeCost = settings?.referee_payment_standard || 25;
        const venues = settings?.venue_costs || [];

        competitions.forEach((comp: any) => {
          let compMatches = 0;
          comp.categories?.forEach((cat: any) => {
            cat.divisions?.forEach((div: any) => {
              compMatches += (parseInt(div.matches?.toString()) || 0);
            });
          });

          const compRefereeCost = compMatches * refereeCost;
          
          let compPitchCost = 0;
          venues.forEach((v: any) => {
            const distributedHours = comp.venueDistributions?.[v.venue_name] || 0;
            compPitchCost += distributedHours * v.hourly_rate;
          });

          totalMatchesGlobal += compMatches;
          totalRefereeCostGlobal += compRefereeCost;
          totalPitchCostGlobal += compPitchCost;
        });
      }
    } catch (e) {
      console.error("Error parsing utilidades_competitions", e);
    }

    const newBudgets: Record<string, number> = {};

    const inscripcionAccount = safeAccounts.find((a: any) =>
      a && typeof a.name === 'string' && (a.name.toLowerCase().includes('inscripción') || a.name.toLowerCase().includes('inscripcion')) && a.type === 'Ingreso'
    );
    if (inscripcionAccount && settings?.registration_fee) {
      newBudgets[inscripcionAccount.id] = numTeams * settings.registration_fee;
    }

    const arbitrajesAccount = safeAccounts.find((a: any) => a.type === 'Gasto' && a.code === 'G001');
    if (arbitrajesAccount) {
      newBudgets[arbitrajesAccount.id] = totalRefereeCostGlobal;
    }

    const instalacionesAccount = safeAccounts.find((a: any) => a.type === 'Gasto' && a.code === 'G002');
    if (instalacionesAccount) {
      newBudgets[instalacionesAccount.id] = totalPitchCostGlobal;
    }

    const partidosAccount = safeAccounts.find((a: any) => a.type === 'Ingreso' && a.code === 'I005');
    if (partidosAccount) {
      newBudgets[partidosAccount.id] = totalMatchesGlobal * 70; // 35€ per team -> 70 per match
    }

    // License Estimations
    const estimatedTotalPlayers = numTeams * estimations.playersPerTeam;
    const type1EstimatedPlayers = Math.round(estimatedTotalPlayers * (estimations.type1Percent / 100));
    const type2EstimatedPlayers = Math.round(estimatedTotalPlayers * (estimations.type2Percent / 100));
    const type3TotalLicenses = estimations.type3Players * estimations.type3Months;

    const accountI002 = safeAccounts.find((a: any) => a.code === 'I002');
    if (accountI002) newBudgets[accountI002.id] = type1EstimatedPlayers * (settings?.license_cost_type1 || 0);

    const accountI003 = safeAccounts.find((a: any) => a.code === 'I003');
    if (accountI003) newBudgets[accountI003.id] = type2EstimatedPlayers * (settings?.license_cost_type2 || 0);

    const accountI004 = safeAccounts.find((a: any) => a.code === 'I004');
    if (accountI004) newBudgets[accountI004.id] = type3TotalLicenses * (settings?.license_cost_type3 || 0);

    const accountG009 = safeAccounts.find((a: any) => a.code === 'G009');
    if (accountG009) newBudgets[accountG009.id] = type1EstimatedPlayers * (settings?.license_base_cost_type1 || 0);

    const accountG010 = safeAccounts.find((a: any) => a.code === 'G010');
    if (accountG010) newBudgets[accountG010.id] = type2EstimatedPlayers * (settings?.license_base_cost_type2 || 0);

    const accountG011 = safeAccounts.find((a: any) => a.code === 'G011');
    if (accountG011) newBudgets[accountG011.id] = type3TotalLicenses * (settings?.license_base_cost_type3 || 0);

    // Gastos Fijos automatically multiplied by seasonMonths
    const accountG003 = safeAccounts.find((a: any) => a.code === 'G003'); // Voluntario
    if (accountG003) newBudgets[accountG003.id] = (estimations.seasonMonths || 8) * (settings?.collaborator_monthly_cost || 0);

    const accountG012 = safeAccounts.find((a: any) => a.code === 'G012'); // MyGol
    if (accountG012) newBudgets[accountG012.id] = (estimations.seasonMonths || 8) * (settings?.mygol_monthly_cost || 0);

    const accountG004 = safeAccounts.find((a: any) => a.code === 'G004'); // Arrendamientos
    if (accountG004) newBudgets[accountG004.id] = (estimations.seasonMonths || 8) * (settings?.headquarters_rent || 0);

    const accountG005 = safeAccounts.find((a: any) => a.code === 'G005'); // AEMF
    if (accountG005 && settings?.aemf_membership) newBudgets[accountG005.id] = settings.aemf_membership; // Usually a one-time thing or per month? User said Gastos Fijos per month for others. Let's not touch AEMF directly unless needed, wait, AEMF is yearly or one-time, let's just leave it alone since user didn't mention it.

    setBudgetValues(prev => ({
      ...prev,
      ...newBudgets
    }));
  }, [numTeams, settings?.registration_fee, accounts, settings?.referee_payment_standard, settings?.venue_costs, estimations, settings?.license_cost_type1, settings?.license_base_cost_type1, settings?.license_cost_type2, settings?.license_base_cost_type2, settings?.license_cost_type3, settings?.license_base_cost_type3, settings?.collaborator_monthly_cost, settings?.mygol_monthly_cost, settings?.headquarters_rent]);

  const handleValueChange = (accountId: string, value: number) => {
    setBudgetValues(prev => ({
      ...prev,
      [accountId]: value
    }));
  };

  const calculateTotal = (type: string) => {
    return accounts
      .filter((a: any) => a.type === type)
      .reduce((sum: number, acc: any) => sum + (budgetValues[acc.id] || 0), 0);
  };

  const totalIncome = calculateTotal('Ingreso');
  const totalExpense = calculateTotal('Gasto');
  const predictedResult = totalIncome - totalExpense;

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Presupuesto Estimado', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30);
    doc.text(`Equipos Estimados: ${numTeams}`, 14, 36);
    
    let yPos = 45;

    // Ingresos
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Estado de Ingresos', 14, yPos);
    yPos += 8;

    const incomeAccounts = safeAccounts.filter((a: any) => a.type === 'Ingreso').sort((a: any, b: any) => (a.code||'').localeCompare(b.code||''));
    const incomeData = incomeAccounts.map((acc: any) => [
      `${acc.code} - ${acc.name}`,
      `${(budgetValues[acc.id] || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cuenta', 'Cantidad']],
      body: incomeData,
      foot: [['Total Ingresos', `${totalIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`]],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // emerald-500
      footStyles: { fillColor: [236, 253, 245], textColor: [6, 78, 59], fontStyle: 'bold' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Gastos
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Estado de Gastos', 14, yPos);
    yPos += 8;

    const expenseAccounts = safeAccounts.filter((a: any) => a.type === 'Gasto').sort((a: any, b: any) => (a.code||'').localeCompare(b.code||''));
    const expenseData = expenseAccounts.map((acc: any) => [
      `${acc.code} - ${acc.name}`,
      `${(budgetValues[acc.id] || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cuenta', 'Cantidad']],
      body: expenseData,
      foot: [['Total Gastos', `${totalExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`]],
      theme: 'grid',
      headStyles: { fillColor: [244, 63, 94] }, // rose-500
      footStyles: { fillColor: [255, 241, 242], textColor: [136, 19, 55], fontStyle: 'bold' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Resumen
    doc.setFontSize(16);
    doc.setTextColor(predictedResult >= 0 ? 67 : 225, predictedResult >= 0 ? 56 : 29, predictedResult >= 0 ? 203 : 72); // indigo-600 or rose-600
    doc.text(`Resultado Previsto: ${predictedResult.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 14, yPos);

    doc.save(`presupuesto_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Presupuesto Estimado</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Calcula el estado de ingresos y gastos previstos</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors"
            title="Generar PDF"
          >
            <Download className="w-4 h-4" />
            Descargar
          </button>
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nº de Equipos Estimado:
            </label>
            <input
              type="number"
              value={numTeams}
              onChange={(e) => setNumTeams(parseInt(e.target.value) || 0)}
              className="w-24 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Calculadora de Licencias Estimadas</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jugadores por Equipo</label>
            <input
              type="number"
              value={estimations.playersPerTeam}
              onChange={(e) => setEstimations({ ...estimations, playersPerTeam: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">% Licencia T1</label>
            <div className="relative">
              <input
                type="number"
                value={estimations.type1Percent}
                onChange={(e) => setEstimations({ ...estimations, type1Percent: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">% Licencia T2</label>
            <div className="relative">
              <input
                type="number"
                value={estimations.type2Percent}
                onChange={(e) => setEstimations({ ...estimations, type2Percent: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jugadores L. T3</label>
            <input
              type="number"
              value={estimations.type3Players}
              onChange={(e) => setEstimations({ ...estimations, type3Players: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Meses L. T3</label>
            <input
              type="number"
              value={estimations.type3Months}
              onChange={(e) => setEstimations({ ...estimations, type3Months: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Meses Temporada</label>
            <input
              type="number"
              value={estimations.seasonMonths}
              onChange={(e) => setEstimations({ ...estimations, seasonMonths: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Section */}
        <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm shadow-emerald-100/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-emerald-950 uppercase tracking-widest">Estado de Ingresos</h4>
              <p className="text-xs font-bold text-emerald-600/60 mt-0.5">Cantidades estimadas a percibir</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {safeAccounts.filter((a: any) => a.type === 'Ingreso').sort((a: any, b: any) => (a.code||'').localeCompare(b.code||'')).map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                <span className="text-xs font-bold text-slate-700">{acc.code} - {acc.name}</span>
                <div className="flex-1 border-b-2 border-dotted border-slate-200 mt-1.5"></div>
                <div className="relative w-32 shrink-0">
                  <FormattedCurrencyInput
                    value={budgetValues[acc.id] || 0}
                    onChange={(val) => handleValueChange(acc.id, val)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-right text-xs font-black text-emerald-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">€</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <span className="text-sm font-black text-emerald-900 uppercase tracking-widest">Total Ingresos</span>
            <span className="text-lg font-black text-emerald-600">{totalIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
        </div>

        {/* Expense Section */}
        <div className="bg-white rounded-[2rem] border border-rose-100 p-6 shadow-sm shadow-rose-100/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-950 uppercase tracking-widest">Estado de Gastos</h4>
              <p className="text-xs font-bold text-rose-600/60 mt-0.5">Cantidades estimadas a pagar</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {safeAccounts.filter((a: any) => a.type === 'Gasto').sort((a: any, b: any) => (a.code||'').localeCompare(b.code||'')).map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-4">
                <span className="text-xs font-bold text-slate-700">{acc.code} - {acc.name}</span>
                <div className="flex-1 border-b-2 border-dotted border-slate-200 mt-1.5"></div>
                <div className="relative w-32 shrink-0">
                  <FormattedCurrencyInput
                    value={budgetValues[acc.id] || 0}
                    onChange={(val) => handleValueChange(acc.id, val)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-right text-xs font-black text-rose-700 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">€</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-between">
            <span className="text-sm font-black text-rose-900 uppercase tracking-widest">Total Gastos</span>
            <span className="text-lg font-black text-rose-600">{totalExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
          </div>
        </div>
      </div>

      {/* Result Section */}
      <div className={`mt-6 p-6 rounded-[2rem] border ${predictedResult >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'} flex flex-col md:flex-row items-center justify-between gap-4`}>
        <div>
          <h4 className={`text-lg font-black uppercase tracking-widest ${predictedResult >= 0 ? 'text-indigo-900' : 'text-rose-900'}`}>
            Resultado Previsto
          </h4>
          <p className={`text-sm font-bold mt-1 ${predictedResult >= 0 ? 'text-indigo-600/60' : 'text-rose-600/60'}`}>
            Diferencia entre ingresos y gastos estimados
          </p>
        </div>
        <div className={`text-4xl font-black ${predictedResult >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
          {predictedResult.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ transactions, accounts, teams, teamStatus }: any) {
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    // Little trick to animate entry
    setTimeout(() => setDataReady(true), 150);
  }, []);

  const safeTransactions = transactions || [];
  const safeAccounts = accounts || [];
  const safeTeams = teams || [];
  const safeTeamStatus = teamStatus || [];

  const totalIncome = safeTransactions.filter((t: any) => t?.type === 'Ingreso').reduce((sum: number, t: any) => sum + (t?.amount || 0), 0);
  const totalExpense = safeTransactions.filter((t: any) => t?.type === 'Gasto').reduce((sum: number, t: any) => sum + (t?.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const paidTeams = safeTeamStatus.filter((s:any) => s?.registration_paid).length;
  const totalTeams = safeTeams.length;
  const paymentRate = totalTeams ? (paidTeams / totalTeams) * 100 : 0;

  // Monthly data array for chart
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyData = months.map((month, index) => {
      const monthTransactions = safeTransactions.filter((t: any) => t?.date && parseISO(t?.date).getMonth() === index);
    const inc = monthTransactions.filter((t: any) => t?.type === 'Ingreso').reduce((sum: number, t: any) => sum + (t?.amount || 0), 0);
    const exp = monthTransactions.filter((t: any) => t?.type === 'Gasto').reduce((sum: number, t: any) => sum + (t?.amount || 0), 0);
    return { name: month, Ingresos: inc, Gastos: exp };
  });

  // Calculate expenses distribution for PieChart
  const expenseAccountsData = safeAccounts
    .filter((a: any) => a?.type === 'Gasto')
    .map((account: any) => {
      const amount = safeTransactions
        .filter((t: any) => t?.accountId === account.id)
        .reduce((sum: number, t: any) => sum + (t?.amount || 0), 0);
      return { name: account.name, value: amount };
    })
    .filter((item: any) => item.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className={`p-6 transition-all duration-700 ${dataReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="mb-8">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest">Dashboard Financiero</h3>
        <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Indicadores y situación global de la temporada</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-6 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Ingresos Totales</div>
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <TrendingUp className="w-4 h-4 text-white" />
             </div>
          </div>
          <div className="text-3xl font-black relative z-10">{totalIncome.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2rem] p-6 shadow-xl shadow-rose-500/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="text-xs font-bold text-rose-100 uppercase tracking-widest">Gastos Totales</div>
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <TrendingDown className="w-4 h-4 text-white" />
             </div>
          </div>
          <div className="text-3xl font-black relative z-10">{totalExpense.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[2rem] p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Beneficio Neto</div>
             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <Wallet className="w-4 h-4 text-white" />
             </div>
          </div>
          <div className="text-3xl font-black relative z-10">{netProfit.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center justify-between mb-4 relative z-10">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inscripciones Pagadas</div>
             <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center">
               <Users className="w-4 h-4 text-white" />
             </div>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black">{paidTeams}</span>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">/ {totalTeams}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden relative z-10">
             <div className="h-full bg-indigo-500" style={{ width: `${paymentRate}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-50 border border-slate-100 rounded-3xl p-6">
           <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Evolución Ingresos vs Gastos</h4>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} dy={10} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} tickFormatter={(val) => `${val}€`} />
                 <RechartsTooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                   itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                   labelStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}
                 />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />
                 <Area type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIngresos)" />
                 <Area type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col items-center">
           <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 w-full text-left">Distribución de Gastos</h4>
           {expenseAccountsData.length > 0 ? (
             <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <RechartsPieChart>
                   <Pie
                     data={expenseAccountsData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {expenseAccountsData.map((entry: any, index: number) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip 
                     formatter={(value: number) => `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                   />
                 </RechartsPieChart>
               </ResponsiveContainer>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-center">
                <PieChart className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-400">Sin datos de gastos</p>
             </div>
           )}
           {expenseAccountsData.length > 0 && (
             <div className="w-full mt-4 space-y-2">
               {expenseAccountsData.map((entry: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between text-xs">
                   <div className="flex items-center gap-2">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                     <span className="font-bold text-slate-600 truncate max-w-[120px]">{entry.name}</span>
                   </div>
                   <span className="font-black text-slate-900">{entry.value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
