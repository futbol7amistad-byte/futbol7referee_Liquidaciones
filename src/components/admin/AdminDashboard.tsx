import React from 'react';
import { useData } from '../../store/DataContext';
import { Users, Banknote, AlertCircle, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const { matches, payments, referees, deliveries } = useData();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Active period should be determined. Assuming current system date is within a period, 
  // or we need to infer it. For simplicity, assume matches cover needed periods.
  // We'll find active period based on today.
  const activePeriod = matches.find(m => m.match_date === today)?.period 
    || [...new Set(matches.map(m => m.period))].sort().reverse()[0] 
    || '';

  // Filter for Active Period
  const activeMatches = matches.filter(m => m.period === activePeriod);
  const liquidatedMatches = matches.filter(m => m.status === 'Liquidado');
  const activeLiquidatedMatches = liquidatedMatches.filter(m => m.period === activePeriod);
  
  const activePayments = payments.filter(p => activeLiquidatedMatches.some(m => m.id === p.match_id));

  // KPIs
  const totalCollectedActive = activePayments.filter(p => p.is_paid).reduce((acc, p) => acc + p.amount, 0);
  const totalCollectedToday = payments.filter(p => p.is_paid && p.created_at.startsWith(today)).reduce((acc, p) => acc + p.amount, 0);
  
  const activeReferees = [...new Set(activeMatches.map(m => m.referee_id))].filter(Boolean);
  
  const upcomingMatchesCount = matches.filter(m => {
    const matchDateTime = new Date(`${m.match_date}T${m.match_time}`);
    return matchDateTime >= now;
  }).length;

  // Teams with liquidated matches
  const teamsInActiveLiquidated = [...new Set(activeLiquidatedMatches.flatMap(m => [m.team_a_id, m.team_b_id]))];
  
  const teamsWithPaymentsActive = teamsInActiveLiquidated.filter(tId => {
    const teamMatches = activeLiquidatedMatches.filter(m => m.team_a_id === tId || m.team_b_id === tId);
    return teamMatches.some(m => {
        const payment = payments.find(p => p.match_id === m.id && p.team_id === tId);
        return payment && payment.is_paid;
    });
  });

  const unpaidActive = teamsInActiveLiquidated.filter(tId => {
    const teamMatches = activeLiquidatedMatches.filter(m => m.team_a_id === tId || m.team_b_id === tId);
    return teamMatches.some(m => {
        const payment = payments.find(p => p.match_id === m.id && p.team_id === tId);
        return payment && !payment.is_paid;
    });
  });

  const teamsInAllLiquidated = [...new Set(liquidatedMatches.flatMap(m => [m.team_a_id, m.team_b_id]))];
  const totalUnpaid = teamsInAllLiquidated.filter(tId => {
    const teamMatches = liquidatedMatches.filter(m => m.team_a_id === tId || m.team_b_id === tId);
    return teamMatches.some(m => {
        const payment = payments.find(p => p.match_id === m.id && p.team_id === tId);
        return payment && !payment.is_paid;
    });
  });

  const stats = [
    {
      title: 'Total Recaudado (Periodo)',
      value: `${totalCollectedActive.toLocaleString('es-ES')} €`,
      subtitle: 'En la jornada activa',
      icon: Banknote,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Hoy',
      value: `${totalCollectedToday.toLocaleString('es-ES')} €`,
      subtitle: 'Recaudado hoy',
      icon: TrendingUp,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Árbitros Activos',
      value: activeReferees.length.toString(),
      subtitle: 'Designados en periodo activo',
      icon: Users,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
    {
      title: 'Próximos Partidos',
      value: upcomingMatchesCount.toString(),
      subtitle: 'Restantes desde ahora',
      icon: Calendar,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Equipos con Pagos',
      value: teamsWithPaymentsActive.length.toString(),
      subtitle: 'Pagos al día en periodo activo',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Equipos con Impagos',
      value: (
        <div className="flex items-center w-full">
          <span className="flex-1 text-left">{unpaidActive.length}</span>
          <div className="w-[1px] h-4 bg-slate-200 mx-4"></div>
          <span className="flex-1 text-right">{totalUnpaid.length}</span>
        </div>
      ),
      subtitle: (
        <div className="flex items-center w-full">
          <span className="flex-1 text-[10px] leading-tight text-left uppercase">Periodo Actual</span>
          <span className="flex-1 text-[10px] leading-tight text-right uppercase">Histórico</span>
        </div>
      ),
      icon: AlertCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 px-1">TABLERO DE INFORMACIÓN GENERAL</p>
          <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">PANEL DE CONTROL</h2>
        </div>
        <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="group bg-white rounded-[2rem] p-6 shadow-app border border-white hover:border-slate-200 transition-all hover:shadow-app-lg relative overflow-hidden active:scale-[0.99]">
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500 opacity-50"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  <span className={`w-1.5 h-1.5 rounded-full mr-2 ${stat.iconColor.replace('text', 'bg')}`}></span>
                  {stat.title}
                </p>
                <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">{stat.value ?? '0'}</div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{stat.subtitle}</div>
              </div>
              <div className={`${stat.iconBg} p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
