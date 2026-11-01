import React from 'react';
import { Home, Search, ListMusic } from 'lucide-react';

export const Navigation = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'library', label: 'Library', icon: ListMusic },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-6 pointer-events-none pb-safe">
      <nav 
        className="pointer-events-auto w-full max-w-xs bg-parchment-50/95 backdrop-blur-lg rounded-full py-1.5 px-4 shadow-dock border border-sage-100/80 flex items-center justify-around"
        aria-label="Main Navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-full transition-all active:scale-95 ${
                isActive
                  ? 'bg-sage-100/90 text-sage-900 font-semibold shadow-sm'
                  : 'text-charcoal-400 hover:text-charcoal-800'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 stroke-[1.8]" />
              <span className="text-[10px] font-sans mt-0.5 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
