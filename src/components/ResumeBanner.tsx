import React from 'react';
import { Play, Sparkles, Clock } from 'lucide-react';
import type { LastSession } from '../types';

interface Props {
  session: LastSession | null;
  onResume: (session: LastSession) => void;
}

export const ResumeBanner: React.FC<Props> = ({ session, onResume }) => {
  if (!session) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = session.duration > 0 
    ? Math.min(100, Math.round((session.currentTime / session.duration) * 100))
    : 0;

  return (
    <div className="resume-banner" onClick={() => onResume(session)} role="button" tabIndex={0}>
      <div className="resume-info">
        <div className="resume-tag">
          <Sparkles size={14} className="sparkle-icon" />
          <span>CONTINUE WHERE YOU LEFT OFF</span>
        </div>
        <div className="resume-title">
          <span className="resume-surah-english">{session.trackTitle || `Surah ${session.surahNumber}`}</span>
          <span className="resume-arabic arabic-text">{session.arabicTitle}</span>
        </div>
        <div className="resume-details">
          <span className="resume-reciter">{session.reciterName}</span>
          <span className="dot-sep">•</span>
          <span className="resume-time">
            <Clock size={13} style={{ marginRight: 3, verticalAlign: 'middle' }} />
            {formatTime(session.currentTime)} / {session.duration > 0 ? formatTime(session.duration) : '--:--'}
          </span>
          {progressPercent > 0 && (
            <>
              <span className="dot-sep">•</span>
              <span className="resume-progress-pill">{progressPercent}% complete</span>
            </>
          )}
        </div>
      </div>

      <button className="resume-btn" onClick={(e) => { e.stopPropagation(); onResume(session); }}>
        <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
        <span>Resume Recitation</span>
      </button>

      {/* Subtle bottom progress line */}
      {progressPercent > 0 && (
        <div 
          className="resume-progress-line"
          style={{ width: `${progressPercent}%` }}
        />
      )}
    </div>
  );
};
