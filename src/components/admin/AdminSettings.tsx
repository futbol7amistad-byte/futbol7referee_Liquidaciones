import React, { useRef, useState } from 'react';
import { useData } from '../../store/DataContext';
import { Settings, Sun, Moon, Upload, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64 } from '../../utils/imageUtils';

export default function AdminSettings() {
  const { settings, updateSettings } = useData();
  const [season, setSeason] = useState(settings.season);
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSeason = () => {
    updateSettings({ season });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      updateSettings({ logo_url: base64 });
    }
  };

  const handleRemoveLogo = () => {
    updateSettings({ logo_url: '' });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-3 text-gray-600" />
            Configuración
          </h2>
          <p className="text-gray-500 font-medium">Personaliza el logo y temporada del campeonato</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Recargar
        </button>
      </div>

      {/* Season Settings */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Temporada</h3>
        <div className="flex gap-4">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-sm bg-white shadow-sm text-gray-900"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            placeholder="Ej: 2025-2026"
          />
          <button
            onClick={handleSaveSeason}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Logo Settings */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Logo del Campeonato</h3>
          <AnimatePresence>
            {settings.logo_url && (
              <motion.span 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-emerald-500"
              >
                Logo guardado
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-[2rem] border border-gray-100 mb-6">
          {settings.logo_url ? (
            <div className="space-y-6 text-center">
              <img 
                src={settings.logo_url} 
                alt="Logo Campeonato" 
                className="w-48 h-48 object-contain mx-auto drop-shadow-xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={handleRemoveLogo}
                className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-700 transition-all flex items-center mx-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Eliminar Logo
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                <Upload className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No hay ningún logo cargado</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleLogoUpload}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700 transition-all flex items-center justify-center"
        >
          <Upload className="w-5 h-5 mr-2" />
          Cambiar Logo
        </button>
        <p className="mt-4 text-[10px] text-gray-400 font-medium">
          Formatos: JPG, PNG, GIF. Tamaño máximo: 2MB
        </p>
      </div>

      {/* Save Notification */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center font-bold z-50"
          >
            <CheckCircle2 className="w-5 h-5 mr-3" />
            Configuración guardada
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
