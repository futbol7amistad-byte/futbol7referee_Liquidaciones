async function check() {
  const projectId = 'gen-lang-client-0213778672';
  
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/seasons`);
    const json = await res.json();
    console.log("DEFAULT DB:", JSON.stringify(json).substring(0, 500));
  } catch(err) {
    console.error("error default", err);
  }

  try {
    const res2 = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9/documents/seasons`);
    const json2 = await res2.json();
    console.log("NEW DB:", JSON.stringify(json2).substring(0, 500));
  } catch(err) {
    console.error("error new", err);
  }
}
check();
