import type { Track } from '../types';

const AUDIO_CACHE_NAME = 'quran-audio-cache';

/**
 * Check if a Surah MP3 stream is already cached offline
 */
export async function isTrackDownloaded(streamUrl: string): Promise<boolean> {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(streamUrl);
    return !!response;
  } catch (e) {
    console.error('Error checking offline track:', e);
    return false;
  }
}

/**
 * Download and cache a Surah for offline playback
 */
export async function downloadTrackForOffline(
  track: Track, 
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!('caches' in window)) {
    alert('Offline storage is not supported in this browser.');
    return false;
  }

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    
    // Check if already in cache
    const existing = await cache.match(track.stream_url);
    if (existing) {
      if (onProgress) onProgress(100);
      return true;
    }

    if (onProgress) onProgress(10);

    const response = await fetch(track.stream_url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    if (onProgress) onProgress(60);

    await cache.put(track.stream_url, response);

    if (onProgress) onProgress(100);
    return true;
  } catch (err) {
    console.error('Error caching track for offline:', err);
    return false;
  }
}

/**
 * Delete a downloaded Surah from the offline cache
 */
export async function deleteDownloadedTrack(streamUrl: string): Promise<boolean> {
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    return await cache.delete(streamUrl);
  } catch (e) {
    console.error('Error deleting offline track:', e);
    return false;
  }
}

/**
 * Get all cached stream URLs
 */
export async function getCachedStreamUrls(): Promise<string[]> {
  if (!('caches' in window)) return [];
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const requests = await cache.keys();
    return requests.map(req => req.url);
  } catch (e) {
    console.error('Error getting cached URLs:', e);
    return [];
  }
}
