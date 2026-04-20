import React, { createContext, useContext, useState, useEffect } from 'react';
import { Match, MatchPayment, Referee, Team, CashDelivery, Sanction } from '../types';
import { mockMatches, mockPayments, mockReferees, mockTeams, mockDeliveries, mockSanctions } from './mockData';

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
  const [matches, setMatches] = useState<Match[]>(() => {
    const saved = localStorage.getItem('app_matches');
    return saved ? JSON.parse(saved) : mockMatches;
  });
  const [payments, setPayments] = useState<MatchPayment[]>(() => {
    const saved = localStorage.getItem('app_payments');
    return saved ? JSON.parse(saved) : mockPayments;
  });
  const [referees, setReferees] = useState<Referee[]>(() => {
    const saved = localStorage.getItem('app_referees');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? parsed : mockReferees;
  });
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('app_teams');
    return saved ? JSON.parse(saved) : mockTeams;
  });
  const [deliveries, setDeliveries] = useState<CashDelivery[]>(() => {
    const saved = localStorage.getItem('app_deliveries');
    return saved ? JSON.parse(saved) : mockDeliveries;
  });
  const [sanctions, setSanctions] = useState<Sanction[]>(() => {
    const saved = localStorage.getItem('app_sanctions');
    return saved ? JSON.parse(saved) : mockSanctions;
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : {
      logo_url: '',
      theme: 'light',
      season: '2025-2026'
    };
  });
  const [hiddenPeriods, setHiddenPeriods] = useState<string[]>(() => {
    const saved = localStorage.getItem('app_hidden_periods');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('app_matches', JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem('app_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('app_referees', JSON.stringify(referees));
  }, [referees]);

  useEffect(() => {
    localStorage.setItem('app_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem('app_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('app_sanctions', JSON.stringify(sanctions));
  }, [sanctions]);

  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const addPayment = (payment: Omit<MatchPayment, 'id' | 'created_at'>) => {
    const newPayment: MatchPayment = {
      ...payment,
      id: `p${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setPayments(prev => [...prev.filter(p => !(p.match_id === payment.match_id && p.team_id === payment.team_id)), newPayment]);
  };

  const addDelivery = (delivery: Omit<CashDelivery, 'id' | 'created_at'>) => {
    const newDelivery: CashDelivery = {
      ...delivery,
      id: `d${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setDeliveries(prev => [...prev, newDelivery]);
  };

  const addReferee = (referee: Omit<Referee, 'id'>) => {
    const newReferee: Referee = {
      ...referee,
      id: `r${Date.now()}`,
    };
    setReferees(prev => [...prev, newReferee]);
  };

  const updateReferee = (id: string, data: Partial<Referee>) => {
    setReferees(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const deleteReferee = (id: string) => {
    setReferees(prev => prev.filter(r => r.id !== id));
  };

  const addSanction = (sanction: Omit<Sanction, 'id' | 'created_at' | 'is_paid'>) => {
    const newSanction: Sanction = {
      ...sanction,
      id: `s${Date.now()}`,
      is_paid: false,
      created_at: new Date().toISOString(),
    };
    setSanctions(prev => [...prev, newSanction]);
    
    // Update team stats
    setTeams(prev => prev.map(t => {
      if (t.id === sanction.team_id) {
        return {
          ...t,
          total_sanctions: t.total_sanctions + 1,
          pending_amount: t.pending_amount + sanction.amount
        };
      }
      return t;
    }));
  };

  const markSanctionAsPaid = (id: string) => {
    const sanction = sanctions.find(s => s.id === id);
    if (!sanction) return;

    setSanctions(prev => prev.map(s => s.id === id ? { ...s, is_paid: true } : s));
    
    // Update team stats
    setTeams(prev => prev.map(t => {
      if (t.id === sanction.team_id) {
        return {
          ...t,
          pending_amount: Math.max(0, t.pending_amount - sanction.amount)
        };
      }
      return t;
    }));
  };

  const clearSanctions = () => {
    setSanctions([]);
    setTeams(prev => prev.map(t => ({ ...t, total_sanctions: 0, pending_amount: 0 })));
  };

  const importMatches = (newMatches: any[], period: string, startDate: string, endDate: string) => {
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

    // 1. Calculate next state for teams
    const nextTeams = [...teams];
    newMatches.forEach(m => {
      const nameA = String(m.team_a_name || '').trim();
      const nameB = String(m.team_b_name || '').trim();

      if (nameA && !nextTeams.some(t => t.name.toLowerCase() === nameA.toLowerCase())) {
        nextTeams.push({
          id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: nameA,
          contact_phone: '',
          total_sanctions: 0,
          pending_amount: 0
        });
      }
      if (nameB && !nextTeams.some(t => t.name.toLowerCase() === nameB.toLowerCase())) {
        nextTeams.push({
          id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: nameB,
          contact_phone: '',
          total_sanctions: 0,
          pending_amount: 0
        });
      }
    });

    // 2. Calculate next state for referees
    const nextReferees = [...referees];
    newMatches.forEach(m => {
      const refName = String(m.referee_name || '').trim();
      if (refName && refName !== 'SIN ASIGNAR') {
        if (!nextReferees.some(r => r.name.toLowerCase() === refName.toLowerCase())) {
          const refereeId = `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          nextReferees.push({
            id: refereeId,
            name: refName,
            username: refName.toUpperCase().replace(/\s/g, ''),
            password: generateInitialPassword(),
            email: `${refName.toLowerCase().replace(/\s/g, '')}@example.com`,
            role: 'referee',
            category: 'Primera',
            status: 'active',
            phone: ''
          });
        }
      }
    });

    // 3. Calculate next state for matches
    const formattedMatches: Match[] = newMatches
      .filter(m => String(m.team_a_name || '').trim() && String(m.team_b_name || '').trim())
      .map((m, index) => {
        const nameA = String(m.team_a_name || '').trim();
        const nameB = String(m.team_b_name || '').trim();
        const refName = String(m.referee_name || '').trim();

      const teamAId = nextTeams.find(t => t.name.toLowerCase() === nameA.toLowerCase())?.id || 'unknown';
      const teamBId = nextTeams.find(t => t.name.toLowerCase() === nameB.toLowerCase())?.id || 'unknown';
      const refereeId = nextReferees.find(r => r.name.toLowerCase() === refName.toLowerCase())?.id || 'r-unassigned';

      return {
        id: `m-${Date.now()}-${index}`,
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
      };
    });

    // 4. Update all states
    setTeams(nextTeams.sort((a, b) => a.name.localeCompare(b.name)));
    setReferees(nextReferees.sort((a, b) => a.name.localeCompare(b.name)));
    
    // Ensure the new period is NOT hidden
    showPeriod(period);

    setMatches(prev => {
      // Clear matches in range
      const clearedMatches = prev.filter(m => {
        const matchDate = m.match_date;
        return matchDate < startDate || matchDate > endDate;
      });
      // Append new matches
      const nextMatches = [...clearedMatches, ...formattedMatches].sort((a, b) => {
        const dateCompare = a.match_date.localeCompare(b.match_date);
        if (dateCompare !== 0) return dateCompare;
        const fieldCompare = a.field.localeCompare(b.field);
        if (fieldCompare !== 0) return fieldCompare;
        return a.match_time.localeCompare(b.match_time);
      });
      localStorage.setItem('app_matches', JSON.stringify(nextMatches));
      return nextMatches;
    });
  };


  const addTeam = (name: string) => {
    const id = `t-${Date.now()}`;
    setTeams(prev => [...prev, {
      id,
      name,
      contact_phone: '',
      total_sanctions: 0,
      pending_amount: 0
    }].sort((a, b) => a.name.localeCompare(b.name)));
    return id;
  };

  const reassignReferee = (matchId: string, refereeId: string) => {
    console.log('reassignReferee called in DataContext');
    console.log('matchId:', matchId);
    console.log('refereeId:', refereeId);
    setMatches(prev => {
      const nextMatches = prev.map(m => m.id === matchId ? { ...m, referee_id: refereeId } : m);
      console.log('Matches updated:', nextMatches.find(m => m.id === matchId));
      return nextMatches;
    });
  };

  const clearMatchesInRange = (startDate: string, endDate: string) => {
    setMatches(prev => prev.filter(m => {
      const matchDate = m.match_date;
      return matchDate < startDate || matchDate > endDate;
    }));
  };

  const deleteMatch = (id: string) => {
    setMatches(prev => prev.filter(m => m.id !== id));
  };

  const hidePeriod = (period: string) => {
    setHiddenPeriods(prev => {
      const next = [...prev, period];
      localStorage.setItem('app_hidden_periods', JSON.stringify(next));
      return next;
    });
  };
  const showPeriod = (period: string) => {
    setHiddenPeriods(prev => {
      const next = prev.filter(p => p !== period);
      localStorage.setItem('app_hidden_periods', JSON.stringify(next));
      return next;
    });
  };

  const clearMatchesByPeriod = (period: string) => {
    hidePeriod(period);
  };

  const clearAllMatches = () => {
    setMatches([]);
    localStorage.setItem('app_matches', '[]');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateMatchStatus = (matchId: string, status: 'Programado' | 'Liquidado') => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status } : m));
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
