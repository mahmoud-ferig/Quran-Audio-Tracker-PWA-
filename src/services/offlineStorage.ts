import type { Track } from '../types';

const AUDIO_CACHE_NAME = 'quran-audio-cache';
const STORAGE_KEY_DOWNLOADS = 'quran_tracker_offline_downloads';

/**
 * The service worker runtime cache and the offline-download cache share the
 * same cache name so a downloaded Surah is also served while offline.
 * An explicit index in localStorage is therefore the single source of truth
 * for "did the user download this?" — the cache may also hold entries written
 * by the service worker while streaming.
 */
function readDownloadIndex(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOWNLOADS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeDownloadIndex(urls: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_DOWNLOADS, JSON.stringify(Array.from(new Set(urls))));
  } catch (e) {
    console.warn('Could not persist offline download index:', e);
  }
}

function addToDownloadIndex(streamUrl: string): void {
  writeDownloadIndex([...readDownloadIndex(), streamUrl]);
}

function removeFromDownloadIndex(streamUrl: string): void {
  writeDownloadIndex(readDownloadIndex().filter((url) => url !== streamUrl));
}

/** All stream URLs the user explicitly downloaded for offline listening. */
export function getDownloadedUrls(): string[] {
  return readDownloadIndex();
}

/**
 * A response is only usable for media playback when it is a complete,
 * non-partial response. Partial (206) or opaque (0) responses stored in the
 * cache are exactly what makes `<audio>` fail with
 * MEDIA_ERR_SRC_NOT_SUPPORTED, so they are never treated as usable.
 */
function isUsableAudioResponse(response: Response | null | undefined): response is Response {
  if (!response) return false;
  if (response.status !== 200) return false;
  if (!response.body) return false;
  return true;
}

/**
 * Check if a Surah MP3 stream is already cached offline
 */
export async function isTrackDownloaded(streamUrl: string): Promise<boolean> {
  if (readDownloadIndex().includes(streamUrl)) return true;
  if (!('caches' in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const response = await cache.match(streamUrl);
    if (!isUsableAudioResponse(response)) return false;
    // Adopt entries created before the download index existed.
    addToDownloadIndex(streamUrl);
    return true;
  } catch (e) {
    console.error('Error checking offline track:', e);
    return false;
  }
}

/**
 * Download and cache a Surah for offline playback.
 * Only a complete 200 response is stored — caching a partial one is what made
 * playback fail randomly later on.
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

    // Check if a usable copy is already in the cache
    const existing = await cache.match(track.stream_url);
    if (isUsableAudioResponse(existing)) {
      addToDownloadIndex(track.stream_url);
      onProgress?.(100);
      return true;
    }
    if (existing) {
      // Drop the unusable (partial/opaque) entry so the download can succeed.
      await cache.delete(track.stream_url);
    }

    onProgress?.(10);

    const response = await fetch(track.stream_url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Buffer the whole body: never store a partial/streamed range response.
    const body = await response.blob();
    if (body.size === 0) throw new Error('Empty audio response');

    onProgress?.(60);

    await cache.put(
      track.stream_url,
      new Response(body, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
          'Content-Length': String(body.size)
        }
      })
    );

    addToDownloadIndex(track.stream_url);
    onProgress?.(100);
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
  removeFromDownloadIndex(streamUrl);
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
 * Get all cached stream URLs (explicit downloads first)
 */
export async function getCachedStreamUrls(): Promise<string[]> {
  const downloaded = readDownloadIndex();
  if (!('caches' in window)) return downloaded;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const requests = await cache.keys();
    return Array.from(new Set([...downloaded, ...requests.map((req) => req.url)]));
  } catch (e) {
    console.error('Error getting cached URLs:', e);
    return downloaded;
  }
}

/**
 * Migration / self-healing: earlier builds let the service worker cache
 * partial (206) and opaque (0) responses for audio. Replaying a truncated body
 * made the browser reject the whole file, which surfaced as
 * "Audio source not found" out of nowhere. Purge every entry that is not a
 * complete 200 response and drop index entries whose cached body is gone.
 */
export async function purgeUnusableAudioCacheEntries(): Promise<void> {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const requests = await cache.keys();
    const usableUrls = new Set<string>();
    let removed = 0;

    await Promise.all(
      requests.map(async (request) => {
        const response = await cache.match(request);
        if (isUsableAudioResponse(response)) {
          usableUrls.add(request.url);
        } else {
          await cache.delete(request);
          removed += 1;
        }
      })
    );

    if (removed > 0) {
      console.info(`Purged ${removed} unusable cached audio response(s).`);
    }

    // Keep the download index in sync with what is actually cached.
    writeDownloadIndex(readDownloadIndex().filter((url) => usableUrls.has(url)));
  } catch (e) {
    console.error('Error purging unusable audio cache entries:', e);
  }
}
