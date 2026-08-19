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
  VolumeX
} from 'lucide-react';
import type { Track, ListeningProgress, PlaybackSpeed, RepeatMode } from '../types';
import { saveProgress, getTrackProgress, saveLastSession } from '../services/storage';

interface Props {
  track: Track | null;
  userId: string;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onProgressUpdated: (trackId: string, progress: ListeningProgress) => void;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const AudioPlayer: React.FC<Props> = ({
  track,
  userId,
  onNextTrack,
  onPrevTrack,
  onProgressUpdated
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isMuted, setIsMuted] = useState(false);

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
      if (!track || !audioRef.current) return;

      const audio = audioRef.current;
      const current = overrideTime !== undefined ? overrideTime : audio.currentTime;
      const dur = audio.duration || duration || track.duration || 0;

      if (dur === 0 && current === 0) return;

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

  // 1. Fetch saved progress on track change
  useEffect(() => {
    if (!track) return;

    let isMounted = true;

    const loadSavedPoint = async () => {
      try {
        const saved = await getTrackProgress(userId, track.id);
        if (saved && saved.currentTime > 0 && isMounted) {
          if (audioRef.current) {
            // Restore playback position
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
  }, [track?.id, userId]);

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

  // 3. Save on window unload / minimize
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

  // Audio Event Handlers
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const now = audioRef.current.currentTime;
    setCurrentTime(now);

    // Throttled background save: every 15s of playback delta
    if (Math.abs(now - lastSavedTimeRef.current) >= 15) {
      persistProgress(now);
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
    }
    // Auto-play when user selects a new track
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      persistProgress();
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error('Play error:', e));
    }
  };

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

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleTrackEnded = () => {
    persistProgress(0, true);

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all') {
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

  if (!track) return null;

  return (
    <div className="player-bar">
      <audio
        ref={audioRef}
        src={track.stream_url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => {
          setIsPlaying(false);
          persistProgress();
        }}
        onPlay={() => setIsPlaying(true)}
        onEnded={handleTrackEnded}
      />

      <div className="player-inner">
        {/* Left: Track Information */}
        <div className="player-track-info">
          <img
            src={track.artwork_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
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
              title={`Repeat: ${repeatMode}`}
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
              title="Rewind 10 seconds"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={18} />
            </button>

            {/* Play / Pause Main Button */}
            <button
              className="play-pause-btn"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>

            {/* Skip +10s */}
            <button
              className="control-btn"
              onClick={() => handleSkip(10)}
              title="Forward 10 seconds"
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

        {/* Right: Quick Options / Mute */}
        <div className="player-options-right">
          <button
            className="control-btn"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
