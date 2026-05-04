import React, { useState } from 'react';
import { useData } from '../../store/DataContext';
import { Plus, Edit2, Trash2, MapPin, X, Check, Clock } from 'lucide-react';
import { Venue } from '../../types';
import { toast } from 'sonner';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves'];

export default function AdminVenues() {
  const { venues, addVenue, updateVenue, deleteVenue, economicSettings } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  
  const [formData, setFormData] = useState<Partial<Venue>>({
    name: '',
    match_price: economicSettings.registration_fee || 0,
    linked_venue_id: '',
    is_active: true,
    available_slots: []
  });

  const openForm = (venue?: Venue) => {
    if (venue) {
      setEditingVenue(venue);
      setFormData({
        name: venue.name,
        match_price: venue.match_price,
        linked_venue_id: venue.linked_venue_id || '',
        is_active: venue.is_active !== false,
        available_slots: [...venue.available_slots]
      });
    } else {
      setEditingVenue(null);
      setFormData({
        name: '',
        match_price: 30, // Default price
        linked_venue_id: '',
        is_active: true,
        available_slots: DAYS.map(day => ({ day, hours: [] }))
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    // Filter out days with empty slots to keep DB clean
    const cleanedSlots = (formData.available_slots || []).filter(slot => slot.hours.length > 0);

    const payload = {
      ...formData,
      available_slots: cleanedSlots
    };

    try {
      if (editingVenue) {
        await updateVenue(editingVenue.id, payload);
        toast.success('Instalación actualizada');
      } else {
        await addVenue(payload as Venue);
        toast.success('Instalación creada');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la instalación');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVenue(id);
      toast.success('Instalación eliminada');
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar la instalación');
    }
  };

  const toggleHour = (day: string, hour: string) => {
    setFormData(prev => {
      const slots = [...(prev.available_slots || [])];
      const slotIndex = slots.findIndex(s => s.day === day);
      
      let daySlot;
      if (slotIndex === -1) {
        daySlot = { day, hours: [] };
        slots.push(daySlot);
      } else {
        daySlot = { ...slots[slotIndex] };
        slots[slotIndex] = daySlot;
      }
      
      if (daySlot.hours.includes(hour)) {
        daySlot.hours = daySlot.hours.filter((h: string) => h !== hour);
      } else {
        daySlot.hours = [...daySlot.hours, hour].sort();
      }
      
      return { ...prev, available_slots: slots };
    });
  };

  // Generate specific intervals (e.g., 20:30 and 21:30 for typical F7)
  const hourOptions = ['20:30', '21:30'];

  const handleMigrateFromSettings = async () => {
    if (!economicSettings.venue_costs || economicSettings.venue_costs.length === 0) {
       toast.error('No hay instalaciones configuradas en los parámetros económicos antiguos.');
       return;
    }
    
    try {
      let count = 0;
      for (const vc of economicSettings.venue_costs) {
        if (!venues.find(v => v.name === vc.venue_name)) {
           await addVenue({
              name: vc.venue_name,
              match_price: 30, // Default match price, assuming hourly_rate was different
              available_slots: DAYS.map(day => ({ day, hours: ['20:30', '21:30'] })) // Assume defaults
           });
           count++;
        }
      }
      if (count > 0) {
        toast.success(`Migración completada. ${count} instalaciones creadas.`);
      } else {
        toast.success('Migración completada. No había instalaciones nuevas que añadir.');
      }
    } catch (err) {
      console.error("Migration error:", err);
      toast.error('Error durante la migración. Consulta la consola.');
    }
  };

  const sortedVenues = [...venues].sort((a,b) => a.name.localeCompare(b.name));
  
  const totalHours = sortedVenues.reduce((acc, venue) => {
    if (venue.is_active === false) return acc;
    return acc + (venue.available_slots || []).reduce((sum, slot) => sum + slot.hours.length, 0);
  }, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center">
            <MapPin className="w-6 h-6 mr-3 text-purple-600" />
            Instalaciones
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona los campos, tarifas de partido y disponibilidad de horarios</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold border border-purple-100 uppercase tracking-widest">
             <Clock className="w-3 h-3 mr-1.5" /> Total Horas Activas: {totalHours}
          </div>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-purple-700 transition flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Instalación
        </button>
      </div>

      {venues.length === 0 && economicSettings.venue_costs && economicSettings.venue_costs.length > 0 && (
         <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
            <div className="text-amber-800 text-sm">
               <span className="font-bold">Migración disponible:</span> Se han detectado instalaciones antiguas en la configuración económica.
            </div>
            <button onClick={handleMigrateFromSettings} className="px-4 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg shadow hover:bg-amber-700">
               Migrar Instalaciones
            </button>
         </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedVenues.map(venue => {
          const venueHours = (venue.available_slots || []).reduce((sum, slot) => sum + slot.hours.length, 0);
          const isActive = venue.is_active !== false;

          return (
          <div key={venue.id} className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all ${!isActive ? 'opacity-80' : ''}`}>
            <div className={`p-5 border-b flex justify-between items-start ${isActive ? 'bg-slate-50 border-slate-100' : 'bg-red-50/80 border-red-100'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                  <span className={`text-[10px] font-black tracking-widest uppercase ${isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isActive ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">{venue.name}</h3>
                <p className="text-emerald-600 font-bold mt-1">{venue.match_price}€ <span className="text-slate-500 text-xs font-normal">/ partido</span></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openForm(venue)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(venue.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className={`p-5 flex-1 text-sm text-slate-600 ${!isActive ? 'bg-red-50/40' : ''}`}>
              <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                <h4 className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Clock className="w-3 h-3 mr-1" /> Disponibilidad
                </h4>
                <div className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                   {venueHours} horas
                </div>
              </div>
              {venue.available_slots?.length > 0 ? (
                <div className="space-y-3">
                  {venue.available_slots.map(slot => (
                    <div key={slot.day} className="flex">
                      <span className="w-20 font-medium text-slate-800">{slot.day}</span>
                      <div className="flex-1 flex flex-wrap gap-1">
                        {slot.hours.map(hour => (
                          <span key={hour} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                            {hour}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No hay horarios configurados</p>
              )}
            </div>
          </div>
          );
        })}
        {venues.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
            No hay instalaciones registradas
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingVenue ? 'Editar Instalación' : 'Nueva Instalación'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de la instalación</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                    placeholder="Ej. Tablero I"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tarifa por partido (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.match_price}
                    onChange={e => setFormData({ ...formData, match_price: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <input 
                    type="checkbox" 
                    id="is_active_toggle"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                 />
                 <label htmlFor="is_active_toggle" className="text-sm font-bold text-slate-700">Activo (Disponible para generar calendarios)</label>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Instalación Vinculada (Múltiples Campos)</label>
                <select 
                  value={formData.linked_venue_id || ''}
                  onChange={e => setFormData({ ...formData, linked_venue_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 px-4 py-2"
                >
                  <option value="">Ninguna</option>
                  {venues.filter(v => v.id !== editingVenue?.id).map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Sirve para establecer que dos campos forman parte de la misma instalación física (ej. Tablero I y Tablero II), a efectos del compañero vinculado en árbitros.</p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  Horarios Disponibles
                </h4>
                <div className="space-y-4">
                  {DAYS.map(day => {
                    const daySlot = formData.available_slots?.find(s => s.day === day) || { hours: [] };
                    return (
                      <div key={day} className="border border-slate-200 p-4 rounded-xl">
                        <div className="font-bold text-slate-800 mb-2">{day}</div>
                        <div className="flex flex-wrap gap-2">
                          {hourOptions.map(hour => {
                            const isSelected = daySlot.hours.includes(hour);
                            return (
                              <button
                                type="button"
                                key={hour}
                                onClick={() => toggleHour(day, hour)}
                                className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors border ${
                                  isSelected 
                                    ? 'bg-purple-100 border-purple-200 text-purple-700' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                                {hour}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </form>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
