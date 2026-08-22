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
import type { FirebaseConfigState } from '../types';

const STORAGE_KEY_FIREBASE_CONFIG = 'quran_tracker_firebase_config';

export function getSavedFirebaseConfig(): FirebaseConfigState {
  const envConfig: FirebaseConfigState = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };

  try {
    const custom = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
    if (custom) {
      const parsed = JSON.parse(custom);
      return {
        apiKey: parsed.apiKey || envConfig.apiKey,
        authDomain: parsed.authDomain || envConfig.authDomain,
        projectId: parsed.projectId || envConfig.projectId,
        storageBucket: parsed.storageBucket || envConfig.storageBucket,
        messagingSenderId: parsed.messagingSenderId || envConfig.messagingSenderId,
        appId: parsed.appId || envConfig.appId
      };
    }
  } catch (e) {
    console.warn('Failed to parse saved Firebase config from localStorage:', e);
  }

  return envConfig;
}

export function saveFirebaseConfig(config: FirebaseConfigState) {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function initializeFirebase(): { app: FirebaseApp | null; db: Firestore | null; isConfigured: boolean } {
  const config = getSavedFirebaseConfig();
  const isConfigured = Boolean(config.apiKey && config.projectId && config.appId);

  if (!isConfigured) {
    return { app: null, db: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    return { app, db, isConfigured: true };
  } catch (error) {
    console.error('Firebase initialization error:', error);
    return { app: null, db: null, isConfigured: false };
  }
}

export { doc, getDoc, setDoc, getDocs, collection, query, where };
