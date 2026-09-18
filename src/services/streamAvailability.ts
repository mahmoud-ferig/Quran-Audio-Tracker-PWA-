/**
 * Lightweight availability probe for Quran audio streams.
 *
 * When the <audio> element fails we cannot trust its MediaError alone:
 * MEDIA_ERR_SRC_NOT_SUPPORTED (code 4) is reported both for a genuinely
 * missing file (404) and for transient/browser-level failures (aborted range
 * request, a truncated cached body, a dropped connection, ...).
 *
 * Probing the URL distinguishes those cases so the UI can either retry
 * silently or tell the user something truthful.
 */

export type StreamAvailability =
  | { status: 'available' }
  | { status: 'missing'; httpStatus: number }
  | { status: 'server-error'; httpStatus: number }
  | { status: 'unreachable' };

const PROBE_TIMEOUT_MS = 8000;

/**
 * HEAD is used deliberately: it is a CORS-safelisted method so no preflight is
 * required, it returns the real status code (the audio hosts send
 * `Access-Control-Allow-Origin: *` even for 404 responses) and it transfers no
 * body. mp3quran servers answer HEAD with `200` + `Content-Length`.
 */
export async function probeStreamAvailability(
  url: string,
  timeoutMs: number = PROBE_TIMEOUT_MS
): Promise<StreamAvailability> {
  if (!url) return { status: 'missing', httpStatus: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      // Never answer the probe from a cache: we want the truth about the
      // network. (The service worker still serves its cache when offline.)
      cache: 'no-store'
    });

    if (response.ok) return { status: 'available' };
    if (response.status === 404 || response.status === 410 || response.status === 403) {
      return { status: 'missing', httpStatus: response.status };
    }
    if (response.status >= 500) {
      return { status: 'server-error', httpStatus: response.status };
    }
    // 3xx that were not followed, 4xx we do not recognise: treat as unavailable.
    return { status: 'missing', httpStatus: response.status };
  } catch {
    // Network failure, DNS failure, timeout/abort or a CORS rejection.
    return { status: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}
