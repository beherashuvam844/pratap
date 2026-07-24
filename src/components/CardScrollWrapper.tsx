import React, { useEffect, useRef, useState } from 'react';
import { playCardCollideSound } from '../utils/soundEffects';

interface CardScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  playSoundOnReveal?: boolean;
  key?: React.Key;
}

export function CardScrollWrapper({
  children,
  className = '',
  index = 0,
  playSoundOnReveal = true
}: CardScrollWrapperProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = domRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (playSoundOnReveal) {
              const pitchVariation = 0.85 + (index % 5) * 0.12;
              playCardCollideSound(pitchVariation);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [index, playSoundOnReveal]);

  const splitClass = index % 2 === 0 ? 'card-deck-split-odd' : 'card-deck-split-even';

  return (
    <div
      ref={domRef}
      className={`${className} ${
        isVisible ? splitClass : 'opacity-0 transform translate-y-10 scale-95'
      }`}
      style={{
        animationDelay: `${Math.min((index % 6) * 0.08, 0.4)}s`,
      }}
    >
      {children}
    </div>
  );
}
