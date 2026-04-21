import React from 'react';
import { useData } from '../../store/DataContext';
import { AlertCircle } from 'lucide-react';
import { formatDateDisplay } from '../../utils/formatters';

export default function AdminUnpaid() {
  const { payments, teams, matches, referees } = useData();

  const unpaidPayments = payments.filter(p => !p.is_paid && p.reason !== 'Metálico');

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Seguimiento de Impagos</h2>

      {unpaidPayments.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
          No hay impagos registrados.
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {unpaidPayments.map(payment => {
              const team = teams.find(t => t.id === payment.team_id);
              const match = matches.find(m => m.id === payment.match_id);
              const referee = referees.find(r => r.id === match?.referee_id);

              return (
                <li key={payment.id} className="p-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{team?.name}</p>
                        <p className="text-sm text-gray-500">
                          Jornada {match?.match_round} • {formatDateDisplay(match?.match_date || '')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{payment.amount}€</p>
                      <p className="text-xs text-gray-500">Árbitro: {referee?.name}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                    <span className="font-medium">Motivo:</span> {payment.reason || 'No especificado'}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
