import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
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
  Star, 
  Loader2, 
  Share2, 
  Download, 
  CheckCircle2 
} from 'lucide-react';
import type { Track, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { isTrackDownloaded, downloadTrackForOffline, deleteDownloadedTrack } from '../services/offlineStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: PlaybackSpeed;
  repeatMode: RepeatMode;
  sleepTimer: SleepTimerOption;
  sleepRemainingSeconds: number | null;
  volume: number;
  isMuted: boolean;
  isFavorite: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onCycleSpeed: () => void;
  onToggleRepeat: () => void;
  onSetSleepTimer: (option: SleepTimerOption) => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onToggleFavorite: () => void;
}

const SLEEP_OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: 'Off', value: 0 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '60 minutes', value: 60 },
  { label: 'End of Surah', value: 'surah' }
];

export const FullScreenPlayer: React.FC<Props> = ({
  isOpen,
  onClose,
  track,
  isPlaying,
  isBuffering,
  currentTime,
  duration,
  playbackSpeed,
  repeatMode,
  sleepTimer,
  sleepRemainingSeconds,
  volume,
  isMuted,
  isFavorite,
  onTogglePlay,
  onSeek,
  onSkip,
  onNextTrack,
  onPrevTrack,
  onCycleSpeed,
  onToggleRepeat,
  onSetSleepTimer,
  onToggleMute,
  onVolumeChange,
  onToggleFavorite
}) => {
  const [isSleepMenuOpen, setIsSleepMenuOpen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const sleepPopoverRef = useRef<HTMLDivElement>(null);

  // Swipe gesture tracking refs
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  // Detect touch device (mobile) — volume is a no-op on iOS/Android
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // Click-outside-to-close for sleep timer popover
  useEffect(() => {
    if (!isSleepMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sleepPopoverRef.current && !sleepPopoverRef.current.contains(e.target as Node)) {
        setIsSleepMenuOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isSleepMenuOpen]);

  // Escape key to dismiss fullscreen sheet
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Check offline status on track change
  useEffect(() => {
    if (!track) return;
    let isMounted = true;
    isTrackDownloaded(track.stream_url).then((downloaded) => {
      if (isMounted) setIsDownloaded(downloaded);
    });
    return () => {
      isMounted = false;
    };
  }, [track]);

  // Touch handlers for swipe down to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    // If pulled downward by more than 70px, close the player sheet
    if (deltaY > 70) {
      onClose();
    }
  };

  if (!isOpen || !track) return null;

  const handleToggleDownload = async () => {
    if (isDownloading) return;

    if (isDownloaded) {
      if (confirm(`Remove Surah ${track.name} from offline storage?`)) {
        await deleteDownloadedTrack(track.stream_url);
        setIsDownloaded(false);
      }
    } else {
      setIsDownloading(true);
      const success = await downloadTrackForOffline(track);
      setIsDownloading(false);
      if (success) {
        setIsDownloaded(true);
      } else {
        alert('Could not download Surah. Please check your internet connection and try again.');
      }
    }
  };

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Quran - ${track.name}`,
        text: `Listening to Surah ${track.name} (${track.arabicName}) recited by ${track.reciterName}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="fullscreen-player-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing Full Screen"
    >
      <div 
        className="fullscreen-player-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Sheet Drag Handle Pill */}
        <div className="sheet-drag-handle" onClick={onClose} title="Swipe or tap down to collapse" />

        {/* Top Navigation Bar */}
        <div className="fullscreen-header">
          <button 
            className="fullscreen-collapse-btn" 
            onClick={onClose}
            aria-label="Collapse Player"
            title="Collapse Player (Esc)"
          >
            <ChevronDown size={28} />
          </button>

          <div className="fullscreen-header-title">
            <span className="now-playing-label">NOW PLAYING</span>
            <span className="header-reciter-name">{track.reciterName}</span>
          </div>

          <div className="fullscreen-header-actions">
            <button 
              className={`icon-btn ${isDownloaded ? 'active-downloaded' : ''}`}
              onClick={handleToggleDownload}
              title={isDownloaded ? 'Downloaded for Offline Playback ✓ (Click to remove)' : 'Download Surah for 100% Offline Playback'}
            >
              {isDownloading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isDownloaded ? (
                <CheckCircle2 size={18} color="var(--accent-emerald)" />
              ) : (
                <Download size={18} />
              )}
            </button>
            <button 
              className={`icon-btn ${isFavorite ? 'active-star' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star size={18} fill={isFavorite ? 'var(--accent-gold)' : 'none'} color={isFavorite ? 'var(--accent-gold)' : 'currentColor'} />
            </button>
            <button 
              className="icon-btn"
              onClick={handleShare}
              title="Share Surah"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Center Artwork Medallion with Audio Waves */}
        <div className="fullscreen-artwork-container">
          <div className={`artwork-glow-ring ${isPlaying ? 'playing' : ''}`}>
            <div className="artwork-circle">
              <span className="artwork-surah-number">{track.surahNumber > 0 ? track.surahNumber : '★'}</span>
              <span className="artwork-arabic-calligraphy">{track.arabicName}</span>
            </div>
          </div>

          {/* Sound Waves Animation */}
          {isPlaying && (
            <div className="sound-wave-bars">
              <span className="wave-bar bar-1" />
              <span className="wave-bar bar-2" />
              <span className="wave-bar bar-3" />
              <span className="wave-bar bar-4" />
              <span className="wave-bar bar-5" />
            </div>
          )}
        </div>

        {/* Track Title & Metadata */}
        <div className="fullscreen-track-details">
          <div className="fullscreen-surah-row">
            <div>
              <h2 className="fullscreen-surah-title">
                {track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}{track.name}
              </h2>
              <p className="fullscreen-english-meaning">{track.englishName || 'The Noble Quran'}</p>
            </div>
            <div className="fullscreen-arabic-large arabic-text">
              {track.arabicName}
            </div>
          </div>

          <div className="fullscreen-meta-tags">
            {track.revelationType && (
              <span className="meta-pill">
                {track.revelationType === 'Meccan' ? '🕋 Meccan' : '🕌 Medinan'}
              </span>
            )}
            {track.versesCount && (
              <span className="meta-pill">
                📖 {track.versesCount} Verses
              </span>
            )}
            <span className="meta-pill reciter-pill">
              🎙️ {track.reciterName}
            </span>
          </div>
        </div>

        {/* Scrubber Timeline */}
        <div className="fullscreen-scrubber-section">
          <div className="fullscreen-slider-track">
            <input
              type="range"
              className="fullscreen-scrubber-slider"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              aria-label="Audio scrubber"
              style={{
                background: `linear-gradient(to right, var(--accent-emerald) 0%, var(--accent-emerald) ${progressPercent}%, var(--border-subtle) ${progressPercent}%, var(--border-subtle) 100%)`
              }}
            />
          </div>
          <div className="fullscreen-time-row">
            <span>{formatTime(currentTime)}</span>
            <span className="time-remaining">-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Primary Playback Row (Prev, Big Play/Pause, Next) */}
        <div className="fullscreen-controls-primary">
          <button
            className="hero-control-btn hero-prev-btn"
            onClick={onPrevTrack}
            title="Previous Surah"
            aria-label="Previous Surah"
          >
            <SkipBack size={26} />
          </button>

          <button
            className="fullscreen-play-hero-btn"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 size={34} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={34} fill="currentColor" />
            ) : (
              <Play size={34} fill="currentColor" style={{ marginLeft: 4 }} />
            )}
          </button>

          <button
            className="hero-control-btn hero-next-btn"
            onClick={onNextTrack}
            title="Next Surah"
            aria-label="Next Surah"
          >
            <SkipForward size={26} />
          </button>
        </div>

        {/* Secondary Utility Controls Row (Repeat, -10s, +10s, Speed) */}
        <div className="fullscreen-controls-secondary">
          <button
            className={`hero-control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'one' ? 'Repeat Current Surah' : 'Repeat All'}`}
            aria-label="Toggle Repeat"
          >
            {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
          </button>

          <button
            className="hero-control-btn"
            onClick={() => onSkip(-10)}
            title="Rewind 10 seconds"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={20} />
          </button>

          <button
            className="hero-control-btn"
            onClick={() => onSkip(10)}
            title="Forward 10 seconds"
            aria-label="Forward 10 seconds"
          >
            <RotateCw size={20} />
          </button>

          <button
            className="hero-control-btn speed-toggle-pill"
            onClick={onCycleSpeed}
            title="Playback Speed"
            aria-label="Playback Speed"
          >
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Bottom Tool Belt (Sleep Timer & Desktop Volume) */}
        <div className="fullscreen-bottom-belt">
          {/* Sleep Timer */}
          <div style={{ position: 'relative' }} ref={sleepPopoverRef}>
            <button
              className={`belt-btn ${sleepTimer !== 0 ? 'active' : ''}`}
              onClick={() => setIsSleepMenuOpen(!isSleepMenuOpen)}
              aria-label="Sleep Timer Options"
            >
              <Moon size={16} />
              <span>
                {sleepRemainingSeconds !== null
                  ? `${Math.ceil(sleepRemainingSeconds / 60)}m`
                  : sleepTimer === 'surah'
                  ? 'End of Surah'
                  : 'Sleep Timer'}
              </span>
            </button>

            {/* Sleep Timer Popover */}
            {isSleepMenuOpen && (
              <div className="fullscreen-sleep-popover">
                <div className="popover-title">Sleep Timer</div>
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    className={`popover-item ${sleepTimer === opt.value ? 'active' : ''}`}
                    onClick={() => {
                      onSetSleepTimer(opt.value);
                      setIsSleepMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control — hidden on mobile touch devices where volume API is a no-op */}
          {!isTouchDevice && (
            <div className="fullscreen-volume-control">
              <button className="icon-btn-minimal" onClick={onToggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
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
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="fullscreen-volume-slider"
                aria-label="Volume Slider"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
