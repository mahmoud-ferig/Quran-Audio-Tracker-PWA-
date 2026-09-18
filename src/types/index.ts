export interface Track {
  id: string;
  surahNumber: number;
  name: string;
  arabicName: string;
  englishName: string;
  duration: number; // in seconds
  stream_url: string;
  reciterId: string;
  reciterName: string;
  artwork_url?: string;
  versesCount: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Reciter {
  id: string;
  name: string;
  arabicName: string;
  style: string;
  photoUrl?: string;
  serverUrl: string; // e.g., 'https://server8.mp3quran.net/afs/'
  /**
   * Surahs this reciter actually recorded. Omit for a complete mushaf (114);
   * historic recitations are often partial, so the app only lists what exists
   * instead of offering Surahs that would fail to play.
   */
  surahNumbers?: number[];
}

export interface ListeningProgress {
  trackId: string;
  surahNumber: number;
  reciterId: string;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: string;
}

export interface LastSession {
  trackId: string;
  surahNumber: number;
  reciterId: string;
  trackTitle: string;
  arabicTitle: string;
  reciterName: string;
  currentTime: number;
  duration: number;
  updatedAt: string;
}

/** One entry of a playlist: a Surah recited by a specific reciter. */
export interface PlaylistItem {
  surahNumber: number;
  reciterId: string;
}

/** An ordered queue the user built by hand, mixing reciters per Surah. */
export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseConfigState {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type PlaybackSpeed = 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0;

export type RepeatMode = 'none' | 'one' | 'all';

export type SleepTimerOption = 0 | 15 | 30 | 45 | 60 | 'surah';

export interface UserSettings {
  preferredReciterId?: string;
  playbackSpeed?: PlaybackSpeed;
  autoplayNext?: boolean;
  repeatMode?: RepeatMode;
  sleepTimer?: SleepTimerOption;
}

export interface UserProfile {
  email: string;
  displayName?: string;
  settings?: UserSettings;
  updatedAt?: string;
}
