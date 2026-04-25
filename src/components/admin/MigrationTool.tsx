import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { migrateData } from '../../lib/migration';

export default function MigrationTool() {
  const [migrating, setMigrating] = useState(false);

  const runMigration = async () => {
    setMigrating(true);
    // 1. Create season
    const seasonRef = await addDoc(collection(db, 'seasons'), {
      name: '2025-2026',
      status: 'active'
    });
    
    // 2. Migrate
    await migrateData(seasonRef.id);
    setMigrating(false);
    alert('Migración completada');
  };

  return (
    <button onClick={runMigration} disabled={migrating} className="p-4 bg-red-600 text-white rounded">
      {migrating ? 'Migrando...' : 'EJECUTAR MIGRACIÓN URGENTE'}
    </button>
  );
}
