
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Season {
  id: string;
  name: string;
  status: 'open' | 'active' | 'closed';
  start_date?: string;
  end_date?: string;
}

const SeasonContext = createContext<{
  currentSeason: Season | null;
  seasons: Season[];
  setCurrentSeason: (season: Season | null) => void;
}>({
  currentSeason: null,
  seasons: [],
  setCurrentSeason: () => {},
});

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen to seasons collection only once
  useEffect(() => {
    console.log("Subscribing to seasons collection...");
    const unsub = onSnapshot(
      collection(db, 'seasons'), 
      (snapshot) => {
        const seasonList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Season));
        console.log("Seasons loaded:", seasonList.length);
        
        // Sort manually to avoid index issues if any
        seasonList.sort((a, b) => b.name.localeCompare(a.name));
        
        setSeasons(seasonList);
        setLoading(false);
      },
      (err) => {
        console.error("Season loading error:", err);
        setLoading(false);
        if (err.message.includes('quota') || err.message.includes('resource-exhausted')) {
          setError("Límite de Firebase alcanzado (Cuota).");
        } else {
          setError("Error cargando temporadas: " + err.message);
        }
      }
    );
    return unsub;
  }, []);

  // 2. Manage current season selection
  useEffect(() => {
    if (seasons.length > 0 && !currentSeason) {
      const active = seasons.find(s => s.status === 'active');
      if (active) {
        console.log("Auto-selecting active season:", active.name);
        setCurrentSeason(active);
      } else {
        console.log("Auto-selecting first season:", seasons[0].name);
        setCurrentSeason(seasons[0]);
      }
    }
  }, [seasons, currentSeason]);

  return (
    <SeasonContext.Provider value={{ currentSeason, seasons, setCurrentSeason }}>
      {error && (
        <div className="fixed bottom-4 left-4 z-[9999] bg-red-600 text-white p-4 rounded-2xl text-xs font-bold shadow-2xl animate-bounce flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-black uppercase tracking-widest">Error de Conexión</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}
      {loading && seasons.length === 0 && !error && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-black text-indigo-900 uppercase tracking-widest">Cargando Sistema...</p>
          </div>
        </div>
      )}
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => useContext(SeasonContext);
