import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

console.log('Firebase configuration loaded:', firebaseConfig ? 'Yes' : 'No');
console.log('Firebase Project ID:', firebaseConfig.projectId);

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
console.log('Firestore initialized with Database ID:', firebaseConfig.firestoreDatabaseId);
