import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, X, Sparkles, ChevronDown } from 'lucide-react';
import type { Track, Reciter, ListeningProgress } from '../types';
import { RECITERS } from '../services/quranData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  activeTrackId: string | null;
  isPlaying: boolean;
  progressMap: Record<string, ListeningProgress>;
  favorites: number[];
  selectedReciterId: string;
  onSelectReciter: (reciter: Reciter) => void;
  onToggleFavorite: (surahNumber: number) => void;
  onSelectTrack: (track: Track) => void;
}

export const SurahDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  tracks,
  activeTrackId,
  isPlaying,
  progressMap,
  favorites,
  selectedReciterId,
  onSelectReciter,
  onToggleFavorite,
  onSelectTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'Meccan' | 'Medinan' | 'progress'>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [isReciterExpanded, setIsReciterExpanded] = useState(false);
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Swipe gesture for mobile
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);

  // Scroll active track into view when drawer opens
  useEffect(() => {
    if (isOpen && activeTrackId && activeCardRef.current) {
      setTimeout(() => {
        activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 300);
    }
  }, [isOpen, activeTrackId]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredReciters = useMemo(() => {
    if (styleFilter === 'all') return RECITERS;
    if (styleFilter === 'murattal') return RECITERS.filter(r => r.style.toLowerCase().includes('murattal'));
    if (styleFilter === 'mujawwad') return RECITERS.filter(r => r.style.toLowerCase().includes('mujawwad'));
    if (styleFilter === 'haram') return RECITERS.filter(r => r.style.toLowerCase().includes('haram'));
    return RECITERS;
  }, [styleFilter]);

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        track.name.toLowerCase().includes(q) ||
        track.englishName.toLowerCase().includes(q) ||
        track.arabicName.includes(q) ||
        track.surahNumber.toString() === q;

      if (!matchesSearch) return false;

      if (filterType === 'favorites') return favorites.includes(track.surahNumber);
      if (filterType === 'Meccan') return track.revelationType === 'Meccan';
      if (filterType === 'Medinan') return track.revelationType === 'Medinan';
      if (filterType === 'progress') {
        const prog = progressMap[track.id];
        return prog && prog.currentTime > 5 && prog.percentage < 98;
      }

      return true;
    });
  }, [tracks, searchQuery, filterType, favorites, progressMap]);

  const inProgressCount = useMemo(() => {
    return Object.values(progressMap).filter((p) => p.currentTime > 5 && p.percentage < 98).length;
  }, [progressMap]);

  const handleTrackSelect = (track: Track) => {
    onSelectTrack(track);
    // On mobile, close the drawer after selection
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const deltaY = touchCurrentY.current - touchStartY.current;
    if (deltaY > 80) onClose();
  };

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={`drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`drawer-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Browse Surahs"
      >
        {/* Drag Handle — mobile */}
        <div
          className="drawer-drag-handle"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
        >
          <div className="drawer-handle-pill" />
        </div>

        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-text">
            <h2 className="drawer-title">Browse</h2>
            <span className="drawer-title-arabic arabic-text">تصفح</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close (Esc)" aria-label="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* Reciter Section */}
        <div className="drawer-section">
          <button
            className="drawer-section-toggle"
            onClick={() => setIsReciterExpanded(!isReciterExpanded)}
          >
            <div className="drawer-section-title">
              <span>Reciter</span>
              <span className="drawer-section-arabic arabic-text">القارئ</span>
            </div>
            <div className="drawer-section-current">
              <span className="drawer-current-reciter">{RECITERS.find(r => r.id === selectedReciterId)?.name}</span>
              <ChevronDown size={16} className={`drawer-chevron ${isReciterExpanded ? 'expanded' : ''}`} />
            </div>
          </button>

          {isReciterExpanded && (
            <div className="drawer-reciter-panel">
              {/* Style Filter Chips */}
              <div className="drawer-filter-row">
                {[
                  { id: 'all', label: `All (${RECITERS.length})` },
                  { id: 'murattal', label: 'Murattal' },
                  { id: 'mujawwad', label: 'Mujawwad' },
                  { id: 'haram', label: 'Haram' }
                ].map(f => (
                  <button
                    key={f.id}
                    className={`drawer-chip ${styleFilter === f.id ? 'active' : ''}`}
                    onClick={() => setStyleFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Reciter List */}
              <div className="drawer-reciter-list">
                {filteredReciters.map((reciter) => {
                  const isActive = reciter.id === selectedReciterId;
                  return (
                    <button
                      key={reciter.id}
                      className={`drawer-reciter-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectReciter(reciter);
                        setIsReciterExpanded(false);
                      }}
                    >
                      <img
                        src={reciter.photoUrl}
                        alt={reciter.name}
                        className="drawer-reciter-avatar"
                        loading="lazy"
                      />
                      <div className="drawer-reciter-info">
                        <span className="drawer-reciter-name">{reciter.name}</span>
                        <span className="drawer-reciter-arabic arabic-text">{reciter.arabicName}</span>
                        <span className="drawer-reciter-style">{reciter.style}</span>
                      </div>
                      {isActive && <span className="drawer-reciter-active-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="drawer-search">
          <Search className="drawer-search-icon" size={16} />
          <input
            type="text"
            className="drawer-search-input"
            placeholder="Search by name, number, or Arabic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="drawer-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="drawer-filter-row">
          <button
            className={`drawer-chip ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({tracks.length})
          </button>
          <button
            className={`drawer-chip ${filterType === 'favorites' ? 'active' : ''}`}
            onClick={() => setFilterType('favorites')}
          >
            <Star size={12} fill={filterType === 'favorites' ? 'currentColor' : 'none'} />
            Favorites ({favorites.length})
          </button>
          <button
            className={`drawer-chip ${filterType === 'Meccan' ? 'active' : ''}`}
            onClick={() => setFilterType('Meccan')}
          >
            🕋 Meccan
          </button>
          <button
            className={`drawer-chip ${filterType === 'Medinan' ? 'active' : ''}`}
            onClick={() => setFilterType('Medinan')}
          >
            🕌 Medinan
          </button>
          {inProgressCount > 0 && (
            <button
              className={`drawer-chip ${filterType === 'progress' ? 'active' : ''}`}
              onClick={() => setFilterType('progress')}
            >
              <Sparkles size={12} />
              In Progress ({inProgressCount})
            </button>
          )}
        </div>

        {/* Surah List */}
        <div className="drawer-surah-list">
          {filteredTracks.map((track) => {
            const isActive = track.id === activeTrackId;
            const isFav = favorites.includes(track.surahNumber);
            const prog = progressMap[track.id];
            const hasProgress = prog && prog.percentage > 0;
            const isComplete = prog && prog.percentage >= 98;

            return (
              <div
                key={track.id}
                ref={isActive ? activeCardRef : null}
                className={`drawer-surah-item ${isActive ? 'active' : ''}`}
                onClick={() => handleTrackSelect(track)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTrackSelect(track);
                  }
                }}
              >
                {/* Number Badge */}
                <div className={`drawer-surah-badge ${isActive ? 'active' : ''}`}>
                  {isActive && isPlaying ? (
                    <div className="badge-sound-wave">
                      <span /><span /><span />
                    </div>
                  ) : (
                    track.surahNumber > 0 ? track.surahNumber : '★'
                  )}
                </div>

                {/* Info */}
                <div className="drawer-surah-info">
                  <div className="drawer-surah-name">{track.name}</div>
                  <div className="drawer-surah-meta">
                    <span>{track.englishName}</span>
                    {track.versesCount > 0 && (
                      <>
                        <span className="drawer-dot">•</span>
                        <span>{track.versesCount} verses</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Side */}
                <div className="drawer-surah-right">
                  {track.surahNumber > 0 && (
                    <button
                      type="button"
                      className={`drawer-fav-btn ${isFav ? 'active' : ''}`}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track.surahNumber);
                      }}
                    >
                      <Star size={14} fill={isFav ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  <div className="drawer-surah-arabic arabic-text">{track.arabicName}</div>
                  {isComplete ? (
                    <span className="drawer-progress-pill complete">✓</span>
                  ) : hasProgress ? (
                    <span className="drawer-progress-pill">{prog.percentage}%</span>
                  ) : null}
                </div>

                {/* Progress bar */}
                {hasProgress && !isComplete && (
                  <div className="drawer-surah-progress" style={{ width: `${prog.percentage}%` }} />
                )}
              </div>
            );
          })}

          {filteredTracks.length === 0 && (
            <div className="drawer-empty">
              <p className="drawer-empty-title">No Surahs found</p>
              <p className="drawer-empty-sub">Try a different search or clear filters.</p>
              <button
                className="drawer-empty-reset"
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
              >
                Show All 114 Surahs
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
