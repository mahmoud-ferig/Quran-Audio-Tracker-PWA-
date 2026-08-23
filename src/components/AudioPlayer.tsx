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
  const userInitiatedPlayRef = useRef<boolean>(false);

  // References to keep mediaSession callbacks fully stable
  const onNextTrackRef = useRef(onNextTrack);
  const onPrevTrackRef = useRef(onPrevTrack);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const isPlayingRef = useRef(isPlaying);
  const trackRef = useRef(track);

  useEffect(() => {
    onNextTrackRef.current = onNextTrack;
    onPrevTrackRef.current = onPrevTrack;
    onPlayStateChangeRef.current = onPlayStateChange;
    isPlayingRef.current = isPlaying;
    trackRef.current = track;
  });

  // Helper to format mm:ss or hh:mm:ss
  const formatTime = (timeInSec: number) => {
    if (!timeInSec || isNaN(timeInSec)) return '0:00';
    const h = Math.floor(timeInSec / 3600);
    const m = Math.floor((timeInSec % 3600) / 60);
    const s = Math.floor(timeInSec % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Efficient Save Progress Function
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

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const now = audioRef.current.currentTime;
    setCurrentTime(now);

    // Save every 5s of active playback delta
    if (Math.abs(now - lastSavedTimeRef.current) >= 5) {
      persistProgress(now);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
    }
  };

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;

    // Mark as user-initiated so the useEffect doesn't fight with the audio events
    userInitiatedPlayRef.current = true;

    if (isPlaying) {
      audioRef.current.pause();
      onPlayStateChange(false);
      persistProgress();
    } else {
      audioRef.current
        .play()
        .then(() => {
          onPlayStateChange(true);
        })
        .catch((e) => {
          console.error('Play error:', e);
          onPlayStateChange(false);
        });
    }
  }, [isPlaying, persistProgress, onPlayStateChange]);

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
    persistProgress(newTime);
  }, [duration, persistProgress]);

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === 'none') setRepeatMode('one');
    else if (repeatMode === 'one') setRepeatMode('all');
    else setRepeatMode('none');
  };

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const handleTrackEnded = () => {
    persistProgress(duration, true);

    if (sleepTimer === 'surah') {
      onPlayStateChange(false);
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
      onNextTrack();
    } else {
      onPlayStateChange(false);
    }
  };

  // Play / Pause side-effect sync from React props
  // Only act on user-initiated changes to avoid ping-pong with audio element events
  useEffect(() => {
    if (!audioRef.current || !track) return;
    if (!userInitiatedPlayRef.current) {
      // This change came from audio element events (onPause/onPlaying), skip to avoid loop
      return;
    }
    userInitiatedPlayRef.current = false;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        onPlayStateChange(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [track, isPlaying, onPlayStateChange]);

  // Sleep Timer Countdown Effect
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
          onPlayStateChange(false);
          setSleepTimer(0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, sleepRemainingSeconds, onPlayStateChange]);

  // Load initial track progress
  useEffect(() => {
    if (!track) return;
    let isCancelled = false;

    const initTrack = async () => {
      const saved = await getTrackProgress(userId, track.id);
      if (!isCancelled && saved && saved.currentTime > 0 && audioRef.current) {
        audioRef.current.currentTime = saved.currentTime;
        setCurrentTime(saved.currentTime);
      }
    };

    initTrack();
    return () => {
      isCancelled = true;
    };
  }, [track, userId]);

  // Stable MediaSession Metadata Registration (Runs ONLY when track changes)
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

  // Sync position state with system lock screen scrubber — throttled to ~1/sec
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

  // Keyboard Shortcuts
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
        src={track.stream_url}
        preload="metadata"
        playsInline={true}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          onPlayStateChange(true);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        }}
        onCanPlay={() => {
          setIsBuffering(false);
          if (isPlaying && audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
          }
        }}
        onPause={() => {
          onPlayStateChange(false);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
          persistProgress();
        }}
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
