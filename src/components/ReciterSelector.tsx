import React from 'react';
import type { Reciter } from '../types';
import { RECITERS } from '../services/quranData';

interface Props {
  selectedReciterId: string;
  onSelectReciter: (reciter: Reciter) => void;
}

export const ReciterSelector: React.FC<Props> = ({
  selectedReciterId,
  onSelectReciter
}) => {
  return (
    <section style={{ marginBottom: '24px' }}>
      <div className="section-title">
        <span>Select Reciter (القراء)</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
          {RECITERS.length} Reciters Available
        </span>
      </div>

      <div className="reciter-scroll-container">
        {RECITERS.map((reciter) => {
          const isActive = reciter.id === selectedReciterId;
          return (
            <div
              key={reciter.id}
              className={`reciter-card ${isActive ? 'active' : ''}`}
              onClick={() => onSelectReciter(reciter)}
            >
              <img
                src={reciter.photoUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                alt={reciter.name}
                className="reciter-avatar"
                loading="lazy"
              />
              <div className="reciter-name" title={reciter.name}>
                {reciter.name}
              </div>
              <div className="arabic-text" style={{ fontSize: '0.85rem', color: 'var(--accent-gold-light)', marginTop: '2px' }}>
                {reciter.arabicName}
              </div>
              <div className="reciter-style">
                {reciter.style}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
