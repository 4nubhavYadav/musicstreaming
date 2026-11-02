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
      className="fixed inset-0 z-50 bg-charcoal-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-parchment-100 rounded-3xl p-6 shadow-zen border border-sage-100 animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center text-sage-800">
              <Moon className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-charcoal-900">
              Zen Sleep Timer
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-sans text-charcoal-600 mb-5 leading-relaxed">
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
                    ? 'bg-sage-700 text-white shadow-sm'
                    : 'bg-parchment-50 text-charcoal-800 hover:bg-parchment-200 border border-sage-100/60'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}

          {sleepTimerMinutes && (
            <button
              onClick={() => handleSelect(null)}
              className="w-full p-3 rounded-2xl text-xs font-sans font-medium text-terracotta-500 hover:bg-terracotta-100/50 mt-1 transition-colors"
            >
              Turn Off Timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
