import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const dbDefault = getFirestore(app);
const dbStudio = getFirestore(app, config.firestoreDatabaseId);

async function checkDb(db, name) {
  try {
    const seasons = await getDocs(collection(db, 'seasons'));
    console.log(`DB: ${name} -> Seasons count: ${seasons.docs.length}`);
  } catch (e) {
    console.error(`DB: ${name} -> Error: ${e.message}`);
  }
}

async function run() {
  await checkDb(dbDefault, 'default');
  await checkDb(dbStudio, config.firestoreDatabaseId);
  process.exit(0);
}
run();
