import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Monitor, Trophy, ArrowLeft, Lock, User as UserIcon, AlertCircle, ChevronDown, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../store/DataContext';

type LoginState = 'intro' | 'selection' | 'admin' | 'referee';

export default function Login() {
  const { login } = useAuth();
  const { referees, settings } = useData();
  const [view, setView] = useState<LoginState>('intro');
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Background Image (Hyperrealistic football stadium at sunset or grass with lights)
  const bgImgUrl = "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=2000";
  // Imagen específica para el login de árbitros
  const refereeBgUrl = "/referee-bg.jpg";

  const handleRefereeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const referee = referees.find(r => r.username === username);
    if (referee) {
      if (referee.password && referee.password !== password) {
        setError('Contraseña incorrecta.');
        return;
      }
      login('referee', {
        id: referee.id,
        email: referee.email,
        role: 'referee',
        name: referee.name
      });
    } else {
      setError('Por favor, selecciona un árbitro.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login({ username, password });
    if (!success) {
      setError('Credenciales incorrectas.');
    }
  };

  return (
    <div className="w-full h-full flex-1 min-h-[100dvh] flex flex-col relative overflow-hidden font-sans bg-slate-950 text-slate-100">
      <AnimatePresence mode="wait">
        
        {/* MAIN APP SCREENS */}
        <motion.div 
          key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center relative z-10 w-full"
          >
            {/* Background for form screens */}
            <div className={`absolute top-0 left-0 right-0 z-0 w-full transition-all duration-700 ease-in-out ${view === 'intro' ? 'h-full' : 'h-[55dvh] md:h-full'}`}>
               <img 
                  src={view === 'referee' ? refereeBgUrl : bgImgUrl}
                  alt="Background"
                  className={`w-full h-full object-cover md:object-center transition-opacity duration-700 ${view === 'intro' ? 'opacity-60' : 'opacity-100'} ${view === 'referee' ? 'object-top' : 'object-bottom'}`}
               />
               <div className={`absolute inset-0 transition-opacity duration-700 ${view === 'intro' ? 'bg-slate-950/70 backdrop-blur-sm md:backdrop-blur-none' : 'bg-gradient-to-b from-slate-900/10 via-transparent to-slate-950'}`}></div>
            </div>

            {/* Container for forms */}
            <div className={`relative z-10 w-full max-w-xl mx-auto ${view === 'intro' ? 'px-4 flex flex-col justify-center items-center h-full' : 'px-0 md:px-4 flex flex-col justify-end md:justify-center items-center h-[100dvh]'}`}>

              
              {/* Back button logic over the image for selection */}
              {view !== 'intro' && (
                 <button 
                   onClick={() => {
                     if (view === 'selection') setView('intro');
                     else setView('selection');
                     setError('');
                     setPassword('');
                   }}
                   className="absolute top-6 left-6 md:top-8 md:left-2 w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white shadow-lg hover:bg-white/20 hover:scale-105 active:scale-95 transition-all z-50"
                 >
                   <ArrowLeft className="w-5 h-5" />
                 </button>
              )}

              {view === 'intro' && (
                 <div className="relative z-10 flex flex-col items-center p-8 text-center animate-in fade-in zoom-in duration-1000">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 mb-8 border border-white/20">
                      {settings?.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                      ) : (
                        <Trophy className="w-12 h-12 text-white" />
                      )}
                    </div>
                    
                    <h2 className="text-sm md:text-base font-black text-emerald-400 uppercase tracking-[0.4em] mb-4">La Evolución de la Gestión</h2>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 drop-shadow-lg">
                      Planner <span className="text-emerald-400">PRO</span>
                    </h1>
                    <p className="text-slate-200 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed mb-12 drop-shadow-md">
                      Plataforma avanzada de planificación y gestión financiera para competiciones deportivas.
                    </p>

                    <button 
                      onClick={() => setView('selection')}
                      className="group relative px-8 py-4 bg-emerald-600 rounded-full overflow-hidden shadow-[0_0_40px_-10px_rgba(16,185,129,0.7)] hover:shadow-[0_0_60px_-5px_rgba(16,185,129,0.9)] transition-all duration-500 hover:scale-105 active:scale-95 border border-emerald-400/30"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <span className="relative z-10 flex items-center text-white text-sm font-black uppercase tracking-[0.2em]">
                        Empezar Ahora
                        <svg className="w-4 h-4 ml-3 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    </button>
                 </div>
              )}

              {view === 'selection' && (
                <motion.div
                   key="selection-box"
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ type: "spring", damping: 25, stiffness: 200 }}
                   className="bg-white w-full rounded-t-[2rem] md:rounded-[2rem] p-8 pb-12 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col items-center relative"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden mx-auto absolute top-4 left-1/2 -translate-x-1/2"></div>
                  
                  <div className="text-center mb-8 mt-2">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Bienvenido</h2>
                    <p className="text-slate-500 font-medium">Selecciona tu tipo de acceso para continuar</p>
                  </div>

                  <div className="w-full space-y-4">
                    <button
                      onClick={() => setView('admin')}
                      className="w-full flex items-center p-4 border-2 border-slate-100/50 bg-white/50 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/80 transition-all group shadow-sm"
                    >
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform shadow-sm">
                        <Monitor className="w-7 h-7 object-contain" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Administración</h3>
                        <p className="text-sm text-slate-500 font-medium">Gestión integral del sistema</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </button>

                    <button
                      onClick={() => setView('referee')}
                      className="w-full flex items-center p-4 border-2 border-slate-100/50 bg-white/50 rounded-2xl hover:border-blue-500 hover:bg-blue-50/80 transition-all group shadow-sm"
                    >
                      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform shadow-sm">
                        <Smartphone className="w-7 h-7 object-contain" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">Panel de Árbitros</h3>
                        <p className="text-sm text-slate-500 font-medium">Acceso para colegiados</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  </div>
                </motion.div>
              )}

              {view === 'admin' && (
                <motion.div
                   key="admin-box"
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ type: "spring", damping: 25, stiffness: 200 }}
                   className="bg-white w-full rounded-t-[2rem] md:rounded-[2rem] p-8 sm:px-10 pb-12 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col relative"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden mx-auto absolute top-4 left-1/2 -translate-x-1/2"></div>
                  
                  <div className="mb-8 mt-4">
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Introduzca sus Claves</h2>
                    <p className="text-slate-500 font-medium">Administración • Temporada {settings?.season}</p>
                  </div>


                  <form onSubmit={handleAdminLogin} className="space-y-6 w-full">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 flex items-center"
                      >
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Usuario</label>
                      <div className="relative border border-gray-300 rounded-xl overflow-hidden focus-within:border-[#16a34a] focus-within:ring-1 focus-within:ring-[#16a34a] transition-all bg-white">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                         </div>
                         <input 
                            type="text"
                            required
                            placeholder="Usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full pl-[3.25rem] pr-4 py-3.5 bg-transparent border-0 focus:ring-0 sm:text-sm text-gray-900 font-bold outline-none"
                         />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Contraseña</label>
                      <div className="relative border border-gray-300 rounded-xl overflow-hidden focus-within:border-[#16a34a] focus-within:ring-1 focus-within:ring-[#16a34a] transition-all bg-white flex items-center">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-[#16a34a]" />
                         </div>
                         <input 
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-[3.25rem] pr-12 py-3.5 bg-transparent border-0 focus:ring-0 sm:text-sm text-gray-900 font-bold outline-none"
                         />
                         <button 
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                         >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                         </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-[#16a34a] hover:bg-[#15803d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#16a34a] transition-colors mt-8 group"
                    >
                      Continuar
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                </motion.div>
              )}

              {view === 'referee' && (
                <motion.div
                   key="referee-box"
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ type: "spring", damping: 25, stiffness: 200 }}
                   className="bg-white w-full min-h-[60vh] md:min-h-0 rounded-t-[2rem] md:rounded-[2rem] p-8 sm:px-10 pb-12 shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col relative"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden mx-auto absolute top-4 left-1/2 -translate-x-1/2"></div>
                  
                  <div className="mb-8 mt-4">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Introduzca sus Claves</h2>
                    <p className="text-gray-500 font-medium">Árbitros • Temporada {settings?.season}</p>
                  </div>

                  <form onSubmit={handleRefereeLogin} className="space-y-6 w-full">
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600 flex items-center"
                      >
                        <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Árbitro</label>
                      <div className="relative border border-gray-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-white">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="block w-full pl-[3.25rem] pr-10 py-3.5 bg-transparent border-0 focus:ring-0 sm:text-sm text-gray-900 font-bold outline-none appearance-none"
                        >
                          <option value="">-- Selecciona tu nombre --</option>
                          {referees
                            .slice()
                            .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()))
                            .map((ref, idx) => (
                            <option key={`login-ref-${ref.id || 'no-id'}-${idx}`} value={ref.username}>{(ref.name || '').toUpperCase()}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">Contraseña</label>
                      <div className="relative border border-gray-300 rounded-xl overflow-hidden focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 transition-all bg-white flex items-center">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-emerald-600" />
                         </div>
                         <input 
                            type={showPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-[3.25rem] pr-12 py-3.5 bg-transparent border-0 focus:ring-0 sm:text-sm text-gray-900 font-bold outline-none"
                         />
                         <button 
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                         >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                         </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 transition-colors mt-8 group"
                    >
                      Continuar
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
