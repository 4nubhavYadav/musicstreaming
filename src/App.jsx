import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { HiddenPlayer } from './components/HiddenPlayer';
import { Header } from './components/Header';
import { RecentlyPlayed } from './components/RecentlyPlayed';
import { NowPlaying } from './components/NowPlaying';
import { MiniPlayer } from './components/MiniPlayer';
import { Navigation } from './components/Navigation';
import { SearchView } from './components/SearchView';
import { LibraryView } from './components/LibraryView';
import { SleepTimerModal } from './components/SleepTimerModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);

  const { isNowPlayingOpen, closeNowPlaying } = usePlayer();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW register notice', err);
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F0EBE1] flex justify-center items-center sm:p-4">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] sm:max-h-[896px] sm:rounded-[44px] bg-parchment-100 shadow-2xl relative overflow-hidden flex flex-col border border-black/5">
        
        {/* Invisible YouTube Audio Engine (Zero Video) */}
        <HiddenPlayer />

        {/* Content Views */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32 pt-safe">
          {activeTab === 'home' && (
            <>
              <Header onOpenSleepTimer={() => setIsSleepTimerOpen(true)} />
              <RecentlyPlayed onOpenAll={() => setActiveTab('library')} />
            </>
          )}

          {activeTab === 'search' && <SearchView />}
          {activeTab === 'library' && <LibraryView />}
        </main>

        {/* Floating Mini Player (Expands to Now Playing on click) */}
        <MiniPlayer />

        {/* Floating Bottom Dock Navigation (Home, Search, Library) */}
        <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Full-Screen Now Playing View */}
        <NowPlaying
          isOpen={isNowPlayingOpen}
          onClose={closeNowPlaying}
          onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        />

        {/* Sleep Timer Modal */}
        <SleepTimerModal
          isOpen={isSleepTimerOpen}
          onClose={() => setIsSleepTimerOpen(false)}
        />

      </div>
    </div>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <MainApp />
    </PlayerProvider>
  );
}
