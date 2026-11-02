import React, { useState } from 'react';
import { Play, Pause, MoreHorizontal, ChevronRight, Heart, Share2, Loader2, Music2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const RecentlyPlayed = ({ onOpenAll, onOpenSearch }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    playTrack,
    togglePlayPause,
    toggleLike,
    isLiked,
    recentlyPlayed
  } = usePlayer();

  const [activeMenuTrackId, setActiveMenuTrackId] = useState(null);

  const handleTrackClick = (track) => {
    if ((currentTrack?.id || currentTrack?.idYoutube) === (track.id || track.idYoutube)) {
      togglePlayPause();
    } else {
      playTrack(track, recentlyPlayed);
    }
  };

  const handleMenuToggle = (e, trackId) => {
    e.stopPropagation();
    setActiveMenuTrackId((prev) => (prev === trackId ? null : trackId));
  };

  return (
    <section className="px-6 mb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl font-semibold text-charcoal-900 tracking-tight">
          Recently Played
        </h3>
        <button
          onClick={onOpenAll}
          className="text-xs font-sans text-charcoal-400 hover:text-charcoal-900 flex items-center gap-0.5 transition-colors font-medium"
        >
          <span>Library</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Track List */}
      {recentlyPlayed.length === 0 ? (
        <div className="text-center py-14 px-4 bg-parchment-50 rounded-3xl border border-dashed border-white/10">
          <Music2 className="w-8 h-8 text-charcoal-400/50 mx-auto mb-2.5" />
          <h4 className="text-sm font-serif font-medium text-charcoal-900 mb-1">
            Your space is quiet
          </h4>
          <p className="text-xs text-charcoal-500 font-sans max-w-[240px] mx-auto mb-4">
            Search for an artist or song to start listening. Your recently played tracks will appear here.
          </p>
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sage-700 hover:bg-sage-800 text-black text-xs font-sans font-semibold rounded-xl shadow-sm transition-colors active:scale-95"
            >
              <span>Search Music</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recentlyPlayed.map((track) => {
            const isThisPlaying =
              (currentTrack?.id || currentTrack?.idYoutube) ===
              (track.id || track.idYoutube);
            const posterUrl =
              track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;

            return (
              <div
                key={track.id || track.idYoutube}
                onClick={() => handleTrackClick(track)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200/80 active:bg-parchment-200 border border-white/5 transition-all cursor-pointer group relative"
              >
                {/* Music Poster Thumbnail + Title + Artist */}
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="w-13 h-13 rounded-2xl overflow-hidden flex-shrink-0 bg-black shadow-sm border border-white/10 relative">
                    <img
                      src={posterUrl}
                      alt={track.title}
                      className="w-12 h-12 object-cover group-hover:scale-105 transition-transform duration-300 rounded-xl"
                      onError={(e) => {
                        e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-medium tracking-tight truncate ${
                        isThisPlaying ? 'text-charcoal-900 font-semibold' : 'text-charcoal-800'
                      }`}
                    >
                      {track.title}
                    </h4>
                    <p className="text-xs font-sans text-charcoal-500 truncate mt-0.5">
                      {track.artist}
                    </p>
                  </div>
                </div>

                {/* Actions: Context Menu + Circular Play Disc */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={(e) => handleMenuToggle(e, track.id)}
                      className="p-1.5 text-charcoal-400 hover:text-charcoal-900 rounded-full active:bg-parchment-200 transition-colors"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Context Popup */}
                    {activeMenuTrackId === track.id && (
                      <div
                        className="absolute right-0 top-8 z-30 bg-parchment-50 border border-white/10 rounded-2xl shadow-zen p-1.5 min-w-[140px] text-xs font-sans text-charcoal-800 animate-in fade-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            toggleLike(track.id);
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isLiked(track.id)
                                ? 'fill-terracotta-400 text-terracotta-400'
                                : 'text-charcoal-400'
                            }`}
                          />
                          <span>
                            {isLiked(track.id) ? 'Favorited' : 'Add to Favorites'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            if (navigator.share) {
                              navigator.share({
                                title: track.title,
                                text: `${track.title} by ${track.artist}`
                              });
                            }
                            setActiveMenuTrackId(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-parchment-200 text-left"
                        >
                          <Share2 className="w-3.5 h-3.5 text-charcoal-400" />
                          <span>Share Track</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleTrackClick(track)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                      isThisPlaying && isPlaying
                        ? 'bg-sage-700 text-black'
                        : 'bg-parchment-200 hover:bg-sage-700 text-charcoal-800 hover:text-black'
                    }`}
                    aria-label={isThisPlaying && isPlaying ? 'Pause' : 'Play'}
                  >
                    {isThisPlaying && isBuffering ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : isThisPlaying && isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-black stroke-none" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current stroke-none ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
