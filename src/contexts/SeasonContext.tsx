
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

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'seasons'), orderBy('name', 'desc')), (snapshot) => {
      const seasonList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Season));
      setSeasons(seasonList);
      
      // Auto-select active season if none selected
      if (!currentSeason) {
        const active = seasonList.find(s => s.status === 'active');
        if (active) setCurrentSeason(active);
        else if (seasonList.length > 0) setCurrentSeason(seasonList[0]);
      }
    });
    return unsub;
  }, [currentSeason]);

  return (
    <SeasonContext.Provider value={{ currentSeason, seasons, setCurrentSeason }}>
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => useContext(SeasonContext);
