import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import { useData } from '../../store/DataContext';
import { Plus, Search, Edit2, Trash2, User, Upload, Sparkles, X, ChevronDown } from 'lucide-react';
import { Referee } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64 } from '../../utils/imageUtils';

export default function AdminReferees() {
  const { referees, addReferee, updateReferee, deleteReferee } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);

  const filteredReferees = referees.filter(r => 
    (r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.username.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedRefereeId === '' || r.id === selectedRefereeId)
  );

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
                {referees.map(ref => (
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
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{referee.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">{referee.phone || 'Sin teléfono'}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">User: {referee.username.toLowerCase()}</div>
                        <div className="text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-lg inline-flex items-center w-fit shadow-sm">
                          {referee.password || '••••••'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 inline-flex text-[10px] font-black uppercase tracking-widest rounded-xl border shadow-sm ${
                        referee.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50/50' 
                          : 'bg-slate-100 text-slate-400 border-slate-200 shadow-slate-50'
                      }`}>
                        {referee.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(referee)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => deleteReferee(referee.id)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 shadow-sm hover:shadow-md"
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
    password: referee?.password || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white"
      >
        <div className="p-8 border-b border-slate-50 flex justify-between items-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
          <div>
            <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight">{referee ? 'Editar Árbitro' : 'Nuevo Árbitro'}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración de perfil y acceso</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Photo Section */}
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
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Foto de perfil (JPG/PNG)</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Roberto García"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Usuario de Acceso</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-900 uppercase tracking-tight focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Teléfono</label>
                  <input
                    type="tel"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="123 456 789"
                  />
               </div>
            </div>

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
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </button>
              </div>
            </div>

            <div className="pt-2">
               <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={formData.status === 'active'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })}
                    />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                  </div>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Estado de la Cuenta: {formData.status === 'active' ? 'ACTIVA' : 'INACTIVA'}</span>
               </label>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 hover:border-slate-300 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(formData)}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            Guardar Perfil
          </button>
        </div>
      </motion.div>
    </div>
  );
}
