import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const oldApp = initializeApp(firebaseConfig, 'oldApp');
const newApp = initializeApp(firebaseConfig, 'newApp');

const oldDb = getFirestore(oldApp, '(default)');
const newDb = getFirestore(newApp, firebaseConfig.firestoreDatabaseId);

async function test() {
  console.log("Trying to read from (default) database...");
  try {
    const defaultSnap = await getDocs(collection(oldDb, 'seasons'));
    console.log(`Found ${defaultSnap.docs.length} seasons in (default) db`);
  } catch(e) {
    console.error("Error reading from (default):", e.message);
  }

  console.log("Trying to read from new database...");
  try {
    const newSnap = await getDocs(collection(newDb, 'seasons'));
    console.log(`Found ${newSnap.docs.length} seasons in new db`);
  } catch(e) {
    console.error("Error reading from new db:", e.message);
  }
}
test();
