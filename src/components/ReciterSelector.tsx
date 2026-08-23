import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { Reciter } from '../types';
import { RECITERS } from '../services/quranData';

interface Props {
  selectedReciterId: string;
  onSelectReciter: (reciter: Reciter) => void;
  onOpenCustomStream?: () => void;
}

export const ReciterSelector: React.FC<Props> = ({
  selectedReciterId,
  onSelectReciter,
  onOpenCustomStream
}) => {
  const [styleFilter, setStyleFilter] = useState<string>('all');

  const filteredReciters = useMemo(() => {
    if (styleFilter === 'all') return RECITERS;
    if (styleFilter === 'murattal') return RECITERS.filter(r => r.style.toLowerCase().includes('murattal'));
    if (styleFilter === 'mujawwad') return RECITERS.filter(r => r.style.toLowerCase().includes('mujawwad'));
    if (styleFilter === 'haram') return RECITERS.filter(r => r.style.toLowerCase().includes('haram'));
    return RECITERS;
  }, [styleFilter]);

  return (
    <section className="reciters-section">
      <div className="section-header">
        <div className="section-title">
          <span>Select Reciter</span>
          <span className="section-arabic-title arabic-text">اختر القارئ</span>
        </div>

        {/* Style Filter Chips */}
        <div className="reciter-style-chips">
          <button 
            className={`filter-chip ${styleFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStyleFilter('all')}
          >
            All ({RECITERS.length})
          </button>
          <button 
            className={`filter-chip ${styleFilter === 'murattal' ? 'active' : ''}`}
            onClick={() => setStyleFilter('murattal')}
          >
            Murattal (مرتل)
          </button>
          <button 
            className={`filter-chip ${styleFilter === 'mujawwad' ? 'active' : ''}`}
            onClick={() => setStyleFilter('mujawwad')}
          >
            Mujawwad (مجود)
          </button>
          <button 
            className={`filter-chip ${styleFilter === 'haram' ? 'active' : ''}`}
            onClick={() => setStyleFilter('haram')}
          >
            Haram Makkah (الحرم)
          </button>
        </div>
      </div>

      <div className="reciter-scroll-container">
        {filteredReciters.map((reciter) => {
          const isActive = reciter.id === selectedReciterId;
          return (
            <div
              key={reciter.id}
              className={`reciter-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectReciter(reciter)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectReciter(reciter);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select reciter ${reciter.name}`}
            >
              <div className="reciter-avatar-wrap">
                <img
                  src={reciter.photoUrl}
                  alt={reciter.name}
                  className="reciter-avatar"
                  loading="lazy"
                />
                {isActive && <span className="reciter-active-dot" />}
              </div>
              <div className="reciter-name" title={reciter.name}>
                {reciter.name}
              </div>
              <div className="reciter-arabic arabic-text">
                {reciter.arabicName}
              </div>
              <div className="reciter-style">
                {reciter.style}
              </div>
            </div>
          );
        })}

        {/* Custom Stream & SoundCloud Discovery Card */}
        {onOpenCustomStream && (
          <div
            className="reciter-card custom-stream-card"
            onClick={onOpenCustomStream}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenCustomStream();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Add custom audio stream or SoundCloud playlist"
          >
            <div className="reciter-avatar-wrap custom-stream-avatar-wrap">
              <div className="custom-stream-icon-box">
                <Plus size={22} />
              </div>
            </div>
            <div className="reciter-name">Custom Stream</div>
            <div className="reciter-arabic arabic-text">بث مخصص</div>
            <div className="reciter-style">SoundCloud / MP3</div>
          </div>
        )}
      </div>
    </section>
  );
};

