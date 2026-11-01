import React, { useState } from 'react';
import { Play, Pause, MoreHorizontal, ChevronRight, Heart, Share2, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { RECENTLY_PLAYED } from '../data/catalog';

export const RecentlyPlayed = ({ onOpenAll }) => {
  const { currentTrack, isPlaying, isBuffering, playTrack, togglePlayPause, toggleLike, isLiked } = usePlayer();
  const [activeMenuTrackId, setActiveMenuTrackId] = useState(null);

  const handleTrackClick = (track) => {
    if ((currentTrack?.id || currentTrack?.idYoutube) === (track.id || track.idYoutube)) {
      togglePlayPause();
    } else {
      playTrack(track, RECENTLY_PLAYED);
    }
  };

  const handleMenuToggle = (e, trackId) => {
    e.stopPropagation();
    setActiveMenuTrackId(prev => (prev === trackId ? null : trackId));
  };

  return (
    <section className="px-6 mb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-lg font-semibold text-charcoal-900 tracking-tight">
          Recently Played
        </h3>
        <button
          onClick={onOpenAll}
          className="text-xs font-sans text-charcoal-600 hover:text-charcoal-900 flex items-center gap-0.5 transition-colors font-medium"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track List */}
      <div className="flex flex-col gap-2.5">
        {RECENTLY_PLAYED.map((track) => {
          const isThisPlaying =
            (currentTrack?.id || currentTrack?.idYoutube) === (track.id || track.idYoutube);
          const posterUrl = track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;

          return (
            <div
              key={track.id}
              onClick={() => handleTrackClick(track)}
              className="flex items-center justify-between p-2 rounded-2xl hover:bg-parchment-200/50 active:bg-parchment-200/80 transition-all cursor-pointer group relative"
            >
              {/* Music Poster Thumbnail + Title + Artist */}
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 shadow-sm border border-black/5">
                  <img
                    src={posterUrl}
                    alt={track.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <h4
                    className={`text-sm font-medium tracking-tight truncate ${
                      isThisPlaying ? 'text-sage-800 font-semibold' : 'text-charcoal-900'
                    }`}
                  >
                    {track.title}
                  </h4>
                  <p className="text-xs font-sans text-charcoal-600 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Actions: Three Dots Menu + Circular Play Button */}
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <button
                    onClick={(e) => handleMenuToggle(e, track.id)}
                    className="p-1.5 text-charcoal-400 hover:text-charcoal-800 rounded-full active:bg-parchment-300/50 transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Context Popup */}
                  {activeMenuTrackId === track.id && (
                    <div 
                      className="absolute right-0 top-8 z-30 bg-parchment-50 border border-sage-100 rounded-2xl shadow-zen p-1.5 min-w-[140px] text-xs font-sans text-charcoal-800 animate-in fade-in zoom-in-95 duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          toggleLike(track.id);
                          setActiveMenuTrackId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked(track.id) ? 'fill-terracotta-500 text-terracotta-500' : ''}`} />
                        <span>{isLiked(track.id) ? 'Favorited' : 'Add to Favorites'}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: track.title, text: `${track.title} by ${track.artist}` });
                          }
                          setActiveMenuTrackId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Track</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleTrackClick(track)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    isThisPlaying && isPlaying
                      ? 'bg-sage-700 text-white'
                      : 'bg-parchment-200/90 hover:bg-parchment-300 text-charcoal-800'
                  }`}
                  aria-label={isThisPlaying && isPlaying ? 'Pause' : 'Play'}
                >
                  {isThisPlaying && isBuffering ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isThisPlaying && isPlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
