import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import fs from "fs";

// New App
const configPath = new URL("../firebase-applet-config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const newApp = initializeApp(config, "newApp");
const newDb = getFirestore(newApp, config.firestoreDatabaseId);

// Old App
const oldApp = initializeApp({
  projectId: "gen-lang-client-0213778672",
  apiKey: "AIzaSyFakeKey",
  appId: "1:12345:web:abcde"
}, "oldApp");
const oldDb = getFirestore(oldApp, "ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9");

async function copyCollection(oldCollectionRef, newCollectionRef) {
  const snap = await getDocs(oldCollectionRef);
  console.log(`Found ${snap.size} docs in ${oldCollectionRef.path}`);
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    await setDoc(doc(newCollectionRef, docSnap.id), data);
    
    // Subcollections for seasons
    if (oldCollectionRef.path === "seasons") {
      const seasonId = docSnap.id;
      const subcols = [
        "matches", "teams", "referees", "sanctions", 
        "accounting_accounts", "accounting_transactions",
        "payments", "deliveries"
      ];
      for (const sub of subcols) {
        await copyCollection(
          collection(oldDb, `seasons/${seasonId}/${sub}`),
          collection(newDb, `seasons/${seasonId}/${sub}`)
        );
      }
      // Also copy specific sub-documents
      const economicConfig = await getDoc(doc(oldDb, `seasons/${seasonId}/economic_settings/config`));
      if (economicConfig.exists()) {
        await setDoc(doc(newDb, `seasons/${seasonId}/economic_settings/config`), economicConfig.data());
      }
      const appSettings = await getDoc(doc(oldDb, `seasons/${seasonId}/settings/app_settings`));
      if (appSettings.exists()) {
        await setDoc(doc(newDb, `seasons/${seasonId}/settings/app_settings`), appSettings.data());
      }
      
      // team_economic_status
      const teams = await getDocs(collection(oldDb, `seasons/${seasonId}/teams`));
      for (const team of teams.docs) {
        const statusDoc = await getDoc(doc(oldDb, `seasons/${seasonId}/team_economic_status/${team.id}`));
        if (statusDoc.exists()) {
          await setDoc(doc(newDb, `seasons/${seasonId}/team_economic_status/${team.id}`), statusDoc.data());
        }
      }
    }
  }
}

async function migrate() {
  console.log("Starting migration...");
  try {
    await copyCollection(collection(oldDb, "seasons"), collection(newDb, "seasons"));
    console.log("Migration complete!");
  } catch(e) {
    console.error("Migration failed:", e);
  }
}

migrate();
