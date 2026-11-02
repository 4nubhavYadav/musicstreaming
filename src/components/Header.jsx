import React from 'react';
import { Moon } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const Header = ({ onOpenSleepTimer }) => {
  const { sleepTimerSecondsLeft } = usePlayer();

  return (
    <header className="flex items-center justify-between pt-7 pb-5 px-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-charcoal-900 leading-tight">
          Sora
        </h1>
      </div>

      <button
        onClick={onOpenSleepTimer}
        className={`p-2 rounded-full border transition-all active:scale-95 ${
          sleepTimerSecondsLeft
            ? 'bg-terracotta-100/80 border-terracotta-400 text-terracotta-400'
            : 'bg-parchment-50 border-white/10 text-charcoal-400 hover:text-charcoal-900'
        }`}
        aria-label="Zen Sleep Timer"
      >
        <Moon className="w-4 h-4" />
      </button>
    </header>
  );
};
