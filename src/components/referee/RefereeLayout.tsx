import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useData } from '../../store/DataContext';
import Footer from '../Footer';

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { matches, payments, settings, referees } = useData();
  const refereeData = referees.find(r => r.id === user?.id);
  const photoUrl = refereeData?.photo_url;

  // Calculate counters for today
  const today = new Date().toISOString().split('T')[0];
  const myMatches = matches.filter(m => m.referee_id === user?.id && m.match_date === today);
  
  let collectedToday = 0;
  myMatches.forEach(match => {
    const matchPayments = payments.filter(p => p.match_id === match.id);
    matchPayments.forEach(p => {
      if (p.is_paid) collectedToday += p.amount;
    });
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 glass shadow-app border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={user?.name} 
                  className="w-10 h-10 rounded-xl object-cover shadow-sm ring-2 ring-emerald-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <span className="text-white font-black text-lg">{user?.name?.charAt(0)}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Árbitro</p>
              <h1 className="font-display font-bold text-slate-900 leading-none truncate max-w-[140px]">
                {user?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end mr-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Recaudado hoy</span>
              <span className="text-base font-black text-emerald-600 leading-none">{collectedToday}€</span>
            </div>
            <button
              onClick={logout}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-lg w-full mx-auto p-4 sm:p-6 mb-20">
        {children}
      </main>

      <Footer />
    </div>
  );
}
