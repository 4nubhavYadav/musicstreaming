import React from 'react';
import { Home, Search, ListMusic } from 'lucide-react';

export const Navigation = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: ListMusic },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-t border-white/10 pb-safe select-none"
      aria-label="Main Navigation"
    >
      <div className="w-full max-w-md mx-auto flex items-center justify-around h-14 sm:h-16 px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                isActive
                  ? 'text-charcoal-900 font-semibold'
                  : 'text-charcoal-400 hover:text-charcoal-800'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.2] text-sage-700 scale-105' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-700" />
                )}
              </div>
              <span className={`text-[10px] font-sans mt-1 tracking-tight transition-colors ${
                isActive ? 'text-charcoal-900 font-medium' : 'text-charcoal-500'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
