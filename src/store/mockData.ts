import { Match, MatchPayment, Referee, Team, CashDelivery, Sanction } from '../types';

export const mockTeams: Team[] = [];

export const mockSanctions: Sanction[] = [];

export const mockReferees: Referee[] = [
  { id: 'r1', name: 'Árbitro 1', username: 'ARBITRO1', phone: '123456789', status: 'active', role: 'referee', category: 'Primera', email: 'arbitro1@example.com' },
  { id: 'r2', name: 'Árbitro 2', username: 'ARBITRO2', phone: '987654321', status: 'active', role: 'referee', category: 'Primera', email: 'arbitro2@example.com' },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export const mockMatches: Match[] = [];

export const mockPayments: MatchPayment[] = [];

export const mockDeliveries: CashDelivery[] = [];
