import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  Repeat1, 
  Volume2, 
  Volume1,
  VolumeX,
  Moon,
  Loader2
} from 'lucide-react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { saveProgress, getTrackProgress, saveLastSession, getAutoplaySetting, setAutoplaySetting } from '../services/storage';

interface Props {
  track: Track | null;
  userId: string;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onProgressUpdated: (trackId: string, progress: ListeningProgress) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SLEEP_OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: 'Off', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: 'End of Surah', value: 'surah' }
];

export const AudioPlayer: React.FC<Props> = ({
  track,
  userId,
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
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => getAutoplaySetting());
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);

  // Sleep Timer state
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(0);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);
  const [isSleepMenuOpen, setIsSleepMenuOpen] = useState(false);

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekCommit = () => {
    persistProgress();
  };

  const handleSkip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      audioRef.current.muted = nextMute;
      setIsMuted(nextMute);
    }
  }, [isMuted]);

  const handleTrackEnded = () => {
    persistProgress(0, true);

    // If Sleep Timer is set to end of surah
    if (sleepTimer === 'surah') {
      setIsPlaying(false);
      setSleepTimer(0);
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
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  };

  const handleAutoplayToggle = () => {
    const nextVal = !autoplayNext;
    setAutoplayNext(nextVal);
    setAutoplaySetting(nextVal);
  };

  // 1. Fetch saved progress on track change
  useEffect(() => {
    if (!track) return;

    let isMounted = true;

    const loadSavedPoint = async () => {
      try {
        const saved = await getTrackProgress(userId, track.id);
        if (saved && saved.currentTime > 0 && isMounted) {
          if (audioRef.current) {
            audioRef.current.currentTime = saved.currentTime;
            setCurrentTime(saved.currentTime);
            lastSavedTimeRef.current = saved.currentTime;
          }
        }
      } catch (err) {
        console.error('Error fetching stop point:', err);
      }
    };

    loadSavedPoint();

    return () => {
      isMounted = false;
    };
  }, [track, userId]);

  // 2. Setup MediaSession API
  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}${track.name} (${track.arabicName})`,
      artist: track.reciterName,
      album: 'The Holy Quran',
      artwork: track.artwork_url
        ? [
            { src: track.artwork_url, sizes: '96x96', type: 'image/jpeg' },
            { src: track.artwork_url, sizes: '256x256', type: 'image/jpeg' },
            { src: track.artwork_url, sizes: '512x512', type: 'image/jpeg' }
          ]
        : []
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play();
      setIsPlaying(true);
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
      persistProgress();
    });

    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skip);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset || 10;
      if (audioRef.current) {
        audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + skip);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      onPrevTrack();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      onNextTrack();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [track, persistProgress, onPrevTrack, onNextTrack]);

  // 3. Sleep Timer interval countdown
  useEffect(() => {
    if (typeof sleepTimer === 'number' && sleepTimer > 0) {
      const interval = setInterval(() => {
        setSleepRemainingSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
            setSleepTimer(0);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [sleepTimer]);

  // 4. Save on window unload / minimize
  useEffect(() => {
    const handleUnload = () => {
      if (audioRef.current && audioRef.current.currentTime > 0) {
        persistProgress(audioRef.current.currentTime);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [persistProgress]);

  // 5. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(1, Math.round((v + 0.1) * 10) / 10));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, Math.round((v - 0.1) * 10) / 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSkip, toggleMute]);

  // Volume synchronization
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

  return (
    <div className="player-bar">
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

      <div className="player-inner">
        {/* Left: Track Information */}
        <div className="player-track-info">
          <img
            src={track.artwork_url || DEFAULT_QURAN_ARTWORK}
            alt={track.name}
            className="player-artwork"
          />
          <div className="player-title-box">
            <div className="player-track-title">
              {track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}{track.name}
            </div>
            <div className="player-track-sub">
              {track.reciterName}
            </div>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="player-controls-center">
          <div className="player-buttons">
            {/* Repeat Button */}
            <button
              className={`control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
              onClick={toggleRepeat}
              title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'one' ? 'Repeat 1' : 'Repeat All'}`}
              aria-label="Repeat mode"
            >
              {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
            </button>

            {/* Prev Track */}
            <button
              className="control-btn"
              onClick={onPrevTrack}
              title="Previous Surah"
              aria-label="Previous Surah"
            >
              <SkipBack size={18} />
            </button>

            {/* Skip -10s */}
            <button
              className="control-btn"
              onClick={() => handleSkip(-10)}
              title="Rewind 10 seconds (←)"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={18} />
            </button>

            {/* Play / Pause Main Button with Buffering state */}
            <button
              className="play-pause-btn"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            {/* Skip +10s */}
            <button
              className="control-btn"
              onClick={() => handleSkip(10)}
              title="Forward 10 seconds (→)"
              aria-label="Forward 10 seconds"
            >
              <RotateCw size={18} />
            </button>

            {/* Next Track */}
            <button
              className="control-btn"
              onClick={onNextTrack}
              title="Next Surah"
              aria-label="Next Surah"
            >
              <SkipForward size={18} />
            </button>

            {/* Speed Badge */}
            <button
              className="speed-badge"
              onClick={cycleSpeed}
              title="Change Playback Speed"
            >
              {playbackSpeed}x
            </button>
          </div>

          {/* Scrubber Bar */}
          <div className="scrubber-container">
            <span className="time-label">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="scrubber-bar"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
            />
            <span className="time-label right">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Quick Options / Sleep / Volume */}
        <div className="player-options-right" style={{ position: 'relative' }}>
          {/* Autoplay Next Surah Toggle */}
          <button
            className={`control-btn ${autoplayNext ? 'active' : ''}`}
            onClick={handleAutoplayToggle}
            title={autoplayNext ? 'Autoplay Next Surah: ON' : 'Autoplay Next Surah: OFF'}
            style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', width: 'auto' }}
          >
            Auto {autoplayNext ? '✓' : '✗'}
          </button>

          {/* Sleep Timer Button */}
          <button
            className={`control-btn ${sleepTimer !== 0 ? 'active' : ''}`}
            onClick={() => setIsSleepMenuOpen(!isSleepMenuOpen)}
            title={
              sleepRemainingSeconds !== null
                ? `Sleep timer: ${Math.ceil(sleepRemainingSeconds / 60)}m left`
                : sleepTimer === 'surah'
                ? 'Sleep at end of Surah'
                : 'Set Sleep Timer'
            }
          >
            <Moon size={17} />
            {sleepRemainingSeconds !== null && (
              <span style={{ fontSize: '0.68rem', marginLeft: 3 }}>
                {Math.ceil(sleepRemainingSeconds / 60)}m
              </span>
            )}
          </button>

          {/* Sleep Menu Popover */}
          {isSleepMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                right: 0,
                marginBottom: '10px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 100,
                minWidth: '130px'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>
                Sleep Timer
              </div>
              {SLEEP_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  className={`control-btn ${sleepTimer === opt.value ? 'active' : ''}`}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setSleepTimer(opt.value);
                    setSleepRemainingSeconds(typeof opt.value === 'number' && opt.value > 0 ? opt.value * 60 : null);
                    setIsSleepMenuOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Volume Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="control-btn"
              onClick={toggleMute}
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : volume < 0.5 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (isMuted && newVol > 0) setIsMuted(false);
              }}
              style={{
                width: '60px',
                height: '4px',
                accentColor: 'var(--accent-emerald)',
                cursor: 'pointer'
              }}
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
