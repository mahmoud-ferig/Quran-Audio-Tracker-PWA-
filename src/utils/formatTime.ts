/**
 * Format seconds into a human-readable time string (m:ss or h:mm:ss).
 */
export function formatTime(timeInSec: number): string {
  if (!timeInSec || isNaN(timeInSec)) return '0:00';
  const h = Math.floor(timeInSec / 3600);
  const m = Math.floor((timeInSec % 3600) / 60);
  const s = Math.floor(timeInSec % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
