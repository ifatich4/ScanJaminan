// src/firebase/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArFaa7POQlqPe_HMkLvOOxtRPGlMTRNck",
  authDomain: "scanjaminan-18bb9.firebaseapp.com",
  projectId: "scanjaminan-18bb9",
  storageBucket: "scanjaminan-18bb9.firebasestorage.app",
  messagingSenderId: "522198786752",
  appId: "1:522198786752:web:2906734a9cba9de4154325",
  measurementId: "G-0B2WH2V84V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
