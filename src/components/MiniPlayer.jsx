import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const MiniPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlayPause,
    nextTrack,
    prevTrack,
    openNowPlaying,
    toggleLike,
    isLiked
  } = usePlayer();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const posterUrl = currentTrack.artwork || `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
  const liked = isLiked ? isLiked(currentTrack.id) : false;

  return (
    <div className="fixed bottom-[60px] sm:bottom-[68px] left-0 right-0 z-30 px-3 sm:px-4 pointer-events-none pb-safe">
      <div 
        onClick={openNowPlaying}
        className="pointer-events-auto w-full max-w-sm mx-auto bg-parchment-50/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-dock flex flex-col overflow-hidden cursor-pointer active:scale-[0.98] transition-all group select-none"
        role="button"
        tabIndex={0}
        aria-label="Open now playing view"
      >
        <div className="flex items-center justify-between p-1.5 pl-2 pr-2.5">
          {/* Track Info with Music Poster */}
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-black border border-white/10 relative shadow-sm">
              <img
                src={posterUrl}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-500 ${isPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
                onError={(e) => {
                  e.target.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
                }}
              />
              {isBuffering && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-700" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-xs font-serif font-medium text-charcoal-900 truncate tracking-tight">
                {currentTrack.title}
              </h4>
              <p className="text-[10px] font-sans text-charcoal-500 truncate mt-0.5">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Quick Favorite */}
            <button
              onClick={() => toggleLike(currentTrack.id)}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform"
              aria-label="Favorite"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  liked ? 'fill-terracotta-400 text-terracotta-400' : ''
                }`}
              />
            </button>

            {/* Prev Track */}
            <button
              onClick={prevTrack}
              className="p-1 text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform"
              aria-label="Previous"
            >
              <SkipBack className="w-3.5 h-3.5 fill-current stroke-none" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              className="w-7 h-7 rounded-full bg-sage-700 hover:bg-sage-800 text-black flex items-center justify-center shadow-sm active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-3 h-3 animate-spin text-black" />
              ) : isPlaying ? (
                <Pause className="w-3 h-3 fill-black stroke-none" />
              ) : (
                <Play className="w-3 h-3 fill-black stroke-none ml-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={nextTrack}
              className="p-1 text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform"
              aria-label="Next"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current stroke-none" />
            </button>
          </div>
        </div>

        {/* Flush Micro Progress Line */}
        <div className="w-full bg-white/5 h-[2px] overflow-hidden">
          <div
            className="bg-sage-600 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
