import React, { useState } from 'react';
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Custom Audio Stream</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`control-btn ${streamType === 'custom' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setStreamType('custom')}
          >
            <Radio size={14} style={{ marginRight: 6 }} />
            Direct Stream / MP3 URL
          </button>

          <button
            className={`control-btn ${streamType === 'soundcloud' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setStreamType('soundcloud')}
          >
            <Music size={14} style={{ marginRight: 6 }} />
            SoundCloud Playlist
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '16px' }}>
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
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
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
