import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import fs from "fs";

const configPath = new URL("../firebase-applet-config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const docRef = await addDoc(collection(db, "test_collection"), { hello: "world" });
    console.log("Written doc:", docRef.id);
    const snap = await getDocs(collection(db, "test_collection"));
    console.log("Count:", snap.size);
  } catch (err) {
    console.error("SDK Error:", err.message);
  }
}

test();
