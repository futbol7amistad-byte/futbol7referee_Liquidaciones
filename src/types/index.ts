export type Role = 'admin' | 'referee';

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
}

export interface Team {
  id: string;
  name: string;
  contact_phone: string;
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
  competition: string;
  referee_id: string;
  status?: 'Programado' | 'Liquidado';
  period?: string; // YYYY-MM-DD_to_YYYY-MM-DD
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
