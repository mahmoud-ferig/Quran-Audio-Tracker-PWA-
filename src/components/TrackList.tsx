import React, { useState, useMemo } from 'react';
import { Search, Volume2, Star } from 'lucide-react';
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

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const matchesSearch =
        track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.arabicName.includes(searchQuery) ||
        track.surahNumber.toString() === searchQuery.trim();

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
    <section>
      <div className="section-title">
        <span>Surahs & Recitations (السور)</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {filteredTracks.length} of {tracks.length}
        </span>
      </div>

      {/* Search Input */}
      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Search by Surah name, number (e.g. 18, Kahf, الملك)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          className={`control-btn ${filterType === 'all' ? 'active' : ''}`}
          style={{
            padding: '6px 14px',
            width: 'auto',
            borderRadius: '9999px',
            background: filterType === 'all' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: filterType === 'all' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
            color: filterType === 'all' ? 'var(--accent-emerald-light)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
          onClick={() => setFilterType('all')}
        >
          All ({tracks.length})
        </button>

        <button
          className={`control-btn ${filterType === 'favorites' ? 'active' : ''}`}
          style={{
            padding: '6px 14px',
            width: 'auto',
            borderRadius: '9999px',
            background: filterType === 'favorites' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: filterType === 'favorites' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
            color: filterType === 'favorites' ? 'var(--accent-gold-light)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
          onClick={() => setFilterType('favorites')}
        >
          <Star size={13} fill={filterType === 'favorites' ? 'currentColor' : 'none'} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          Favorites ({favorites.length})
        </button>

        <button
          className={`control-btn ${filterType === 'Meccan' ? 'active' : ''}`}
          style={{
            padding: '6px 14px',
            width: 'auto',
            borderRadius: '9999px',
            background: filterType === 'Meccan' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: filterType === 'Meccan' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
            color: filterType === 'Meccan' ? 'var(--accent-emerald-light)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
          onClick={() => setFilterType('Meccan')}
        >
          Meccan (مكية)
        </button>

        <button
          className={`control-btn ${filterType === 'Medinan' ? 'active' : ''}`}
          style={{
            padding: '6px 14px',
            width: 'auto',
            borderRadius: '9999px',
            background: filterType === 'Medinan' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
            border: filterType === 'Medinan' ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
            color: filterType === 'Medinan' ? 'var(--accent-emerald-light)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600
          }}
          onClick={() => setFilterType('Medinan')}
        >
          Medinan (مدنية)
        </button>

        {inProgressCount > 0 && (
          <button
            className={`control-btn ${filterType === 'progress' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              width: 'auto',
              borderRadius: '9999px',
              background: filterType === 'progress' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: filterType === 'progress' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              color: filterType === 'progress' ? 'var(--accent-gold-light)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600
            }}
            onClick={() => setFilterType('progress')}
          >
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
              className={`track-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTrack(track)}
            >
              <div className="track-left">
                <div className="surah-badge">
                  {isActive && isPlaying ? (
                    <Volume2 size={18} className="animate-pulse-subtle" />
                  ) : (
                    track.surahNumber > 0 ? track.surahNumber.toString().padStart(3, '0') : '♪'
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
                        <span>•</span>
                        <span>{track.versesCount} verses</span>
                      </>
                    )}
                    <span>•</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '1px 6px', 
                      borderRadius: '4px', 
                      background: 'rgba(255,255,255,0.05)' 
                    }}>
                      {track.revelationType}
                    </span>
                  </div>
                </div>
              </div>

              <div className="track-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {track.surahNumber > 0 && (
                  <button
                    type="button"
                    className="icon-btn"
                    style={{
                      width: '32px',
                      height: '32px',
                      color: isFav ? 'var(--accent-gold)' : 'var(--text-muted)',
                      border: 'none',
                      background: isFav ? 'rgba(245, 158, 11, 0.12)' : 'transparent'
                    }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.surahNumber);
                    }}
                  >
                    <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                )}

                <div style={{ textAlign: 'right' }}>
                  <div className="track-arabic">
                    {track.arabicName}
                  </div>
                  {isComplete ? (
                    <span className="progress-pill" style={{ color: 'var(--accent-emerald-light)' }}>
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
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No Surahs found</p>
          <p style={{ fontSize: '0.85rem' }}>Try refining your search query or clear the filter.</p>
        </div>
      )}
    </section>
  );
};
