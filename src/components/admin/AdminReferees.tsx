import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useData } from '../../store/DataContext';
import { Plus, Search, Edit2, Trash2, User, Upload, X, ChevronDown, MessageCircle, Zap, ShieldAlert } from 'lucide-react';
import { Referee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64 } from '../../utils/imageUtils';
import { getWhatsAppLink } from '../../utils/whatsapp';

export default function AdminReferees() {
  const { referees, addReferee, updateReferee, deleteReferee, teams } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);

  const filteredReferees = React.useMemo(() => {
    return referees
      .filter(r => {
        const name = r.name || '';
        const username = r.username || '';
        return (name.toLowerCase().includes(searchTerm.toLowerCase()) || 
               username.toLowerCase().includes(searchTerm.toLowerCase())) &&
               (selectedRefereeId === '' || r.id === selectedRefereeId);
      })
      .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));
  }, [referees, searchTerm, selectedRefereeId]);

  const handleOpenModal = (referee: Referee | null = null) => {
    setEditingReferee(referee);
    setShowModal(true);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 px-1">MANTENIMIENTO Y GESTIÓN</p>
          <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">Cuerpo Arbitral</h2>
          <p className="text-sm text-slate-500 font-bold mt-1">Directorio oficial y gestión de credenciales.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
        >
          <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform" />
          Añadir Árbitro
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-[2.5rem] shadow-app border border-slate-100 overflow-hidden">
        <div className="p-8 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="text"
                placeholder="Buscar por nombre o usuario..."
                className="w-full pl-14 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black text-slate-900 appearance-none focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                value={selectedRefereeId}
                onChange={(e) => setSelectedRefereeId(e.target.value)}
              >
                <option value="">TODOS LOS ÁRBITROS</option>
                {[...referees].sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())).map(ref => (
                  <option key={ref.id} value={ref.id}>{ref.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Perfil</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Información</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Credenciales</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Estado</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Horas</th>
                  <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Restricciones</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredReferees.map((referee) => (
                  <tr key={referee.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="relative inline-block">
                        {referee.photo_url ? (
                          <img 
                            src={referee.photo_url} 
                            alt={referee.name} 
                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-slate-100"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm ring-1 ring-slate-100 text-slate-400">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${referee.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{referee.name || 'SIN NOMBRE'}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{referee.phone || 'Sin teléfono'}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">User: {(referee.username || 'n/a').toLowerCase()}</div>
                        <div className="text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg inline-flex items-center w-fit shadow-sm">
                          {referee.password || '••••••'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <button 
                        onClick={() => updateReferee(referee.id, { status: referee.status === 'active' ? 'inactive' : 'active' })}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm transition-all ${
                          referee.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50/50' 
                            : 'bg-slate-100 text-slate-400 border-slate-200 shadow-slate-50'
                        }`}
                      >
                        {referee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-slate-900">{Object.values(referee.disponibilidad || {}).reduce((acc: number, h: any[]) => acc + h.length, 0)} / 8</span>
                            <span className="text-[10px] font-bold text-slate-400">L:{referee.disponibilidad?.Lunes?.length || 0} | M:{referee.disponibilidad?.Martes?.length || 0} | X:{referee.disponibilidad?.Miercoles?.length || 0} | J:{referee.disponibilidad?.Jueves?.length || 0}</span>
                        </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-center">
                      {(referee.preferences?.camposVetados?.length > 0 || referee.preferences?.equiposVetados?.length > 0) ? (
                        <div className="relative flex justify-center group/tooltip">
                          <button type="button" className="p-2 text-rose-500 bg-rose-50 rounded-full border border-rose-100 shadow-sm cursor-help">
                            <ShieldAlert className="w-5 h-5" />
                          </button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-64 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 text-left border border-slate-700/50">
                            <div className="mb-1 font-bold text-slate-300">Restricciones:</div>
                            {referee.preferences?.camposVetados?.length > 0 && (
                              <div className="mb-2">
                                <span className="font-bold text-rose-400 block mb-1">Campos Vetados:</span>
                                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-200">
                                  {referee.preferences.camposVetados.map((campo, i) => (
                                    <li key={`cv-${i}`}>{campo}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {referee.preferences?.equiposVetados?.length > 0 && (
                              <div>
                                <span className="font-bold text-rose-400 block mb-1">Equipos Vetados:</span>
                                <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-200 whitespace-normal">
                                  {referee.preferences.equiposVetados.map((teamId, i) => {
                                    const team = teams.find(t => t.id === teamId);
                                    return <li key={`tv-${i}`} className="break-words">{team ? team.name : teamId}</li>;
                                  })}
                                </ul>
                              </div>
                            )}
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700/50"></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-bold block text-center">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <a
                          href={getWhatsAppLink(referee.phone || '', `LiquidF7 Pro (Ver. 20.0)\n\n⚠️ INSTRUCCIONES IMPORTANTES:\n\nHola ${referee.name.toUpperCase()}, aquí tienes tus credenciales para acceder a la app:\n\n*Usuario*: ${referee.username}\n\n*Contraseña*: ${referee.password || 'Sin contraseña'}\n\n*Guía de acceso y uso:*\n\n1. Accede aquí: 🔗 Portal del Árbitro: https://futbol7referee-liquidaciones.vercel.app/\n\n2. Introduce tu *Usuario* y *Contraseña*.\n\n3. Una vez en el panel, comprueba o selecciona el *Periodo* correcto.\n\n4. Despliega el día de tus partidos y verifica que son los correctos.\n\n5. Selecciona "*PAGADO*" si abonan en campo, o *NO PAGADO* y, en este último caso, indica el motivo del impago (Transferencia, Olvido, Otros) por cada equipo.\n\n6. Pulsa "*Guardar y Finalizar*". El partido pasará de estado "*Pendiente*" a "*Liquidado*".\n\n7. *¿Error?* Si te equivocas, pulsa el botón "Editar", corrige los datos y vuelve a "Guardar y Finalizar".\n\n*Tip*: Recomendable añadir este enlace a la pantalla de inicio de tu móvil para acceder siempre directamente.`)}
                          target="whatsapp_admin"
                          rel="noopener noreferrer"
                          className={`w-10 h-10 items-center justify-center text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200 shadow-sm hover:shadow-md ${referee.status === 'inactive' ? 'hidden' : 'flex'}`}
                          title="Enviar credenciales y tutorial detallado por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <button 
                          onClick={() => handleOpenModal(referee)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteReferee(referee.id)}
                          className={`w-10 h-10 items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md ${referee.status === 'inactive' ? 'hidden' : 'flex'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <RefereeModal 
            referee={editingReferee} 
            onClose={() => setShowModal(false)} 
             onSave={(data) => {
              if (editingReferee) {
                updateReferee(editingReferee.id, data);
                toast.success('Árbitro actualizado');
              } else {
                addReferee({
                  ...data,
                  email: `${data.username?.toLowerCase()}@example.com`,
                  role: 'referee',
                  category: 'Primera'
                } as any);
                toast.success('Árbitro creado');
              }
              setShowModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RefereeModal({ referee, onClose, onSave }: { referee: Referee | null, onClose: () => void, onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: referee?.name || '',
    username: referee?.username || '',
    phone: referee?.phone || '',
    status: referee?.status || 'active',
    photo_url: referee?.photo_url || '',
    password: referee?.password || '',
    preferences: referee?.preferences || { nivel: 2, camposVetados: [], equiposVetados: [] },
    disponibilidad: referee?.disponibilidad || { Lunes: [], Martes: [], Miercoles: [], Jueves: [] }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { teams, matches } = useData(); // Necesitamos los equipos y partidos
  const campos = [...new Set(matches.map(m => m.field).filter(Boolean))].sort();

  const generatePassword = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const firstLetter = letters.charAt(Math.floor(Math.random() * letters.length));
    let rest = '';
    for (let i = 0; i < 5; i++) {
       rest += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    setFormData({ ...formData, password: firstLetter + rest });
  };

  const handleNameChange = (name: string) => {
    const username = name.toUpperCase();
    setFormData({ ...formData, name, username });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, photo_url: base64 });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-white"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          <div>
            <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">{referee ? 'Editar Árbitro' : 'Nuevo Árbitro'}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Perfil, restricciones y disponibilidad</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
            <div className="space-y-6">
              {/* Foto */ }
              <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    {formData.photo_url ? (
                        <img src={formData.photo_url} alt="Preview" className="w-28 h-28 rounded-[2.5rem] object-cover border-4 border-slate-50 shadow-app-lg ring-1 ring-slate-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-28 h-28 rounded-[2.5rem] bg-slate-50 flex items-center justify-center border-4 border-slate-50 shadow-app-inner ring-1 ring-slate-100">
                          <User className="w-12 h-12 text-slate-200" />
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </div>
              </div>

              {/* Nombre y Usuario */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900" value={formData.name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Usuario</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-900" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teléfono</label>
                    <input type="tel" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Contraseña de Seguridad</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 px-5 py-4 bg-slate-900 text-indigo-400 border border-slate-800 rounded-2xl text-sm font-mono font-black tracking-widest focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-app-inner"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="M12345"
                  />
                  <button 
                    type="button"
                    onClick={generatePassword}
                    className="w-14 h-14 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
                  >
                    <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
            </div>
            
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl">
              <h4 className="text-xs font-black text-indigo-900 uppercase">Restricciones y Disponibilidad</h4>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Nivel Técnico</label>
                <select className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs" value={formData.preferences.nivel} onChange={(e) => setFormData({...formData, preferences: {...formData.preferences, nivel: Number(e.target.value) as 1|2|3}})}>
                  <option value={1}>Nivel 1 (Alto)</option>
                  <option value={2}>Nivel 2 (Medio)</option>
                  <option value={3}>Nivel 3 (Bajo)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Campos Vetados</label>
                <div className="h-24 overflow-y-auto bg-white p-3 rounded-xl border border-slate-200 text-[10px]">
                  {campos.map(campo => (
                    <label key={campo} className="flex items-center gap-2 mb-1">
                      <input type="checkbox" checked={formData.preferences.camposVetados?.includes(campo)} onChange={(e) => {
                          const newer = e.target.checked 
                            ? [...(formData.preferences.camposVetados || []), campo] 
                            : (formData.preferences.camposVetados || []).filter(c => c !== campo);
                          setFormData({...formData, preferences: {...formData.preferences, camposVetados: newer}});
                        }}
                      />
                      {campo}
                    </label>
                  ))}
                  {campos.length === 0 && <div className="text-slate-400 italic">No hay campos registrados</div>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Equipos Vetados</label>
                <div className="h-24 overflow-y-auto bg-white p-3 rounded-xl border border-slate-200 text-[10px]">
                  {[...teams].sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                    <label key={t.id} className="flex items-center gap-2 mb-1">
                      <input type="checkbox" checked={formData.preferences.equiposVetados.includes(t.id)} onChange={(e) => {
                          const newer = e.target.checked ? [...formData.preferences.equiposVetados, t.id] : formData.preferences.equiposVetados.filter(id => id !== t.id);
                          setFormData({...formData, preferences: {...formData.preferences, equiposVetados: newer}});
                        }}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Disponibilidad */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">Disponibilidad (Lunes-Jueves)</label>
                    <button type="button" onClick={() => {
                        const nuevaDisp = { Lunes: ['20:30', '21:30'], Martes: ['20:30', '21:30'], Miercoles: ['20:30', '21:30'], Jueves: ['20:30', '21:30'] };
                        setFormData({...formData, disponibilidad: nuevaDisp});
                    }} className="text-[10px] text-indigo-600 font-bold hover:underline">Marcar todos</button>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[10px] space-y-2">
                  {['Lunes', 'Martes', 'Miercoles', 'Jueves'].map(dia => (
                    <div key={dia} className="flex gap-2 items-center">
                      <span className="w-16 font-bold">{dia}</span>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={formData.disponibilidad[dia]?.includes('20:30') || false} onChange={(e) => {
                         const time = '20:30'; 
                         const existingDays = formData.disponibilidad[dia] || [];
                         const newer = e.target.checked ? [...existingDays, time] : existingDays.filter(t => t !== time);
                         setFormData({...formData, disponibilidad: {...formData.disponibilidad, [dia]: newer}});
                      }}/> 20:30 </label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={formData.disponibilidad[dia]?.includes('21:30') || false} onChange={(e) => {
                         const time = '21:30'; 
                         const existingDays = formData.disponibilidad[dia] || [];
                         const newer = e.target.checked ? [...existingDays, time] : existingDays.filter(t => t !== time);
                         setFormData({...formData, disponibilidad: {...formData.disponibilidad, [dia]: newer}});
                      }}/> 21:30 </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex gap-4">
          <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
          <button type="button" onClick={() => onSave(formData)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">Guardar Perfil</button>
        </div>
      </motion.div>
    </div>
  );
}
