import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Loader2 } from 'lucide-react';
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
    openNowPlaying
  } = usePlayer();

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const posterUrl = currentTrack.artwork || `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-4 pointer-events-none">
      <div 
        onClick={openNowPlaying}
        className="pointer-events-auto max-w-sm mx-auto bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-zen p-2 flex flex-col gap-1.5 cursor-pointer active:scale-98 transition-all group"
      >
        <div className="flex items-center justify-between">
          {/* Track Info with Music Poster */}
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-parchment-50 shadow-sm border border-white/10">
              <img
                src={posterUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
                }}
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-semibold text-charcoal-900 truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] font-sans text-charcoal-500 truncate">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={prevTrack}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform"
              aria-label="Previous"
            >
              <SkipBack className="w-4 h-4 fill-current stroke-none" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-8 h-8 rounded-full bg-sage-700 hover:bg-sage-800 text-black flex items-center justify-center shadow-sm active:scale-95 transition-all"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isBuffering ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
              ) : isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-black stroke-none" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-black stroke-none ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 text-charcoal-400 hover:text-charcoal-900 active:scale-90 transition-transform"
              aria-label="Next"
            >
              <SkipForward className="w-4 h-4 fill-current stroke-none" />
            </button>
          </div>
        </div>

        {/* Minimal Progress Line */}
        <div className="w-full bg-parchment-200 h-1 rounded-full overflow-hidden">
          <div
            className="bg-sage-700 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
