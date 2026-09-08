import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
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
  CheckCircle2,
  Settings,
  Sun,
  Moon as MoonIcon,
  List,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import type { Track, PlaybackSpeed, RepeatMode, SleepTimerOption } from '../types';
import { formatTime } from '../utils/formatTime';
import { isTrackDownloaded, downloadTrackForOffline, deleteDownloadedTrack } from '../services/offlineStorage';
import type { ThemeMode } from '../services/theme';

interface Props {
  track: Track | null;
  isPlaying: boolean;
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
  isFavorite: boolean;
  theme: ThemeMode;
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
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenDrawer: () => void;
}

const SLEEP_OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: 'Off', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: 'End of Surah', value: 'surah' }
];

export const PlayerScreen: React.FC<Props> = ({
  track,
  isPlaying,
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
  isFavorite,
  theme,
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
  onToggleFavorite,
  onToggleTheme,
  onOpenSettings,
  onOpenDrawer
}) => {
  const [isSleepMenuOpen, setIsSleepMenuOpen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const sleepPopoverRef = useRef<HTMLDivElement>(null);

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

  // Check offline status on track change
  useEffect(() => {
    if (!track) return;
    let isMounted = true;
    isTrackDownloaded(track.stream_url).then((downloaded) => {
      if (isMounted) setIsDownloaded(downloaded);
    });
    return () => { isMounted = false; };
  }, [track]);

  const handleToggleDownload = async () => {
    if (!track || isDownloading) return;

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

  const handleShare = () => {
    if (!track) return;
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

  // Empty state when no track is loaded
  if (!track) {
    return (
      <div className="player-screen player-screen--empty">
        <div className="player-top-bar">
          <div className="player-brand">
            <span className="player-brand-title">Quran Player</span>
            <span className="player-brand-arabic arabic-text">القرآن الكريم</span>
          </div>
          <div className="player-top-actions">
            <button className="player-icon-btn" onClick={onToggleTheme} title="Toggle theme">
              {theme === 'light' ? <MoonIcon size={18} /> : <Sun size={18} />}
            </button>
            <button className="player-icon-btn" onClick={onOpenSettings} title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>
        <div className="player-empty-content">
          <div className="player-empty-medallion">
            <span className="player-empty-icon arabic-text">﷽</span>
          </div>
          <h2 className="player-empty-title">Select a Surah to begin</h2>
          <p className="player-empty-sub">Browse the collection to start listening</p>
          <button className="player-browse-btn" onClick={onOpenDrawer}>
            <List size={18} />
            <span>Browse Surahs</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-screen">
      {/* Top Bar */}
      <div className="player-top-bar">
        <div className="player-brand">
          <span className="player-brand-title">Quran Player</span>
          <span className="player-brand-arabic arabic-text">القرآن الكريم</span>
        </div>
        <div className="player-top-actions">
          <button className="player-icon-btn" onClick={onToggleTheme} title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}>
            {theme === 'light' ? <MoonIcon size={18} /> : <Sun size={18} />}
          </button>
          <button className="player-icon-btn" onClick={onOpenSettings} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Center: Artwork Medallion */}
      <div className="player-artwork-section">
        <div className={`player-artwork-ring ${isPlaying ? 'playing' : ''} ${isBuffering ? 'buffering' : ''}`}>
          <div className="player-artwork-circle">
            <span className="player-artwork-number">{track.surahNumber > 0 ? track.surahNumber : '★'}</span>
            <span className="player-artwork-arabic arabic-text">{track.arabicName}</span>
          </div>
        </div>

        {/* Sound Wave Animation */}
        {isPlaying && !isBuffering && (
          <div className="player-sound-waves">
            <span className="wave-bar bar-1" />
            <span className="wave-bar bar-2" />
            <span className="wave-bar bar-3" />
            <span className="wave-bar bar-4" />
            <span className="wave-bar bar-5" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="player-track-info">
        <div className="player-track-titles">
          <h1 className="player-surah-name">
            {track.surahNumber > 0 ? `${track.surahNumber}. ` : ''}{track.name}
          </h1>
          <p className="player-english-name">{track.englishName || 'The Noble Quran'}</p>
        </div>
        <div className="player-meta-pills">
          {track.revelationType && (
            <span className="player-pill">
              {track.revelationType === 'Meccan' ? '🕋 Meccan' : '🕌 Medinan'}
            </span>
          )}
          {track.versesCount > 0 && (
            <span className="player-pill">📖 {track.versesCount} Verses</span>
          )}
          <span className="player-pill player-pill--reciter">🎙️ {track.reciterName}</span>
        </div>
      </div>

      {/* Error Banner */}
      {loadError && (
        <div className="player-error-banner">
          <AlertCircle size={16} />
          <span>{loadError}</span>
          <button onClick={onTogglePlay} className="player-retry-btn">
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Scrubber */}
      <div className="player-scrubber">
        <div className="player-slider-track">
          <input
            type="range"
            className="player-scrubber-input"
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
        <div className="player-time-row">
          <span>{formatTime(currentTime)}</span>
          <span className="player-time-remaining">-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>
      </div>

      {/* Primary Controls */}
      <div className="player-controls-primary">
        <button className="player-ctrl-btn" onClick={onPrevTrack} title="Previous Surah" aria-label="Previous Surah">
          <SkipBack size={24} />
        </button>
        <button className="player-ctrl-btn" onClick={() => onSkip(-10)} title="Rewind 10s" aria-label="Rewind 10 seconds">
          <RotateCcw size={20} />
        </button>
        <button
          className="player-play-btn"
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isBuffering ? (
            <Loader2 size={32} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={32} fill="currentColor" />
          ) : (
            <Play size={32} fill="currentColor" style={{ marginLeft: 3 }} />
          )}
        </button>
        <button className="player-ctrl-btn" onClick={() => onSkip(10)} title="Forward 10s" aria-label="Forward 10 seconds">
          <RotateCw size={20} />
        </button>
        <button className="player-ctrl-btn" onClick={onNextTrack} title="Next Surah" aria-label="Next Surah">
          <SkipForward size={24} />
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="player-controls-secondary">
        <button
          className={`player-sec-btn ${repeatMode !== 'none' ? 'active' : ''}`}
          onClick={onToggleRepeat}
          title={`Repeat: ${repeatMode === 'none' ? 'Off' : repeatMode === 'one' ? 'Current' : 'All'}`}
        >
          {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
        </button>

        <button className="player-sec-btn player-speed-btn" onClick={onCycleSpeed} title="Playback Speed">
          {playbackSpeed}x
        </button>

        {/* Sleep Timer */}
        <div className="player-sleep-wrap" ref={sleepPopoverRef}>
          <button
            className={`player-sec-btn ${sleepTimer !== 0 ? 'active' : ''}`}
            onClick={() => setIsSleepMenuOpen(!isSleepMenuOpen)}
            title="Sleep Timer"
          >
            <Moon size={16} />
            {sleepRemainingSeconds !== null && (
              <span className="player-sleep-badge">{Math.ceil(sleepRemainingSeconds / 60)}m</span>
            )}
          </button>

          {isSleepMenuOpen && (
            <div className="player-sleep-popover">
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

        <button
          className={`player-sec-btn ${isFavorite ? 'active-star' : ''}`}
          onClick={onToggleFavorite}
          title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        >
          <Star size={18} fill={isFavorite ? 'var(--accent-gold)' : 'none'} color={isFavorite ? 'var(--accent-gold)' : 'currentColor'} />
        </button>

        <button
          className={`player-sec-btn ${isDownloaded ? 'active' : ''}`}
          onClick={handleToggleDownload}
          title={isDownloaded ? 'Downloaded ✓' : 'Download for Offline'}
        >
          {isDownloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isDownloaded ? (
            <CheckCircle2 size={16} color="var(--accent-emerald)" />
          ) : (
            <Download size={16} />
          )}
        </button>

        <button className="player-sec-btn" onClick={handleShare} title="Share">
          <Share2 size={16} />
        </button>

        {/* Volume — desktop only */}
        {!isTouchDevice && (
          <div className="player-volume-wrap">
            <button className="player-sec-btn" onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
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
              className="player-volume-slider"
              aria-label="Volume"
            />
          </div>
        )}
      </div>

      {/* Browse Button */}
      <div className="player-bottom-bar">
        <button className="player-browse-btn" onClick={onOpenDrawer}>
          <List size={18} />
          <span>Browse Surahs & Reciters</span>
        </button>
      </div>
    </div>
  );
};
