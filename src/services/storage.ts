import { initializeFirebase, doc, getDoc, setDoc, getDocs, collection, query, where } from '../firebase/config';
import type { ListeningProgress, LastSession, UserSettings } from '../types';

const STORAGE_KEY_USER_ID = 'quran_tracker_user_id';
const STORAGE_KEY_USER_EMAIL = 'quran_tracker_user_email';
const STORAGE_KEY_USER_SETTINGS = 'quran_tracker_user_settings';
const STORAGE_KEY_LOCAL_PROGRESS = 'quran_tracker_local_progress';
const STORAGE_KEY_LOCAL_LAST_SESSION = 'quran_tracker_local_last_session';
const STORAGE_KEY_LOCAL_FAVORITES = 'quran_tracker_local_favorites';
const STORAGE_KEY_AUTOPLAY = 'quran_tracker_autoplay';

/**
 * Get User Email if linked
 */
export function getUserEmail(): string | null {
  const email = localStorage.getItem(STORAGE_KEY_USER_EMAIL);
  return email ? email.trim().toLowerCase() : null;
}

/**
 * Link User Email and set as primary identity
 */
export function setUserEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  localStorage.setItem(STORAGE_KEY_USER_EMAIL, normalized);
  localStorage.setItem(STORAGE_KEY_USER_ID, normalized);
  return normalized;
}

/**
 * Remove User Email and revert to local guest ID
 */
export function removeUserEmail(): string {
  localStorage.removeItem(STORAGE_KEY_USER_EMAIL);
  const guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
  localStorage.setItem(STORAGE_KEY_USER_ID, guestId);
  return guestId;
}

/**
 * Get or generate a persistent unique User ID or Email for syncing
 */
export function getOrCreateUserId(): string {
  const email = getUserEmail();
  if (email) return email;

  let userId = localStorage.getItem(STORAGE_KEY_USER_ID);
  if (!userId) {
    userId = 'guest_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem(STORAGE_KEY_USER_ID, userId);
  }
  return userId;
}

export function setCustomUserId(newId: string): void {
  if (newId.trim()) {
    const trimmed = newId.trim();
    if (trimmed.includes('@')) {
      setUserEmail(trimmed);
    } else {
      localStorage.setItem(STORAGE_KEY_USER_ID, trimmed);
    }
  }
}

/**
 * Local Storage Helper for instant cache and offline use
 */
function getLocalProgressMap(): Record<string, ListeningProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading local progress map:', e);
    return {};
  }
}

function saveLocalProgressMap(map: Record<string, ListeningProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving local progress map:', e);
  }
}

/**
 * Timeout promise wrapper to prevent hanging when Firestore database is not yet created or offline
 */
function withTimeout<T>(promise: Promise<T>, ms: number = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore operation timed out')), ms))
  ]);
}

/**
 * Migrate local progress, favorites, and settings from old ID to new Email ID
 */
export async function migrateUserData(fromUserId: string, toEmail: string): Promise<void> {
  const normalizedEmail = toEmail.trim().toLowerCase();
  if (!fromUserId || fromUserId === normalizedEmail) return;

  const localMap = getLocalProgressMap();
  const favorites = getLocalFavorites();
  const lastSession = await getLastSession(fromUserId);

  // Sync all to the new email ID if Firestore is ready
  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const promises: Promise<any>[] = [];

      // Migrate Progress records
      for (const trackId in localMap) {
        const prog = localMap[trackId];
        const docKey = `${normalizedEmail}_${trackId}`;
        const docRef = doc(db, 'listening_progress', docKey);
        promises.push(
          withTimeout(setDoc(docRef, {
            userId: normalizedEmail,
            trackId: prog.trackId,
            surahNumber: prog.surahNumber,
            reciterId: prog.reciterId,
            currentTime: prog.currentTime,
            duration: prog.duration,
            percentage: prog.percentage,
            updatedAt: prog.updatedAt
          }, { merge: true }), 1500).catch((e) => console.warn('Firestore item sync skipped:', e))
        );
      }

      // Migrate Favorites
      if (favorites.length > 0) {
        const favDoc = doc(db, 'user_favorites', normalizedEmail);
        promises.push(
          withTimeout(setDoc(favDoc, {
            userId: normalizedEmail,
            surahNumbers: favorites,
            updatedAt: new Date().toISOString()
          }, { merge: true }), 1500).catch((e) => console.warn('Firestore favorites sync skipped:', e))
        );
      }

      // Migrate Last Session
      if (lastSession) {
        const sessDoc = doc(db, 'listening_progress', `${normalizedEmail}_last_session`);
        promises.push(
          withTimeout(setDoc(sessDoc, {
            userId: normalizedEmail,
            ...lastSession
          }, { merge: true }), 1500).catch((e) => console.warn('Firestore session sync skipped:', e))
        );
      }

      if (promises.length > 0) {
        await withTimeout(Promise.all(promises), 2500).catch(() => {});
      }
    } catch (e) {
      console.warn('Migration to email completed locally (Firestore unavailable):', e);
    }
  }
}

/**
 * Save Track Listening Progress to LocalStorage and Firestore
 */
export async function saveProgress(
  userId: string,
  progress: ListeningProgress
): Promise<void> {
  // 1. Instant local write
  const localMap = getLocalProgressMap();
  localMap[progress.trackId] = progress;
  saveLocalProgressMap(localMap);

  // 2. Cloud Firestore Sync
  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docKey = `${userId}_${progress.trackId}`;
      const docRef = doc(db, 'listening_progress', docKey);
      await withTimeout(setDoc(docRef, {
        userId,
        trackId: progress.trackId,
        surahNumber: progress.surahNumber,
        reciterId: progress.reciterId,
        currentTime: progress.currentTime,
        duration: progress.duration,
        percentage: progress.percentage,
        updatedAt: progress.updatedAt
      }, { merge: true }), 2000);
    } catch (err) {
      console.warn('Firestore progress write failed, fallback to local only:', err);
    }
  }
}

/**
 * Fetch Saved Progress for a Specific Track
 */
export async function getTrackProgress(
  userId: string,
  trackId: string
): Promise<ListeningProgress | null> {
  // 1. Check local cache first for instant response
  const localMap = getLocalProgressMap();
  const cached = localMap[trackId] || null;

  // 2. Check Firestore if configured
  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docKey = `${userId}_${trackId}`;
      const docRef = doc(db, 'listening_progress', docKey);
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap && snap.exists()) {
        const data = snap.data() as ListeningProgress;
        // Merge with local if newer
        if (!cached || new Date(data.updatedAt) > new Date(cached.updatedAt)) {
          localMap[trackId] = data;
          saveLocalProgressMap(localMap);
          return data;
        }
      }
    } catch (err) {
      console.warn('Firestore progress read failed, using local cache:', err);
    }
  }

  return cached;
}

/**
 * Fetch all progress records for user (using scoped query for privacy & efficiency)
 */
export async function getAllProgress(
  userId: string
): Promise<Record<string, ListeningProgress>> {
  const localMap = getLocalProgressMap();

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const colRef = collection(db, 'listening_progress');
      const q = query(colRef, where('userId', '==', userId));
      const snap = await withTimeout(getDocs(q), 2000);
      if (snap) {
        snap.forEach((d) => {
          const data = d.data() as ListeningProgress;
          if (!localMap[data.trackId] || new Date(data.updatedAt) > new Date(localMap[data.trackId].updatedAt)) {
            localMap[data.trackId] = data;
          }
        });
        saveLocalProgressMap(localMap);
      }
    } catch (err) {
      console.warn('Firestore fetch all progress failed, returning local cache:', err);
    }
  }

  return localMap;
}

/**
 * Save Last Active Session (to jump straight back)
 */
export async function saveLastSession(
  userId: string,
  session: LastSession
): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_LAST_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving local last session:', e);
  }

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docKey = `${userId}_last_session`;
      const docRef = doc(db, 'listening_progress', docKey);
      await withTimeout(setDoc(docRef, {
        userId,
        ...session
      }, { merge: true }), 2000);
    } catch (err) {
      console.warn('Firestore last session write failed:', err);
    }
  }
}

/**
 * Get Last Active Session
 */
export async function getLastSession(
  userId: string
): Promise<LastSession | null> {
  let localSession: LastSession | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_LAST_SESSION);
    if (raw) localSession = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local last session:', e);
  }

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docKey = `${userId}_last_session`;
      const docRef = doc(db, 'listening_progress', docKey);
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap && snap.exists()) {
        const remoteSession = snap.data() as LastSession;
        if (!localSession || new Date(remoteSession.updatedAt) > new Date(localSession.updatedAt)) {
          localStorage.setItem(STORAGE_KEY_LOCAL_LAST_SESSION, JSON.stringify(remoteSession));
          return remoteSession;
        }
      }
    } catch (err) {
      console.warn('Firestore last session read failed:', err);
    }
  }

  return localSession;
}

/**
 * Favorites Management
 */
export function getLocalFavorites(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_FAVORITES);
    return raw ? JSON.parse(raw) : [1, 18, 36, 55, 67, 112, 113, 114]; // Default popular surahs
  } catch (e) {
    console.error('Error reading favorites:', e);
    return [1, 18, 36, 55, 67, 112, 113, 114];
  }
}

export async function getFavorites(userId: string): Promise<number[]> {
  const local = getLocalFavorites();

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'user_favorites', userId);
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.surahNumbers)) {
          localStorage.setItem(STORAGE_KEY_LOCAL_FAVORITES, JSON.stringify(data.surahNumbers));
          return data.surahNumbers;
        }
      }
    } catch (err) {
      console.warn('Firestore favorites fetch failed, using local cache:', err);
    }
  }

  return local;
}

export async function toggleFavorite(userId: string, surahNumber: number): Promise<number[]> {
  const current = getLocalFavorites();
  const exists = current.includes(surahNumber);
  const updated = exists ? current.filter(n => n !== surahNumber) : [...current, surahNumber];

  localStorage.setItem(STORAGE_KEY_LOCAL_FAVORITES, JSON.stringify(updated));

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'user_favorites', userId);
      await withTimeout(setDoc(docRef, {
        userId,
        surahNumbers: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true }), 2000);
    } catch (err) {
      console.warn('Firestore favorites update failed:', err);
    }
  }

  return updated;
}

/**
 * Autoplay Settings
 */
export function getAutoplaySetting(): boolean {
  const val = localStorage.getItem(STORAGE_KEY_AUTOPLAY);
  return val === null ? true : val === 'true';
}

export function setAutoplaySetting(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTOPLAY, enabled ? 'true' : 'false');
}

/**
 * User Preferences & Settings Management
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  let localSettings: UserSettings = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER_SETTINGS);
    if (raw) localSettings = JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local user settings:', e);
  }

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'user_settings', userId);
      const snap = await withTimeout(getDoc(docRef), 2000);
      if (snap && snap.exists()) {
        const remoteSettings = snap.data() as UserSettings;
        const merged = { ...localSettings, ...remoteSettings };
        localStorage.setItem(STORAGE_KEY_USER_SETTINGS, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Firestore settings fetch failed, using local cache:', err);
    }
  }

  return localSettings;
}

export async function saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getUserSettings(userId);
  const updated: UserSettings = { ...current, ...settings };

  localStorage.setItem(STORAGE_KEY_USER_SETTINGS, JSON.stringify(updated));

  const { db, isConfigured } = initializeFirebase();
  if (isConfigured && db) {
    try {
      const docRef = doc(db, 'user_settings', userId);
      await withTimeout(setDoc(docRef, {
        ...updated,
        userId,
        updatedAt: new Date().toISOString()
      }, { merge: true }), 2000);
    } catch (err) {
      console.warn('Firestore settings save failed:', err);
    }
  }

  return updated;
}
