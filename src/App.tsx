import React, { useState, useEffect, useCallback } from 'react';
import type { Track, Reciter, ListeningProgress, LastSession } from './types';
import { RECITERS, getTracksForReciter, generateTrackForSurah, SURAH_METADATA } from './services/quranData';
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
import type { ThemeMode, AccentColor } from './services/theme';
import { Header } from './components/Header';
import { ResumeBanner } from './components/ResumeBanner';
import { ReciterSelector } from './components/ReciterSelector';
import { TrackList } from './components/TrackList';
import { AudioPlayer } from './components/AudioPlayer';
import { SettingsModal } from './components/SettingsModal';
import { CustomStreamModal } from './components/CustomStreamModal';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [accent, setAccent] = useState<AccentColor>(() => getStoredAccent());
  const [userId, setUserId] = useState<string>(getOrCreateUserId());
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(() => initializeFirebase().isConfigured);
  const [selectedReciter, setSelectedReciter] = useState<Reciter>(RECITERS[0]);
  const [tracks, setTracks] = useState<Track[]>(() => getTracksForReciter(RECITERS[0]));
  const [activeTrack, setActiveTrack] = useState<Track | null>(() => getTracksForReciter(RECITERS[0])[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progressMap, setProgressMap] = useState<Record<string, ListeningProgress>>({});
  const [lastSession, setLastSession] = useState<LastSession | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

  // Apply theme & accent on mount and when changed
  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  const handleToggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next, accent);
  };

  const handleChangeAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
    applyTheme(theme, newAccent);
  };

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomStreamOpen, setIsCustomStreamOpen] = useState(false);

  // 1. Initial & Account Change Load + Auto-Sync on Tab Focus
  useEffect(() => {
    const initData = async () => {
      try {
        const [prog, session, favs, settings] = await Promise.all([
          getAllProgress(userId),
          getLastSession(userId),
          getFavorites(userId),
          getUserSettings(userId)
        ]);
        setProgressMap(prog);
        setLastSession(session);
        setFavorites(favs);

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

        // Always ensure an active track is loaded for the persistent player bar
        if (session && session.surahNumber > 0) {
          const surah = SURAH_METADATA.find(s => s.number === session.surahNumber);
          if (surah) {
            setActiveTrack(generateTrackForSurah(surah, reciterToUse));
          }
        } else if (reciterTracks.length > 0) {
          setActiveTrack(reciterTracks[0]);
        }
      } catch (err) {
        console.error('Error initializing tracker data:', err);
      }
    };

    initData();

    // Auto sync when user switches tabs or unlocks their phone
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        initData();
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

    // If currently playing a track from another reciter, switch active track to the new reciter's stream
    if (activeTrack && activeTrack.surahNumber > 0) {
      const correspondingSurah = SURAH_METADATA.find(s => s.number === activeTrack.surahNumber);
      if (correspondingSurah) {
        const updatedTrack = generateTrackForSurah(correspondingSurah, reciter);
        setActiveTrack(updatedTrack);
      }
    }
  };

  // 3. Handle Track Selection
  const handleSelectTrack = (track: Track) => {
    setActiveTrack(track);
    setIsPlaying(true);
  };

  // 4. Handle Resume Session
  const handleResumeSession = (session: LastSession) => {
    // Find matching reciter
    const reciter = RECITERS.find(r => r.id === session.reciterId) || selectedReciter;
    if (reciter.id !== selectedReciter.id) {
      setSelectedReciter(reciter);
      setTracks(getTracksForReciter(reciter));
    }

    const surah = SURAH_METADATA.find(s => s.number === session.surahNumber);
    if (surah) {
      const trackToPlay = generateTrackForSurah(surah, reciter);
      setActiveTrack(trackToPlay);
      setIsPlaying(true);
    }
  };

  // 5. Handle Next / Prev Track
  const handleNextTrack = () => {
    if (!activeTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === activeTrack.id);
    if (currentIndex >= 0 && currentIndex < tracks.length - 1) {
      handleSelectTrack(tracks[currentIndex + 1]);
    } else if (tracks.length > 0) {
      handleSelectTrack(tracks[0]);
    }
  };

  const handlePrevTrack = () => {
    if (!activeTrack) return;
    const currentIndex = tracks.findIndex(t => t.id === activeTrack.id);
    if (currentIndex > 0) {
      handleSelectTrack(tracks[currentIndex - 1]);
    } else if (tracks.length > 0) {
      handleSelectTrack(tracks[tracks.length - 1]);
    }
  };

  // 6. Progress Update Callback
  const handleProgressUpdated = useCallback((trackId: string, progress: ListeningProgress) => {
    setProgressMap(prev => ({
      ...prev,
      [trackId]: progress
    }));

    if (activeTrack && activeTrack.id === trackId) {
      setLastSession({
        trackId: activeTrack.id,
        surahNumber: activeTrack.surahNumber,
        reciterId: activeTrack.reciterId,
        trackTitle: activeTrack.name,
        arabicTitle: activeTrack.arabicName,
        reciterName: activeTrack.reciterName,
        currentTime: progress.currentTime,
        duration: progress.duration,
        updatedAt: progress.updatedAt
      });
    }
  }, [activeTrack]);

  // 7. Favorite Toggle
  const handleToggleFavorite = async (surahNumber: number) => {
    const updated = await toggleFavorite(userId, surahNumber);
    setFavorites(updated);
  };

  // 8. Add Custom Tracks / SoundCloud
  const handleAddCustomTracks = (newTracks: Track[]) => {
    setTracks(prev => [...newTracks, ...prev]);
    if (newTracks.length > 0) {
      setActiveTrack(newTracks[0]);
    }
  };

  const handleFirebaseConfigUpdated = () => {
    const { isConfigured } = initializeFirebase();
    setIsFirebaseConfigured(isConfigured);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        isConfigured={isFirebaseConfigured}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCustomStream={() => setIsCustomStreamOpen(true)}
        userId={userId}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Resume Banner */}
        <ResumeBanner
          session={lastSession}
          onResume={handleResumeSession}
        />

        {/* Reciters List */}
        <ReciterSelector
          selectedReciterId={selectedReciter.id}
          onSelectReciter={handleSelectReciter}
        />

        {/* Surahs / Tracks List */}
        <TrackList
          tracks={tracks}
          activeTrackId={activeTrack?.id || null}
          isPlaying={isPlaying}
          progressMap={progressMap}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onSelectTrack={handleSelectTrack}
        />
      </main>

      {/* Sticky Bottom Audio Player with Full Screen Sheet */}
      <AudioPlayer
        track={activeTrack}
        userId={userId}
        isFavorite={activeTrack ? favorites.includes(activeTrack.surahNumber) : false}
        onToggleFavorite={() => {
          if (activeTrack && activeTrack.surahNumber > 0) {
            handleToggleFavorite(activeTrack.surahNumber);
          }
        }}
        onNextTrack={handleNextTrack}
        onPrevTrack={handlePrevTrack}
        onProgressUpdated={handleProgressUpdated}
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

      {/* Custom Stream / SoundCloud Modal */}
      <CustomStreamModal
        isOpen={isCustomStreamOpen}
        onClose={() => setIsCustomStreamOpen(false)}
        onAddTracks={handleAddCustomTracks}
      />
    </div>
  );
};

export default App;
