import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../store/DataContext';
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Shield, 
  Banknote, 
  Calendar, 
  Settings, 
  Trophy, 
  BarChart2, 
  Zap, 
  Calculator,
  Menu,
  X,
  ChevronRight,
  Wrench,
  AlertTriangle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../Footer';
import { formatDateDisplay } from '../../utils/formatters';

interface NavItemProps {
  key?: string | number;
  item: { name: string; href: string; icon: any };
  isMobile?: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  locationPathname: string;
}

const NavItem = ({ item, isMobile = false, setIsMobileMenuOpen, locationPathname }: NavItemProps) => {
  const isActive = locationPathname === item.href;
  const Icon = item.icon;

  const getIconColor = (name: string) => {
    switch (name) {
      case 'Panel': return 'text-indigo-500';
      case 'Árbitros': return 'text-blue-500';
      case 'Equipos': return 'text-yellow-500';
      case 'Calendario': return 'text-purple-500';
      case 'Pendientes': return 'text-rose-500';
      case 'Asignaciones': return 'text-pink-500';
      case 'Equidad': return 'text-amber-500';
      case 'Liquidaciones': return 'text-emerald-500';
      case 'Gestión Económica': return 'text-orange-500';
      case 'Temporadas': return 'text-indigo-600';
      case 'Utilidades': return 'text-sky-500';
      case 'Configuración': return 'text-slate-500';
      default: return 'text-slate-400';
    }
  };

  return (
    <Link
      to={item.href}
      onClick={() => isMobile && setIsMobileMenuOpen(false)}
      className={`group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-xl transition-colors ${
          isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'
        }`}>
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : getIconColor(item.name)}`} />
        </div>
        <span className="ml-3 text-xs font-black uppercase tracking-widest leading-none">
          {item.name}
        </span>
      </div>
      {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
    </Link>
  );
};

export default function AdminLayoutContainer({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const { settings } = useData();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackupReminder, setShowBackupReminder] = useState(false);

  useEffect(() => {
    if (!settings.backup_frequency || settings.backup_frequency === 'none') {
       setShowBackupReminder(false);
       return;
    }
    
    const lastBackup = settings.last_backup_date ? new Date(settings.last_backup_date) : null;
    const now = new Date();
    
    if (!lastBackup) {
       setShowBackupReminder(true);
       return;
    }
    
    const diffDays = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 3600 * 24));
    
    if (settings.backup_frequency === 'weekly' && diffDays >= 7) {
       setShowBackupReminder(true);
    } else if (settings.backup_frequency === 'monthly' && diffDays >= 30) {
       setShowBackupReminder(true);
    } else {
       setShowBackupReminder(false);
    }
  }, [settings.backup_frequency, settings.last_backup_date]);

  const allMenuItems = [
    { name: 'Panel', href: '/admin', icon: LayoutDashboard },
    { name: 'Árbitros', href: '/admin/referees', icon: Shield },
    { name: 'Equipos', href: '/admin/teams', icon: Trophy },
    { name: 'Calendario', href: '/admin/calendar', icon: Calendar },
    { name: 'Asignaciones', href: '/admin/auto-assigner', icon: Zap },
    { name: 'Equidad', href: '/admin/equity', icon: BarChart2 },
    { name: 'Cobros Equipos', href: '/admin/payments', icon: Banknote },
    { name: 'Gestión Económica', href: '/admin/economic', icon: Calculator },
    { name: 'Liquidaciones', href: '/admin/settlements', icon: BarChart2 },
    { name: 'Temporadas', href: '/admin/seasons', icon: Calendar },
    { name: 'Utilidades', href: '/admin/utilities', icon: Wrench },
    { name: 'Configuración', href: '/admin/settings', icon: Settings },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'collaborator') {
      return ['Panel', 'Árbitros', 'Equipos', 'Cobros Equipos', 'Gestión Económica'].includes(item.name);
    }
    return false;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-xl" />
          )}
          <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Admin Panel</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-50 rounded-xl text-slate-600"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 sticky top-0 h-screen overflow-hidden">
        {/* Profile / Brand Header */}
        <div className="p-8 border-b border-slate-50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover p-1.5" />
                ) : (
                  <Shield className="w-7 h-7" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {user?.role === 'admin' ? 'Super Usuario' : 'Colaborador'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto scrollbar-hide">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 mt-2">Menú Principal</p>
          {menuItems.map((item) => (
            <NavItem 
              key={item.name} 
              item={item} 
              setIsMobileMenuOpen={setIsMobileMenuOpen} 
              locationPathname={location.pathname} 
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-50 bg-slate-50/50">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Activa</span>
            </div>
            <p className="text-xs font-black text-slate-900 uppercase">{formatDateDisplay(new Date())}</p>
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center px-4 py-3 rounded-2xl hover:bg-rose-50 text-rose-500 transition-all group"
          >
            <div className="p-2 rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="ml-3 text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute top-0 bottom-0 left-0 w-[280px] bg-white flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm font-black text-slate-900 uppercase">Menú</span>
            </div>
            <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <NavItem 
                  key={item.name} 
                  item={item} 
                  isMobile 
                  setIsMobileMenuOpen={setIsMobileMenuOpen} 
                  locationPathname={location.pathname} 
                />
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button 
                onClick={logout}
                className="w-full flex items-center px-4 py-3 rounded-2xl bg-rose-50 text-rose-500"
              >
                <LogOut className="w-5 h-5" />
                <span className="ml-3 text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-scroll-container" className="flex-grow min-w-0 flex flex-col h-screen overflow-y-auto bg-[#F8FAFC]">
        {showBackupReminder && (
          <div className="bg-amber-100/50 border-b border-amber-200 px-4 py-3 shrink-0">
             <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-500 rounded-lg shrink-0">
                      <AlertTriangle className="w-5 h-5 text-white" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-amber-900">Recordatorio de Copia de Seguridad</p>
                     <p className="text-xs font-medium text-amber-700 mt-0.5">Te recomendamos realizar una copia de seguridad para mantener tus datos a salvo.</p>
                   </div>
                </div>
                <Link to="/admin/settings" className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-amber-700 shadow-sm hover:bg-amber-50 transition-colors border border-amber-200">
                   Ir a Configuración
                </Link>
             </div>
          </div>
        )}
        <div className="flex-grow p-4 sm:p-6 lg:p-8 shrink-0 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-grow">
            {children}
          </div>
        </div>
        <Footer className="shrink-0" />
      </main>
    </div>
  );
}
