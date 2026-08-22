import React from 'react';
import { Settings, Cloud, HardDrive, Radio, Disc, User, Mail } from 'lucide-react';

interface Props {
  isConfigured: boolean;
  onOpenSettings: () => void;
  onOpenCustomStream: () => void;
  userId: string;
}

export const Header: React.FC<Props> = ({
  isConfigured,
  onOpenSettings,
  onOpenCustomStream,
  userId
}) => {
  const isEmail = userId.includes('@');

  return (
    <header className="app-header">
      <div className="brand-logo">
        <div className="brand-icon">
          <Disc size={22} className="animate-spin-slow" />
        </div>
        <div>
          <div style={{ lineHeight: 1.1 }}>Quran Audio Tracker</div>
          <button
            onClick={onOpenSettings}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              color: isEmail ? 'var(--accent-emerald)' : 'var(--text-muted)',
              fontWeight: 500,
              textAlign: 'left'
            }}
            title={isEmail ? `Logged in as ${userId}` : 'Click to link your email for multi-device sync'}
          >
            {isEmail ? <Mail size={11} /> : <User size={11} />}
            <span>{isEmail ? userId : `Guest (${userId.substring(0, 8)})`}</span>
          </button>
        </div>
      </div>

      <div className="header-actions">
        <div 
          className={`badge-status ${isConfigured ? '' : 'offline'}`}
          title={isConfigured ? 'Connected to Firebase Firestore' : 'Running in Offline Local Storage mode'}
        >
          {isConfigured ? <Cloud size={13} /> : <HardDrive size={13} />}
          <span>{isConfigured ? 'Cloud Synced' : 'Local Mode'}</span>
        </div>

        <button
          className="icon-btn"
          onClick={onOpenCustomStream}
          title="Add SoundCloud / Custom Stream"
          aria-label="Add SoundCloud or Custom Stream"
        >
          <Radio size={18} />
        </button>

        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings & Sync"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
