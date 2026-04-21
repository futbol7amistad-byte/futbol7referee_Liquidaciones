import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Monitor, Trophy, ArrowLeft, Lock, Mail, User as UserIcon, AlertCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../store/DataContext';

type LoginState = 'selection' | 'admin' | 'referee';

export default function Login() {
  const { login } = useAuth();
  const { referees, settings } = useData();
  const [view, setView] = useState<LoginState>('selection');
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

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
    if (email) {
      // En un entorno real, aquí se verificaría el email y contraseña
      login('admin');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-600 flex flex-col items-center justify-center p-4 sm:p-8 font-sans relative overflow-hidden">
      {/* Background decorative elements for 3D depth */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-black opacity-10 rounded-full blur-3xl pointer-events-none"></div>

      <AnimatePresence mode="wait">
        {view === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-4xl flex flex-col items-center z-10"
          >
            <div className="text-center mb-10 mt-4">
              <div className="mx-auto w-24 h-24 bg-white rounded-full p-1 shadow-2xl mb-6 flex items-center justify-center border-4 border-emerald-100 relative overflow-hidden">
                <div className="absolute inset-0 rounded-full shadow-inner"></div>
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <Trophy className="w-12 h-12 text-emerald-600 drop-shadow-md" />
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg mb-3 tracking-tight">
                Liquidaciones Arbitrales
              </h1>
              <p className="text-emerald-50 text-lg md:text-xl font-medium drop-shadow mb-3">
                Sistema de Gestión de Pagos - Fútbol 7 Amistad
              </p>
              <p className="text-emerald-100 text-sm font-bold tracking-widest uppercase drop-shadow-sm">
                Temporada: {settings.season}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
              {/* Referee Card */}
              <motion.button
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('referee')}
                className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center text-center group border border-gray-100 relative overflow-hidden transition-shadow hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40 flex items-center justify-center mb-6 transform group-hover:rotate-6 transition-transform duration-300 border border-white/20">
                  <Smartphone className="w-10 h-10 text-white drop-shadow-md" strokeWidth={1.5} />
                </div>
                
                <h2 className="text-2xl font-extrabold text-gray-800 mb-3">Panel de Árbitros</h2>
                <p className="text-gray-500 mb-8 flex-grow leading-relaxed font-medium">
                  Acceso para árbitros para registrar liquidaciones de partidos desde el campo
                </p>
                
                <div className="bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-full text-sm font-bold border border-emerald-100 shadow-sm">
                  Optimizado para móvil
                </div>
              </motion.button>

              {/* Admin Card */}
              <motion.button
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setView('admin')}
                className="bg-white rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center text-center group border border-gray-100 relative overflow-hidden transition-shadow hover:shadow-[0_30px_60px_rgba(0,0,0,0.3)]"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40 flex items-center justify-center mb-6 transform group-hover:-rotate-6 transition-transform duration-300 border border-white/20">
                  <Monitor className="w-10 h-10 text-white drop-shadow-md" strokeWidth={1.5} />
                </div>
                
                <h2 className="text-2xl font-extrabold text-gray-800 mb-3">Panel de Administración</h2>
                <p className="text-gray-500 mb-8 flex-grow leading-relaxed font-medium">
                  Acceso administrativo para gestionar árbitros, entregas y reportes
                </p>
                
                <div className="bg-blue-50 text-blue-600 px-6 py-2.5 rounded-full text-sm font-bold border border-blue-100 shadow-sm">
                  Gestión completa
                </div>
              </motion.button>
            </div>

            <p className="mt-12 text-emerald-50 text-sm font-medium drop-shadow-sm">
              Selecciona tu tipo de acceso para continuar
            </p>
          </motion.div>
        )}

        {view === 'referee' && (
          <motion.div
            key="referee-form"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md z-10"
          >
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.3)] relative overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
              
              <button 
                onClick={() => setView('selection')}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform" />
                Volver a selección
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-4 border-4 border-emerald-100">
                  <Smartphone className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Panel de Árbitros</h2>
                <p className="text-gray-500 font-medium">Acceso para registro de liquidaciones</p>
              </div>

              <form onSubmit={handleRefereeLogin} className="space-y-5">
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
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Seleccionar Árbitro</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-white shadow-inner transition-colors hover:bg-white appearance-none text-gray-900 font-bold"
                    >
                      <option value="">-- Selecciona tu nombre --</option>
                      {referees
                        .slice()
                        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
                        .map(ref => (
                        <option key={ref.id} value={ref.username}>{ref.name.toUpperCase()}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-gray-50 shadow-inner transition-colors hover:bg-white text-gray-900 font-bold"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors mt-8"
                >
                  Iniciar Sesión
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium">
                  Contacta con el administrador si tienes problemas de acceso
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'admin' && (
          <motion.div
            key="admin-form"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md z-10"
          >
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.3)] relative overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              
              <button 
                onClick={() => setView('selection')}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 mr-1 transform group-hover:-translate-x-1 transition-transform" />
                Volver a selección
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-4 border-4 border-blue-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-blue-600 opacity-10"></div>
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Trophy className="w-10 h-10 text-blue-600" />
                  )}
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-1">Administración</h2>
                <p className="text-gray-500 font-medium mb-1">Temporada: {settings.season}</p>
                <p className="text-gray-400 text-sm">Acceso para gestión del sistema</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 shadow-inner transition-colors hover:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 shadow-inner transition-colors hover:bg-white"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-8"
                >
                  Iniciar Sesión
                </motion.button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500 font-medium">
                  Contacta con el administrador si tienes problemas de acceso
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
