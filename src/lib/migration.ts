import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export async function migrateData(seasonId: string) {
  const collectionsToMigrate = [
    'matches', 'payments', 'referees', 'teams', 'deliveries', 
    'sanctions', 'accounting_accounts', 'accounting_transactions', 'team_economic_status'
  ];

  for (const colName of collectionsToMigrate) {
    const oldColRef = collection(db, colName);
    const snapshot = await getDocs(oldColRef);
    
    for (const document of snapshot.docs) {
      const data = document.data();
      const newRef = doc(db, 'seasons', seasonId, colName, document.id);
      await setDoc(newRef, { ...data, seasonId });
    }
  }
}
