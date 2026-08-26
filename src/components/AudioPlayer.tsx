import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Loader2,
  ChevronUp,
  Star
} from 'lucide-react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { saveProgress, getTrackProgress, saveLastSession, getAutoplaySetting } from '../services/storage';
import { formatTime } from '../utils/formatTime';
import { FullScreenPlayer } from './FullScreenPlayer';

interface Props {
  track: Track | null;
  userId: string;
  isPlaying: boolean;
  onPlayStateChange: (playing: boolean) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onProgressUpdated: (trackId: string, progress: ListeningProgress) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const AudioPlayer: React.FC<Props> = ({
  track,
  userId,
  isPlaying,
  onPlayStateChange,
  isFavorite = false,
  onToggleFavorite = () => {},
  onNextTrack,
  onPrevTrack,
  onProgressUpdated
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [autoplayNext] = useState<boolean>(() => getAutoplaySetting());
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Full Screen Sheet State
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  // Sleep Timer state
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(0);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);

  const lastSavedTimeRef = useRef<number>(0);
  const lastPositionUpdateRef = useRef<number>(0);
  // Tracks the track ID we already loaded, to detect new track arrivals
  const loadedTrackIdRef = useRef<string | null>(null);
  // Whether we intend to play after loading a new track
  const playIntentRef = useRef<boolean>(false);

  // Stable refs for callbacks used inside MediaSession and audio events
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

  // Keep a ref so audio event handlers always get the latest persistProgress
  const persistProgressRef = useRef(persistProgress);
  useEffect(() => {
    persistProgressRef.current = persistProgress;
  }, [persistProgress]);

  // ── Audio Element Event Handlers ──────────────────────────────────────
  // These fire from the browser's native <audio> element.
  // They are the ONLY place we call onPlayStateChange to update the parent.
  // We never sync isPlaying → audio.play()/pause() through a useEffect.

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const now = audioRef.current.currentTime;
    setCurrentTime(now);

    // Save every 5s of active playback delta
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
    onPlayStateChangeRef.current(true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsBuffering(false);
    // If we had a play intent (e.g. new track loaded while isPlaying was true),
    // start playback now that the audio is ready.
    if (playIntentRef.current && audioRef.current?.paused) {
      audioRef.current.play().catch(() => {
        onPlayStateChangeRef.current(false);
      });
      playIntentRef.current = false;
    }
  }, []);

  const handlePause = useCallback(() => {
    // Don't propagate pause if we're just loading a new track (the browser pauses
    // the old src before loading the new one).
    if (playIntentRef.current) return;
    onPlayStateChangeRef.current(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    persistProgressRef.current();
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
      // onPause handler will call onPlayStateChange(false)
    } else {
      audioRef.current
        .play()
        .then(() => {
          // onPlaying handler will call onPlayStateChange(true)
        })
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

  // ── Track Change Effect ───────────────────────────────────────────────
  // When a new track arrives, load it and optionally start playback.
  // This is the ONLY effect that controls the audio element's src.
  useEffect(() => {
    if (!track || !audioRef.current) return;

    // Same track, nothing to do
    if (loadedTrackIdRef.current === track.id) return;

    const audio = audioRef.current;
    loadedTrackIdRef.current = track.id;

    // Reset UI state for the new track
    setCurrentTime(0);
    setDuration(track.duration || 0);
    lastSavedTimeRef.current = 0;
    setIsBuffering(true);

    // Signal that we want to play after loading (if parent says isPlaying)
    playIntentRef.current = isPlaying;

    // Load the new source — the browser will fire loadedmetadata → canplay
    audio.src = track.stream_url;
    audio.playbackRate = playbackSpeed;
    audio.load();

    // Restore saved progress for this track
    (async () => {
      const saved = await getTrackProgress(userId, track.id);
      if (saved && saved.currentTime > 0 && audioRef.current) {
        audioRef.current.currentTime = saved.currentTime;
        setCurrentTime(saved.currentTime);
      }
    })();
  }, [track, isPlaying, playbackSpeed, userId]);

  // ── Sleep Timer Countdown ─────────────────────────────────────────────
  // Fixed: sleepRemainingSeconds is NOT in the dependency array so the
  // interval is created once per timer activation, not recreated every second.
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

      // Android / Bluetooth 'stop' action
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

  // ── MediaSession Position State (throttled ~1/sec) ────────────────────
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
    } catch {
      // Ignore minor rounding sync errors
    }
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
        case 'KeyF':
          e.preventDefault();
          setIsFullScreenOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSkip, toggleMute]);

  if (!track) return null;

  const DEFAULT_QURAN_ARTWORK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="24" fill="#059669"/>
  <circle cx="60" cy="60" r="44" fill="none" stroke="#d97706" stroke-width="2"/>
  <circle cx="60" cy="60" r="36" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3"/>
  <polygon points="60,28 69,51 93,60 69,69 60,92 51,69 27,60 51,51" fill="#d97706" opacity="0.9"/>
  <circle cx="60" cy="60" r="24" fill="#ffffff"/>
  <circle cx="60" cy="60" r="10" fill="#059669"/>
</svg>
`)}`;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
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
      />

      {/* Floating Mini Player Bar */}
      <div 
        className="mini-player-bar" 
        onClick={() => setIsFullScreenOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Expand Now Playing"
      >
        {/* Top Progress Line Indicator */}
        <div 
          className="mini-player-progress-line" 
          style={{ width: `${progressPercent}%` }} 
        />

        <div className="mini-player-inner">
          {/* Left: Artwork Medallion & Info */}
          <div className="mini-player-info">
            <div className="mini-player-medallion">
              <img
                src={track.artwork_url || DEFAULT_QURAN_ARTWORK}
                alt={track.name}
                className="mini-player-artwork"
              />
              {isPlaying && !isBuffering && (
                <div className="mini-player-wave-overlay">
                  <span className="mini-wave-bar bar-1"></span>
                  <span className="mini-wave-bar bar-2"></span>
                  <span className="mini-wave-bar bar-3"></span>
                </div>
              )}
            </div>

            <div className="mini-player-text">
              <div className="mini-player-title-row">
                <span className="mini-player-title">
                  {track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}{track.name}
                </span>
                <span className="mini-player-arabic arabic-text">{track.arabicName}</span>
              </div>
              <div className="mini-player-sub">
                <span className="mini-reciter-name">{track.reciterName}</span>
                <span className="mini-dot-sep">•</span>
                <span className="mini-time-text">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="mini-player-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`mini-icon-btn favorite-mini-btn ${isFavorite ? 'active-star' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star size={16} fill={isFavorite ? 'var(--accent-gold)' : 'none'} color={isFavorite ? 'var(--accent-gold)' : 'currentColor'} />
            </button>

            <button
              className="mini-icon-btn"
              onClick={onPrevTrack}
              title="Previous Surah"
              aria-label="Previous Surah"
            >
              <SkipBack size={18} />
            </button>

            <button
              className="mini-play-btn"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              className="mini-icon-btn"
              onClick={onNextTrack}
              title="Next Surah"
              aria-label="Next Surah"
            >
              <SkipForward size={18} />
            </button>

            <button 
              className="mini-expand-btn" 
              onClick={() => setIsFullScreenOpen(true)}
              title="Expand Full Screen Player"
            >
              <ChevronUp size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Full-Screen Sheet Modal */}
      <FullScreenPlayer
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        track={track}
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        repeatMode={repeatMode}
        sleepTimer={sleepTimer}
        sleepRemainingSeconds={sleepRemainingSeconds}
        volume={volume}
        isMuted={isMuted}
        isFavorite={isFavorite}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onNextTrack={onNextTrack}
        onPrevTrack={onPrevTrack}
        onCycleSpeed={cycleSpeed}
        onToggleRepeat={toggleRepeat}
        onSetSleepTimer={(val) => {
          setSleepTimer(val);
          if (typeof val === 'number' && val > 0) {
            setSleepRemainingSeconds(val * 60);
          } else {
            setSleepRemainingSeconds(null);
          }
        }}
        onToggleMute={toggleMute}
        onVolumeChange={(val) => {
          setVolume(val);
          if (audioRef.current) {
            audioRef.current.volume = val;
            audioRef.current.muted = false;
          }
          setIsMuted(false);
        }}
        onToggleFavorite={onToggleFavorite}
      />
    </>
  );
};
