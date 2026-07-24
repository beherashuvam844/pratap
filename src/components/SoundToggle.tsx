import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playCardCollideSound } from '../utils/soundEffects';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggleSound = () => {
    const nextState = !enabled;
    setEnabled(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playCardCollideSound(1.2);
    }
  };

  return (
    <button
      onClick={toggleSound}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-300 card-lift-sm cursor-pointer ${
        enabled
          ? 'bg-slate-900/90 text-amber-400 border-amber-500/40 shadow-amber-950/30'
          : 'bg-slate-950/90 text-slate-500 border-slate-800'
      }`}
      title={enabled ? 'Sound FX Enabled (Card Collision Sound)' : 'Sound FX Muted'}
    >
      {enabled ? (
        <>
          <Volume2 className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 hidden sm:inline">
            Card SFX ON
          </span>
        </>
      ) : (
        <>
          <VolumeX className="h-4 w-4 text-slate-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 hidden sm:inline">
            SFX MUTED
          </span>
        </>
      )}
    </button>
  );
}
