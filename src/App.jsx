import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { HiddenPlayer } from './components/HiddenPlayer';
import { Header } from './components/Header';
import { FeaturedCard } from './components/FeaturedCard';
import { RecentlyPlayed } from './components/RecentlyPlayed';
import { NowPlaying } from './components/NowPlaying';
import { Navigation } from './components/Navigation';
import { SearchView } from './components/SearchView';
import { LibraryView } from './components/LibraryView';
import { ProfileView } from './components/ProfileView';
import { SleepTimerModal } from './components/SleepTimerModal';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const { isNowPlayingOpen, closeNowPlaying, openNowPlaying } = usePlayer();

  // PWA install prompt handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker if supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW register error', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'To install Sora:\n\n• On iOS (Safari): Tap the Share button, then select "Add to Home Screen".\n• On Android (Chrome): Tap the menu (⋮) and select "Install app" or "Add to Home Screen".'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EBE1] flex justify-center items-center sm:p-4">
      {/* Mobile Frame Container */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[844px] sm:max-h-[896px] sm:rounded-[44px] bg-parchment-100 shadow-2xl relative overflow-hidden flex flex-col border border-black/5">
        
        {/* Invisible YouTube Audio Engine */}
        <HiddenPlayer />

        {/* Content Views */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-16 pt-safe">
          {activeTab === 'home' && (
            <>
              <Header onOpenProfile={() => setActiveTab('profile')} />
              <FeaturedCard />
              <RecentlyPlayed onOpenAll={() => setActiveTab('library')} />
            </>
          )}

          {activeTab === 'search' && <SearchView />}
          {activeTab === 'library' && <LibraryView />}
          {activeTab === 'profile' && (
            <ProfileView
              onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
              deferredPrompt={deferredPrompt}
              onInstallPwa={handleInstallPwa}
            />
          )}
        </main>

        {/* Floating Bottom Dock Navigation */}
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
