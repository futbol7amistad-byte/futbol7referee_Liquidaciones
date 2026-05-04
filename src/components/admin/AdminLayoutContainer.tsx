import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../store/DataContext';
import { useSeason } from '../../contexts/SeasonContext';
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
  ChevronDown,
  Wrench,
  AlertTriangle,
  MapPin,
  FolderTree
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../Footer';
import { formatDateDisplay } from '../../utils/formatters';

interface NavItemProps {
  item: { name: string; href: string; icon: any };
  isMobile?: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  locationPathname: string;
  isSubItem?: boolean;
}

const getIconColor = (name: string) => {
  switch (name) {
    case 'Panel': return 'text-indigo-600';
    case 'Mantenimientos': return 'text-blue-600'; // New
    case 'Árbitros': return 'text-emerald-600';
    case 'Equipos': return 'text-amber-600';
    case 'Calendario': return 'text-blue-600';
    case 'Instalaciones': return 'text-purple-600';
    case 'Asignaciones': return 'text-fuchsia-600';
    case 'Equidad': return 'text-teal-600';
    case 'Liquidaciones': return 'text-emerald-500';
    case 'Gestión Económica': return 'text-orange-600';
    case 'Contabilidad': return 'text-orange-600';
    case 'Cobro Equipos': return 'text-amber-500';
    case 'Temporadas': return 'text-indigo-700';
    case 'Utilidades': return 'text-sky-600';
    case 'Configuración': return 'text-slate-600';
    case 'Ajustes Generales': return 'text-slate-600';
    default: return 'text-slate-500';
  }
};

const NavItem = ({ item, isMobile = false, setIsMobileMenuOpen, locationPathname, isSubItem = false }: NavItemProps) => {
  const isActive = locationPathname === item.href || (locationPathname.startsWith(item.href) && item.href !== '/admin');
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={() => isMobile && setIsMobileMenuOpen(false)}
      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent ${
        isActive 
          ? 'bg-slate-100/80 border-slate-200 text-slate-900 shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-800'
      } ${isSubItem ? 'pl-8' : ''}`}
    >
      <div className="flex items-center">
        <div className={`p-1.5 rounded-lg transition-colors mr-3 ${
          isActive ? 'bg-white shadow-sm' : 'bg-transparent group-hover:bg-white group-hover:shadow-sm'
        }`}>
          <Icon className={`w-4 h-4 transition-colors ${getIconColor(item.name)}`} />
        </div>
        <span className={`text-[11px] font-black uppercase tracking-widest leading-none mt-0.5 ${isSubItem && isActive ? 'text-slate-800' : ''}`}>
          {item.name}
        </span>
      </div>
      {isActive && !isSubItem && <ChevronRight className="w-4 h-4 text-slate-300" />}
    </Link>
  );
};

const NavGroup = ({ group, isMobile, setIsMobileMenuOpen, locationPathname }: any) => {
  const isAnyChildActive = group.items.some((item: any) => locationPathname === item.href || (locationPathname.startsWith(item.href) && item.href !== '/admin'));
  const [isExpanded, setIsExpanded] = useState(isAnyChildActive);
  const Icon = group.icon;

  // Auto-expand if a child becomes active later (e.g. navigation by other means)
  useEffect(() => {
    if (isAnyChildActive && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isAnyChildActive, locationPathname]);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 border border-transparent ${
          isAnyChildActive 
            ? 'text-slate-900' 
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`}
      >
        <div className="flex items-center">
          <div className="p-1.5 rounded-lg transition-colors mr-3 bg-transparent group-hover:bg-white group-hover:shadow-sm">
            <Icon className={`w-4 h-4 transition-colors ${getIconColor(group.groupName)}`} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest leading-none mt-0.5">
            {group.groupName}
          </span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      
      {isExpanded && (
        <div className="space-y-1 mb-2">
          {group.items.map((item: any) => (
            <NavItem 
              key={item.name} 
              item={item} 
              isMobile={isMobile} 
              setIsMobileMenuOpen={setIsMobileMenuOpen} 
              locationPathname={locationPathname} 
              isSubItem
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminLayoutContainer({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const { settings } = useData();
  const { seasons, currentSeason, setCurrentSeason } = useSeason();
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
    {
      groupName: 'Mantenimientos',
      icon: FolderTree,
      items: [
        { name: 'Equipos', href: '/admin/teams', icon: Trophy },
        { name: 'Árbitros', href: '/admin/referees', icon: Shield },
        { name: 'Instalaciones', href: '/admin/venues', icon: MapPin },
      ]
    },
    { name: 'Calendario', href: '/admin/calendar', icon: Calendar },
    { name: 'Asignaciones', href: '/admin/auto-assigner', icon: Zap },
    { name: 'Equidad', href: '/admin/equity', icon: BarChart2 },
    {
      groupName: 'Gestión Económica',
      icon: Calculator,
      items: [
        { name: 'Contabilidad', href: '/admin/economic', icon: Calculator },
        { name: 'Cobro Equipos', href: '/admin/payments', icon: Banknote },
        { name: 'Liquidaciones', href: '/admin/settlements', icon: BarChart2 },
      ]
    },
    { name: 'Utilidades', href: '/admin/utilities', icon: Wrench },
    {
      groupName: 'Configuración',
      icon: Settings,
      items: [
        { name: 'Ajustes Generales', href: '/admin/settings', icon: Settings },
        { name: 'Temporadas', href: '/admin/seasons', icon: Calendar },
      ]
    }
  ];

  // Filtering based on role
  const menuItems = allMenuItems.map(item => {
    if (user?.role === 'admin') return item;
    
    if (user?.role === 'collaborator') {
      if ('groupName' in item) {
        // Filter group items
        const filteredItems = item.items.filter(subItem => 
          ['Equipos', 'Árbitros', 'Cobro Equipos', 'Contabilidad'].includes(subItem.name)
        );
        if (filteredItems.length > 0) {
          return { ...item, items: filteredItems };
        }
        return null;
      } else {
        if (['Panel'].includes(item.name)) return item;
        return null;
      }
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 bg-emerald-600 rounded-xl" />
          )}
          <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">Planner PRO</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-hidden shadow-sm z-10 hover:w-72 transition-all duration-300">
        {/* Profile / Brand Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shadow-sm">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover p-1.5" />
                ) : (
                  <Shield className="w-6 h-6" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                {user?.role === 'admin' ? 'Super Usuario' : 'Colaborador'}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <select
              value={currentSeason?.id || ''}
              onChange={(e) => {
                const s = seasons.find(x => x.id === e.target.value);
                if (s) setCurrentSeason(s);
              }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-bold leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'active' ? '(Activa)' : s.status === 'closed' ? '(Cerrada)' : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
              <ChevronDown className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {menuItems.map((item: any, i) => (
            'groupName' in item ? (
              <NavGroup 
                key={item.groupName} 
                group={item} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
                locationPathname={location.pathname} 
              />
            ) : (
              <NavItem 
                key={item.name} 
                item={item} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
                locationPathname={location.pathname} 
              />
            )
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 shadow-inner">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Activa</span>
            </div>
            <p className="text-[11px] font-black text-slate-700 uppercase">{formatDateDisplay(new Date())}</p>
          </div>

          <button 
            onClick={logout}
            className="w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all group border border-transparent"
          >
            <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-rose-100 transition-colors">
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            </div>
            <span className="ml-3 text-[11px] font-black uppercase tracking-widest">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="absolute top-0 bottom-0 left-0 w-[280px] bg-white flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl border-r border-slate-200">
            <div className="p-6 border-b border-slate-100 flex flex-col space-y-4 bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-sm font-black text-slate-900 uppercase">Planner PRO</span>
              </div>
              <div className="relative w-full">
                <select
                  value={currentSeason?.id || ''}
                  onChange={(e) => {
                    const s = seasons.find(x => x.id === e.target.value);
                    if (s) setCurrentSeason(s);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-3 pr-8 rounded-lg text-xs font-bold leading-tight focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status === 'active' ? '(Activa)' : s.status === 'closed' ? '(Cerrada)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
              {menuItems.map((item: any) => (
                'groupName' in item ? (
                  <NavGroup 
                    key={item.groupName} 
                    group={item} 
                    isMobile
                    setIsMobileMenuOpen={setIsMobileMenuOpen} 
                    locationPathname={location.pathname} 
                  />
                ) : (
                  <NavItem 
                    key={item.name} 
                    item={item} 
                    isMobile 
                    setIsMobileMenuOpen={setIsMobileMenuOpen} 
                    locationPathname={location.pathname} 
                  />
                )
              ))}
            </nav>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button 
                onClick={logout}
                className="w-full flex items-center px-4 py-3 rounded-2xl border border-transparent hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-all group"
              >
                <div className="p-2 rounded-xl bg-slate-200 group-hover:bg-rose-200 transition-colors">
                   <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-600" />
                </div>
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
