import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Star, X, Sparkles, ChevronDown, Plus, Check, Trash2, ArrowUp, ArrowDown, ListMusic } from 'lucide-react';
import type { Track, Reciter, ListeningProgress, Playlist } from '../types';
import { RECITERS, SURAH_METADATA } from '../services/quranData';
import { getRecitersForSurah, playlistItemKey } from '../services/playlists';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Full Surah list of the selected reciter (browse mode). */
  tracks: Track[];
  /** The active playlist as playable tracks (queue mode). */
  queueTracks: Track[];
  activeTrackId: string | null;
  isPlaying: boolean;
  progressMap: Record<string, ListeningProgress>;
  favorites: number[];
  selectedReciterId: string;
  onSelectReciter: (reciter: Reciter) => void;
  onToggleFavorite: (surahNumber: number) => void;
  onSelectTrack: (track: Track) => void;
  // Playlists
  playlists: Playlist[];
  activePlaylist: Playlist | null;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, name: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onActivatePlaylist: (playlistId: string) => void;
  onExitPlaylist: () => void;
  onAddTrackToPlaylist: (track: Track) => void;
  onRemovePlaylistItem: (index: number) => void;
  onMovePlaylistItem: (index: number, delta: number) => void;
  onChangePlaylistItemReciter: (index: number, reciterId: string) => void;
}

export const SurahDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  tracks,
  queueTracks,
  activeTrackId,
  isPlaying,
  progressMap,
  favorites,
  selectedReciterId,
  onSelectReciter,
  onToggleFavorite,
  onSelectTrack,
  playlists,
  activePlaylist,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onActivatePlaylist,
  onExitPlaylist,
  onAddTrackToPlaylist,
  onRemovePlaylistItem,
  onMovePlaylistItem,
  onChangePlaylistItemReciter
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'Meccan' | 'Medinan' | 'progress'>('all');
  const [styleFilter, setStyleFilter] = useState<string>('all');
  const [isReciterExpanded, setIsReciterExpanded] = useState(false);
  const [isPlaylistExpanded, setIsPlaylistExpanded] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  // Which list the drawer shows while a playlist is the queue. Stored per
  // playlist id, so activating another playlist goes back to queue view.
  const [browseOverrideFor, setBrowseOverrideFor] = useState<string | null>(null);
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const playlistIsQueue = !!activePlaylist && activePlaylist.items.length > 0;
  const showingQueue = playlistIsQueue && browseOverrideFor !== activePlaylist?.id;
  const displayTracks = showingQueue ? queueTracks : tracks;

  /** Where a tap on “+” goes: the active playlist, else the newest one. */
  const targetPlaylist = useMemo(() => {
    if (activePlaylist) return activePlaylist;
    return playlists.length > 0 ? playlists[0] : null;
  }, [activePlaylist, playlists]);

  const targetKeys = useMemo(
    () => new Set((targetPlaylist?.items ?? []).map(playlistItemKey)),
    [targetPlaylist]
  );

  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    onCreatePlaylist(name);
    setNewPlaylistName('');
  };

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
    return displayTracks.filter((track) => {
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
  }, [displayTracks, searchQuery, filterType, favorites, progressMap]);

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
                        <span className="drawer-reciter-style">
                          {reciter.surahNumbers && reciter.surahNumbers.length > 0
                            ? `${reciter.style} · ${reciter.surahNumbers.length} surahs`
                            : reciter.style}
                        </span>
                      </div>
                      {isActive && <span className="drawer-reciter-active-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Playlist Section */}
        <div className="drawer-section">
          <button
            className="drawer-section-toggle"
            onClick={() => setIsPlaylistExpanded(!isPlaylistExpanded)}
          >
            <div className="drawer-section-title">
              <span>Playlist</span>
              <span className="drawer-section-arabic arabic-text">قائمة التشغيل</span>
            </div>
            <div className="drawer-section-current">
              <span className="drawer-current-reciter">
                {activePlaylist
                  ? activePlaylist.name
                  : playlists.length > 0
                    ? `${playlists.length} saved`
                    : 'None'}
              </span>
              <ChevronDown size={16} className={`drawer-chevron ${isPlaylistExpanded ? 'expanded' : ''}`} />
            </div>
          </button>

          {isPlaylistExpanded && (
            <div className="drawer-playlist-panel">
              {/* Create */}
              <div className="drawer-playlist-create">
                <input
                  type="text"
                  className="drawer-playlist-input"
                  placeholder="New playlist name…"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreatePlaylist();
                  }}
                  aria-label="New playlist name"
                />
                <button
                  className="drawer-playlist-create-btn"
                  onClick={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim()}
                >
                  <Plus size={14} />
                  Create
                </button>
              </div>

              {playlists.length === 0 ? (
                <p className="drawer-playlist-hint">
                  Create a playlist, then tap <Plus size={12} /> on any Surah to add it. Pick a
                  different reciter first to change who recites that Surah.
                </p>
              ) : (
                <div className="drawer-playlist-list">
                  {playlists.map((playlist) => {
                    const isActive = playlist.id === activePlaylist?.id;
                    return (
                      <div
                        key={playlist.id}
                        className={`drawer-playlist-item ${isActive ? 'active' : ''}`}
                      >
                        <button
                          className="drawer-playlist-main"
                          onClick={() => onActivatePlaylist(playlist.id)}
                          title={isActive ? 'Currently the playback queue' : 'Play this playlist'}
                        >
                          <ListMusic size={14} className="drawer-playlist-icon" />
                          <span className="drawer-playlist-name">{playlist.name}</span>
                          <span className="drawer-playlist-count">
                            {playlist.items.length} {playlist.items.length === 1 ? 'surah' : 'surahs'}
                          </span>
                          {isActive && <Check size={14} className="drawer-playlist-check" />}
                        </button>
                        <button
                          className="drawer-playlist-icon-btn"
                          title={isActive ? 'Save & stop using as queue' : 'Delete playlist'}
                          onClick={() => (isActive ? onExitPlaylist() : onDeletePlaylist(playlist.id))}
                        >
                          {isActive ? <X size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Editor for the selected playlist */}
              {activePlaylist && (
                <div className="drawer-playlist-editor">
                  <div className="drawer-playlist-editor-head">
                    <input
                      key={activePlaylist.id}
                      className="drawer-playlist-title-input"
                      defaultValue={activePlaylist.name}
                      onBlur={(e) => onRenamePlaylist(activePlaylist.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      aria-label="Playlist name"
                    />
                    <span className="drawer-playlist-editor-count">
                      {activePlaylist.items.length} queued
                    </span>
                  </div>

                  {activePlaylist.items.length === 0 ? (
                    <p className="drawer-playlist-hint">
                      Empty playlist — tap <Plus size={12} /> on a Surah to queue it.
                    </p>
                  ) : (
                    activePlaylist.items.map((item, index) => {
                      const surah = SURAH_METADATA.find((s) => s.number === item.surahNumber);
                      const options = getRecitersForSurah(item.surahNumber);
                      return (
                        <div key={`${playlistItemKey(item)}_${index}`} className="playlist-row">
                          <span className="playlist-row-index">{index + 1}</span>

                          <div className="playlist-row-info">
                            <span className="playlist-row-surah">
                              {surah ? `${surah.number}. ${surah.name}` : `Surah ${item.surahNumber}`}
                            </span>
                            <select
                              className="playlist-row-reciter"
                              value={item.reciterId}
                              onChange={(e) => onChangePlaylistItemReciter(index, e.target.value)}
                              aria-label={`Reciter for ${surah ? surah.name : 'this Surah'}`}
                            >
                              {options.map((reciter) => (
                                <option key={reciter.id} value={reciter.id}>
                                  {reciter.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="playlist-row-actions">
                            <button
                              onClick={() => onMovePlaylistItem(index, -1)}
                              disabled={index === 0}
                              title="Move up"
                              aria-label="Move up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              onClick={() => onMovePlaylistItem(index, 1)}
                              disabled={index === activePlaylist.items.length - 1}
                              title="Move down"
                              aria-label="Move down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              onClick={() => onRemovePlaylistItem(index)}
                              title="Remove from playlist"
                              aria-label="Remove from playlist"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
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
          {playlistIsQueue && (
            <>
              <button
                className={`drawer-chip ${showingQueue && filterType === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setBrowseOverrideFor(null);
                  setFilterType('all');
                }}
                title="The playlist is the playback queue"
              >
                <ListMusic size={12} />
                Queue ({queueTracks.length})
              </button>
              <button
                className={`drawer-chip ${!showingQueue && filterType === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setBrowseOverrideFor(activePlaylist?.id ?? null);
                  setFilterType('all');
                }}
                title="Browse all Surahs of the selected reciter"
              >
                All surahs ({tracks.length})
              </button>
            </>
          )}
          {!playlistIsQueue && (
            <button
              className={`drawer-chip ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({tracks.length})
            </button>
          )}
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
                    <div className="drawer-surah-actions">
                      <button
                        type="button"
                        className={`drawer-add-btn ${targetKeys.has(track.id) ? 'active' : ''}`}
                        title={
                          targetKeys.has(track.id)
                            ? `Already in "${targetPlaylist?.name ?? 'playlist'}"`
                            : `Add to "${targetPlaylist?.name ?? 'a new playlist'}"`
                        }
                        aria-label="Add to playlist"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddTrackToPlaylist(track);
                          // A brand new playlist is worth showing straight away.
                          if (playlists.length === 0) setIsPlaylistExpanded(true);
                        }}
                      >
                        {targetKeys.has(track.id) ? <Check size={14} /> : <Plus size={14} />}
                      </button>
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
                    </div>
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
                Show All {displayTracks.length} Surahs
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
