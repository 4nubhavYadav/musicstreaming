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
  const posterUrl = currentTrack?.artwork || `https://i.ytimg.com/vi/${currentTrack?.id || 'mehLx_Fjv_c'}/hqdefault.jpg`;
  const liked = isLiked ? isLiked(currentTrack?.id) : false;

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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-3xl flex flex-col justify-between pt-safe pb-safe px-6 sm:px-8 max-w-md mx-auto animate-in slide-in-from-bottom duration-300 select-none">
      
      {/* Toast for Loop status */}
      {loopToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-parchment-200/90 backdrop-blur-md text-charcoal-900 border border-white/10 px-4 py-1.5 rounded-full text-xs font-sans font-medium shadow-zen animate-in fade-in zoom-in duration-150">
          {loopToast}
        </div>
      )}

      {/* Top Header Bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-charcoal-400 hover:text-charcoal-900 rounded-full active:scale-90 transition-all"
            aria-label="Collapse player"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          {/* Minimal Status Label */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-sans font-medium tracking-[0.22em] text-charcoal-500 uppercase">
              Now Playing
            </span>
          </div>

          <div className="flex items-center gap-1 relative">
            {/* Quick Sleep Timer Indicator */}
            <button
              onClick={onOpenSleepTimer}
              className={`p-2 rounded-full transition-all active:scale-90 flex items-center gap-1 ${
                sleepTimerSecondsLeft
                  ? 'text-terracotta-400 font-medium'
                  : 'text-charcoal-400 hover:text-charcoal-900'
              }`}
              aria-label="Sleep timer"
            >
              <Moon className="w-4 h-4" />
              {sleepTimerSecondsLeft && (
                <span className="text-[10px] font-sans tabular-nums">
                  {Math.ceil(sleepTimerSecondsLeft / 60)}m
                </span>
              )}
            </button>

            {/* More Options */}
            <button
              onClick={() => setShowMenu(prev => !prev)}
              className="p-2 -mr-2 text-charcoal-400 hover:text-charcoal-900 rounded-full active:scale-90 transition-all"
              aria-label="Options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div 
                className="absolute right-0 top-10 bg-parchment-50 border border-white/10 rounded-2xl shadow-zen p-1.5 min-w-[170px] z-30 text-xs font-sans text-charcoal-800 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowMenu(false)}
              >
                <button
                  onClick={onOpenSleepTimer}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left transition-colors"
                >
                  <Moon className="w-4 h-4 text-charcoal-400" />
                  <span>Zen Sleep Timer</span>
                </button>
                <button
                  onClick={() => toggleLike(currentTrack?.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left transition-colors"
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-terracotta-400 text-terracotta-400' : 'text-charcoal-400'}`} />
                  <span>{liked ? 'Remove Favorite' : 'Add to Favorites'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Minimal Mode Pill Switcher: Track | Up Next | Related */}
        <div className="flex justify-center mt-3 mb-1">
          <div className="flex items-center p-1 bg-parchment-50/80 rounded-full border border-white/5 text-[11px] font-sans">
            <button
              onClick={() => setViewMode('track')}
              className={`px-3.5 py-1 rounded-full font-medium transition-all ${
                viewMode === 'track'
                  ? 'bg-parchment-200 text-charcoal-900 font-semibold shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Track
            </button>
            <button
              onClick={() => setViewMode('queue')}
              className={`px-3.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
                viewMode === 'queue'
                  ? 'bg-parchment-200 text-charcoal-900 font-semibold shadow-sm'
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
              className={`px-3.5 py-1 rounded-full font-medium transition-all ${
                viewMode === 'related'
                  ? 'bg-parchment-200 text-charcoal-900 font-semibold shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Related
            </button>
          </div>
        </div>
      </div>

      {/* Main Body: Track View OR Up Next Queue OR Related Shelves */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-2 min-h-0 flex flex-col justify-center">
        {viewMode === 'track' && (
          <div className="flex flex-col justify-center items-center py-2 animate-in fade-in duration-200">
            {/* Artwork with subtle atmospheric glow */}
            <div className="relative">
              <div 
                className="absolute inset-0 bg-cover bg-center rounded-3xl blur-2xl opacity-20 scale-95 pointer-events-none transition-all duration-700"
                style={{ backgroundImage: `url(${posterUrl})` }}
              />
              <div className="w-[230px] h-[230px] sm:w-[270px] sm:h-[270px] aspect-square rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group bg-parchment-50 z-10">
                <img
                  src={posterUrl}
                  alt={currentTrack?.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-102' : 'group-hover:scale-105'}`}
                  onError={(e) => {
                    e.target.src = `https://i.ytimg.com/vi/${currentTrack?.id || 'mehLx_Fjv_c'}/hqdefault.jpg`;
                  }}
                />
              </div>
            </div>

            {/* Title & Artist */}
            <div className="w-full max-w-xs text-center mt-5 mb-1 px-3 z-10">
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-charcoal-900 tracking-tight leading-snug truncate">
                {currentTrack?.title || 'Unknown Title'}
              </h2>
              <p className="font-sans text-xs sm:text-sm text-charcoal-500 font-normal tracking-wide mt-1 truncate">
                {currentTrack?.artist || 'Unknown Artist'}
              </p>
              {currentTrack?.album && (
                <p className="text-[10px] font-sans text-charcoal-400/70 mt-0.5 truncate">
                  {currentTrack.album}
                </p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'queue' && (
          <div className="h-full py-2 animate-in fade-in duration-200 flex flex-col">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                Playing Queue ({queue.length})
              </span>
              <span className="text-[10px] text-charcoal-500 font-medium">
                Auto-replenishing Radio
              </span>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5 pr-0.5">
              {queue.map((track, idx) => {
                const isCurrent = idx === queueIndex;
                return (
                  <div
                    key={`${track.id || track.idYoutube}-${idx}`}
                    onClick={() => playTrack(track, queue)}
                    className={`flex items-center justify-between p-2 rounded-2xl cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-parchment-200 border-white/20 shadow-sm'
                        : 'bg-parchment-50/70 hover:bg-parchment-200 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-black border border-white/10 relative">
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
                            <span className="w-2 h-2 rounded-full bg-sage-700 animate-ping" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-serif truncate ${isCurrent ? 'text-charcoal-900 font-semibold' : 'text-charcoal-800'}`}>
                          {track.title}
                        </p>
                        <p className="text-[10px] font-sans text-charcoal-500 truncate mt-0.5">
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
          <div className="h-full py-2 animate-in fade-in duration-200 flex flex-col overflow-y-auto no-scrollbar">
            {isLoadingRelated ? (
              <div className="py-12 text-center text-charcoal-500 flex flex-col items-center gap-2 my-auto">
                <Loader2 className="w-5 h-5 animate-spin text-charcoal-400" />
                <span className="text-xs font-sans">Discovering related music...</span>
              </div>
            ) : relatedData?.sections && relatedData.sections.length > 0 ? (
              <div className="flex flex-col gap-4">
                {relatedData.sections.map((sec, sIdx) => (
                  <div key={sIdx} className="space-y-1.5">
                    <h3 className="font-serif text-xs font-semibold text-charcoal-900 px-1">
                      {sec.title}
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      {sec.items.slice(0, 6).map((item, iIdx) => (
                        <div
                          key={iIdx}
                          onClick={() => {
                            if (item.id) {
                              playTrack(item);
                            }
                          }}
                          className="flex items-center justify-between p-2 rounded-2xl bg-parchment-50/70 hover:bg-parchment-200 border border-white/5 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-black border border-white/10">
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
                              <p className="text-xs font-serif font-medium text-charcoal-900 truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] font-sans text-charcoal-500 truncate mt-0.5">
                                {item.artist}
                              </p>
                            </div>
                          </div>
                          {item.id && (
                            <button
                              className="w-7 h-7 rounded-full bg-sage-700 text-black flex items-center justify-center shadow-sm flex-shrink-0 active:scale-95"
                              aria-label="Play track"
                            >
                              <Play className="w-3 h-3 fill-black ml-0.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-charcoal-500 my-auto">
                <Music2 className="w-7 h-7 text-charcoal-400/50 mx-auto mb-2" />
                <p className="text-xs font-sans">No related recommendations for this track.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Section */}
      <div className="pb-5 pt-2">
        {/* Scrubber Bar */}
        <div className="mb-4 px-1">
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
          <div className="flex justify-between text-[10px] font-mono text-charcoal-400 mt-1 tabular-nums">
            <span>{formatTime(activeTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Controls: Prev, Large Play/Pause Disc, Next */}
        <div className="flex items-center justify-center gap-8 mb-4">
          <button
            onClick={prevTrack}
            className="text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform p-2"
            aria-label="Previous track"
          >
            <SkipBack className="w-7 h-7 fill-current stroke-none" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-16 h-16 rounded-full bg-sage-700 hover:bg-sage-800 text-black flex items-center justify-center shadow-zen active:scale-95 transition-all"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-7 h-7 animate-spin text-black" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7 fill-black stroke-none" />
            ) : (
              <Play className="w-7 h-7 fill-black stroke-none ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform p-2"
            aria-label="Next track"
          >
            <SkipForward className="w-7 h-7 fill-current stroke-none" />
          </button>
        </div>

        {/* Secondary Row: Shuffle, Sleep indicator, Heart, Loop */}
        <div className="flex items-center justify-between px-5 text-charcoal-400">
          {/* Shuffle Toggle */}
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-all active:scale-90 relative ${
              isShuffle ? 'text-charcoal-900 font-bold' : 'text-charcoal-400 hover:text-charcoal-800'
            }`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-4 h-4" />
            {isShuffle && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-700" />
            )}
          </button>

          {/* Sleep Timer Shortcut */}
          <button
            onClick={onOpenSleepTimer}
            className={`p-2 transition-all active:scale-90 flex items-center gap-1 ${
              sleepTimerSecondsLeft
                ? 'text-terracotta-400 font-medium'
                : 'text-charcoal-400 hover:text-charcoal-800'
            }`}
            aria-label="Sleep timer"
          >
            <Moon className="w-4 h-4" />
            {sleepTimerSecondsLeft && (
              <span className="text-[9px] font-sans tabular-nums">
                {Math.ceil(sleepTimerSecondsLeft / 60)}m
              </span>
            )}
          </button>

          {/* Like Heart */}
          <button
            onClick={() => toggleLike(currentTrack?.id)}
            className="p-2 transition-all active:scale-90 text-charcoal-400 hover:text-charcoal-800"
            aria-label="Favorite"
          >
            <Heart
              className={`w-4 h-4 ${
                liked ? 'fill-terracotta-400 text-terracotta-400' : ''
              }`}
            />
          </button>

          {/* Working Loop / Repeat Toggle Button */}
          <button
            onClick={cycleRepeat}
            className={`p-2 rounded-full transition-all active:scale-90 relative flex items-center justify-center ${
              repeatMode === 'one'
                ? 'bg-sage-700 text-black shadow-sm ring-1 ring-sage-700/50'
                : repeatMode === 'all'
                ? 'bg-parchment-200 text-charcoal-900 border border-white/10 shadow-sm'
                : 'text-charcoal-400 hover:text-charcoal-800'
            }`}
            aria-label={`Loop mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Repeat className={`w-4 h-4 ${repeatMode === 'all' ? 'stroke-[2.5]' : ''}`} />
            )}
            {repeatMode === 'all' && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-700" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
