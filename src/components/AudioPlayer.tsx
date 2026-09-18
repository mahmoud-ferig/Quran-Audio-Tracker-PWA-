import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { saveProgress, getTrackProgress, saveLastSession, getAutoplaySetting } from '../services/storage';
import { probeStreamAvailability } from '../services/streamAvailability';
import type { StreamAvailability } from '../services/streamAvailability';

interface UseAudioPlayerProps {
  track: Track | null;
  userId: string;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onProgressUpdated: (trackId: string, progress: ListeningProgress) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

/** MediaError codes (kept as numbers so they work on every browser). */
const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_DECODE = 3;

/** How often a failed source is silently re-loaded before the user sees an error. */
const MAX_AUTO_RETRIES = 2;
/** Backoff between silent retries (ms). */
const RETRY_BACKOFF_MS = [700, 2200];
/** A load that never reaches `loadedmetadata` within this window is a stall. */
const LOAD_TIMEOUT_MS = 25000;

export interface AudioPlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isBuffering: boolean;
  isRetrying: boolean;
  loadError: string | null;
  currentTime: number;
  duration: number;
  playbackSpeed: PlaybackSpeed;
  repeatMode: RepeatMode;
  sleepTimer: SleepTimerOption;
  sleepRemainingSeconds: number | null;
  volume: number;
  isMuted: boolean;
  handleTogglePlay: () => void;
  handleSeek: (time: number) => void;
  handleSkip: (seconds: number) => void;
  cycleSpeed: () => void;
  toggleRepeat: () => void;
  toggleMute: () => void;
  handleVolumeChange: (val: number) => void;
  handleSetSleepTimer: (val: SleepTimerOption) => void;
  setAutoplayIntent: (val: boolean) => void;
  handleRetry: () => void;
  audioElement: React.JSX.Element;
}

export function useAudioPlayer({
  track,
  userId,
  isPlaying,
  onPlayStateChange,
  onNextTrack,
  onPrevTrack,
  onProgressUpdated
}: UseAudioPlayerProps): AudioPlayerState {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [autoplayNext] = useState<boolean>(() => getAutoplaySetting());
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Sleep Timer state
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(0);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);

  const lastSavedTimeRef = useRef<number>(0);
  const lastPositionUpdateRef = useRef<number>(0);
  const loadedTrackIdRef = useRef<string | null>(null);

  // Explicit autoplay intent — set BEFORE loading a new track
  const autoplayIntentRef = useRef<boolean>(false);
  // Guard against propagating pause during source swap
  const isSwappingSourceRef = useRef<boolean>(false);
  // Timeout for stuck loads
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Reliability bookkeeping ──────────────────────────────────────────
  /** The source we currently *want* to play. Any event about another URL is stale. */
  const intendedSrcRef = useRef<string | null>(null);
  /** Silent retries already spent on the current source. */
  const loadAttemptRef = useRef<number>(0);
  /** Timeout that fires the next silent retry. */
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Cached availability probe result, so a retry loop hits the network once. */
  const probeRef = useRef<{ src: string; availability: StreamAvailability } | null>(null);
  /** Latest `startLoad`/`retryLoad` implementation, so recovery can re-load without a circular dependency. */
  const startLoadRef = useRef<(src: string, opts?: { resetRetries?: boolean }) => void>(() => {});
  /** Source that already produced media data (metadata/canplay/playing). */
  const srcHadDataRef = useRef<string | null>(null);
  /** Position to restore once metadata is known (saved progress or a manual retry). */
  const pendingSeekRef = useRef<number | null>(null);
  /** Mirror of `playbackSpeed` so source loading does not depend on it. */
  const playbackSpeedRef = useRef<PlaybackSpeed>(playbackSpeed);

  // Stable refs for callbacks used inside audio events
  const onNextTrackRef = useRef(onNextTrack);
  const onPrevTrackRef = useRef(onPrevTrack);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const trackRef = useRef(track);

  useEffect(() => {
    onNextTrackRef.current = onNextTrack;
    onPrevTrackRef.current = onPrevTrack;
    onPlayStateChangeRef.current = onPlayStateChange;
    trackRef.current = track;
  });

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // ── Persist Progress ─────────────────────────────────────────────────
  const persistProgress = useCallback(
    async (overrideTime?: number, isFinished = false) => {
      if (!track) return;

      const audio = audioRef.current;
      const current = overrideTime !== undefined ? overrideTime : (audio?.currentTime || 0);
      const dur = audio?.duration || duration || track.duration || 0;

      const percentage = isFinished ? 100 : dur > 0 ? Math.min(100, Math.round((current / dur) * 100)) : 0;

      const progressData: ListeningProgress = {
        trackId: track.id,
        surahNumber: track.surahNumber,
        reciterId: track.reciterId,
        currentTime: isFinished ? 0 : Math.round(current * 10) / 10,
        duration: Math.round(dur * 10) / 10,
        percentage,
        updatedAt: new Date().toISOString()
      };

      lastSavedTimeRef.current = current;
      onProgressUpdated(track.id, progressData);

      await saveProgress(userId, progressData);
      await saveLastSession(userId, {
        trackId: track.id,
        surahNumber: track.surahNumber,
        reciterId: track.reciterId,
        trackTitle: track.name,
        arabicTitle: track.arabicName,
        reciterName: track.reciterName,
        currentTime: isFinished ? 0 : current,
        duration: dur,
        updatedAt: new Date().toISOString()
      });
    },
    [track, duration, userId, onProgressUpdated]
  );

  const persistProgressRef = useRef(persistProgress);
  useEffect(() => {
    persistProgressRef.current = persistProgress;
  }, [persistProgress]);

  // ── Source Loading & Recovery ─────────────────────────────────────────
  //
  // Playback used to break randomly with "Audio source not found": a stale
  // `error` event from the request we had just replaced was blamed on the new
  // track, and a single failure left the element unusable (the play/retry
  // button only called play() on a dead element). Loading now goes through a
  // single path that tags the intended source, retries transients silently and
  // only shows an error when the URL really is unavailable.

  const clearLoadTimers = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  /** Applies a queued seek once the element knows its duration. */
  const applyPendingSeek = useCallback((audio: HTMLAudioElement) => {
    const target = pendingSeekRef.current;
    if (target === null) return;
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    const clamped = Math.max(0, Math.min(target, Math.max(0, audio.duration - 1)));
    pendingSeekRef.current = null;
    if (clamped <= 0) return;
    try {
      audio.currentTime = clamped;
      setCurrentTime(clamped);
    } catch {
      /* seeking before the media is ready is harmless to ignore */
    }
  }, []);

  /**
   * Decides what to do after the media element failed:
   *  - probe the URL to tell a genuinely missing file apart from a hiccup,
   *  - retry transient failures silently with backoff,
   *  - only then surface a truthful message.
   */
  const handleLoadFailure = useCallback(
    async (src: string, mediaCode?: number) => {
      if (intendedSrcRef.current !== src) return; // stale failure of a replaced source

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }

      let availability = probeRef.current?.src === src ? probeRef.current.availability : null;
      if (!availability) {
        availability = await probeStreamAvailability(src);
        probeRef.current = { src, availability };
      }
      if (intendedSrcRef.current !== src) return; // source changed while probing

      if (availability.status === 'missing') {
        clearLoadTimers();
        setIsRetrying(false);
        setIsBuffering(false);
        isSwappingSourceRef.current = false;
        autoplayIntentRef.current = false;
        const reciter = trackRef.current?.reciterName;
        setLoadError(
          `This Surah is not available${reciter ? ` from ${reciter}` : ''}. Please pick another reciter.`
        );
        onPlayStateChangeRef.current(false);
        return;
      }

      if (loadAttemptRef.current < MAX_AUTO_RETRIES) {
        const delay = RETRY_BACKOFF_MS[Math.min(loadAttemptRef.current, RETRY_BACKOFF_MS.length - 1)];
        loadAttemptRef.current += 1;
        setIsRetrying(true);
        setIsBuffering(true);
        clearLoadTimers();
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (intendedSrcRef.current !== src) return;
          startLoadRef.current(src);
        }, delay);
        return;
      }

      clearLoadTimers();
      setIsRetrying(false);
      setIsBuffering(false);
      isSwappingSourceRef.current = false;
      autoplayIntentRef.current = false;
      setLoadError(
        mediaCode === MEDIA_ERR_DECODE
          ? 'This audio file could not be played. Try another reciter.'
          : availability.status === 'unreachable'
            ? 'Could not reach the audio server. Check your internet connection.'
            : 'Playback failed to start. Tap Retry to try again.'
      );
      onPlayStateChangeRef.current(false);
    },
    [clearLoadTimers]
  );

  const armLoadTimeout = useCallback(
    (src: string) => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        loadTimeoutRef.current = null;
        const audio = audioRef.current;
        if (!audio || intendedSrcRef.current !== src) return;
        if (audio.readyState >= 2) return; // have current data — slow, but playable
        void handleLoadFailure(src);
      }, LOAD_TIMEOUT_MS);
    },
    [handleLoadFailure]
  );

  /** (Re)loads a source on the shared <audio> element. */
  const startLoad = useCallback(
    (src: string, opts: { resetRetries?: boolean } = {}) => {
      const audio = audioRef.current;
      if (!audio) return;

      const isSameSource = intendedSrcRef.current === src;

      clearLoadTimers();
      if (isSameSource) {
        // Silently re-loading the very same URL (a retry) must not throw the
        // listener back to the beginning of a long Surah.
        if (pendingSeekRef.current === null && lastSavedTimeRef.current > 0) {
          pendingSeekRef.current = lastSavedTimeRef.current;
        }
      } else {
        lastSavedTimeRef.current = 0;
      }

      intendedSrcRef.current = src;
      if (opts.resetRetries) loadAttemptRef.current = 0;

      setIsBuffering(true);
      setLoadError(null);
      isSwappingSourceRef.current = true;

      // Assigning a new src aborts whatever request was in flight. Browsers may
      // report that dead request as `error`/`abort` on this element afterwards;
      // handleError drops anything that does not belong to `intendedSrcRef`.
      audio.src = src;
      audio.playbackRate = playbackSpeedRef.current;
      audio.load();
      armLoadTimeout(src);
    },
    [armLoadTimeout, clearLoadTimers]
  );

  useEffect(() => {
    startLoadRef.current = startLoad;
  }, [startLoad]);

  /** User initiated recovery — always forces a brand new load. */
  const retryLoad = useCallback(() => {
    const track = trackRef.current;
    const audio = audioRef.current;
    const src = track?.stream_url || intendedSrcRef.current;
    if (!audio || !src) return;

    clearLoadTimers();
    loadAttemptRef.current = 0;
    probeRef.current = null;
    autoplayIntentRef.current = true;
    setIsRetrying(true);

    // Remember where we were so a retry does not send the user back to 0:00.
    const resumeAt = audio.currentTime > 0 ? audio.currentTime : lastSavedTimeRef.current;
    pendingSeekRef.current = resumeAt > 0 ? resumeAt : null;

    loadedTrackIdRef.current = track?.id ?? loadedTrackIdRef.current;
    srcHadDataRef.current = null;
    setLoadError(null);
    setCurrentTime(pendingSeekRef.current ?? 0);

    // Drop the failed source completely: `removeAttribute('src')` + load()
    // clears the element's error state, so a plain re-assignment cannot be
    // short-circuited by the browser's cached failure.
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    audio.removeAttribute('src');
    audio.load();

    startLoadRef.current(src, { resetRetries: true });
  }, [clearLoadTimers]);

  // ── Audio Element Event Handlers ──────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const now = audioRef.current.currentTime;
    setCurrentTime(now);

    if (Math.abs(now - lastSavedTimeRef.current) >= 5) {
      persistProgressRef.current(now);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
    }
    srcHadDataRef.current = intendedSrcRef.current;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    applyPendingSeek(audio);
  }, [applyPendingSeek]);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
    setIsRetrying(false);
    setLoadError(null);
    isSwappingSourceRef.current = false;
    srcHadDataRef.current = intendedSrcRef.current;
    loadAttemptRef.current = 0;
    onPlayStateChangeRef.current(true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsBuffering(false);
    setIsRetrying(false);
    setLoadError(null);
    // The swap is over as soon as we have playable data: without this a
    // subsequent pause was swallowed and progress was never persisted.
    isSwappingSourceRef.current = false;
    srcHadDataRef.current = intendedSrcRef.current;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (audioRef.current) applyPendingSeek(audioRef.current);
    if (autoplayIntentRef.current && audioRef.current?.paused) {
      audioRef.current.play().catch(() => {
        onPlayStateChangeRef.current(false);
      });
      autoplayIntentRef.current = false;
    }
  }, [applyPendingSeek]);

  const handlePause = useCallback(() => {
    if (isSwappingSourceRef.current) return;
    onPlayStateChangeRef.current(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    persistProgressRef.current();
  }, []);

  const handleError = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // The `error` attribute is reset to null every time a resource is
    // (re)selected, so a null value here means this event belongs to a source
    // we already replaced — the late tail of the request we aborted by
    // switching tracks. Ignoring it is what stops the random error banner.
    const mediaError = audio.error;
    if (!mediaError) return;

    const errorCode = mediaError.code;

    // 1 = MEDIA_ERR_ABORTED: fired when we ourselves swap the source or call
    // load() again. It says nothing about the source we want to play.
    if (errorCode === MEDIA_ERR_ABORTED) return;

    const wantedSrc = intendedSrcRef.current;
    if (!wantedSrc) return;

    // A late error that still points at an older URL can never be about the
    // source we are loading now (this was the "error from nowhere").
    const failingSrc = audio.currentSrc || audio.src;
    if (!failingSrc) return;
    if (srcHadDataRef.current !== wantedSrc && failingSrc.split('#')[0] !== wantedSrc.split('#')[0]) {
      return;
    }

    setIsBuffering(false);
    void handleLoadFailure(wantedSrc, errorCode);
  }, [handleLoadFailure]);

  const handleTrackEnded = useCallback(() => {
    persistProgressRef.current(undefined, true);

    if (sleepTimer === 'surah') {
      onPlayStateChangeRef.current(false);
      setSleepTimer(0);
      setSleepRemainingSeconds(null);
      return;
    }

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else if (repeatMode === 'all' || autoplayNext) {
      onNextTrackRef.current();
    } else {
      onPlayStateChangeRef.current(false);
    }
  }, [sleepTimer, repeatMode, autoplayNext]);

  // ── User Actions ──────────────────────────────────────────────────────

  const handleTogglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only pause when the element really is playing: a stale `isPlaying` flag on
    // a paused/errored element must not swallow the user's tap.
    if (isPlaying && !audio.paused) {
      audio.pause();
      return;
    }

    // A media element that errored (or has no source yet) can never start with
    // play() — it rejects immediately. Reload instead, so the play button and
    // the Retry button both actually recover playback.
    if (loadError || audio.error || !audio.src) {
      retryLoad();
      return;
    }

    setLoadError(null);
    audio
      .play()
      .then(() => {})
      .catch((e) => {
        console.error('Play error:', e);
        onPlayStateChange(false);
      });
  }, [isPlaying, loadError, onPlayStateChange, retryLoad]);

  const handleSeek = useCallback((time: number) => {
    pendingSeekRef.current = null;
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    pendingSeekRef.current = null;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    persistProgressRef.current(newTime);
  }, [duration]);

  const cycleSpeed = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, [playbackSpeed]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'one';
      if (prev === 'one') return 'all';
      return 'none';
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const handleVolumeChange = useCallback((val: number) => {
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = false;
    }
    setIsMuted(false);
  }, []);

  const handleSetSleepTimer = useCallback((val: SleepTimerOption) => {
    setSleepTimer(val);
    if (typeof val === 'number' && val > 0) {
      setSleepRemainingSeconds(val * 60);
    } else {
      setSleepRemainingSeconds(null);
    }
  }, []);

  // ── Track Change Effect ───────────────────────────────────────────────
  useEffect(() => {
    if (!track || !audioRef.current) return;

    const isSameTrack = loadedTrackIdRef.current === track.id;
    const isSameSource = intendedSrcRef.current === track.stream_url;
    // Skip only when nothing about the source changed. A *failed* load keeps
    // these in sync but is restarted explicitly by retryLoad().
    if (isSameTrack && isSameSource) return;

    loadedTrackIdRef.current = track.id;
    if (!isSameSource) {
      probeRef.current = null;
      pendingSeekRef.current = null;
    }

    setCurrentTime(0);
    setDuration(track.duration || 0);

    startLoad(track.stream_url, { resetRetries: true });

    (async () => {
      try {
        const saved = await getTrackProgress(userId, track.id);
        if (!saved || saved.currentTime <= 0) return;
        // Ignore the result if the user already moved on to another source.
        if (intendedSrcRef.current !== track.stream_url || loadedTrackIdRef.current !== track.id) return;
        pendingSeekRef.current = saved.currentTime;
        setCurrentTime(saved.currentTime);
        const audio = audioRef.current;
        if (audio) applyPendingSeek(audio);
      } catch (e) {
        console.warn('Failed to restore track progress:', e);
      }
    })();

    return () => {
      clearLoadTimers();
    };
    // `playbackSpeed` is intentionally not a dependency: it is applied through
    // playbackSpeedRef so changing speed never interrupts a load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, track?.stream_url, userId, startLoad, clearLoadTimers, applyPendingSeek]);

  // ── Sleep Timer Countdown ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof sleepTimer !== 'number' || sleepTimer === 0 || sleepRemainingSeconds === null) {
      return;
    }

    const interval = setInterval(() => {
      setSleepRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (audioRef.current) {
            audioRef.current.pause();
          }
          onPlayStateChangeRef.current(false);
          setSleepTimer(0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimer]);

  // ── MediaSession Metadata ─────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}${track.name} (${track.arabicName})`,
        artist: track.reciterName,
        album: 'The Holy Quran - القرآن الكريم',
        artwork: [
          { src: `${origin}/pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${origin}/pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${origin}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().then(() => {
          onPlayStateChangeRef.current(true);
        }).catch(() => {});
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
        onPlayStateChangeRef.current(false);
      });

      try {
        navigator.mediaSession.setActionHandler('stop', () => {
          audioRef.current?.pause();
          onPlayStateChangeRef.current(false);
        });
      } catch {}

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        onPrevTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        onNextTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (!audioRef.current) return;
        const skip = details?.seekOffset || 10;
        const target = Math.max(0, audioRef.current.currentTime - skip);
        audioRef.current.currentTime = target;
        setCurrentTime(target);
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (!audioRef.current) return;
        const skip = details?.seekOffset || 10;
        const target = Math.min(audioRef.current.duration || 9999, audioRef.current.currentTime + skip);
        audioRef.current.currentTime = target;
        setCurrentTime(target);
      });

      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime !== undefined && !isNaN(details.seekTime)) {
            audioRef.current.currentTime = details.seekTime;
            setCurrentTime(details.seekTime);
            persistProgressRef.current(details.seekTime);
          }
        });
      } catch {}
    } catch (e) {
      console.warn('Error setting MediaSession metadata:', e);
    }
  }, [track]);

  // ── MediaSession Position State ────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession) || duration <= 0 || isNaN(duration)) {
      return;
    }
    const now = Date.now();
    if (now - lastPositionUpdateRef.current < 1000) return;
    lastPositionUpdateRef.current = now;
    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: playbackSpeed || 1.0,
        position: Math.max(0, Math.min(currentTime, duration))
      });
    } catch {}
  }, [currentTime, duration, playbackSpeed]);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.min(1, prev + 0.1);
            if (audioRef.current) audioRef.current.volume = next;
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.max(0, prev - 0.1);
            if (audioRef.current) audioRef.current.volume = next;
            return next;
          });
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSkip, toggleMute]);

  return {
    audioRef,
    isBuffering,
    isRetrying,
    loadError,
    currentTime,
    duration,
    playbackSpeed,
    repeatMode,
    sleepTimer,
    sleepRemainingSeconds,
    volume,
    isMuted,
    handleTogglePlay,
    handleSeek,
    handleSkip,
    cycleSpeed,
    toggleRepeat,
    toggleMute,
    handleVolumeChange,
    handleSetSleepTimer,
    setAutoplayIntent: (val: boolean) => { autoplayIntentRef.current = val; },
    handleRetry: retryLoad,
    audioElement: (
      <audio
        ref={audioRef}
        preload="metadata"
        playsInline={true}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onCanPlay={handleCanPlay}
        onPause={handlePause}
        onEnded={handleTrackEnded}
        onError={handleError}
      />
    )
  };
}
