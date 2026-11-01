import React from 'react';
import { Moon, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const Header = ({ onOpenSleepTimer }) => {
  const { sleepTimerSecondsLeft } = usePlayer();

  return (
    <header className="flex items-center justify-between pt-7 pb-5 px-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-charcoal-900 leading-tight">
          Sora
        </h1>
        <p className="text-xs font-sans text-charcoal-600 mt-0.5 tracking-wide">
          Audio Only · Zen Music
        </p>
      </div>

      <button
        onClick={onOpenSleepTimer}
        className={`p-2 rounded-full border transition-all active:scale-95 ${
          sleepTimerSecondsLeft
            ? 'bg-terracotta-100/80 border-terracotta-400 text-terracotta-600'
            : 'bg-parchment-200/60 border-sage-200/70 text-charcoal-600 hover:text-charcoal-900'
        }`}
        aria-label="Zen Sleep Timer"
      >
        <Moon className="w-4 h-4" />
      </button>
    </header>
  );
};
