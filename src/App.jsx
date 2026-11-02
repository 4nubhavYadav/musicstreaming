import React, { useState, useEffect } from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { HiddenPlayer } from './components/HiddenPlayer';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { NowPlaying } from './components/NowPlaying';
import { MiniPlayer } from './components/MiniPlayer';
import { Navigation } from './components/Navigation';
import { SearchView } from './components/SearchView';
import { LibraryView } from './components/LibraryView';
import { SleepTimerModal } from './components/SleepTimerModal';
import { checkAppUpdate, performApkUpdate } from './services';
import { Download, Sparkles, X, Loader2 } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const { isNowPlayingOpen, closeNowPlaying } = usePlayer();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('SW register notice', err);
      });
    }

    // Phase 6: Check for in-app APK updates on launch
    checkAppUpdate().then((info) => {
      if (info && info.updateAvailable) {
        setUpdateInfo(info);
      }
    });
  }, []);

  // Listen to visualViewport resize to detect mobile virtual keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      const isShrunk = window.visualViewport.height < window.innerHeight - 130;
      setIsKeyboardOpen(isShrunk);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport.removeEventListener('resize', handleResize);
  }, []);

  const shouldHideFloatingBars = isSearchFocused || isKeyboardOpen;

  const handleStartUpdate = async () => {
    if (!updateInfo?.apkUrl || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await performApkUpdate(updateInfo.apkUrl, (percent) => {
        setDownloadProgress(percent);
      });
    } catch (err) {
      console.warn('Update failed:', err);
      alert('Could not download update: ' + err.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="h-full w-full bg-black flex justify-center items-start sm:items-center sm:min-h-screen sm:p-4 overflow-hidden">
      {/* Mobile Frame Container (border removed, clean full mobile viewport) */}
      <div className="w-full max-w-md h-full sm:h-[844px] sm:max-h-[896px] sm:rounded-[44px] bg-black shadow-2xl relative overflow-hidden flex flex-col">
        
        {/* Invisible YouTube Audio Engine (Zero Video) */}
        <HiddenPlayer />

        {/* Content Views */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32 pt-safe">
          {activeTab === 'home' && (
            <>
              <Header onOpenSleepTimer={() => setIsSleepTimerOpen(true)} />
              <HomeView
                onOpenAll={() => setActiveTab('library')}
                onOpenSearch={() => setActiveTab('search')}
              />
            </>
          )}

          {activeTab === 'search' && (
            <SearchView onFocusChange={setIsSearchFocused} />
          )}
          {activeTab === 'library' && <LibraryView />}
        </main>

        {/* Floating Mini Player (Hidden when keyboard/search active) */}
        {!shouldHideFloatingBars && <MiniPlayer />}

        {/* Floating Bottom Dock Navigation (Hidden when keyboard/search active) */}
        {!shouldHideFloatingBars && (
          <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
        )}

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

        {/* Phase 6: In-App APK Update Dialog */}
        {updateInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-xs bg-parchment-50 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-charcoal-900">
                  <Sparkles className="w-4 h-4 text-charcoal-800" />
                  <span className="font-serif font-semibold text-sm text-charcoal-900">
                    Update Available
                  </span>
                </div>
                {!isDownloading && (
                  <button
                    onClick={() => setUpdateInfo(null)}
                    className="p-1 rounded-full text-charcoal-400 hover:text-charcoal-800 hover:bg-parchment-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-charcoal-800">
                  Sora v{updateInfo.remoteVersionName}
                </p>
                <p className="text-[11px] font-sans text-charcoal-500 leading-relaxed">
                  {updateInfo.notes}
                </p>
              </div>

              {isDownloading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-charcoal-500">
                    <span>Downloading...</span>
                    <span>{downloadProgress !== null ? `${downloadProgress}%` : ''}</span>
                  </div>
                  <div className="w-full h-2 bg-parchment-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage-700 transition-all duration-200"
                      style={{ width: `${downloadProgress || 10}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {!isDownloading && (
                  <button
                    onClick={() => setUpdateInfo(null)}
                    className="flex-1 py-2 rounded-xl text-xs font-sans text-charcoal-500 hover:text-charcoal-800 hover:bg-parchment-200 transition-colors"
                  >
                    Later
                  </button>
                )}
                <button
                  disabled={isDownloading}
                  onClick={handleStartUpdate}
                  className="flex-1 py-2 px-3 rounded-xl bg-sage-700 hover:bg-sage-800 active:scale-95 text-black text-xs font-sans font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Installing...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-black" />
                      <span>Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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
