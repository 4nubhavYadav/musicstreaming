import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { FEATURED_ALBUM } from '../data/catalog';

export const FeaturedCard = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlayPause,
    playTrack,
    nextTrack,
    prevTrack,
    openNowPlaying
  } = usePlayer();

  const isCurrentAlbum = currentTrack?.album === FEATURED_ALBUM.title;

  const handlePlayAlbum = () => {
    playTrack(FEATURED_ALBUM.tracks[0], FEATURED_ALBUM.tracks);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="px-6 mb-7">
      <div className="bg-sage-700 text-parchment-50 rounded-[28px] p-5 shadow-zen relative overflow-hidden transition-all duration-300">
        
        {/* Top Half: Album Showcase */}
        <div className="flex gap-4 items-start mb-6">
          {/* Artwork */}
          <div 
            onClick={openNowPlaying}
            className="w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-md cursor-pointer group relative active:scale-95 transition-transform"
          >
            <img
              src={FEATURED_ALBUM.artwork}
              alt={FEATURED_ALBUM.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between min-h-[128px]">
            <div>
              <span className="text-[10px] font-sans uppercase font-bold tracking-widest text-terracotta-400">
                FEATURED ALBUM
              </span>
              <h2 className="text-xl font-serif font-semibold text-white tracking-tight leading-snug mt-0.5">
                {FEATURED_ALBUM.title}
              </h2>
              <p className="text-xs font-sans text-parchment-200/90 font-medium">
                {FEATURED_ALBUM.artist}
              </p>
              <p className="text-[11px] font-sans text-parchment-200/70 leading-relaxed mt-2 line-clamp-2">
                {FEATURED_ALBUM.description}
              </p>
            </div>

            {/* Play Album Pill Button */}
            <button
              onClick={handlePlayAlbum}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-full text-xs font-medium tracking-wide shadow-sm active:scale-95 transition-all self-start"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Play Album</span>
            </button>
          </div>
        </div>

        {/* Bottom Half: Embedded Mini Player */}
        <div 
          onClick={openNowPlaying}
          className="pt-3 border-t border-white/10 flex flex-col gap-2 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                <img
                  src={currentTrack?.artwork || FEATURED_ALBUM.artwork}
                  alt={currentTrack?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate max-w-[110px] sm:max-w-[140px]">
                  {currentTrack?.title || 'A Walk'}
                </div>
                <div className="text-[10px] text-parchment-200/70 truncate">
                  {currentTrack?.artist || 'Tycho'}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={prevTrack}
                className="text-parchment-200 hover:text-white active:scale-90 transition-transform p-1"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-white text-sage-800 flex items-center justify-center shadow-md active:scale-95 hover:bg-parchment-50 transition-all"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current text-sage-800" />
                ) : (
                  <Play className="w-4 h-4 fill-current text-sage-800 ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="text-parchment-200 hover:text-white active:scale-90 transition-transform p-1"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Timestamp */}
            <div className="text-[11px] font-sans text-parchment-200/70 tabular-nums">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Minimal Progress Bar */}
          <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden mt-1">
            <div
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
