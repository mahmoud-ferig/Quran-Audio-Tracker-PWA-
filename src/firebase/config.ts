import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  query,
  where,
  Firestore 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import type { FirebaseConfigState } from '../types';

const STORAGE_KEY_FIREBASE_CONFIG = 'quran_tracker_firebase_config';

export function getSavedFirebaseConfig(): FirebaseConfigState {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (custom) {
      const parsed = JSON.parse(custom);
      return {
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || (parsed.projectId ? `${parsed.projectId}.firebaseapp.com` : ''),
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || (parsed.projectId ? `${parsed.projectId}.firebasestorage.app` : ''),
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId || ''
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved Firebase config from localStorage:', e);
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
}

export function saveFirebaseConfig(config: FirebaseConfigState) {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
  app = null;
  db = null;
  storage = null;
}

export function getCustomFirebaseConfigOnly(): FirebaseConfigState {
  try {
    const custom = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (custom) {
      const parsed = JSON.parse(custom);
      return {
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || (parsed.projectId ? `${parsed.projectId}.firebaseapp.com` : ''),
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || (parsed.projectId ? `${parsed.projectId}.firebasestorage.app` : ''),
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId || ''
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved Firebase config from localStorage:', e);
  }

  return {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };
}

export function hasCustomFirebaseConfig(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG));
}

export function clearFirebaseConfig() {
  localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
  app = null;
  db = null;
  storage = null;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

export function initializeFirebase(): { 
  app: FirebaseApp | null; 
  db: Firestore | null; 
  storage: FirebaseStorage | null; 
  isConfigured: boolean 
} {
  const config = getSavedFirebaseConfig();
  const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);

  if (!isConfigured) {
    return { app: null, db: null, storage: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    storage = getStorage(app);
    return { app, db, storage, isConfigured: true };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return { app: null, db: null, storage: null, isConfigured: false };
  }
}

export { doc, getDoc, setDoc, getDocs, collection, query, where, getStorage };
