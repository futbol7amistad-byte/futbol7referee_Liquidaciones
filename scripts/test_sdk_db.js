import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configPath = new URL("../firebase-applet-config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

console.log("Using Database ID:", config.firestoreDatabaseId);
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const snap = await getDocs(collection(db, "seasons"));
    console.log("Seasons count:", snap.size);
  } catch (err) {
    console.error("SDK Error:", err.message);
  }
}

test();
