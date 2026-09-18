import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Track, Reciter, ListeningProgress, Playlist } from './types';
import { RECITERS, getTracksForReciter } from './services/quranData';
import {
  getOrCreateUserId,
  getAllProgress,
  getLastSession,
  getFavorites,
  toggleFavorite,
  getUserSettings,
  saveUserSettings,
  getPlaylists,
  savePlaylists,
  getActivePlaylistId,
  setActivePlaylistId as persistActivePlaylistId
} from './services/storage';
import {
  createPlaylist,
  renamePlaylist,
  prunePlaylist,
  addItemToPlaylist,
  removeItemFromPlaylist,
  moveItemInPlaylist,
  changeItemReciter,
  playlistToTracks,
  trackToPlaylistItem,
  DEFAULT_PLAYLIST_NAME
} from './services/playlists';
import { initializeFirebase } from './firebase/config';
import { getStoredTheme, getStoredAccent, applyTheme } from './services/theme';
import { purgeUnusableAudioCacheEntries } from './services/offlineStorage';
import type { ThemeMode, AccentColor } from './services/theme';
import { useAudioPlayer } from './components/AudioPlayer';
import { PlayerScreen } from './components/PlayerScreen';
import { SurahDrawer } from './components/SurahDrawer';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [accent, setAccent] = useState<AccentColor>(() => getStoredAccent());
  const [userId, setUserId] = useState<string>(getOrCreateUserId());
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [reciterTracks, setReciterTracks] = useState<Track[]>(() => getTracksForReciter(RECITERS[0]));
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressMap, setProgressMap] = useState<Record<string, ListeningProgress>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // The playlist currently used as the queue. While it has entries it replaces
  // the reciter's full Surah list for playback, so next/prev walk the playlist.
  const activePlaylist = useMemo(
    () => playlists.find(p => p.id === activePlaylistId) ?? null,
    [playlists, activePlaylistId]
  );
  const queueTracks = useMemo(() => playlistToTracks(activePlaylist), [activePlaylist]);
  /** Queue the audio player walks through (playlist when it has entries). */
  const tracks = queueTracks.length > 0 ? queueTracks : reciterTracks;

  // UI State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply theme & accent on mount and when changed
  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  // Self-heal caches written by older builds: partial (206) and opaque audio
  // responses used to be replayed as truncated files, which the browser
  // rejected at random with "Audio source not found".
  useEffect(() => {
    void purgeUnusableAudioCacheEntries();
  }, []);

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next, accent);
  };

  const handleChangeAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
    applyTheme(theme, newAccent);
  };

  // Ref to AudioPlayer's autoplay intent setter
  const setAutoplayIntentRef = React.useRef<((val: boolean) => void) | null>(null);

  // 1. Initial & Account Change Load + Auto-Sync on Tab Focus
  useEffect(() => {
    const initData = async (isInitialLoad: boolean) => {
      try {
        const [prog, session, favs, settings] = await Promise.all([
          getAllProgress(userId),
          getLastSession(userId),
          getFavorites(userId),
          getUserSettings(userId)
        ]);
        setProgressMap(prog);
        setFavorites(favs);

        // Playlists are only refreshed on a full load: merging them on every
        // focus could revert an edit whose Firestore write is still in flight.
        let cleanPlaylists: Playlist[] = [];
        if (isInitialLoad) {
          const loadedPlaylists = await getPlaylists(userId);
          cleanPlaylists = loadedPlaylists.map(prunePlaylist);
          setPlaylists(cleanPlaylists);
          // Drop entries pointing at Surahs a reciter never recorded.
          if (cleanPlaylists.some((p, i) => p.items.length !== loadedPlaylists[i].items.length)) {
            void savePlaylists(userId, cleanPlaylists);
          }
        }

        // Only the very first load decides which reciter/track is active.
        // Re-running this on every focus/visibilitychange used to swap the
        // track out from under the user while it was playing — which in turn
        // reloaded the audio source mid-playback and could surface a load
        // error for a track that was working perfectly fine.
        if (!isInitialLoad) return;

        let reciterToUse = RECITERS[0];
        if (settings?.preferredReciterId) {
          const found = RECITERS.find(r => r.id === settings.preferredReciterId);
          if (found) reciterToUse = found;
        } else if (session?.reciterId) {
          const found = RECITERS.find(r => r.id === session.reciterId);
          if (found) reciterToUse = found;
        }

        setSelectedReciter(reciterToUse);
        const reciterTracks = getTracksForReciter(reciterToUse);
        setReciterTracks(reciterTracks);

        // Restore the playlist that was acting as the queue, if it still exists.
        const storedPlaylistId = getActivePlaylistId();
        const storedPlaylist = storedPlaylistId
          ? cleanPlaylists.find(p => p.id === storedPlaylistId && p.items.length > 0)
          : undefined;
        const playlistQueue = storedPlaylist ? playlistToTracks(storedPlaylist) : [];
        if (storedPlaylist && playlistQueue.length > 0) {
          setActivePlaylistId(storedPlaylist.id);
        }

        // Restore last session track (but don't autoplay). Reciters with a
        // partial mushaf (historic recordings) may not have that Surah, so fall
        // back to the first available entry of the active queue.
        const source = playlistQueue.length > 0 ? playlistQueue : reciterTracks;
        const restored =
          session && session.surahNumber > 0
            ? source.find(t => t.surahNumber === session.surahNumber)
            : undefined;

        if (restored) {
          setActiveTrack(restored);
        } else if (source.length > 0) {
          setActiveTrack(source[0]);
        }
      } catch (err) {
        console.error('Error initializing tracker data:', err);
      }
    };

    initData(true);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        initData(false);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [userId]);

  // 2. Handle Reciter Change
  const handleSelectReciter = (reciter: Reciter) => {
    setSelectedReciter(reciter);
    const newTracks = getTracksForReciter(reciter);
    setReciterTracks(newTracks);
    saveUserSettings(userId, { preferredReciterId: reciter.id });

    // Choosing a reciter means browsing their mushaf again, so the playlist
    // stops being the queue (it stays saved and can be re-activated).
    exitPlaylistQueue();

    // If a track is loaded, switch to the same Surah with the new reciter —
    // unless that reciter never recorded it (partial mushaf), in which case
    // fall back to their first available Surah.
    if (activeTrack && activeTrack.surahNumber > 0) {
      const matching =
        newTracks.find(t => t.surahNumber === activeTrack.surahNumber) ?? newTracks[0];

      if (matching) {
        if (isPlaying) {
          setAutoplayIntentRef.current?.(true);
        }
        setActiveTrack(matching);
      }
    }
  };

  // 2b. Playlist actions
  const exitPlaylistQueue = useCallback(() => {
    setActivePlaylistId(null);
    persistActivePlaylistId(null);
  }, []);

  /** Writes the playlist array to state, localStorage and Firestore. */
  const persistPlaylists = useCallback(
    (next: Playlist[]) => {
      setPlaylists(next);
      void savePlaylists(userId, next);
    },
    [userId]
  );

  /** The playlist an added Surah goes into: the active one, else the newest. */
  const resolveTargetPlaylist = useCallback((): { target: Playlist; list: Playlist[] } => {
    const active = activePlaylistId ? playlists.find(p => p.id === activePlaylistId) : undefined;
    if (active) return { target: active, list: playlists };
    if (playlists.length > 0) return { target: playlists[0], list: playlists };
    const created = createPlaylist(DEFAULT_PLAYLIST_NAME);
    return { target: created, list: [created, ...playlists] };
  }, [activePlaylistId, playlists]);

  const handleCreatePlaylist = (name: string) => {
    const playlist = createPlaylist(name);
    persistPlaylists([playlist, ...playlists]);
    setActivePlaylistId(playlist.id);
    persistActivePlaylistId(playlist.id);
  };

  const handleRenamePlaylist = (playlistId: string, name: string) => {
    persistPlaylists(
      playlists.map(p => (p.id === playlistId ? renamePlaylist(p, name) : p))
    );
  };

  const handleDeletePlaylist = (playlistId: string) => {
    persistPlaylists(playlists.filter(p => p.id !== playlistId));
    if (activePlaylistId === playlistId) exitPlaylistQueue();
  };

  const handleActivatePlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    setActivePlaylistId(playlistId);
    persistActivePlaylistId(playlistId);

    const queue = playlistToTracks(playlist);
    if (queue.length === 0) return; // nothing to play yet — keep browsing

    // Keep the current Surah when it is part of the playlist, else start at the top.
    const current = activeTrack ? queue.find(t => t.id === activeTrack.id) : undefined;
    if (!current) {
      setAutoplayIntentRef.current?.(true);
      setActiveTrack(queue[0]);
      setIsPlaying(true);
    }
  };

  const handleAddTrackToPlaylist = (track: Track) => {
    const { target, list } = resolveTargetPlaylist();
    const updated = addItemToPlaylist(target, trackToPlaylistItem(track));
    persistPlaylists(list.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleUpdatePlaylist = (playlistId: string, update: (playlist: Playlist) => Playlist) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    const updated = update(playlist);
    if (updated === playlist) return;
    persistPlaylists(playlists.map(p => (p.id === updated.id ? updated : p)));
  };

  const handleRemovePlaylistItem = (index: number) => {
    if (!activePlaylist) return;
    handleUpdatePlaylist(activePlaylist.id, p => removeItemFromPlaylist(p, index));
  };

  const handleMovePlaylistItem = (index: number, delta: number) => {
    if (!activePlaylist) return;
    handleUpdatePlaylist(activePlaylist.id, p => moveItemInPlaylist(p, index, delta));
  };

  const handleChangePlaylistItemReciter = (index: number, reciterId: string) => {
    if (!activePlaylist) return;
    handleUpdatePlaylist(activePlaylist.id, p => changeItemReciter(p, index, reciterId));
  };

  // 3. Handle Track Selection — always autoplay
  const handleSelectTrack = (track: Track) => {
    setAutoplayIntentRef.current?.(true);

    // Re-selecting the Surah that is already loaded must not be swallowed by
    // the "same track" guard — it has to actually reload a failed source.
    if (activeTrack?.id === track.id) {
      if (audio.loadError || !isPlaying) {
        audio.handleRetry();
      }
      setIsPlaying(true);
      return;
    }

    setActiveTrack(track);
    setIsPlaying(true);
  };

  // 4. Handle Next / Prev Track
  const handleNextTrack = useCallback(() => {
    if (!activeTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === activeTrack.id);
    let nextTrack: Track | null = null;
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      nextTrack = tracks[currentIndex + 1];
    } else if (tracks.length > 0) {
      nextTrack = tracks[0]; // Wrap around
    }
    if (nextTrack) {
      setAutoplayIntentRef.current?.(true);
      setActiveTrack(nextTrack);
      setIsPlaying(true);
    }
  }, [activeTrack, tracks]);

  const handlePrevTrack = useCallback(() => {
    if (!activeTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === activeTrack.id);
    let prevTrack: Track | null = null;
    if (currentIndex > 0) {
      prevTrack = tracks[currentIndex - 1];
    } else if (tracks.length > 0) {
      prevTrack = tracks[tracks.length - 1]; // Wrap around
    }
    if (prevTrack) {
      setAutoplayIntentRef.current?.(true);
      setActiveTrack(prevTrack);
      setIsPlaying(true);
    }
  }, [activeTrack, tracks]);

  // 5. Progress Update Callback
  const handleProgressUpdated = useCallback((trackId: string, progress: ListeningProgress) => {
    setProgressMap(prev => ({
      ...prev,
      [trackId]: progress
    }));
  }, []);

  // 6. Favorite Toggle
  const handleToggleFavorite = async (surahNumber: number) => {
    const updated = await toggleFavorite(userId, surahNumber);
    setFavorites(updated);
  };

  const handleFirebaseConfigUpdated = () => {
    initializeFirebase();
    getAllProgress(userId).then(setProgressMap);
  };

  // Use audio hook — returns controls + audio element
  const audio = useAudioPlayer({
    track: activeTrack,
    userId,
    isPlaying,
    onPlayStateChange: setIsPlaying,
    onNextTrack: handleNextTrack,
    onPrevTrack: handlePrevTrack,
    onProgressUpdated: handleProgressUpdated
  });

  // Store the autoplay intent setter
  useEffect(() => {
    setAutoplayIntentRef.current = audio.setAutoplayIntent;
  }, [audio.setAutoplayIntent]);

  return (
    <div className="app-container">
      {/* Hidden audio element */}
      {audio.audioElement}

      {/* Full-Screen Player */}
      <PlayerScreen
        track={activeTrack}
        isPlaying={isPlaying}
        isBuffering={audio.isBuffering}
        isRetrying={audio.isRetrying}
        loadError={audio.loadError}
        currentTime={audio.currentTime}
        duration={audio.duration}
        playbackSpeed={audio.playbackSpeed}
        repeatMode={audio.repeatMode}
        sleepTimer={audio.sleepTimer}
        sleepRemainingSeconds={audio.sleepRemainingSeconds}
        volume={audio.volume}
        isMuted={audio.isMuted}
        isFavorite={activeTrack ? favorites.includes(activeTrack.surahNumber) : false}
        theme={theme}
        onTogglePlay={audio.handleTogglePlay}
        onSeek={audio.handleSeek}
        onSkip={audio.handleSkip}
        onRetry={audio.handleRetry}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onCycleSpeed={audio.cycleSpeed}
        onToggleRepeat={audio.toggleRepeat}
        onSetSleepTimer={audio.handleSetSleepTimer}
        onToggleMute={audio.toggleMute}
        onVolumeChange={audio.handleVolumeChange}
        onToggleFavorite={() => {
          if (activeTrack && activeTrack.surahNumber > 0) {
            handleToggleFavorite(activeTrack.surahNumber);
          }
        }}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Surah Drawer */}
      <SurahDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tracks={reciterTracks}
        queueTracks={queueTracks}
        activeTrackId={activeTrack?.id || null}
        isPlaying={isPlaying}
        progressMap={progressMap}
        favorites={favorites}
        selectedReciterId={selectedReciter.id}
        onSelectReciter={handleSelectReciter}
        onToggleFavorite={handleToggleFavorite}
        onSelectTrack={handleSelectTrack}
        playlists={playlists}
        activePlaylist={activePlaylist}
        onCreatePlaylist={handleCreatePlaylist}
        onRenamePlaylist={handleRenamePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onActivatePlaylist={handleActivatePlaylist}
        onExitPlaylist={exitPlaylistQueue}
        onAddTrackToPlaylist={handleAddTrackToPlaylist}
        onRemovePlaylistItem={handleRemovePlaylistItem}
        onMovePlaylistItem={handleMovePlaylistItem}
        onChangePlaylistItemReciter={handleChangePlaylistItemReciter}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
        onUserIdChanged={(newId) => setUserId(newId)}
        onConfigUpdated={handleFirebaseConfigUpdated}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        accent={accent}
        onChangeAccent={handleChangeAccent}
      />
    </div>
  );
};

export default App;
