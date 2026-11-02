import React, { useState } from 'react';
import { 
  ChevronDown, 
  MoreHorizontal, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Repeat1, 
  Heart, 
  Moon, 
  Loader2,
  Music2
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const NowPlaying = ({ isOpen, onClose, onOpenSleepTimer }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    queue = [],
    queueIndex = 0,
    playTrack,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    loopToast,
    toggleLike,
    isLiked,
    sleepTimerSecondsLeft,
    isSeekingRef,
    relatedData,
    isLoadingRelated
  } = usePlayer();

  const [dragTime, setDragTime] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [viewMode, setViewMode] = useState('track'); // 'track' | 'queue' | 'related'

  if (!isOpen || !currentTrack) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTime = dragTime !== null ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;
  const posterUrl = currentTrack?.artwork || `https://i.ytimg.com/vi/${currentTrack?.id || 'mehLx_Fjv_c'}/hqdefault.jpg`;

  const handleSeekChange = (e) => {
    isSeekingRef.current = true;
    setDragTime(parseFloat(e.target.value));
  };

  const handleSeekCommit = (e) => {
    isSeekingRef.current = false;
    const newTime = parseFloat(e.target.value);
    seek(newTime);
    setDragTime(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-parchment-100 flex flex-col justify-between pt-safe pb-safe px-6 sm:px-7 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Toast for Loop status */}
      {loopToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-sage-800 text-parchment-50 px-4 py-1.5 rounded-full text-xs font-sans font-medium shadow-zen animate-in fade-in zoom-in duration-150">
          {loopToast}
        </div>
      )}

      {/* Top Bar: Progress Line, Collapse & Options */}
      <div>
        <div className="w-full bg-parchment-300/80 h-1 rounded-full overflow-hidden mt-2 mb-3">
          <div
            className="bg-sage-600 h-full rounded-full transition-all duration-200"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 text-charcoal-600 hover:text-charcoal-900 rounded-full active:bg-parchment-200 transition-colors"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          {/* Mode Switcher: Song | Up Next | Related */}
          <div className="flex items-center bg-parchment-200/70 p-1 rounded-xl border border-sage-200/60 text-[11px] font-sans">
            <button
              onClick={() => setViewMode('track')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'track'
                  ? 'bg-white text-sage-900 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Song
            </button>
            <button
              onClick={() => setViewMode('queue')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                viewMode === 'queue'
                  ? 'bg-white text-sage-900 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <span>Up Next</span>
              {queue.length > 1 && (
                <span className="text-[9px] opacity-70">({queue.length})</span>
              )}
            </button>
            <button
              onClick={() => setViewMode('related')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'related'
                  ? 'bg-white text-sage-900 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Related
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(prev => !prev)}
              className="p-2 text-charcoal-600 hover:text-charcoal-900 rounded-full active:bg-parchment-200 transition-colors"
              aria-label="Options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {showMenu && (
              <div 
                className="absolute right-0 top-10 bg-parchment-50 border border-sage-100 rounded-2xl shadow-zen p-2 min-w-[170px] z-20 text-xs font-sans text-charcoal-800"
                onClick={() => setShowMenu(false)}
              >
                <button
                  onClick={onOpenSleepTimer}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                >
                  <Moon className="w-4 h-4 text-sage-700" />
                  <span>Zen Sleep Timer</span>
                </button>
                <button
                  onClick={() => toggleLike(currentTrack?.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                >
                  <Heart className={`w-4 h-4 ${isLiked(currentTrack?.id) ? 'fill-terracotta-500 text-terracotta-500' : ''}`} />
                  <span>{isLiked(currentTrack?.id) ? 'Favorited' : 'Add to Favorites'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Body: Track View OR Up Next Queue OR Related Shelves */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2">
        {viewMode === 'track' && (
          <div className="h-full flex flex-col justify-center items-center py-2 animate-in fade-in duration-200">
            <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-3xl overflow-hidden shadow-zen border border-black/5 relative group bg-charcoal-900">
              <img
                src={posterUrl}
                alt={currentTrack?.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
                onError={(e) => {
                  e.target.src = `https://i.ytimg.com/vi/${currentTrack?.id || 'mehLx_Fjv_c'}/hqdefault.jpg`;
                }}
              />
            </div>

            {/* Title & Artist */}
            <div className="text-center mt-6 mb-2 px-4 max-w-xs">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal-900 tracking-tight leading-tight truncate">
                {currentTrack?.title || 'A Walk'}
              </h2>
              <p className="font-sans text-sm sm:text-base text-charcoal-600 font-normal mt-1 tracking-wide truncate">
                {currentTrack?.artist || 'Tycho'}
              </p>
              {currentTrack?.album && (
                <p className="text-[11px] font-sans text-charcoal-400 mt-0.5 truncate">
                  {currentTrack.album}
                </p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'queue' && (
          <div className="py-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                Playing Queue ({queue.length})
              </span>
              <span className="text-[10px] text-sage-800 font-medium">
                Auto-replenishing Radio
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {queue.map((track, idx) => {
                const isCurrent = idx === queueIndex;
                return (
                  <div
                    key={`${track.id || track.idYoutube}-${idx}`}
                    onClick={() => playTrack(track, queue)}
                    className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-sage-100/80 border-sage-300 shadow-sm'
                        : 'bg-parchment-50/60 hover:bg-parchment-200 border-sage-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 relative">
                        <img
                          src={track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                          alt={track.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                          }}
                        />
                        {isCurrent && isPlaying && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="w-2 h-2 rounded-full bg-sage-400 animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isCurrent ? 'text-sage-900 font-semibold' : 'text-charcoal-900'}`}>
                          {track.title}
                        </p>
                        <p className="text-[11px] font-sans text-charcoal-500 truncate mt-0.5">
                          {track.artist}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-charcoal-400 tabular-nums flex-shrink-0">
                      {track.duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'related' && (
          <div className="py-2 animate-in fade-in duration-200">
            {isLoadingRelated ? (
              <div className="py-12 text-center text-charcoal-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-sage-700" />
                <span className="text-xs font-sans">Discovering related music...</span>
              </div>
            ) : relatedData?.sections && relatedData.sections.length > 0 ? (
              <div className="flex flex-col gap-5">
                {relatedData.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <h3 className="font-serif text-sm font-semibold text-charcoal-900 px-1">
                      {sec.title}
                    </h3>
                    <div className="flex flex-col gap-2">
                      {sec.items.slice(0, 6).map((item, iIdx) => (
                        <div
                          key={iIdx}
                          onClick={() => {
                            if (item.id) {
                              playTrack(item);
                            }
                          }}
                          className="flex items-center justify-between p-2 rounded-2xl bg-parchment-50/70 hover:bg-parchment-200 border border-sage-100/60 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800">
                              <img
                                src={item.artwork || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = `https://i.ytimg.com/vi/${item.id || 'default'}/hqdefault.jpg`;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-charcoal-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] font-sans text-charcoal-500 truncate mt-0.5">
                                {item.artist}
                              </p>
                            </div>
                          </div>
                          {item.id && (
                            <button
                              className="w-8 h-8 rounded-full bg-sage-700 text-white flex items-center justify-center shadow-sm flex-shrink-0 active:scale-95"
                              aria-label="Play track"
                            >
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-charcoal-500">
                <Music2 className="w-8 h-8 text-sage-600/50 mx-auto mb-2" />
                <p className="text-xs font-sans">No related recommendations for this track.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Section */}
      <div className="pb-6 pt-2">
        {/* Scrubber Bar */}
        <div className="mb-5">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={1}
              value={activeTime}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="w-full cursor-pointer z-10"
              aria-label="Track progress"
            />
          </div>
          <div className="flex justify-between text-[11px] font-sans text-charcoal-400 mt-1.5 tabular-nums">
            <span>{formatTime(activeTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Controls: Prev, Large Sage Play/Pause Disc, Next */}
        <div className="flex items-center justify-center gap-10 mb-6">
          <button
            onClick={prevTrack}
            className="text-sage-800 hover:text-sage-900 active:scale-90 transition-transform p-2"
            aria-label="Previous track"
          >
            <SkipBack className="w-8 h-8 fill-current stroke-none" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-20 h-20 rounded-full bg-sage-700 hover:bg-sage-800 text-white flex items-center justify-center shadow-zen active:scale-95 transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 fill-white stroke-none" />
            ) : (
              <Play className="w-8 h-8 fill-white stroke-none ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="text-sage-800 hover:text-sage-900 active:scale-90 transition-transform p-2"
            aria-label="Next track"
          >
            <SkipForward className="w-8 h-8 fill-current stroke-none" />
          </button>
        </div>

        {/* Secondary Row: Shuffle, Sleep indicator, Heart, Loop */}
        <div className="flex items-center justify-between px-6 text-sage-800">
          {/* Shuffle Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-all active:scale-90 relative ${
              isShuffle ? 'text-sage-900 font-bold' : 'text-charcoal-400 hover:text-sage-800'
            }`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sage-700" />
            )}
          </button>

          {/* Sleep Timer Shortcut */}
          <button
            onClick={onOpenSleepTimer}
            className={`p-2 transition-all active:scale-90 flex items-center gap-1 ${
              sleepTimerSecondsLeft
                ? 'text-terracotta-500 font-medium'
                : 'text-charcoal-400 hover:text-sage-800'
            }`}
            aria-label="Sleep timer"
          >
            <Moon className="w-5 h-5" />
            {sleepTimerSecondsLeft && (
              <span className="text-[10px] font-sans tabular-nums">
                {Math.ceil(sleepTimerSecondsLeft / 60)}m
              </span>
            )}
          </button>

          {/* Like Heart */}
          <button
            onClick={() => toggleLike(currentTrack?.id)}
            className="p-2 transition-all active:scale-90 text-charcoal-400 hover:text-sage-800"
            aria-label="Favorite"
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked(currentTrack?.id)
                  ? 'fill-terracotta-500 text-terracotta-500'
                  : ''
              }`}
            />
          </button>

          {/* Working Loop / Repeat Toggle Button */}
          <button
            onClick={cycleRepeat}
            className={`p-2.5 rounded-full transition-all active:scale-90 relative flex items-center justify-center ${
              repeatMode === 'one'
                ? 'bg-sage-700 text-white shadow-md ring-2 ring-sage-400/50'
                : repeatMode === 'all'
                ? 'bg-sage-100 text-sage-800 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-700'
            }`}
            aria-label={`Loop mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Repeat className={`w-5 h-5 ${repeatMode === 'all' ? 'stroke-[2.5]' : ''}`} />
            )}
            {repeatMode === 'all' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sage-700" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
