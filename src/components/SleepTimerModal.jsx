import React from 'react';
import { Moon, X, Check } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const SleepTimerModal = ({ isOpen, onClose }) => {
  const { sleepTimerMinutes, startSleepTimer } = usePlayer();

  if (!isOpen) return null;

  const timerOptions = [
    { label: '15 Minutes', minutes: 15 },
    { label: '30 Minutes', minutes: 30 },
    { label: '45 Minutes', minutes: 45 },
    { label: '60 Minutes', minutes: 60 },
  ];

  const handleSelect = (mins) => {
    startSleepTimer(mins);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-parchment-50 rounded-3xl p-6 shadow-zen border border-white/10 animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-parchment-200 flex items-center justify-center text-charcoal-800">
              <Moon className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-charcoal-900">
              Zen Sleep Timer
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-900 rounded-full hover:bg-parchment-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-sans text-charcoal-500 mb-5 leading-relaxed">
          Music will gently fade out and stop when the timer finishes.
        </p>

        <div className="flex flex-col gap-2">
          {timerOptions.map((opt) => {
            const isSelected = sleepTimerMinutes === opt.minutes;
            return (
              <button
                key={opt.minutes}
                onClick={() => handleSelect(opt.minutes)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-xs font-sans font-medium transition-all ${
                  isSelected
                    ? 'bg-sage-700 text-black font-semibold shadow-sm'
                    : 'bg-parchment-100 text-charcoal-800 hover:bg-parchment-200 border border-white/10'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-black stroke-[2.5]" />}
              </button>
            );
          })}

          {sleepTimerMinutes && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full p-3 rounded-2xl text-xs font-sans font-medium text-terracotta-400 hover:bg-terracotta-100/20 mt-1 transition-colors"
            >
              Turn Off Timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
