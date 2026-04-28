import fs from "fs";

async function readFromProject(projectId, dbId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/seasons`;
  console.log("Fetching", url);
  const response = await fetch(url);
  const json = await response.json();
  if (json.error) {
    console.error(`Error from ${projectId}/${dbId}:`, json.error.message);
  } else {
    const docs = json.documents || [];
    console.log(`Success from ${projectId}/${dbId}. Found ${docs.length} documents.`);
  }
}

async function run() {
  await readFromProject("gen-lang-client-0213778672", "(default)");
  await readFromProject("gen-lang-client-0213778672", "ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9");
  await readFromProject("futbol7amistad-prod", "(default)");
  await readFromProject("futbol7amistad-prod", "ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9");
}

run();
