import React, { useState, useEffect, useCallback } from 'react';
import type { Track, Reciter, ListeningProgress } from './types';
import { RECITERS, getTracksForReciter } from './services/quranData';
import {
  getOrCreateUserId,
  getAllProgress,
  getLastSession,
  getFavorites,
  toggleFavorite,
  getUserSettings,
  saveUserSettings
} from './services/storage';
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
  const [tracks, setTracks] = useState<Track[]>(() => getTracksForReciter(RECITERS[0]));
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressMap, setProgressMap] = useState<Record<string, ListeningProgress>>({});
  const [favorites, setFavorites] = useState<number[]>([]);

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
        setTracks(reciterTracks);

        // Restore last session track (but don't autoplay). Reciters with a
        // partial mushaf (historic recordings) may not have that Surah, so fall
        // back to their first available one.
        const restored =
          session && session.surahNumber > 0
            ? reciterTracks.find(t => t.surahNumber === session.surahNumber)
            : undefined;

        if (restored) {
          setActiveTrack(restored);
        } else if (reciterTracks.length > 0) {
          setActiveTrack(reciterTracks[0]);
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
    setTracks(newTracks);
    saveUserSettings(userId, { preferredReciterId: reciter.id });

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
        tracks={tracks}
        activeTrackId={activeTrack?.id || null}
        isPlaying={isPlaying}
        progressMap={progressMap}
        favorites={favorites}
        selectedReciterId={selectedReciter.id}
        onSelectReciter={handleSelectReciter}
        onToggleFavorite={handleToggleFavorite}
        onSelectTrack={handleSelectTrack}
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
