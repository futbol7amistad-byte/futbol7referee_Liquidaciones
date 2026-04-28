import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const fakeApp = initializeApp({
  projectId: "gen-lang-client-0213778672",
  apiKey: "AIzaSyFakeKey",
  appId: "1:12345:web:abcde"
}, "oldApp");

const db = getFirestore(fakeApp, "ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9");

async function test() {
  try {
    const snap = await getDocs(collection(db, "seasons"));
    console.log("Seasons count:", snap.size);
    snap.docs.forEach(d => console.log(d.id, d.data()));
  } catch(e) {
    console.error("SDK Error:", e.message);
  }
}
test();
