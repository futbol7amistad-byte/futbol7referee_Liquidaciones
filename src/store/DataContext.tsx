import React, { createContext, useContext, useState, useEffect } from 'react';
import { Match, MatchPayment, Referee, Team, CashDelivery, Sanction, AccountingAccount, AccountingTransaction, EconomicSettings, TeamEconomicStatus } from '../types';
import { useSeason } from '../contexts/SeasonContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, setDoc, writeBatch, getDocs, orderBy, where } from 'firebase/firestore';

interface DataContextType {
  matches: Match[];
  payments: MatchPayment[];
  referees: Referee[];
  teams: Team[];
  deliveries: CashDelivery[];
  sanctions: Sanction[];
  accounts: AccountingAccount[];
  transactions: AccountingTransaction[];
  economicSettings: EconomicSettings;
  teamEconomicStatus: TeamEconomicStatus[];
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
  addTeam: (data: Partial<Team>) => Promise<string>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  updateMatchStatus: (matchId: string, status: 'Programado' | 'Liquidado') => void;
  assignmentResults: any[];
  setAssignmentResults: (results: any[]) => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Economic functions
  addAccountingAccount: (account: Omit<AccountingAccount, 'id'>) => void;
  updateAccountingAccount: (id: string, data: Partial<AccountingAccount>) => void;
  deleteAccountingAccount: (id: string) => void;
  addTransaction: (transaction: Omit<AccountingTransaction, 'id' | 'created_at'>) => void;
  updateEconomicSettings: (settings: Partial<EconomicSettings>) => void;
  updateTeamEconomicStatus: (teamId: string, status: Partial<TeamEconomicStatus>) => void;
}

export interface AppSettings {
  logo_url: string;
  season: string;
  backup_frequency?: 'none' | 'weekly' | 'monthly';
  last_backup_date?: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentSeason } = useSeason();
  const [matches, setMatches] = useState<Match[]>([]);
  const [payments, setPayments] = useState<MatchPayment[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [deliveries, setDeliveries] = useState<CashDelivery[]>([]);
  const [sanctions, setSanctions] = useState<Sanction[]>([]);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [economicSettings, setEconomicSettings] = useState<EconomicSettings>({
    registration_fee: 0,
    license_cost_type1: 0,
    license_base_cost_type1: 0,
    license_cost_type2: 0,
    license_base_cost_type2: 0,
    license_cost_type3: 0,
    license_base_cost_type3: 0,
    referee_payment_standard: 0,
    venue_costs: [],
    headquarters_rent: 0,
    aemf_membership: 0,
    collaborator_monthly_cost: 0,
    mygol_monthly_cost: 0
  });
  const [teamEconomicStatus, setTeamEconomicStatus] = useState<TeamEconomicStatus[]>([]);
  const [assignmentResults, setAssignmentResults] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ logo_url: '', season: '2025-2026' });
  const [error, setError] = useState<string | null>(null);

  // Load settings once
  useEffect(() => {
    if (!currentSeason) return;

    const unsub = onSnapshot(doc(db, 'seasons', currentSeason.id, 'settings', 'app_settings'), 
      (doc) => {
        if (doc.exists()) {
          setSettings(doc.data() as AppSettings);
        }
      },
      (err) => {
        console.error("Error loading settings:", err);
      }
    );

    const unsubEconomicSettings = onSnapshot(doc(db, 'seasons', currentSeason.id, 'economic_settings', 'config'), 
      (doc) => {
        if (doc.exists()) {
          setEconomicSettings(doc.data() as EconomicSettings);
        }
      },
      (err) => console.error("Error loading economic settings:", err)
    );

    return () => {
      unsub();
      unsubEconomicSettings();
    };
  }, [currentSeason]);

  const [hiddenPeriods, setHiddenPeriods] = useState<string[]>([]);

  useEffect(() => {
    if (!currentSeason) return;

    const handleError = (err: any) => {
      console.error("Firestore error:", err);
      if (err.message.toLowerCase().includes('quota')) {
        setError("Límite de lecturas alcanzado (Quota exceeded). Algunos datos podrían no cargarse.");
      } else if (err.message.toLowerCase().includes('permission-denied')) {
        setError("Error de permisos: No tienes acceso a los datos de la temporada actual.");
      }
    };

    const seasonRef = doc(db, 'seasons', currentSeason.id);

    const unsubMatches = onSnapshot(collection(seasonRef, 'matches'), 
      (snapshot) => setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match))),
      handleError
    );
    const unsubPayments = onSnapshot(collection(seasonRef, 'payments'), 
      (snapshot) => setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MatchPayment))),
      handleError
    );
    const unsubReferees = onSnapshot(collection(seasonRef, 'referees'), 
      (snapshot) => setReferees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referee))),
      handleError
    );
    const unsubTeams = onSnapshot(collection(seasonRef, 'teams'), 
      (snapshot) => setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team))),
      handleError
    );
    const unsubDeliveries = onSnapshot(collection(seasonRef, 'deliveries'), 
      (snapshot) => setDeliveries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDelivery))),
      handleError
    );
    const unsubSanctions = onSnapshot(collection(seasonRef, 'sanctions'), 
      (snapshot) => setSanctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sanction))),
      handleError
    );
    const unsubAccounts = onSnapshot(collection(seasonRef, 'accounting_accounts'), 
      (snapshot) => setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingAccount))),
      handleError
    );
    const unsubTransactions = onSnapshot(query(collection(seasonRef, 'accounting_transactions'), orderBy('date', 'desc')), 
      (snapshot) => setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountingTransaction))),
      handleError
    );
    const unsubTeamEconomic = onSnapshot(collection(seasonRef, 'team_economic_status'), 
      (snapshot) => setTeamEconomicStatus(snapshot.docs.map(doc => ({ team_id: doc.id, ...doc.data() } as TeamEconomicStatus))),
      handleError
    );

    return () => {
      unsubMatches();
      unsubPayments();
      unsubReferees();
      unsubTeams();
      unsubDeliveries();
      unsubSanctions();
      unsubAccounts();
      unsubTransactions();
      unsubTeamEconomic();
    };
  }, [currentSeason]);

  const addPayment = async (payment: Omit<MatchPayment, 'id' | 'created_at'>) => {
    if (!currentSeason) return;
    const paymentId = `${payment.match_id}_${payment.team_id}`;
    await setDoc(doc(db, 'seasons', currentSeason.id, 'payments', paymentId), {
      ...payment,
      created_at: new Date().toISOString(),
    });
  };

  const addDelivery = async (delivery: Omit<CashDelivery, 'id' | 'created_at'>) => {
    if (!currentSeason) return;
    await addDoc(collection(db, 'seasons', currentSeason.id, 'deliveries'), {
      ...delivery,
      created_at: new Date().toISOString(),
    });
  };

  const addReferee = async (referee: Omit<Referee, 'id'>) => {
    if (!currentSeason) return;
    await addDoc(collection(db, 'seasons', currentSeason.id, 'referees'), referee);
  };

  const updateReferee = async (id: string, data: Partial<Referee>) => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'referees', id), data);
  };

  const deleteReferee = async (id: string) => {
    if (!currentSeason) return;
    await deleteDoc(doc(db, 'seasons', currentSeason.id, 'referees', id));
  };

  const addSanction = async (sanction: Omit<Sanction, 'id' | 'created_at' | 'is_paid'>) => {
    if (!currentSeason) return;
    await addDoc(collection(db, 'seasons', currentSeason.id, 'sanctions'), {
      ...sanction,
      is_paid: false,
      created_at: new Date().toISOString(),
    });
  };

  const markSanctionAsPaid = async (id: string) => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'sanctions', id), { is_paid: true });
  };


  const clearSanctions = () => {
    setSanctions([]);
    setTeams(prev => prev.map(t => ({ ...t, total_sanctions: 0, pending_amount: 0 })));
  };

  const importMatches = async (newMatches: any[], period: string, startDate: string, endDate: string) => {
    if (!currentSeason) return;
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
    const teamsSnapshot = await getDocs(collection(db, 'seasons', currentSeason.id, 'teams'));
    const currentTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    const refsSnapshot = await getDocs(collection(db, 'seasons', currentSeason.id, 'referees'));
    const currentRefs = refsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    const teamsToMap = [...currentTeams];
    const refsToMap = [...currentRefs];

    // 1 & 2. Identify and add teams and referees
    for (const m of newMatches) {
        const teamNames = [String(m.team_a_name || '').trim(), String(m.team_b_name || '').trim()].filter(Boolean);
        for (const name of teamNames) {
            if (!teamsToMap.some(t => t.name.toLowerCase() === name.toLowerCase())) {
                const docRef = doc(collection(db, 'seasons', currentSeason.id, 'teams'));
                batch.set(docRef, { name, contact_phone: '', total_sanctions: 0, pending_amount: 0 });
                teamsToMap.push({ id: docRef.id, name });
            }
        }

        const refName = String(m.referee_name || '').trim();
        if (refName && refName !== 'SIN ASIGNAR' && !refsToMap.some(r => r.name.toLowerCase() === refName.toLowerCase())) {
            const docRef = doc(collection(db, 'seasons', currentSeason.id, 'referees'));
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
        const refereeId = ''; // Forzar vacío para que el Auto-Asignador actúe

        batch.set(doc(collection(db, 'seasons', currentSeason.id, 'matches')), {
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
            period: period,
            level: Number(m.level) || 3
        });
    }

    await batch.commit();
    showPeriod(period);
  };


  const addTeam = async (data: Partial<Team>) => {
    if (!currentSeason) return '';
    const docRef = await addDoc(collection(db, 'seasons', currentSeason.id, 'teams'), {
      name: data.name || 'Nuevo Equipo',
      delegate: data.delegate || '',
      contact_phone: data.contact_phone || '',
      email: data.email || '',
      total_sanctions: 0,
      pending_amount: 0
    });
    return docRef.id;
  };

  const updateTeam = async (id: string, data: Partial<Team>) => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'teams', id), data);
  };

  const reassignReferee = async (matchId: string, refereeId: string) => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'matches', matchId), { referee_id: refereeId });
  };

  const clearMatchesInRange = async (startDate: string, endDate: string) => {
    if (!currentSeason) return;
    const matchesToDelete = matches.filter(m => {
        const matchDate = m.match_date;
        return matchDate >= startDate && matchDate <= endDate;
    });
    for (const match of matchesToDelete) {
        await deleteDoc(doc(db, 'seasons', currentSeason.id, 'matches', match.id));
    }
  };

  const deleteMatch = async (id: string) => {
    if (!currentSeason) return;
    await deleteDoc(doc(db, 'seasons', currentSeason.id, 'matches', id));
  };
  
  const clearAllMatches = async () => {
    if (!currentSeason) return;
    for (const match of matches) {
      await deleteDoc(doc(db, 'seasons', currentSeason.id, 'matches', match.id));
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

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!currentSeason) return;
    const settingsRef = doc(db, 'seasons', currentSeason.id, 'settings', 'app_settings');
    await setDoc(settingsRef, { ...settings, ...newSettings }, { merge: true });
  };

  const updateMatchStatus = async (matchId: string, status: 'Programado' | 'Liquidado') => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'matches', matchId), { status });
    
    // Auto-generate accounting entries if settled
    if (status === 'Liquidado') {
      const matchDoc = matches.find(m => m.id === matchId);
      if (!matchDoc) return;

      const refereeDoc = referees.find(r => r.id === matchDoc.referee_id);
      
      // 1. Referee Payment (Gasto)
      if (economicSettings.referee_payment_standard > 0) {
        const account = accounts.find(a => a.name.toLowerCase().includes('arbitraje') && a.type === 'Gasto');
        if (account) {
          await addTransaction({
            date: matchDoc.match_date,
            amount: economicSettings.referee_payment_standard,
            accountId: account.id,
            description: `Arbitraje: ${matchDoc.field} - ${refereeDoc?.name || 'Árbitro'} (J.${matchDoc.match_round})`,
            relatedMatchId: matchId,
            isAutomated: true,
            type: 'Gasto'
          });
        }
      }

      // 2. Venue Rental (Gasto)
      const venueRate = economicSettings.venue_costs?.find(v => v.venue_name === matchDoc.field)?.hourly_rate || 0;
      if (venueRate > 0) {
        const venueAccount = accounts.find(a => a.name.toLowerCase().includes('instalaciones') && a.type === 'Gasto');
        if (venueAccount) {
          await addTransaction({
            date: matchDoc.match_date,
            amount: venueRate,
            accountId: venueAccount.id,
            description: `Alquiler Campo: ${matchDoc.field} (J.${matchDoc.match_round})`,
            relatedMatchId: matchId,
            isAutomated: true,
            type: 'Gasto'
          });
        }
      }

      // 3. Match Income (Ingreso)
      const matchPayments = payments.filter(p => p.match_id === matchId && p.is_paid);
      const totalIncome = matchPayments.reduce((acc, p) => acc + p.amount, 0);
      if (totalIncome > 0) {
        const incomeAccount = accounts.find(a => a.name.toLowerCase().includes('partidos') && a.type === 'Ingreso');
        if (incomeAccount) {
          await addTransaction({
            date: matchDoc.match_date,
            amount: totalIncome,
            accountId: incomeAccount.id,
            description: `Ingresos Recaudados J.${matchDoc.match_round}: ${matchDoc.field}`,
            relatedMatchId: matchId,
            isAutomated: true,
            type: 'Ingreso'
          });
        }
      }
    }
  };

  const addAccountingAccount = async (account: Omit<AccountingAccount, 'id'>) => {
    if (!currentSeason) return;
    await addDoc(collection(db, 'seasons', currentSeason.id, 'accounting_accounts'), account);
  };

  const updateAccountingAccount = async (id: string, data: Partial<AccountingAccount>) => {
    if (!currentSeason) return;
    await updateDoc(doc(db, 'seasons', currentSeason.id, 'accounting_accounts', id), data);
  };

  const deleteAccountingAccount = async (id: string) => {
    if (!currentSeason) return;
    await deleteDoc(doc(db, 'seasons', currentSeason.id, 'accounting_accounts', id));
  };

  const addTransaction = async (transaction: Omit<AccountingTransaction, 'id' | 'created_at'>) => {
    if (!currentSeason) return;
    await addDoc(collection(db, 'seasons', currentSeason.id, 'accounting_transactions'), {
      ...transaction,
      created_at: new Date().toISOString()
    });
  };

  const updateEconomicSettings = async (newSettings: Partial<EconomicSettings>) => {
    if (!currentSeason) return;
    await setDoc(doc(db, 'seasons', currentSeason.id, 'economic_settings', 'config'), newSettings, { merge: true });
  };

  const updateTeamEconomicStatus = async (teamId: string, status: Partial<TeamEconomicStatus>) => {
    if (!currentSeason) return;
    await setDoc(doc(db, 'seasons', currentSeason.id, 'team_economic_status', teamId), status, { merge: true });
  };

  return (
    <DataContext.Provider value={{ 
      matches, payments, referees, teams, deliveries, sanctions,
      accounts, transactions, economicSettings, teamEconomicStatus,
      assignmentResults, setAssignmentResults,
      addPayment, addDelivery, addReferee, updateReferee, deleteReferee,
      addSanction, markSanctionAsPaid, clearSanctions,
      importMatches, reassignReferee, clearMatchesInRange, clearMatchesByPeriod, deleteMatch, clearAllMatches, addTeam, updateTeam,
      settings, updateSettings, updateMatchStatus,
      hiddenPeriods, hidePeriod, showPeriod,
      error, clearError: () => setError(null),
      addAccountingAccount, updateAccountingAccount, deleteAccountingAccount, addTransaction, updateEconomicSettings, updateTeamEconomicStatus
    }}>
      {error && (
        <div className="fixed top-4 right-4 z-[9999] max-w-sm">
          <div className="bg-red-600 text-white p-4 rounded-lg shadow-2xl flex items-start space-x-3 animate-bounce">
            <div className="flex-shrink-0 mt-0.5">⚠️</div>
            <div className="flex-grow">
              <p className="text-sm font-bold">Error de Base de Datos</p>
              <p className="text-xs opacity-90">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-xs bg-white/20 hover:bg-white/40 px-2 py-1 rounded transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
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
