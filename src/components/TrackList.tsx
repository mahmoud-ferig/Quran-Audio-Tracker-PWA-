import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, X, Sparkles } from 'lucide-react';
import type { Track, ListeningProgress } from '../types';

interface Props {
  tracks: Track[];
  activeTrackId: string | null;
  isPlaying: boolean;
  progressMap: Record<string, ListeningProgress>;
  favorites: number[];
  onToggleFavorite: (surahNumber: number) => void;
  onSelectTrack: (track: Track) => void;
}

export const TrackList: React.FC<Props> = ({
  tracks,
  activeTrackId,
  isPlaying,
  progressMap,
  favorites,
  onToggleFavorite,
  onSelectTrack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'Meccan' | 'Medinan' | 'progress'>('all');
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active track card into view smoothly
  useEffect(() => {
    if (activeTrackId && activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeTrackId]);

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

  return (
    <section className="surahs-section">
      <div className="section-header">
        <div className="section-title">
          <span>Surahs & Recitations</span>
          <span className="section-arabic-title arabic-text">السور والتلاوات</span>
        </div>
        <span className="surah-count-badge">
          {filteredTracks.length} of {tracks.length}
        </span>
      </div>

      {/* Search Input Bar */}
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Search by Surah name, number (e.g. 18, Kahf, الملك)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="search-clear-btn" 
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-chips-row">
        <button
          className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All ({tracks.length})
        </button>

        <button
          className={`filter-chip ${filterType === 'favorites' ? 'active' : ''}`}
          onClick={() => setFilterType('favorites')}
        >
          <Star size={13} fill={filterType === 'favorites' ? 'currentColor' : 'none'} style={{ marginRight: 4 }} />
          Favorites ({favorites.length})
        </button>

        <button
          className={`filter-chip ${filterType === 'Meccan' ? 'active' : ''}`}
          onClick={() => setFilterType('Meccan')}
        >
          🕋 Meccan (مكية)
        </button>

        <button
          className={`filter-chip ${filterType === 'Medinan' ? 'active' : ''}`}
          onClick={() => setFilterType('Medinan')}
        >
          🕌 Medinan (مدنية)
        </button>

        {inProgressCount > 0 && (
          <button
            className={`filter-chip ${filterType === 'progress' ? 'active' : ''}`}
            onClick={() => setFilterType('progress')}
          >
            <Sparkles size={13} style={{ marginRight: 4 }} />
            In Progress ({inProgressCount})
          </button>
        )}
      </div>

      {/* Grid of Surahs */}
      <div className="tracks-grid">
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
              className={`track-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTrack(track)}
              role="button"
              tabIndex={0}
            >
              <div className="track-left">
                {/* Octagonal / Rounded Calligraphic Badge */}
                <div className={`surah-badge ${isActive ? 'active-badge' : ''}`}>
                  {isActive && isPlaying ? (
                    <div className="badge-sound-wave">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    track.surahNumber > 0 ? track.surahNumber.toString().padStart(3, '0') : '★'
                  )}
                </div>

                <div className="track-details">
                  <div className="track-name">
                    {track.name}
                  </div>
                  <div className="track-meta">
                    <span>{track.englishName}</span>
                    {track.versesCount > 0 && (
                      <>
                        <span className="dot-sep">•</span>
                        <span>{track.versesCount} verses</span>
                      </>
                    )}
                    <span className="dot-sep">•</span>
                    <span className="revelation-tag">
                      {track.revelationType === 'Meccan' ? '🕋 Meccan' : '🕌 Medinan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="track-right">
                {track.surahNumber > 0 && (
                  <button
                    type="button"
                    className={`track-fav-btn ${isFav ? 'active-fav' : ''}`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.surahNumber);
                    }}
                  >
                    <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                )}

                <div className="track-arabic-box">
                  <div className="track-arabic arabic-text">
                    {track.arabicName}
                  </div>
                  {isComplete ? (
                    <span className="progress-pill complete">
                      Completed ✓
                    </span>
                  ) : hasProgress ? (
                    <span className="progress-pill">
                      {prog.percentage}% saved
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Progress bar at the bottom of the card */}
              {hasProgress && !isComplete && (
                <div
                  className="track-card-progress"
                  style={{ width: `${prog.percentage}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {filteredTracks.length === 0 && (
        <div className="empty-state-box">
          <p className="empty-state-title">No Surahs found</p>
          <p className="empty-state-sub">Try searching by a different name or number, or clear your active filter.</p>
          <button 
            className="empty-state-reset-btn"
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
          >
            Show All 114 Surahs
          </button>
        </div>
      )}
    </section>
  );
};
