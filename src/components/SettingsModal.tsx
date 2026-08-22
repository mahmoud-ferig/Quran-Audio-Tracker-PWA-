import React, { useState } from 'react';
import { X, Copy, Check, Cloud, Database, Music } from 'lucide-react';
import type { FirebaseConfigState } from '../types';
import { getSavedFirebaseConfig, saveFirebaseConfig } from '../firebase/config';
import { setCustomUserId } from '../services/storage';
import { getSoundCloudClientId, setSoundCloudClientId } from '../services/soundcloud';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUserIdChanged: (newId: string) => void;
  onConfigUpdated: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  onUserIdChanged,
  onConfigUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'firebase' | 'soundcloud' | 'user'>('firebase');
  const [copied, setCopied] = useState(false);
  const [inputUserId, setInputUserId] = useState(userId);
  const [scClientId, setScClientId] = useState(() => getSoundCloudClientId());

  const [fbConfig, setFbConfig] = useState<FirebaseConfigState>(() => getSavedFirebaseConfig());

  if (!isOpen) return null;

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    onConfigUpdated();
    alert('Firebase settings saved! Syncing initialized.');
    onClose();
  };

  const handleSaveSoundCloud = (e: React.FormEvent) => {
    e.preventDefault();
    setSoundCloudClientId(scClientId);
    alert('SoundCloud Client ID saved!');
    onClose();
  };

  const handleUpdateUserId = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUserId.trim()) {
      setCustomUserId(inputUserId.trim());
      onUserIdChanged(inputUserId.trim());
      alert('Sync ID updated! Your progress will now sync with this ID.');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Settings & Cloud Sync</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <button
            className={`control-btn ${activeTab === 'firebase' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setActiveTab('firebase')}
          >
            <Cloud size={14} style={{ marginRight: 6 }} />
            Firebase Firestore
          </button>

          <button
            className={`control-btn ${activeTab === 'user' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setActiveTab('user')}
          >
            <Database size={14} style={{ marginRight: 6 }} />
            Sync ID
          </button>

          <button
            className={`control-btn ${activeTab === 'soundcloud' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setActiveTab('soundcloud')}
          >
            <Music size={14} style={{ marginRight: 6 }} />
            SoundCloud
          </button>
        </div>

        {/* Firebase Config Tab */}
        {activeTab === 'firebase' && (
          <form onSubmit={handleSaveFirebase}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Check size={18} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Cloud Firestore Connected
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Project: {fbConfig.projectId || 'quran-audio-tracker-app'}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Your playback progress and favorites are securely synchronized with Cloud Firestore using isolated user IDs.
            </p>

            <details style={{ marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <summary style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '12px' }}>
                Advanced: Custom Project Override
              </summary>

              <div className="form-group">
                <label className="form-label">Firebase API Key</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="AIzaSy..."
                  value={fbConfig.apiKey}
                  onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="my-quran-app"
                  value={fbConfig.projectId}
                  onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">App ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1:123456789:web:abcdef"
                  value={fbConfig.appId}
                  onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                />
              </div>

              <button type="submit" className="primary-btn" style={{ marginTop: '10px' }}>
                Save Custom Configuration
              </button>
            </details>
          </form>
        )}

        {/* Sync / User ID Tab */}
        {activeTab === 'user' && (
          <form onSubmit={handleUpdateUserId}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Your unique Sync ID links your playback bookmarks. Enter the same Sync ID on your phone and laptop to share progress.
            </p>

            <div className="form-group">
              <label className="form-label">Your Active Sync ID</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={inputUserId}
                  onChange={(e) => setInputUserId(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleCopyUserId}
                  title="Copy Sync ID"
                  style={{ height: '42px', width: '42px', flexShrink: 0 }}
                >
                  {copied ? <Check size={18} color="var(--accent-emerald)" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn">
              Apply Sync ID
            </button>
          </form>
        )}

        {/* SoundCloud API Tab */}
        {activeTab === 'soundcloud' && (
          <form onSubmit={handleSaveSoundCloud}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Optionally supply a SoundCloud Client ID to resolve private playlist URLs.
            </p>

            <div className="form-group">
              <label className="form-label">SoundCloud Client ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="Paste your SoundCloud Client ID..."
                value={scClientId}
                onChange={(e) => setScClientId(e.target.value)}
              />
            </div>

            <button type="submit" className="primary-btn">
              Save SoundCloud Client ID
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
