import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { saveProgress, getTrackProgress, saveLastSession, getAutoplaySetting } from '../services/storage';

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

export interface AudioPlayerState {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isBuffering: boolean;
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
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
    }
  }, []);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
    setLoadError(null);
    isSwappingSourceRef.current = false;
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
    setLoadError(null);
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (autoplayIntentRef.current && audioRef.current?.paused) {
      audioRef.current.play().catch(() => {
        onPlayStateChangeRef.current(false);
      });
      autoplayIntentRef.current = false;
    }
  }, []);

  const handlePause = useCallback(() => {
    if (isSwappingSourceRef.current) return;
    onPlayStateChangeRef.current(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    persistProgressRef.current();
  }, []);

  const handleError = useCallback(() => {
    setIsBuffering(false);
    isSwappingSourceRef.current = false;
    autoplayIntentRef.current = false;
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    const audio = audioRef.current;
    const errorCode = audio?.error?.code;
    let msg = 'Failed to load audio';
    if (errorCode === 2) msg = 'Network error — check your connection';
    else if (errorCode === 3) msg = 'Audio decoding error';
    else if (errorCode === 4) msg = 'Audio source not found';
    setLoadError(msg);
    onPlayStateChangeRef.current(false);
  }, []);

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
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setLoadError(null);
      audioRef.current
        .play()
        .then(() => {})
        .catch((e) => {
          console.error('Play error:', e);
          onPlayStateChange(false);
        });
    }
  }, [isPlaying, onPlayStateChange]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
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

    if (loadedTrackIdRef.current === track.id) return;

    const audio = audioRef.current;
    loadedTrackIdRef.current = track.id;

    setCurrentTime(0);
    setDuration(track.duration || 0);
    lastSavedTimeRef.current = 0;
    setIsBuffering(true);
    setLoadError(null);

    isSwappingSourceRef.current = true;

    audio.src = track.stream_url;
    audio.playbackRate = playbackSpeed;
    audio.load();

    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      if (isSwappingSourceRef.current || !audioRef.current?.readyState) {
        setIsBuffering(false);
        isSwappingSourceRef.current = false;
        setLoadError('Audio is taking too long to load. Check your connection.');
      }
    }, 20000);

    (async () => {
      try {
        const saved = await getTrackProgress(userId, track.id);
        if (saved && saved.currentTime > 0 && audioRef.current && loadedTrackIdRef.current === track.id) {
          audioRef.current.currentTime = saved.currentTime;
          setCurrentTime(saved.currentTime);
        }
      } catch (e) {
        console.warn('Failed to restore track progress:', e);
      }
    })();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id, playbackSpeed, userId]);

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
