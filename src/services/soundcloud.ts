import type { Track } from '../types';

const STORAGE_KEY_SC_CLIENT_ID = 'quran_tracker_soundcloud_client_id';

export function getSoundCloudClientId(): string {
  return (
    localStorage.getItem(STORAGE_KEY_SC_CLIENT_ID) ||
    import.meta.env.VITE_SOUNDCLOUD_CLIENT_ID ||
    ''
  );
}

export function setSoundCloudClientId(clientId: string) {
  localStorage.setItem(STORAGE_KEY_SC_CLIENT_ID, clientId.trim());
}

export interface SoundCloudRawTrack {
  id: number | string;
  title: string;
  duration: number; // milliseconds
  stream_url?: string;
  artwork_url?: string;
  user?: {
    username: string;
    avatar_url?: string;
  };
}

/**
 * Fetch tracks from a SoundCloud playlist ID
 */
export async function fetchPlaylistTracks(playlistId: string): Promise<Track[]> {
  const clientId = getSoundCloudClientId();
  if (!clientId) {
    throw new Error('SoundCloud Client ID is not configured. Please add it in Settings.');
  }

  const response = await fetch(
    `https://api.soundcloud.com/playlists/${playlistId}?client_id=${clientId}`
  );

  if (!response.ok) {
    throw new Error(`Failed to load playlist from SoundCloud (Status ${response.status})`);
  }

  const playlist = await response.json();
  return (playlist.tracks || []).map((t: SoundCloudRawTrack, index: number) => ({
    id: `sc_${t.id}`,
    surahNumber: index + 1,
    name: t.title,
    arabicName: t.title,
    englishName: t.title,
    duration: Math.round((t.duration || 0) / 1000),
    stream_url: t.stream_url ? `${t.stream_url}?client_id=${clientId}` : '',
    reciterId: 'soundcloud',
    reciterName: t.user?.username || playlist.user?.username || 'SoundCloud Reciter',
    artwork_url: t.artwork_url || playlist.artwork_url,
    versesCount: 0,
    revelationType: 'Meccan'
  }));
}

/**
 * Create a custom audio track from any direct audio/podcast URL
 */
export function createCustomTrack(
  title: string,
  url: string,
  reciterName = 'Custom Stream'
): Track {
  return {
    id: `custom_${Date.now()}`,
    surahNumber: 0,
    name: title,
    arabicName: title,
    englishName: title,
    duration: 0,
    stream_url: url,
    reciterId: 'custom',
    reciterName,
    artwork_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    versesCount: 0,
    revelationType: 'Meccan'
  };
}
