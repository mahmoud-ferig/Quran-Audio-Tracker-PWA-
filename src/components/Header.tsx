import React from 'react';
import { Settings, Cloud, HardDrive, Radio, Disc, User, Mail, Sun, Moon } from 'lucide-react';
import type { ThemeMode } from '../services/theme';

interface Props {
  isConfigured: boolean;
  onOpenSettings: () => void;
  onOpenCustomStream: () => void;
  userId: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const Header: React.FC<Props> = ({
  isConfigured,
  onOpenSettings,
  onOpenCustomStream,
  userId,
  theme,
  onToggleTheme
}) => {
  const isEmail = userId.includes('@');

  return (
    <header className="app-header">
      <div className="brand-logo">
        <div className="brand-icon">
          <Disc size={18} className="animate-spin-slow" />
        </div>
        <div className="brand-text-container">
          <div className="brand-title">Quran Audio Tracker</div>
          <button
            onClick={onOpenSettings}
            className="user-profile-btn"
            title={isEmail ? `Logged in as ${userId}` : 'Click to link your email for multi-device sync'}
          >
            {isEmail ? <Mail size={10} /> : <User size={10} />}
            <span className="user-email-text">{isEmail ? userId : `Guest (${userId.substring(0, 8)})`}</span>
          </button>
        </div>
      </div>

      <div className="header-actions">
        <div 
          className={`badge-status ${isConfigured ? '' : 'offline'}`}
          title={isConfigured ? 'Connected to Firebase Firestore' : 'Running in Offline Local Storage mode'}
        >
          {isConfigured ? <Cloud size={13} /> : <HardDrive size={13} />}
          <span className="badge-text">{isConfigured ? 'Synced' : 'Local'}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <button
          className="icon-btn"
          onClick={onOpenCustomStream}
          title="Add SoundCloud / Custom Stream"
          aria-label="Add SoundCloud or Custom Stream"
        >
          <Radio size={16} />
        </button>

        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Settings & Sync"
          aria-label="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
