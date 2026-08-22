import React, { useState } from 'react';
import { X, Copy, Check, Cloud, Database, Music, Trash2, ExternalLink } from 'lucide-react';
import type { FirebaseConfigState } from '../types';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  hasCustomFirebaseConfig 
} from '../firebase/config';
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
  const [isCustomConfig, setIsCustomConfig] = useState(() => hasCustomFirebaseConfig());

  if (!isOpen) return null;

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    setIsCustomConfig(true);
    onConfigUpdated();
    alert('Custom Firebase settings saved! Syncing initialized with your database.');
    onClose();
  };

  const handleClearFirebase = () => {
    if (confirm('Disconnect your custom Firebase backend and revert to local mode?')) {
      clearFirebaseConfig();
      setFbConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      });
      setIsCustomConfig(false);
      onConfigUpdated();
      alert('Firebase backend disconnected. App is now running in local offline mode.');
    }
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
            Firebase Database
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
              background: fbConfig.projectId ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${fbConfig.projectId ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {fbConfig.projectId ? <Check size={18} color="var(--accent-emerald)" /> : <Cloud size={18} color="var(--text-muted)" />}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fbConfig.projectId ? (isCustomConfig ? 'Custom Firebase Backend Active' : 'Cloud Firestore Active') : 'Local Offline Mode (Default)'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {fbConfig.projectId ? `Project: ${fbConfig.projectId}` : 'No cloud backend connected. All progress saved locally on device.'}
                  </div>
                </div>
              </div>

              {isCustomConfig && (
                <button
                  type="button"
                  onClick={handleClearFirebase}
                  className="icon-btn"
                  title="Disconnect Custom Firebase"
                  style={{ color: '#ef4444' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Want to sync your listening bookmarks across all your devices using your own private database? Enter your personal Firebase Web App configuration below:
            </p>

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
                placeholder="e.g. my-quran-app"
                value={fbConfig.projectId}
                onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">App ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1:123456789:web:abcdef"
                value={fbConfig.appId}
                onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button type="submit" className="primary-btn" style={{ flex: 1 }}>
                Save & Connect Backend
              </button>

              {isCustomConfig && (
                <button
                  type="button"
                  className="control-btn"
                  onClick={handleClearFirebase}
                  style={{ width: 'auto', padding: '0 14px', fontSize: '0.8rem', color: '#ef4444' }}
                >
                  Disconnect
                </button>
              )}
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>How to create your own free Firebase backend?</span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-emerald)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                Firebase Console <ExternalLink size={10} />
              </a>
            </div>
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
