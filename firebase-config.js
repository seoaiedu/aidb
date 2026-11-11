// AIDB (aidb-b4972) Firebase 프로젝트 설정
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const firebaseConfig = {
  projectId: "aidb-b4972",
  appId: "1:377268412125:web:a20f3e044ee8808f55c534",
  storageBucket: "aidb-b4972.firebasestorage.app",
  apiKey: "AIzaSyAdOCvxOdbDYgVJA_lkChL33fZWLuP57bM",
  authDomain: "aidb-b4972.firebaseapp.com",
  messagingSenderId: "377268412125",
  measurementId: "G-DR2QSNQ9T4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
};

