import React from 'react';
import { Play, Sparkles } from 'lucide-react';
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
    <div 
      className="resume-banner-slim" 
      onClick={() => onResume(session)} 
      role="button" 
      tabIndex={0}
      title="Click to resume recitation"
    >
      <div className="resume-slim-left">
        <div className="resume-slim-icon">
          <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
        </div>
        <div className="resume-slim-text">
          <div className="resume-slim-title-row">
            <span className="resume-slim-tag">
              <Sparkles size={11} />
              <span>Resume</span>
            </span>
            <span className="resume-slim-surah">
              {session.trackTitle || `Surah ${session.surahNumber}`}
            </span>
            <span className="resume-slim-arabic arabic-text">{session.arabicTitle}</span>
          </div>
          <div className="resume-slim-meta">
            <span>{session.reciterName}</span>
            <span className="dot-sep">•</span>
            <span>{formatTime(session.currentTime)} / {session.duration > 0 ? formatTime(session.duration) : '--:--'}</span>
          </div>
        </div>
      </div>

      <div className="resume-slim-right">
        {progressPercent > 0 && (
          <span className="resume-slim-pill">{progressPercent}%</span>
        )}
        <button 
          className="resume-slim-btn" 
          onClick={(e) => { e.stopPropagation(); onResume(session); }}
        >
          <span>Play</span>
        </button>
      </div>

      {progressPercent > 0 && (
        <div 
          className="resume-slim-progress" 
          style={{ width: `${progressPercent}%` }} 
        />
      )}
    </div>
  );
};
