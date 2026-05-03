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

  // Background Image (Hyperrealistic football stadium at sunset)
  const bgImgUrl = "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=2000";

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
    <div className="w-full h-full flex-1 min-h-screen flex flex-col relative overflow-hidden font-sans bg-slate-900 text-slate-100">
      <AnimatePresence mode="wait">
        
        {/* INTRO SPLASH SCREEN */}
        {view === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950"
          >
            <div className="absolute inset-0">
              <img 
                src={bgImgUrl}
                alt="Stadium"
                className="w-full h-full object-cover opacity-30 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>
              <div className="absolute inset-0 bg-[#16a34a]/10 mix-blend-overlay"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-gradient-to-br from-[#4ade80] to-[#16a34a] p-1 mx-auto mb-8 shadow-2xl transition-transform">
                  <div className="w-full h-full bg-slate-900 rounded-[1.8rem] flex items-center justify-center shadow-inner">
                     {settings?.logo_url ? (
                       <img src={settings.logo_url} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                     ) : (
                       <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-[#16a34a]" />
                     )}
                  </div>
                </div>
              </motion.div>
              
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-5xl sm:text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(22,163,74,0.4)]"
              >
                Futbol7
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4ade80] to-[#16a34a]">
                  Planner PRO
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="text-lg sm:text-2xl text-slate-300 font-medium tracking-wide max-w-2xl mx-auto drop-shadow mb-12"
              >
                Gestión Integral y Profesional
              </motion.p>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView('selection')}
                className="group relative px-8 py-4 bg-[#16a34a] hover:bg-[#15803d] rounded-full font-bold text-white overflow-hidden shadow-[0_0_40px_rgba(22,163,74,0.4)] transition-colors inline-flex items-center gap-2 text-lg"
              >
                Comenzar
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* MAIN APP SCREENS */}
        {view !== 'intro' && (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col md:flex-row relative z-10 w-full"
          >
            {/* Background for form screens */}
            <div className="absolute inset-0 z-0 h-[45vh] md:h-full md:w-[45%] lg:w-1/2">
               <img 
                  src={bgImgUrl}
                  alt="Stadium"
                  className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-900/80 md:bg-gradient-to-r md:from-slate-900/20 md:via-slate-900/40 md:to-slate-900"></div>
            </div>

            {/* Container for forms (mobile: bottom sliding up, desktop: right side aligned center) */}
            <div className="relative z-10 flex-1 flex flex-col justify-end md:justify-center md:items-center w-full pt-[30vh] md:pt-0 md:ml-auto md:w-[55%] lg:w-1/2">
              
              {/* Back button logic over the image for selection */}
              {view !== 'selection' && (
                 <button 
                   onClick={() => {
                     setView('selection');
                     setError('');
                     setPassword('');
                   }}
                   className="absolute top-6 left-6 md:top-8 md:left-8 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center text-slate-800 shadow-lg hover:scale-105 active:scale-95 transition-all z-50"
                 >
                   <ArrowLeft className="w-5 h-5" />
                 </button>
              )}

              {view === 'selection' && (
                <motion.div
                   key="selection-box"
                   initial={{ y: 100, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   transition={{ type: "spring", damping: 25, stiffness: 200 }}
                   className="bg-white w-full h-full md:h-auto min-h-[60vh] md:min-h-0 rounded-t-[2rem] md:rounded-[2rem] p-8 pb-12 shadow-2xl flex flex-col items-center md:max-w-xl md:mx-auto md:my-auto"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden"></div>
                  
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Bienvenido</h2>
                    <p className="text-gray-500 font-medium">Selecciona tu tipo de acceso para continuar</p>
                  </div>

                  <div className="w-full space-y-4">
                    <button
                      onClick={() => setView('admin')}
                      className="w-full flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-[#16a34a] hover:bg-green-50 transition-all group"
                    >
                      <div className="w-14 h-14 bg-green-100 text-[#16a34a] rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                        <Monitor className="w-7 h-7 object-contain" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#16a34a] transition-colors">Administración</h3>
                        <p className="text-sm text-gray-500 font-medium">Gestión integral del sistema</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#16a34a] transition-colors" />
                    </button>

                    <button
                      onClick={() => setView('referee')}
                      className="w-full flex items-center p-4 border-2 border-gray-100 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50 transition-all group"
                    >
                      <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mr-5 group-hover:scale-110 transition-transform">
                        <Smartphone className="w-7 h-7 object-contain" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">Panel de Árbitros</h3>
                        <p className="text-sm text-gray-500 font-medium">Acceso para colegiados</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
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
                   className="bg-white w-full h-full md:h-auto min-h-[60vh] md:min-h-0 rounded-t-[2rem] md:rounded-[2rem] p-8 sm:px-10 pb-12 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] md:shadow-2xl flex flex-col md:max-w-md md:mx-auto md:my-auto relative"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden mx-auto"></div>
                  
                  <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Sign In</h2>
                    <p className="text-gray-500 font-medium">Administración • Temporada {settings?.season}</p>
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
                   className="bg-white w-full h-full md:h-auto min-h-[60vh] md:min-h-0 rounded-t-[2rem] md:rounded-[2rem] p-8 sm:px-10 pb-12 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] md:shadow-2xl flex flex-col md:max-w-md md:mx-auto md:my-auto relative"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-8 md:hidden mx-auto"></div>
                  
                  <div className="mb-8">
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Sign In</h2>
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
        )}
      </AnimatePresence>
    </div>
  );
}
