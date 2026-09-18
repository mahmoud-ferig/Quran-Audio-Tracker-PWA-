import type { Playlist, PlaylistItem, Reciter, Track } from '../types';
import { RECITERS, SURAH_METADATA, generateTrackForSurah } from './quranData';

export const DEFAULT_PLAYLIST_NAME = 'My Playlist';

/** Stable key for one playlist entry — same shape as its Track id. */
export function playlistItemKey(item: PlaylistItem): string {
  return `${item.reciterId}_${item.surahNumber}`;
}

export function trackToPlaylistItem(track: Track): PlaylistItem {
  return { surahNumber: track.surahNumber, reciterId: track.reciterId };
}

export function findReciter(reciterId: string): Reciter | undefined {
  return RECITERS.find((r) => r.id === reciterId);
}

/**
 * Reciters that actually recorded a given Surah. Partial mushafts (historic
 * recitations) are excluded, so the per-item reciter picker can never offer a
 * combination that would 404 at playback time.
 */
export function getRecitersForSurah(surahNumber: number): Reciter[] {
  return RECITERS.filter(
    (reciter) => !reciter.surahNumbers || reciter.surahNumbers.includes(surahNumber)
  );
}

function isItemPlayable(item: PlaylistItem): boolean {
  const surah = SURAH_METADATA.find((s) => s.number === item.surahNumber);
  const reciter = findReciter(item.reciterId);
  if (!surah || !reciter) return false;
  if (reciter.surahNumbers && !reciter.surahNumbers.includes(item.surahNumber)) return false;
  return true;
}

/** Drops entries pointing at a Surah/reciter combination that does not exist. */
export function prunePlaylist(playlist: Playlist): Playlist {
  const items = playlist.items.filter(isItemPlayable);
  if (items.length === playlist.items.length) return playlist;
  return { ...playlist, items };
}

/** Turns a playlist into the queue the audio player walks through. */
export function playlistToTracks(playlist: Playlist | null | undefined): Track[] {
  if (!playlist) return [];
  const seen = new Set<string>();
  const tracks: Track[] = [];

  for (const item of playlist.items) {
    if (!isItemPlayable(item)) continue;
    const key = playlistItemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    const surah = SURAH_METADATA.find((s) => s.number === item.surahNumber)!;
    const reciter = findReciter(item.reciterId)!;
    tracks.push(generateTrackForSurah(surah, reciter));
  }

  return tracks;
}

export function countPlayableItems(playlist: Playlist | null | undefined): number {
  return playlistToTracks(playlist).length;
}

export function createPlaylist(name: string): Playlist {
  const now = new Date().toISOString();
  return {
    id: `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || DEFAULT_PLAYLIST_NAME,
    items: [],
    createdAt: now,
    updatedAt: now
  };
}

export function withItems(playlist: Playlist, items: PlaylistItem[]): Playlist {
  return { ...playlist, items, updatedAt: new Date().toISOString() };
}

/** Appends an entry unless the exact Surah + reciter pair is already queued. */
export function addItemToPlaylist(playlist: Playlist, item: PlaylistItem): Playlist {
  const key = playlistItemKey(item);
  if (playlist.items.some((existing) => playlistItemKey(existing) === key)) return playlist;
  return withItems(playlist, [...playlist.items, item]);
}

export function removeItemFromPlaylist(playlist: Playlist, index: number): Playlist {
  if (index < 0 || index >= playlist.items.length) return playlist;
  return withItems(playlist, playlist.items.filter((_, i) => i !== index));
}

export function moveItemInPlaylist(playlist: Playlist, index: number, delta: number): Playlist {
  const target = index + delta;
  if (index < 0 || index >= playlist.items.length) return playlist;
  if (target < 0 || target >= playlist.items.length) return playlist;
  const items = [...playlist.items];
  const [moved] = items.splice(index, 1);
  items.splice(target, 0, moved);
  return withItems(playlist, items);
}

/** Reassigns the reciter of one entry (the "this Surah, that reciter" edit). */
export function changeItemReciter(playlist: Playlist, index: number, reciterId: string): Playlist {
  const item = playlist.items[index];
  const reciter = findReciter(reciterId);
  if (!item || !reciter) return playlist;
  if (reciter.surahNumbers && !reciter.surahNumbers.includes(item.surahNumber)) return playlist;

  const items = [...playlist.items];
  items[index] = { ...item, reciterId };

  // Reassigning can land on a pair that is already queued — keep the first.
  const seen = new Set<string>();
  const deduped = items.filter((entry) => {
    const key = playlistItemKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return withItems(playlist, deduped);
}

export function renamePlaylist(playlist: Playlist, name: string): Playlist {
  const trimmed = name.trim();
  if (!trimmed || trimmed === playlist.name) return playlist;
  return { ...playlist, name: trimmed, updatedAt: new Date().toISOString() };
}
