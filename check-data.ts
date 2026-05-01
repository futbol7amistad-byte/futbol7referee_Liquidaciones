import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const dbStudio = getFirestore(app, config.firestoreDatabaseId);

async function checkDb() {
  try {
    const seasons = await getDocs(collection(dbStudio, 'seasons'));
    console.log(`Seasons count: ${seasons.docs.length}`);
    if (seasons.docs.length > 0) {
      const sId = seasons.docs[0].id;
      const ref = collection(dbStudio, 'seasons', sId, 'referees');
      const matches = collection(dbStudio, 'seasons', sId, 'matches');
      const rc = await getDocs(ref);
      const mc = await getDocs(matches);
      console.log(`Referees in season ${sId}: ${rc.docs.length}`);
      console.log(`Matches in season ${sId}: ${mc.docs.length}`);
      if (mc.docs.length > 0) {
        console.log(`First match date: ${mc.docs[0].data().match_date}`);
        console.log(`First match:`, mc.docs[0].data());
      }
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }
}
checkDb().then(() => process.exit(0));
