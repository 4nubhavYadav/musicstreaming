import React, { useState } from 'react';
import { Download, Moon, User, Check, Sparkles, ShieldCheck, Heart } from 'lucide-react';

export const ProfileView = ({ onOpenSleepTimer, deferredPrompt, onInstallPwa }) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('sora_user_name') || 'Alex';
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setUserName(val);
    localStorage.setItem('sora_user_name', val);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="px-6 pt-6 pb-28 animate-in fade-in duration-200">
      <h2 className="font-serif text-2xl font-semibold text-charcoal-900 mb-1">
        Profile & Settings
      </h2>
      <p className="text-xs font-sans text-charcoal-600 mb-6">
        Personalize your calm listening environment.
      </p>

      {/* User Name Card */}
      <div className="bg-parchment-50 border border-sage-100 rounded-3xl p-5 shadow-sm mb-4">
        <label className="block text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-2">
          Your Name / Greeting
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userName}
            onChange={handleNameChange}
            className="flex-1 bg-parchment-200/60 border border-sage-200/70 rounded-xl px-3.5 py-2 text-xs font-medium text-charcoal-900 focus:outline-none focus:border-sage-600"
            placeholder="Your name"
          />
          {isSaved && (
            <span className="text-[11px] text-sage-800 flex items-center gap-1 font-medium animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* PWA Install Button */}
      <div className="bg-parchment-50 border border-sage-100 rounded-3xl p-5 shadow-sm mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-charcoal-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-sage-700" />
              <span>Install Sora App (PWA)</span>
            </h3>
            <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
              Add Sora directly to your phone's home screen for full-screen audio and offline access.
            </p>
          </div>
        </div>

        <button
          onClick={onInstallPwa}
          className="w-full bg-sage-700 hover:bg-sage-800 active:scale-98 text-white rounded-xl py-2.5 px-4 text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Add to Mobile Home Screen</span>
        </button>
      </div>

      {/* Sleep Timer Setting */}
      <div 
        onClick={onOpenSleepTimer}
        className="bg-parchment-50 border border-sage-100 rounded-3xl p-5 shadow-sm mb-4 cursor-pointer hover:bg-parchment-200/50 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center text-sage-800">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-medium text-charcoal-900">Zen Sleep Timer</h4>
            <p className="text-[11px] text-charcoal-600">Gradual volume fade at bedtime</p>
          </div>
        </div>
        <span className="text-xs font-medium text-sage-800">Configure &gt;</span>
      </div>

      {/* About Section */}
      <div className="p-4 rounded-2xl bg-parchment-200/40 border border-sage-100/50 text-center">
        <p className="text-[11px] font-sans text-charcoal-600">
          Sora · Pure Audio Streaming
        </p>
        <p className="text-[10px] text-charcoal-400 mt-0.5">
          Zero video · Clean typography · Powered by YouTube free API
        </p>
      </div>
    </div>
  );
};
