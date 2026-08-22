import React, { useState } from 'react';
import { X, Copy, Check, Cloud, Music, Trash2, ExternalLink, Mail, UserCheck, LogOut } from 'lucide-react';
import type { FirebaseConfigState } from '../types';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  hasCustomFirebaseConfig 
} from '../firebase/config';
import { setUserEmail, removeUserEmail, migrateUserData, getUserEmail } from '../services/storage';
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
  const [activeTab, setActiveTab] = useState<'account' | 'firebase' | 'soundcloud'>('account');
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState(() => getUserEmail() || (userId.includes('@') ? userId : ''));
  const [scClientId, setScClientId] = useState(() => getSoundCloudClientId());
  const [isMigrating, setIsMigrating] = useState(false);

  const [fbConfig, setFbConfig] = useState<FirebaseConfigState>(() => getSavedFirebaseConfig());
  const [isCustomConfig, setIsCustomConfig] = useState(() => hasCustomFirebaseConfig());

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
      // Migrate local data to email account
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Account & Settings</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          <button
            className={`control-btn ${activeTab === 'account' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setActiveTab('account')}
          >
            <Mail size={14} style={{ marginRight: 6 }} />
            Account Sync
          </button>

          <button
            className={`control-btn ${activeTab === 'firebase' ? 'active' : ''}`}
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}
            onClick={() => setActiveTab('firebase')}
          >
            <Cloud size={14} style={{ marginRight: 6 }} />
            Database
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

        {/* Account / Email Sync Tab */}
        {activeTab === 'account' && (
          <form onSubmit={handleLinkEmail}>
            <div style={{
              background: isEmailLinked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isEmailLinked ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-subtle)'}`,
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isEmailLinked ? <UserCheck size={18} color="var(--accent-emerald)" /> : <Mail size={18} color="var(--text-muted)" />}
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isEmailLinked ? 'Email Profile Linked' : 'Guest Profile (Unlinked)'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {isEmailLinked ? `Account: ${userId}` : `Temporary ID: ${userId.substring(0, 12)}...`}
                  </div>
                </div>
              </div>

              {isEmailLinked && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="icon-btn"
                  title="Sign Out / Switch Profile"
                  style={{ color: '#ef4444' }}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Link your email address to sync your listening position, favorite Surahs, and tracker seamlessly across your phone, tablet, and laptop.
            </p>

            <div className="form-group">
              <label className="form-label">Your Email Address</label>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                    className="icon-btn"
                    onClick={handleCopyUserId}
                    title="Copy Email"
                    style={{ height: '42px', width: '42px', flexShrink: 0 }}
                  >
                    {copied ? <Check size={18} color="var(--accent-emerald)" /> : <Copy size={18} />}
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button 
                type="submit" 
                className="primary-btn" 
                style={{ flex: 1 }}
                disabled={isMigrating}
              >
                {isMigrating ? 'Syncing...' : (isEmailLinked ? 'Update Account Email' : 'Link & Sync Email')}
              </button>

              {isEmailLinked && (
                <button
                  type="button"
                  className="control-btn"
                  onClick={handleSignOut}
                  style={{ width: 'auto', padding: '0 14px', fontSize: '0.8rem', color: '#ef4444' }}
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
                    {fbConfig.projectId ? `Project: ${fbConfig.projectId}` : 'All progress saved locally on device.'}
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
              Want to sync your listening bookmarks with your own private Firebase database? Enter your personal Firebase Web App configuration below:
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
