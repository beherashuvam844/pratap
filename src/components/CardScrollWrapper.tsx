import React, { useEffect, useRef, useState } from 'react';

interface CardScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  key?: React.Key;
}

export function CardScrollWrapper({
  children,
  className = '',
  index = 0,
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
  }, []);

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
