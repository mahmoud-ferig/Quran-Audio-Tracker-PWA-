import React, { useState } from 'react';
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
  Share2
} from 'lucide-react';
import type { Track, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';

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

  if (!isOpen || !track) return null;

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
    <div className="fullscreen-player-overlay">
      <div className="fullscreen-player-content">
        {/* Top Navigation Bar */}
        <div className="fullscreen-header">
          <button 
            className="fullscreen-collapse-btn" 
            onClick={onClose}
            aria-label="Collapse Player"
          >
            <ChevronDown size={28} />
          </button>

          <div className="fullscreen-header-title">
            <span className="now-playing-label">NOW PLAYING</span>
            <span className="header-reciter-name">{track.reciterName}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className={`icon-btn ${isFavorite ? 'active-star' : ''}`}
              onClick={onToggleFavorite}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star size={20} fill={isFavorite ? 'var(--accent-gold)' : 'none'} color={isFavorite ? 'var(--accent-gold)' : 'currentColor'} />
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
              <span className="wave-bar bar-1"></span>
              <span className="wave-bar bar-2"></span>
              <span className="wave-bar bar-3"></span>
              <span className="wave-bar bar-4"></span>
              <span className="wave-bar bar-5"></span>
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

        {/* Hero Control Center */}
        <div className="fullscreen-controls-center">
          {/* Repeat */}
          <button
            className={`hero-control-btn ${repeatMode !== 'none' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'one' ? 'Repeat Current Surah' : 'Repeat All'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
          </button>

          {/* Skip -10s */}
          <button
            className="hero-control-btn"
            onClick={() => onSkip(-10)}
            title="Rewind 10 seconds"
          >
            <RotateCcw size={24} />
          </button>

          {/* Previous Track */}
          <button
            className="hero-control-btn"
            onClick={onPrevTrack}
            title="Previous Surah"
          >
            <SkipBack size={26} />
          </button>

          {/* Giant Play / Pause Button */}
          <button
            className="fullscreen-play-hero-btn"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 size={34} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={34} fill="currentColor" />
            ) : (
              <Play size={34} fill="currentColor" style={{ marginLeft: 4 }} />
            )}
          </button>

          {/* Next Track */}
          <button
            className="hero-control-btn"
            onClick={onNextTrack}
            title="Next Surah"
          >
            <SkipForward size={26} />
          </button>

          {/* Skip +10s */}
          <button
            className="hero-control-btn"
            onClick={() => onSkip(10)}
            title="Forward 10 seconds"
          >
            <RotateCw size={24} />
          </button>

          {/* Speed Badge */}
          <button
            className="hero-control-btn speed-toggle-pill"
            onClick={onCycleSpeed}
            title="Playback Speed"
          >
            <span>{playbackSpeed}x</span>
          </button>
        </div>

        {/* Bottom Utility Tool Belt */}
        <div className="fullscreen-bottom-belt">
          {/* Sleep Timer */}
          <div style={{ position: 'relative' }}>
            <button
              className={`belt-btn ${sleepTimer !== 0 ? 'active' : ''}`}
              onClick={() => setIsSleepMenuOpen(!isSleepMenuOpen)}
            >
              <Moon size={18} />
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

          {/* Volume Control */}
          <div className="fullscreen-volume-control">
            <button className="icon-btn-minimal" onClick={onToggleMute}>
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};
