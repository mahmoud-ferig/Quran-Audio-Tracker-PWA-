import React from 'react';
import { Settings, Radio, Disc, User, Mail, Sun, Moon } from 'lucide-react';
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
      {/* Brand Logo & Title */}
      <div className="brand-logo" role="banner">
        <div className="brand-icon">
          <Disc size={19} className="animate-spin-slow" />
        </div>
        <div className="brand-text-container">
          <div className="brand-title-row">
            <span className="brand-title">Quran Tracker</span>
            <span className="brand-arabic-subtitle arabic-text">القرآن الكريم</span>
          </div>
        </div>
      </div>

      {/* Action Cluster */}
      <div className="header-actions">
        {/* Unified Sync & Account Profile Pill */}
        <button
          onClick={onOpenSettings}
          className={`header-profile-pill ${isConfigured ? 'synced' : 'local'}`}
          title={
            isConfigured
              ? `Cloud Synced • Logged in as ${isEmail ? userId : 'Guest'}`
              : 'Local Mode • Click to connect Cloud Sync'
          }
          aria-label="Account and Sync Status"
        >
          <span className="sync-pulse-indicator" />
          <span className="profile-pill-icon">
            {isEmail ? <Mail size={12} /> : <User size={12} />}
          </span>
          <span className="profile-pill-label">
            {isEmail ? userId.split('@')[0] : `Guest ${userId.substring(0, 5)}`}
          </span>
        </button>

        {/* Quick Theme Toggle */}
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Custom Stream / Radio */}
        <button
          className="icon-btn custom-stream-btn"
          onClick={onOpenCustomStream}
          title="Add Custom Audio / SoundCloud Stream"
          aria-label="Custom Stream"
        >
          <Radio size={16} />
        </button>

        {/* Settings Button */}
        <button
          className="icon-btn settings-btn"
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

