export type Role = 'admin' | 'referee' | 'collaborator';

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
}

export interface Referee extends User {
  username: string;
  password?: string;
  phone: string;
  status: 'active' | 'inactive';
  photo_url?: string;
  category: string;
  preferences?: {
    nivel: 1 | 2 | 3;
    camposVetados: string[];
    equiposVetados: string[];
  };
  disponibilidad?: Record<string, string[]>; // Ejemplo: { "Lunes": ["20:30", "21:30"] }
}

export interface Team {
  id: string;
  name: string;
  delegate?: string;
  contact_phone: string;
  email?: string;
  total_sanctions: number;
  pending_amount: number;
}

export interface Sanction {
  id: string;
  team_id: string;
  amount: number;
  round: number;
  date: string;
  is_paid: boolean;
  reason: string;
  created_at: string;
}

export interface Match {
  id: string;
  match_round: number;
  match_date: string; // YYYY-MM-DD
  match_time: string; // HH:MM
  day_name?: string;
  field: string;
  team_a_id: string;
  team_b_id: string;
  team_a_name?: string;
  team_b_name?: string;
  competition: string;
  referee_id: string;
  status?: 'Programado' | 'Liquidado';
  period?: string; // YYYY-MM-DD_to_YYYY-MM-DD
  level: 1 | 2 | 3;
}

export interface MatchPayment {
  id: string;
  match_id: string;
  team_id: string;
  amount: number;
  is_paid: boolean;
  reason?: string;
  created_at: string;
}

export interface CashDelivery {
  id: string;
  referee_id: string;
  amount: number;
  date: string;
  created_at: string;
  period?: string; // Add period field to link to the specific week/jornada
}

export interface AppSettings {
  logo_url: string;
  season: string;
  backup_frequency?: 'none' | 'weekly' | 'monthly';
  last_backup_date?: string;
  autoAssignerConfig?: {
    weeklySlots: Record<string, Record<string, number>>;
    inactiveRefs: string[];
    mandatoryDays: Record<string, string[]>;
  };
}

export interface AccountingAccount {
  id: string;
  code: string;
  name: string;
  type: 'Ingreso' | 'Gasto';
  category: 'Fijo' | 'Variable';
}

export interface AccountingTransaction {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  description: string;
  relatedMatchId?: string;
  relatedTeamId?: string;
  isAutomated: boolean;
  type: 'Ingreso' | 'Gasto';
  created_at: string;
}

export interface VenueRentalCost {
  venue_name: string;
  hourly_rate: number;
}

export interface EconomicSettings {
  registration_fee: number;
  license_cost_type1: number; // PVP
  license_base_cost_type1: number; // Coste
  license_cost_type2: number; // PVP
  license_base_cost_type2: number; // Coste
  license_cost_type3: number; // PVP
  license_base_cost_type3: number; // Coste
  referee_payment_standard: number;
  referee_payment_special?: number;
  venue_costs?: VenueRentalCost[];
  headquarters_rent?: number;
  aemf_membership?: number;
  collaborator_monthly_cost?: number;
  mygol_monthly_cost?: number;
  budget_manual_values?: Record<string, number>;
  budget_estimations?: {
    playersPerTeam: number;
    type1Percent: number;
    type2Percent: number;
    type3Players: number;
    type3Months: number;
    seasonMonths: number;
  };
}

export interface TeamEconomicStatus {
  team_id: string;
  registration_paid: boolean;
  licenses_count_type1: number;
  licenses_count_type2: number;
  licenses_count_type3: number;
  total_paid: number;
  total_pending: number;
}
