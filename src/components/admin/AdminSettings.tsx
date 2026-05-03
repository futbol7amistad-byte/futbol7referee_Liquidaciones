import React, { useRef, useState, useEffect } from 'react';
import { useData } from '../../store/DataContext';
import { useSeason } from '../../contexts/SeasonContext';
import { db } from '../../lib/firebase';
import { doc, writeBatch, collection, setDoc } from 'firebase/firestore';
import { Settings, Sun, Moon, Upload, Trash2, CheckCircle2, RefreshCw, HardDriveDownload, CalendarClock, UploadCloud, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fileToBase64 } from '../../utils/imageUtils';

export default function AdminSettings() {
  const data = useData();
  const { currentSeason } = useSeason();
  const { settings, updateSettings } = data;
  const [season, setSeason] = useState(settings.season);
  const [backupFreq, setBackupFreq] = useState(settings.backup_frequency || 'none');
  const [showSaved, setShowSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefRestore = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreLog, setRestoreLog] = useState('');

  useEffect(() => {
    setSeason(settings.season);
    setBackupFreq(settings.backup_frequency || 'none');
  }, [settings]);

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSeason) return;

    if (!window.confirm("ATENCIÓN: Esto SOBREESCRIBIRÁ todos los datos actuales de esta temporada con los del archivo de copia de seguridad. Asegúrate de que sea la temporada correcta. ¿Deseas continuar?")) {
      if (fileInputRefRestore.current) fileInputRefRestore.current.value = '';
      return;
    }

    setRestoring(true);
    setRestoreLog('Leyendo archivo de copia de seguridad...');
    
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !backup.timestamp) {
        throw new Error("El archivo no tiene el formato de copia de seguridad válido de nuestro sistema.");
      }

      setRestoreLog('Restaurando datos...');
      
      const collectionsMap: Record<string, any[]> = {
        'matches': backup.data.matches || [],
        'payments': backup.data.payments || [],
        'referees': backup.data.referees || [],
        'teams': backup.data.teams || [],
        'deliveries': backup.data.deliveries || [],
        'sanctions': backup.data.sanctions || [],
        'referee_advances': backup.data.referee_advances || backup.data.refereeAdvances || [],
        'accounting_accounts': backup.data.accounts || [],
        'accounting_transactions': backup.data.transactions || [],
        'team_economic_status': backup.data.teamEconomicStatus || []
      };

      let count = 0;
      for (const [colName, items] of Object.entries(collectionsMap)) {
        setRestoreLog(`Restaurando ${colName} (${items.length} items)...`);
        for (const item of items) {
           const id = item.id || item.team_id; 
           if(id) {
             const dataToSave = { ...item };
             delete dataToSave.id;
             await setDoc(doc(db, 'seasons', currentSeason.id, colName, id), dataToSave);
             count++;
           }
        }
      }

      if (backup.data.settings) {
         setRestoreLog('Restaurando configuración general...');
         await setDoc(doc(db, 'seasons', currentSeason.id, 'settings', 'app_settings'), backup.data.settings);
      }
      if (backup.data.economicSettings) {
         setRestoreLog('Restaurando configuración económica...');
         await setDoc(doc(db, 'seasons', currentSeason.id, 'economic_settings', 'config'), backup.data.economicSettings);
      }

      setRestoreLog(`¡Éxito! ${count} registros restaurados. Recargando...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error(err);
      setRestoreLog(`Error: ${err.message}`);
      setRestoring(false);
    }
  };

  const handleSaveSeason = () => {
    updateSettings({ season });
    triggerSave();
  };

  const handleSaveBackupConfig = (freq: 'none'|'weekly'|'monthly') => {
    setBackupFreq(freq);
    updateSettings({ backup_frequency: freq });
    triggerSave();
  };

  const triggerSave = () => {
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

  const handleDownloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      season: settings.season,
      data: {
        matches: data.matches,
        payments: data.payments,
        referees: data.referees,
        teams: data.teams,
        deliveries: data.deliveries,
        sanctions: data.sanctions,
        accounts: data.accounts,
        transactions: data.transactions,
        economicSettings: data.economicSettings,
        teamEconomicStatus: data.teamEconomicStatus,
        settings: data.settings
      }
    };
    
    // Create Blob
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `futbol7_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    updateSettings({ last_backup_date: new Date().toISOString() });
    triggerSave();
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
          <p className="text-gray-500 font-medium">Opciones generales, diseño de sistema y respaldos</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Recargar
        </button>
      </div>

      {/* Backup and Data Security */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-3 bg-emerald-50 rounded-xl">
             <HardDriveDownload className="w-5 h-5 text-emerald-600" />
           </div>
           <div>
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Copias de Seguridad (Backup)</h3>
             <p className="text-xs text-gray-500 font-medium">Exporta todos los datos del sistema para archivarlos o prevenir pérdidas accidentales.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 italic">
              Se exportarán todas las configuraciones, categorías, partidos, asignaciones, árbitros y datos económicos de la temporada actual.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadBackup}
                disabled={restoring}
                className="flex-1 flex justify-center items-center px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                <HardDriveDownload className="w-5 h-5 mr-2" />
                Guardar Copia
              </button>
              
              <button
                onClick={() => fileInputRefRestore.current?.click()}
                disabled={restoring}
                className="flex-1 flex justify-center items-center px-4 py-3 bg-red-600 text-white rounded-xl font-bold shadow-md shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-5 h-5 mr-2" />
                Restaurar
              </button>
              <input
                ref={fileInputRefRestore}
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleRestoreBackup}
              />
            </div>
            
            <AnimatePresence>
              {restoring && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-mono text-red-700">
                  <div className="flex items-center mb-1">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <strong>No cierres la página...</strong>
                  </div>
                  {restoreLog}
                </motion.div>
              )}
            </AnimatePresence>

            {settings.last_backup_date && !restoring && (
               <p className="text-xs font-bold text-emerald-700 text-center">
                 Última copia realizada: {new Date(settings.last_backup_date).toLocaleString()}
               </p>
            )}
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="w-4 h-4 text-slate-500" />
                <h4 className="text-sm font-black text-slate-800">Periodicidad de Aviso de Copia</h4>
             </div>
             <p className="text-xs text-slate-500 mb-4">
               Habilita un recordatorio global en el panel superior para que no olvides realizar tu copia con cierta periodicidad.
             </p>
             <div className="space-y-2">
               <label className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                  <input type="radio" name="b_freq" checked={backupFreq === 'none'} onChange={() => handleSaveBackupConfig('none')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Sin avisos (Manual)</span>
               </label>
               <label className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                  <input type="radio" name="b_freq" checked={backupFreq === 'weekly'} onChange={() => handleSaveBackupConfig('weekly')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Aviso Semanal</span>
               </label>
               <label className="flex items-center gap-3 bg-white p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                  <input type="radio" name="b_freq" checked={backupFreq === 'monthly'} onChange={() => handleSaveBackupConfig('monthly')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Aviso Mensual</span>
               </label>
             </div>
          </div>
        </div>
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
