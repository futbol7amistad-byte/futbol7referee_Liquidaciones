const projectId = "futbol7amistad-prod";
const dbId = "ai-studio-6d8d35df-97f2-4658-83e4-0bba4bb8b0d9";

fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/seasons`)
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);
