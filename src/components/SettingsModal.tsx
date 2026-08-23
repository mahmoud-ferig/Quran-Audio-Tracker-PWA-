import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Cloud, Music, Trash2, ExternalLink, Mail, UserCheck, LogOut, Sun, Moon } from 'lucide-react';
import type { FirebaseConfigState } from '../types';
import { 
  getCustomFirebaseConfigOnly, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  hasCustomFirebaseConfig 
} from '../firebase/config';
import { setUserEmail, removeUserEmail, migrateUserData, getUserEmail } from '../services/storage';
import { getSoundCloudClientId, setSoundCloudClientId } from '../services/soundcloud';
import type { ThemeMode, AccentColor } from '../services/theme';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onUserIdChanged: (newId: string) => void;
  onConfigUpdated: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  accent: AccentColor;
  onChangeAccent: (accent: AccentColor) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  userId,
  onUserIdChanged,
  onConfigUpdated,
  theme,
  onToggleTheme,
  accent,
  onChangeAccent
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'firebase' | 'soundcloud'>('account');
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState(() => getUserEmail() || (userId.includes('@') ? userId : ''));
  const [scClientId, setScClientId] = useState(() => getSoundCloudClientId());
  const [isMigrating, setIsMigrating] = useState(false);

  const [fbConfig, setFbConfig] = useState<FirebaseConfigState>(() => getCustomFirebaseConfigOnly());
  const [isCustomConfig, setIsCustomConfig] = useState(() => hasCustomFirebaseConfig());

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

  const isEmailLinked = userId.includes('@');

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      setIsMigrating(true);
      await migrateUserData(userId, cleanEmail);
      const newId = setUserEmail(cleanEmail);
      onUserIdChanged(newId);
      alert(`Account linked to ${cleanEmail}! Your progress and favorites are now synchronized to this email.`);
      onClose();
    } catch (err) {
      console.error('Error linking email account:', err);
      alert('Error saving email account. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSignOut = () => {
    if (confirm('Sign out from this email account on this device? A new guest session will be created.')) {
      const guestId = removeUserEmail();
      setEmailInput('');
      onUserIdChanged(guestId);
      alert('Signed out. You are now using a local guest profile.');
    }
  };

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbConfig.apiKey.trim() || !fbConfig.projectId.trim()) {
      alert('Please enter a valid Firebase API Key and Project ID.');
      return;
    }
    saveFirebaseConfig(fbConfig);
    setIsCustomConfig(true);
    onConfigUpdated();
    alert('Custom Firebase backend connected! Syncing is now routed to your private database.');
    onClose();
  };

  const handleClearFirebase = () => {
    if (confirm('Disconnect your custom database and revert to the default cloud backend?')) {
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
      alert('Reverted to default cloud backend.');
    }
  };

  const handleSaveSoundCloud = (e: React.FormEvent) => {
    e.preventDefault();
    setSoundCloudClientId(scClientId);
    alert('SoundCloud Client ID saved!');
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" id="settings-modal-title">Account & Settings</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal" title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs-header">
          <button
            className={`control-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <Mail size={14} style={{ marginRight: 6 }} />
            Account Sync
          </button>

          <button
            className={`control-btn ${activeTab === 'firebase' ? 'active' : ''}`}
            onClick={() => setActiveTab('firebase')}
          >
            <Cloud size={14} style={{ marginRight: 6 }} />
            Database
          </button>

          <button
            className={`control-btn ${activeTab === 'soundcloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('soundcloud')}
          >
            <Music size={14} style={{ marginRight: 6 }} />
            SoundCloud
          </button>
        </div>

        {/* Account / Email Sync Tab */}
        {activeTab === 'account' && (
          <form onSubmit={handleLinkEmail}>
            <div className={`settings-account-status ${isEmailLinked ? 'linked' : 'unlinked'}`}>
              <div className="settings-account-info">
                {isEmailLinked ? <UserCheck size={18} color="var(--accent-emerald)" /> : <Mail size={18} color="var(--text-muted)" />}
                <div>
                  <div className="settings-account-title">
                    {isEmailLinked ? 'Email Profile Linked' : 'Guest Profile (Unlinked)'}
                  </div>
                  <div className="settings-account-sub">
                    {isEmailLinked ? `Account: ${userId}` : `Temporary ID: ${userId.substring(0, 12)}...`}
                  </div>
                </div>
              </div>

              {isEmailLinked && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="icon-btn signout-btn"
                  title="Sign Out / Switch Profile"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>

            <p className="settings-desc">
              Link your email address to sync your listening position, favorite Surahs, and tracker seamlessly across your phone, tablet, and laptop.
            </p>

            <div className="form-group">
              <label className="form-label">Your Email Address</label>
              <div className="settings-email-row">
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="e.g. name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                {isEmailLinked && (
                  <button
                    type="button"
                    className="icon-btn copy-btn"
                    onClick={handleCopyUserId}
                    title="Copy Email"
                  >
                    {copied ? <Check size={18} color="var(--accent-emerald)" /> : <Copy size={18} />}
                  </button>
                )}
              </div>
            </div>

            {/* Appearance / Theme Row */}
            <div className="settings-appearance-card">
              <div className="settings-theme-row">
                <div>
                  <div className="settings-item-title">App Theme</div>
                  <div className="settings-item-sub">
                    {theme === 'light' ? 'Light Theme (Default)' : 'Dark Theme'}
                  </div>
                </div>

                <button
                  type="button"
                  className="control-btn theme-switch-btn"
                  onClick={onToggleTheme}
                >
                  {theme === 'light' ? (
                    <>
                      <Moon size={14} style={{ marginRight: 6 }} /> Switch to Dark
                    </>
                  ) : (
                    <>
                      <Sun size={14} style={{ marginRight: 6 }} /> Switch to Light
                    </>
                  )}
                </button>
              </div>

              {/* Accent Color Palette */}
              <div className="settings-accent-row">
                <div className="settings-accent-label">
                  Accent Color (لون التمييز)
                </div>
                <div className="settings-accent-list">
                  {[
                    { id: 'emerald', label: 'Emerald Oasis', color: '#059669' },
                    { id: 'gold', label: 'Royal Gold', color: '#d97706' },
                    { id: 'indigo', label: 'Royal Indigo', color: '#6366f1' },
                    { id: 'sapphire', label: 'Sapphire Blue', color: '#0284c7' }
                  ].map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onChangeAccent(acc.id as AccentColor)}
                      className={`filter-chip ${accent === acc.id ? 'active' : ''}`}
                    >
                      <span 
                        className="accent-circle-preview"
                        style={{ background: acc.color }} 
                      />
                      {acc.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="settings-actions-row">
              <button 
                type="submit" 
                className="primary-btn" 
                disabled={isMigrating}
              >
                {isMigrating ? 'Syncing...' : (isEmailLinked ? 'Update Account Email' : 'Link & Sync Email')}
              </button>

              {isEmailLinked && (
                <button
                  type="button"
                  className="control-btn signout-text-btn"
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
              )}
            </div>
          </form>
        )}

        {/* Firebase Config Tab */}
        {activeTab === 'firebase' && (
          <form onSubmit={handleSaveFirebase}>
            <div className="settings-db-status">
              <div className="settings-account-info">
                <Check size={18} color="var(--accent-emerald)" />
                <div>
                  <div className="settings-account-title">
                    {isCustomConfig ? 'Custom Database Connected' : 'Cloud Firestore Active'}
                  </div>
                  <div className="settings-account-sub">
                    {isCustomConfig ? `Custom Project: ${fbConfig.projectId}` : 'Default Cloud Sync is active under the hood for all users.'}
                  </div>
                </div>
              </div>

              {isCustomConfig && (
                <button
                  type="button"
                  onClick={handleClearFirebase}
                  className="icon-btn signout-btn"
                  title="Disconnect Custom Database"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <p className="settings-desc">
              Want to route your sync to your own private Firebase project instead of the default cloud? Enter your personal credentials:
            </p>

            <div className="form-group">
              <label className="form-label">Custom Firebase API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy..."
                value={fbConfig.apiKey}
                onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom Project ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. my-private-quran-db"
                value={fbConfig.projectId}
                onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Custom App ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 1:123456789:web:abcdef"
                value={fbConfig.appId}
                onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
              />
            </div>

            <div className="settings-actions-row">
              <button type="submit" className="primary-btn">
                Connect Custom Database
              </button>

              {isCustomConfig && (
                <button
                  type="button"
                  className="control-btn signout-text-btn"
                  onClick={handleClearFirebase}
                >
                  Disconnect
                </button>
              )}
            </div>

            <div className="settings-db-footer">
              <span>Want your own free private database?</span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="settings-link"
              >
                Firebase Console <ExternalLink size={10} />
              </a>
            </div>
          </form>
        )}

        {/* SoundCloud API Tab */}
        {activeTab === 'soundcloud' && (
          <form onSubmit={handleSaveSoundCloud}>
            <p className="settings-desc">
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

