import React from 'react';
import { Radio, Disc, User, Mail, Sun, Moon, ChevronDown } from 'lucide-react';
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
      {/* 1. Left: Brand Logo & Title */}
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

      {/* 2. Center: Quick-Access Unified Center Pill */}
      <div className={`navbar-center-pill ${isConfigured ? 'synced' : 'local'}`}>
        {/* Custom Audio Stream Trigger */}
        <button
          type="button"
          className="center-pill-btn stream-action-btn"
          onClick={onOpenCustomStream}
          title="Add Custom Audio / SoundCloud Stream"
          aria-label="Add Custom Stream"
        >
          <Radio size={13} className="stream-icon-accent" />
          <span className="center-pill-text">Live Stream</span>
        </button>

        <span className="center-pill-divider" aria-hidden="true" />

        {/* Sync & Account Profile Trigger */}
        <button
          type="button"
          className="center-pill-btn account-action-btn"
          onClick={onOpenSettings}
          title={
            isConfigured
              ? `Cloud Synced • Logged in as ${isEmail ? userId : 'Guest'}`
              : 'Local Mode • Click to connect Cloud Sync'
          }
          aria-label="Account and Sync Settings"
        >
          <span className="sync-pulse-indicator" />
          <span className="profile-pill-icon">
            {isEmail ? <Mail size={12} /> : <User size={12} />}
          </span>
          <span className="profile-pill-label">
            {isEmail ? userId.split('@')[0] : `Guest ${userId.substring(0, 5)}`}
          </span>
          <ChevronDown size={11} className="center-pill-chevron" />
        </button>
      </div>

      {/* 3. Right: Theme Toggle */}
      <div className="header-actions">
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
};


