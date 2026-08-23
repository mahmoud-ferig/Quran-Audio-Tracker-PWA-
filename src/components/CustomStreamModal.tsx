import React, { useState, useEffect } from 'react';
import { X, Radio, Music, Plus } from 'lucide-react';
import type { Track } from '../types';
import { createCustomTrack, fetchPlaylistTracks } from '../services/soundcloud';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddTracks: (tracks: Track[]) => void;
}

export const CustomStreamModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddTracks
}) => {
  const [streamType, setStreamType] = useState<'custom' | 'soundcloud'>('custom');
  const [title, setTitle] = useState('');
  const [reciter, setReciter] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Dismiss on Escape key
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

  if (!isOpen) return null;

  const handleAddDirectStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioUrl.trim() || !title.trim()) {
      setErrorMsg('Please provide a title and valid audio stream URL.');
      return;
    }

    const newTrack = createCustomTrack(
      title.trim(),
      audioUrl.trim(),
      reciter.trim() || 'Custom Stream'
    );

    onAddTracks([newTrack]);
    onClose();
  };

  const handleFetchSoundCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistId.trim()) {
      setErrorMsg('Please enter a SoundCloud playlist ID.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const tracks = await fetchPlaylistTracks(playlistId.trim());
      if (tracks.length === 0) {
        throw new Error('No playable tracks found in playlist.');
      }
      onAddTracks(tracks);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch playlist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-stream-modal-title"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="custom-stream-modal-title">Custom Audio Stream</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal" title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="settings-tabs-header">
          <button
            className={`control-btn ${streamType === 'custom' ? 'active' : ''}`}
            onClick={() => setStreamType('custom')}
          >
            <Radio size={14} style={{ marginRight: 6 }} />
            Direct Stream / MP3 URL
          </button>

          <button
            className={`control-btn ${streamType === 'soundcloud' ? 'active' : ''}`}
            onClick={() => setStreamType('soundcloud')}
          >
            <Music size={14} style={{ marginRight: 6 }} />
            SoundCloud Playlist
          </button>
        </div>

        {errorMsg && (
          <div className="form-error-alert">
            {errorMsg}
          </div>
        )}

        {streamType === 'custom' ? (
          <form onSubmit={handleAddDirectStream}>
            <div className="form-group">
              <label className="form-label">Track / Surah Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Surah Al-Kahf - Live Makkah"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reciter / Artist Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sheikh Bandar Baleela"
                value={reciter}
                onChange={(e) => setReciter(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Direct Audio Stream URL (MP3 / AAC / HTTPS) *</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://..."
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primary-btn">
              <Plus size={16} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
              Add to Playlist
            </button>
          </form>
        ) : (
          <form onSubmit={handleFetchSoundCloud}>
            <p className="settings-desc">
              Import a playlist directly from SoundCloud using its Playlist ID. Make sure your SoundCloud Client ID is configured in Settings.
            </p>

            <div className="form-group">
              <label className="form-label">SoundCloud Playlist ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 123456789"
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="primary-btn" disabled={isLoading}>
              {isLoading ? 'Fetching Playlist...' : 'Import Playlist'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

