import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../store/DataContext';
import { LogOut, LayoutDashboard, Users, Shield, Banknote, Calendar, Settings, Trophy, BarChart2, Zap, Calculator } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../Footer';
import { formatDateDisplay } from '../../utils/formatters';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const { settings, matches } = useData();
  console.log('AdminLayout matches:', matches);
  const location = useLocation();

  const dates = matches.map(m => m.match_date).sort();
  let periodDisplay = 'Sin partidos';
  if (dates.length > 0) {
    const minDate = new Date(dates[0]);
    const maxDate = new Date(dates[dates.length - 1]);
    
    const minDay = minDate.getDate();
    const maxDay = maxDate.getDate();
    const monthName = minDate.toLocaleString('es-ES', { month: 'long' });
    const year = minDate.getFullYear();

    if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
      periodDisplay = `Del ${minDay} al ${maxDay} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
    } else {
      periodDisplay = `Del ${formatDateDisplay(dates[0])} al ${formatDateDisplay(dates[dates.length - 1])}`;
    }
  }

  const allNavigation = [
    { name: 'Panel', href: '/admin', icon: LayoutDashboard },
    { name: 'Árbitros', href: '/admin/referees', icon: Users },
    { name: 'Equipos', href: '/admin/teams', icon: Shield },
    { name: 'Calendario', href: '/admin/calendar', icon: Calendar },
    { name: 'Asignaciones', href: '/admin/auto-assigner', icon: Zap },
    { name: 'Equidad', href: '/admin/equity', icon: BarChart2 },
    { name: 'Liquidaciones', href: '/admin/payments', icon: Banknote },
    { name: 'Economía', href: '/admin/economic', icon: Calculator },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
  ];

  const navigation = allNavigation.filter(item => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'collaborator') {
      return ['Panel', 'Árbitros', 'Equipos', 'Economía'].includes(item.name);
    }
    return false;
  });

  const getNavColor = (name: string) => {
    switch (name) {
      case 'Panel': return 'text-indigo-500';
      case 'Árbitros': return 'text-purple-500';
      case 'Equipos': return 'text-blue-500';
      case 'Calendario': return 'text-sky-500';
      case 'Asignaciones': return 'text-pink-500'; // Nuevo color
      case 'Equidad': return 'text-amber-500';
      case 'Liquidaciones': return 'text-emerald-500';
      case 'Economía': return 'text-orange-500';
      case 'Configuración': return 'text-slate-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60 sticky top-0 z-50 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo Campeonato" 
                className="w-12 h-12 object-contain drop-shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Trophy className="text-white w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-xs font-display font-black text-slate-900 leading-tight uppercase tracking-tight">CONSOLA DE ADMINISTRACIÓN INTEGRAL DE ÁRBITROS Y EQUIPOS</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Futbol 7 La Amistad • Tenerife</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 shadow-app-inner">
              <Calendar className="w-4 h-4 text-slate-400 mr-3" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Periodo Activo</span>
                <span className="text-xs font-bold text-slate-700">{periodDisplay}</span>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="group flex items-center justify-center w-10 h-10 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Navigation */}
      <div className="bg-white border-b border-slate-200/60 overflow-x-auto scrollbar-hide print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center h-16 gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const navColor = getNavColor(item.name);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap group ${
                    isActive
                      ? `${navColor} border-b-2 border-current`
                      : 'text-slate-400 hover:text-slate-900 border-b-2 border-transparent'
                  }`}
                >
                  <item.icon className={`mr-2.5 h-4 w-4 ${isActive ? navColor : 'text-slate-300 group-hover:text-slate-400'} transition-all`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 print:p-0 print:py-0">
        {children}
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
