import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Loader2,
  ChevronUp
} from 'lucide-react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { saveProgress, getTrackProgress, saveLastSession, getAutoplaySetting } from '../services/storage';
import { FullScreenPlayer } from './FullScreenPlayer';

interface Props {
  track: Track | null;
  userId: string;
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
  isFavorite = false,
  onToggleFavorite = () => {},
  onNextTrack,
  onPrevTrack,
  onProgressUpdated
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
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

  // Audio Event Handlers & Controls
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
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        persistProgress(audioRef.current?.currentTime || 0);
      })
      .catch(() => setIsPlaying(false));
  };

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      persistProgress();
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error('Play error:', e));
    }
  }, [isPlaying, persistProgress]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSeekCommit = () => {
    if (audioRef.current) {
      persistProgress(audioRef.current.currentTime);
    }
  };

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
      setIsPlaying(false);
      setSleepTimer(0);
      setSleepRemainingSeconds(null);
      return;
    }

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' || autoplayNext) {
      onNextTrack();
    } else {
      setIsPlaying(false);
    }
  };

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
          setIsPlaying(false);
          setSleepTimer(0);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer, sleepRemainingSeconds]);

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

  // MediaSession API Integration
  useEffect(() => {
    if ('mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}${track.name} (${track.arabicName})`,
        artist: track.reciterName,
        album: 'The Holy Quran',
        artwork: [
          { src: track.artwork_url || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: track.artwork_url || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('pause', () => handleTogglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', onPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', onNextTrack);
      navigator.mediaSession.setActionHandler('seekbackward', () => handleSkip(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => handleSkip(10));
    }
  }, [track, handleTogglePlay, onNextTrack, onPrevTrack, handleSkip]);

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
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSkip, toggleMute]);

  // Volume Sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  if (!track) return null;

  const DEFAULT_QURAN_ARTWORK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="32" fill="#059669"/>
  <circle cx="60" cy="60" r="46" fill="#047857" stroke="#f59e0b" stroke-width="3"/>
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
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onCanPlay={() => setIsBuffering(false)}
        onPause={() => {
          setIsPlaying(false);
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
          {/* Left: Artwork & Info */}
          <div className="mini-player-info">
            <img
              src={track.artwork_url || DEFAULT_QURAN_ARTWORK}
              alt={track.name}
              className="mini-player-artwork"
            />
            <div className="mini-player-text">
              <div className="mini-player-title">
                {track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}{track.name}
                <span className="mini-player-arabic arabic-text">{track.arabicName}</span>
              </div>
              <div className="mini-player-sub">
                {track.reciterName} • {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="mini-player-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="mini-action-btn"
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
              className="mini-action-btn"
              onClick={onNextTrack}
              title="Next Surah"
              aria-label="Next Surah"
            >
              <SkipForward size={18} />
            </button>

            <button
              className="mini-action-btn expand-btn"
              onClick={() => setIsFullScreenOpen(true)}
              title="Expand Player"
              aria-label="Expand Player"
            >
              <ChevronUp size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Full-Screen Sheet */}
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
        onSeek={(t) => {
          handleSeek(t);
          handleSeekCommit();
        }}
        onSkip={handleSkip}
        onNextTrack={onNextTrack}
        onPrevTrack={onPrevTrack}
        onCycleSpeed={cycleSpeed}
        onToggleRepeat={toggleRepeat}
        onSetSleepTimer={(opt) => {
          setSleepTimer(opt);
          setSleepRemainingSeconds(typeof opt === 'number' && opt > 0 ? opt * 60 : null);
        }}
        onToggleMute={toggleMute}
        onVolumeChange={(v) => {
          setVolume(v);
          if (isMuted && v > 0) setIsMuted(false);
        }}
        onToggleFavorite={onToggleFavorite}
      />
    </>
  );
};
