import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";
import fs from "fs";

// Old app config uses the same as new one except project id and api key might differ.
// Let's rely on REST API since we don't have the old api key.
// Wait, the new config currently has projectId: "futbol7amistad-prod" and apiKey: "AIzaSyC..."
// Can we just fetch with REST API?
// The problem with REST API was missing permissions. Let's see if we can do the same for the new database inside the SDK: it worked.
// Why did SDK work but REST failed? "Missing or insufficient permissions."
// Because REST API requests must include some headers or API Key if it's restricted by API key.
async function fetchWithRest(projectId, dbId, apiKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/seasons?key=${apiKey}`;
  console.log("Fetching", url);
  const response = await fetch(url);
  const json = await response.json();
  if (json.error) {
    console.error(`Error from ${projectId}/${dbId}:`, json.error.message);
  } else {
    console.log(`Success from ${projectId}/${dbId}. Found ${(json.documents || []).length} documents.`);
  }
}

const configPath = new URL("../firebase-applet-config.json", import.meta.url);
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Let's use the new apiKey to fetch from the new DB
fetchWithRest("futbol7amistad-prod", config.firestoreDatabaseId, config.apiKey)
  .then(() => fetchWithRest("gen-lang-client-0213778672", config.firestoreDatabaseId, config.apiKey)) // try the old DB with same apiKey (might fail if API key doesn't match)
  .catch(console.error);

