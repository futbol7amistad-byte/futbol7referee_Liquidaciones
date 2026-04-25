import React, { useState } from 'react';
import { useSeason } from '../../contexts/SeasonContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Calendar, Plus, Archive, Play, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Seasons() {
  const { seasons, setCurrentSeason } = useSeason();
  const [name, setName] = useState('');

  const createSeason = async () => {
    if (!name) return;
    await addDoc(collection(db, 'seasons'), {
      name,
      status: 'open',
      created_at: new Date().toISOString()
    });
    setName('');
  };

  const closeSeason = async (id: string) => {
    await updateDoc(doc(db, 'seasons', id), { status: 'closed' });
  };

  const activateSeason = async (id: string) => {
    await updateDoc(doc(db, 'seasons', id), { status: 'active' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Gestión de Temporadas</h2>
      
      <div className="flex gap-4">
        <input 
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder="Nombre de la nueva temporada (ej. 2026-2027)"
          className="border rounded-xl px-4 py-2 w-full text-slate-900 placeholder:text-slate-400"
        />
        <button onClick={createSeason} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus className="w-4 h-4" /> Crear
        </button>
      </div>

      <div className="grid gap-4">
        {seasons.map(s => (
          <div key={s.id} className="border border-slate-200 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{s.name}</p>
              <p className="text-sm text-slate-600">
                {s.status === 'active' ? 'Temporada Activa' : s.status === 'open' ? 'Abierta' : s.status === 'closed' ? 'Cerrada' : s.status}
              </p>
            </div>
            <div className="flex gap-2">
              {s.status === 'open' && (
                <button onClick={() => activateSeason(s.id)} className="text-green-600"><Play className="w-5 h-5"/></button>
              )}
              {s.status === 'active' && (
                <button onClick={() => closeSeason(s.id)} className="text-red-600"><Archive className="w-5 h-5"/></button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t mt-6">
        <Link to="/admin/migration-tool" className="text-red-600 flex items-center gap-2 hover:underline">
          <Settings className="w-5 h-5" /> Abrir Herramienta de Migración de Emergencia
        </Link>
      </div>
    </div>
  );
}
