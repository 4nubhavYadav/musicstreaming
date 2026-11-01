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
  Clock
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const NowPlaying = ({ isOpen, onClose, onOpenSleepTimer }) => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    isShuffle,
    toggleShuffle,
    repeatMode,
    cycleRepeat,
    toggleLike,
    isLiked,
    sleepTimerSecondsLeft,
    isSeekingRef
  } = usePlayer();

  const [dragTime, setDragTime] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTime = dragTime !== null ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

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
    <div className="fixed inset-0 z-50 bg-parchment-100 flex flex-col justify-between pt-safe pb-safe px-7 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
      
      {/* Top Bar: Progress Line, Collapse & Options */}
      <div>
        {/* Subtle Top Slim Line */}
        <div className="w-full bg-parchment-300/80 h-1 rounded-full overflow-hidden mt-2 mb-4">
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

          <span className="text-[11px] font-sans tracking-widest uppercase font-semibold text-charcoal-400">
            Now Playing
          </span>

          <div className="relative">
            <button
              onClick={() => setShowMenu(prev => !prev)}
              className="p-2 text-charcoal-600 hover:text-charcoal-900 rounded-full active:bg-parchment-200 transition-colors"
              aria-label="Options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>

            {/* Menu Dropdown */}
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

      {/* Hero Center Artwork */}
      <div className="flex-1 flex flex-col justify-center items-center py-4">
        <div className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-3xl overflow-hidden shadow-zen border border-black/5 relative group bg-parchment-200">
          <img
            src={currentTrack?.artwork}
            alt={currentTrack?.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />
        </div>

        {/* Title & Artist */}
        <div className="text-center mt-7 mb-2 px-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal-900 tracking-tight leading-tight">
            {currentTrack?.title || 'A Walk'}
          </h2>
          <p className="font-sans text-sm sm:text-base text-charcoal-600 font-normal mt-1 tracking-wide">
            {currentTrack?.artist || 'Tycho'}
          </p>
        </div>
      </div>

      {/* Bottom Controls Section */}
      <div className="pb-8">
        {/* Scrubber Bar */}
        <div className="mb-6">
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
        <div className="flex items-center justify-center gap-10 mb-8">
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
            {isPlaying ? (
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

        {/* Secondary Row: Shuffle, Sleep indicator, Heart, Repeat */}
        <div className="flex items-center justify-between px-6 text-sage-800">
          <button
            onClick={toggleShuffle}
            className={`p-2 transition-all active:scale-90 relative ${
              isShuffle ? 'text-sage-900 font-bold' : 'text-charcoal-400 hover:text-sage-800'
            }`}
            aria-label="Toggle shuffle"
          >
            <Shuffle className="w-5 h-5" />
            {isShuffle && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-700" />
            )}
          </button>

          {/* Sleep Timer Indicator Button */}
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

          {/* Repeat */}
          <button
            onClick={cycleRepeat}
            className={`p-2 transition-all active:scale-90 relative ${
              repeatMode !== 'off'
                ? 'text-sage-900 font-bold'
                : 'text-charcoal-400 hover:text-sage-800'
            }`}
            aria-label="Repeat mode"
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-5 h-5" />
            ) : (
              <Repeat className="w-5 h-5" />
            )}
            {repeatMode !== 'off' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sage-700" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
