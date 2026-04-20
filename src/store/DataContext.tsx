import React, { createContext, useContext, useState, useEffect } from 'react';
import { Match, MatchPayment, Referee, Team, CashDelivery, Sanction } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, setDoc, writeBatch, getDocs } from 'firebase/firestore';

interface DataContextType {
  matches: Match[];
  payments: MatchPayment[];
  referees: Referee[];
  teams: Team[];
  deliveries: CashDelivery[];
  sanctions: Sanction[];
  addPayment: (payment: Omit<MatchPayment, 'id' | 'created_at'>) => void;
  addDelivery: (delivery: Omit<CashDelivery, 'id' | 'created_at'>) => void;
  addReferee: (referee: Omit<Referee, 'id'>) => void;
  updateReferee: (id: string, data: Partial<Referee>) => void;
  deleteReferee: (id: string) => void;
  addSanction: (sanction: Omit<Sanction, 'id' | 'created_at' | 'is_paid'>) => void;
  markSanctionAsPaid: (id: string) => void;
  clearSanctions: () => void;
  importMatches: (matches: any[], period: string, startDate: string, endDate: string) => void;
  reassignReferee: (matchId: string, refereeId: string) => void;
  clearMatchesInRange: (startDate: string, endDate: string) => void;
  clearMatchesByPeriod: (period: string) => void;
  deleteMatch: (id: string) => void;
  clearAllMatches: () => void;
  hiddenPeriods: string[];
  hidePeriod: (period: string) => void;
  showPeriod: (period: string) => void;
  addTeam: (name: string) => string;
  updateMatchStatus: (matchId: string, status: 'Programado' | 'Liquidado') => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

export interface AppSettings {
  logo_url: string;
  theme: 'light' | 'dark';
  season: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [payments, setPayments] = useState<MatchPayment[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [deliveries, setDeliveries] = useState<CashDelivery[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ logo_url: '', theme: 'light', season: '2025-2026' });
  const [hiddenPeriods, setHiddenPeriods] = useState<string[]>([]);

  useEffect(() => {
    const unsubMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchPayment)));
    });
    const unsubReferees = onSnapshot(collection(db, 'referees'), (snapshot) => {
      setReferees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referee)));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
    });
    const unsubDeliveries = onSnapshot(collection(db, 'deliveries'), (snapshot) => {
      setDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDelivery)));
    });
    const unsubSanctions = onSnapshot(collection(db, 'sanctions'), (snapshot) => {
      setSanctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sanction)));
    });

    return () => {
      unsubMatches();
      unsubPayments();
      unsubReferees();
      unsubTeams();
      unsubDeliveries();
      unsubSanctions();
    };
  }, []);

  const addPayment = async (payment: Omit<MatchPayment, 'id' | 'created_at'>) => {
    await addDoc(collection(db, 'payments'), {
      ...payment,
      created_at: new Date().toISOString(),
    });
  };

  const addDelivery = async (delivery: Omit<CashDelivery, 'id' | 'created_at'>) => {
    await addDoc(collection(db, 'deliveries'), {
      ...delivery,
      created_at: new Date().toISOString(),
    });
  };

  const addReferee = async (referee: Omit<Referee, 'id'>) => {
    await addDoc(collection(db, 'referees'), referee);
  };

  const updateReferee = async (id: string, data: Partial<Referee>) => {
    await updateDoc(doc(db, 'referees', id), data);
  };

  const deleteReferee = async (id: string) => {
    await deleteDoc(doc(db, 'referees', id));
  };

  const addSanction = async (sanction: Omit<Sanction, 'id' | 'created_at' | 'is_paid'>) => {
    await addDoc(collection(db, 'sanctions'), {
      ...sanction,
      is_paid: false,
      created_at: new Date().toISOString(),
    });
  };

  const markSanctionAsPaid = async (id: string) => {
    await updateDoc(doc(db, 'sanctions', id), { is_paid: true });
  };


  const clearSanctions = () => {
    setSanctions([]);
    setTeams(prev => prev.map(t => ({ ...t, total_sanctions: 0, pending_amount: 0 })));
  };

  const importMatches = async (newMatches: any[], period: string, startDate: string, endDate: string) => {
    const generateInitialPassword = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const firstLetter = letters.charAt(Math.floor(Math.random() * letters.length));
      let rest = '';
      for (let i = 0; i < 5; i++) {
        rest += numbers.charAt(Math.floor(Math.random() * numbers.length));
      }
      return firstLetter + rest;
    };

    const batch = writeBatch(db);
    
    // Fetch snapshot of current teams and referees for accurate duplicate checking
    const teamsSnapshot = await getDocs(collection(db, 'teams'));
    const currentTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    const refsSnapshot = await getDocs(collection(db, 'referees'));
    const currentRefs = refsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    const teamsToMap = [...currentTeams];
    const refsToMap = [...currentRefs];

    // 1 & 2. Identify and add teams and referees
    for (const m of newMatches) {
        const teamNames = [String(m.team_a_name || '').trim(), String(m.team_b_name || '').trim()].filter(Boolean);
        for (const name of teamNames) {
            if (!teamsToMap.some(t => t.name.toLowerCase() === name.toLowerCase())) {
                const docRef = doc(collection(db, 'teams'));
                batch.set(docRef, { name, contact_phone: '', total_sanctions: 0, pending_amount: 0 });
                teamsToMap.push({ id: docRef.id, name });
            }
        }

        const refName = String(m.referee_name || '').trim();
        if (refName && refName !== 'SIN ASIGNAR' && !refsToMap.some(r => r.name.toLowerCase() === refName.toLowerCase())) {
            const docRef = doc(collection(db, 'referees'));
            batch.set(docRef, {
                name: refName,
                username: refName.toUpperCase().replace(/\s/g, ''),
                password: generateInitialPassword(),
                email: `${refName.toLowerCase().replace(/\s/g, '')}@example.com`,
                role: 'referee',
                category: 'Primera',
                status: 'active',
                phone: ''
            });
            refsToMap.push({ id: docRef.id, name: refName });
        }
    }

    // 3. Add matches
    for (const m of newMatches.filter(m => String(m.team_a_name || '').trim() && String(m.team_b_name || '').trim())) {
        const teamAId = teamsToMap.find(t => t.name.toLowerCase() === String(m.team_a_name || '').trim().toLowerCase())?.id || 'unknown';
        const teamBId = teamsToMap.find(t => t.name.toLowerCase() === String(m.team_b_name || '').trim().toLowerCase())?.id || 'unknown';
        const refereeId = refsToMap.find(r => r.name.toLowerCase() === String(m.referee_name || '').trim().toLowerCase())?.id || 'r-unassigned';

        batch.set(doc(collection(db, 'matches')), {
            match_round: m.match_round,
            match_date: m.match_date,
            match_time: m.match_time,
            day_name: m.day_name,
            field: m.field,
            competition: m.competition,
            team_a_id: teamAId,
            team_b_id: teamBId,
            referee_id: refereeId,
            status: 'Programado',
            period: period
        });
    }

    await batch.commit();
    showPeriod(period);
  };


  const addTeam = async (name: string) => {
    const docRef = await addDoc(collection(db, 'teams'), {
      name,
      contact_phone: '',
      total_sanctions: 0,
      pending_amount: 0
    });
    return docRef.id;
  };

  const reassignReferee = async (matchId: string, refereeId: string) => {
    await updateDoc(doc(db, 'matches', matchId), { referee_id: refereeId });
  };

  const clearMatchesInRange = async (startDate: string, endDate: string) => {
    const matchesToDelete = matches.filter(m => {
        const matchDate = m.match_date;
        return matchDate >= startDate && matchDate <= endDate;
    });
    for (const match of matchesToDelete) {
        await deleteDoc(doc(db, 'matches', match.id));
    }
  };

  const deleteMatch = async (id: string) => {
    await deleteDoc(doc(db, 'matches', id));
  };
  
  const clearAllMatches = async () => {
    for (const match of matches) {
      await deleteDoc(doc(db, 'matches', match.id));
    }
  };

  const hidePeriod = (period: string) => {
    setHiddenPeriods(prev => [...prev, period]);
  };
  const showPeriod = (period: string) => {
    setHiddenPeriods(prev => prev.filter(p => p !== period));
  };

  const clearMatchesByPeriod = (period: string) => {
    hidePeriod(period);
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateMatchStatus = async (matchId: string, status: 'Programado' | 'Liquidado') => {
    await updateDoc(doc(db, 'matches', matchId), { status });
  };

  return (
    <DataContext.Provider value={{ 
      matches, payments, referees, teams, deliveries, sanctions,
      addPayment, addDelivery, addReferee, updateReferee, deleteReferee,
      addSanction, markSanctionAsPaid, clearSanctions,
      importMatches, reassignReferee, clearMatchesInRange, clearMatchesByPeriod, deleteMatch, clearAllMatches, addTeam,
      settings, updateSettings, updateMatchStatus,
      hiddenPeriods, hidePeriod, showPeriod
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
