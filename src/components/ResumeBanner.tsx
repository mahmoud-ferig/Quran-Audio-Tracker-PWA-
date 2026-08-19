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
    <div className="resume-banner">
      <div className="resume-info">
        <div className="resume-tag">
          <Sparkles size={14} />
          <span>Continue Where You Left Off</span>
        </div>
        <div className="resume-title">
          <span>{session.trackTitle || `Surah ${session.surahNumber}`}</span>
          <span className="resume-arabic">{session.arabicTitle}</span>
        </div>
        <div className="resume-details">
          <span>{session.reciterName}</span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} />
            {formatTime(session.currentTime)} {session.duration > 0 ? `/ ${formatTime(session.duration)}` : 'stopped point'}
          </span>
          {progressPercent > 0 && (
            <>
              <span>•</span>
              <span className="progress-pill">{progressPercent}% complete</span>
            </>
          )}
        </div>
      </div>

      <button className="resume-btn" onClick={() => onResume(session)}>
        <Play size={18} fill="currentColor" />
        <span>Resume Recitation</span>
      </button>
    </div>
  );
};
