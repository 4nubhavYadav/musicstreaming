import React, { useState } from 'react';

export const Header = ({ onOpenProfile }) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('sora_user_name') || 'Alex';
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="flex items-center justify-between pt-6 pb-5 px-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold tracking-tight text-charcoal-900 leading-tight">
          {getGreeting()}, {userName}
        </h1>
        <p className="text-xs font-sans text-charcoal-600 mt-1 font-normal tracking-wide">
          Let's listen to something beautiful.
        </p>
      </div>

      <button
        onClick={onOpenProfile}
        className="relative group p-0.5 rounded-full transition-transform active:scale-95 focus:outline-none"
        aria-label="Profile and Settings"
      >
        <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-sage-200/80 shadow-sm bg-parchment-200 flex items-center justify-center">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="100" height="100" fill="#E8DEC9" />
            <circle cx="50" cy="42" r="20" fill="#5F7054" />
            <path
              d="M 22 92 C 22 72, 36 64, 50 64 C 64 64, 78 72, 78 92 Z"
              fill="#526049"
            />
          </svg>
        </div>
      </button>
    </header>
  );
};
