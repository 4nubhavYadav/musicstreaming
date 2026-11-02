import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  MoreHorizontal,
  ChevronRight,
  Heart,
  Share2,
  Loader2,
  Sparkles,
  Compass,
  Radio,
  RefreshCw
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getHomeRecommendations, seedColdStartArtist } from '../services';

export const HomeView = ({ onOpenAll, onOpenSearch }) => {
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

  const [homeData, setHomeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seedingArtist, setSeedingArtist] = useState(null);
  const [activeMenuTrackId, setActiveMenuTrackId] = useState(null);

  // Suggested starter artists for cold start onboarding
  const starterArtists = [
    'Billie Eilish',
    'The Weeknd',
    'Coldplay',
    'Taylor Swift',
    'Kendrick Lamar',
    'Arijit Singh',
    'Dua Lipa',
    'Post Malone'
  ];

  const loadRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHomeRecommendations();
      setHomeData(data);
    } catch (err) {
      console.warn('[HomeView] Failed to load recommendations:', err);
      setError('Could not load recommendations right now.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [recentlyPlayed.length]);

  const handleSeedArtist = async (artist) => {
    setSeedingArtist(artist);
    try {
      const seededTrack = await seedColdStartArtist(artist);
      if (seededTrack) {
        await loadRecommendations();
      }
    } catch (err) {
      console.warn('Seeding failed:', err);
    } finally {
      setSeedingArtist(null);
    }
  };

  const handleTrackClick = (track, shelfList = null) => {
    if ((currentTrack?.id || currentTrack?.idYoutube) === (track.id || track.idYoutube)) {
      togglePlayPause();
    } else {
      playTrack(track, shelfList);
    }
  };

  const handleMenuToggle = (e, trackId) => {
    e.stopPropagation();
    setActiveMenuTrackId((prev) => (prev === trackId ? null : trackId));
  };

  return (
    <div className="px-6 mb-24 animate-in fade-in duration-200 space-y-7">
      {/* Cold Start Artist Picker */}
      {homeData?.isColdStart && (
        <div className="p-4 rounded-3xl bg-sage-50/90 border border-sage-200/80 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-sage-700 flex-shrink-0" />
            <h3 className="font-serif text-sm font-semibold text-charcoal-900">
              Tune Your Recommendations
            </h3>
          </div>
          <p className="text-[11px] font-sans text-charcoal-600 mb-3.5 leading-relaxed">
            Pick an artist you love to seed your personalized radio & quick picks.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {starterArtists.map((artist) => (
              <button
                key={artist}
                disabled={seedingArtist !== null}
                onClick={() => handleSeedArtist(artist)}
                className={`text-xs font-sans px-3 py-1.5 rounded-full border transition-all active:scale-95 flex items-center gap-1.5 ${
                  seedingArtist === artist
                    ? 'bg-sage-700 text-white border-sage-700 animate-pulse'
                    : 'bg-white hover:bg-sage-100 text-charcoal-800 border-sage-200'
                }`}
              >
                <span>{artist}</span>
                {seedingArtist === artist && (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && !homeData && (
        <div className="space-y-6 animate-pulse">
          <div className="space-y-3">
            <div className="h-5 w-32 bg-sage-200/60 rounded-md" />
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-36 h-44 bg-sage-100/80 rounded-2xl flex-shrink-0" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-5 w-44 bg-sage-200/60 rounded-md" />
            <div className="h-14 bg-sage-100/70 rounded-2xl" />
            <div className="h-14 bg-sage-100/70 rounded-2xl" />
          </div>
        </div>
      )}

      {/* Error State with Retry */}
      {error && !isLoading && (
        <div className="p-4 rounded-2xl bg-terracotta-50/70 border border-terracotta-200 text-terracotta-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadRecommendations}
            className="flex items-center gap-1 text-[11px] font-medium text-terracotta-900 underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Recommendation Shelves */}
      {homeData?.shelves && homeData.shelves.length > 0 && (
        <div className="space-y-7">
          {homeData.shelves.map((shelf) => (
            <section key={shelf.id} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-charcoal-900 tracking-tight">
                    {shelf.title}
                  </h3>
                  {shelf.subtitle && (
                    <p className="text-[11px] font-sans text-charcoal-500">
                      {shelf.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Horizontal Scroll Shelf */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-6 px-6">
                {shelf.items.map((track) => {
                  const isThisPlaying =
                    (currentTrack?.id || currentTrack?.idYoutube) ===
                    (track.id || track.idYoutube);

                  return (
                    <div
                      key={track.id || track.idYoutube}
                      onClick={() => handleTrackClick(track, shelf.items)}
                      className="w-36 sm:w-40 flex-shrink-0 group cursor-pointer active:scale-98 transition-all"
                    >
                      <div className="w-36 sm:w-40 h-36 sm:h-40 rounded-2xl overflow-hidden bg-charcoal-800 border border-black/5 shadow-sm relative mb-2">
                        <img
                          src={track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                          }}
                        />
                        {/* Play overlay button */}
                        <div
                          className={`absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity ${
                            isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-sage-700 text-white flex items-center justify-center shadow-md">
                            {isThisPlaying && isPlaying ? (
                              <Pause className="w-4 h-4 fill-current stroke-none" />
                            ) : (
                              <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>

                      <h4 className={`text-xs font-medium truncate ${isThisPlaying ? 'text-sage-800 font-semibold' : 'text-charcoal-900'}`}>
                        {track.title}
                      </h4>
                      <p className="text-[11px] font-sans text-charcoal-500 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Recently Played Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-charcoal-900 tracking-tight">
            Recently Played
          </h3>
          <button
            onClick={onOpenAll}
            className="text-xs font-sans text-charcoal-600 hover:text-charcoal-900 flex items-center gap-0.5 transition-colors font-medium"
          >
            <span>Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentlyPlayed.length === 0 ? (
          <div className="text-center py-10 px-4 bg-parchment-50/70 rounded-3xl border border-dashed border-sage-200">
            <Radio className="w-7 h-7 text-sage-600/50 mx-auto mb-2" />
            <p className="text-xs font-serif font-medium text-charcoal-900 mb-1">
              Your space is quiet
            </p>
            <p className="text-[11px] text-charcoal-500 font-sans max-w-[220px] mx-auto mb-3">
              Play any song from recommendations or search to start your listening history.
            </p>
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-sage-700 hover:bg-sage-800 text-white text-xs font-sans font-medium rounded-xl shadow-sm transition-colors"
              >
                <span>Search Music</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentlyPlayed.slice(0, 10).map((track) => {
              const isThisPlaying =
                (currentTrack?.id || currentTrack?.idYoutube) ===
                (track.id || track.idYoutube);

              return (
                <div
                  key={track.id || track.idYoutube}
                  onClick={() => handleTrackClick(track, recentlyPlayed)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/60 hover:bg-parchment-200/60 active:bg-parchment-200 border border-sage-100/60 transition-all cursor-pointer group relative"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 border border-black/5 shadow-sm relative">
                      <img
                        src={track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                        }}
                      />
                      {isThisPlaying && isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-sage-400 animate-ping" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-medium tracking-tight truncate ${
                          isThisPlaying ? 'text-sage-800 font-semibold' : 'text-charcoal-900'
                        }`}
                      >
                        {track.title}
                      </h4>
                      <p className="text-[11px] font-sans text-charcoal-500 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-charcoal-400 tabular-nums">
                      {track.duration}
                    </span>

                    <div className="relative">
                      <button
                        onClick={(e) => handleMenuToggle(e, track.id)}
                        className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-full hover:bg-parchment-300/50"
                        aria-label="Track options"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>

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
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isLiked(track.id)
                                  ? 'fill-terracotta-500 text-terracotta-500'
                                  : ''
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
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share Track</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackClick(track, recentlyPlayed);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-white'
                          : 'bg-parchment-200/90 hover:bg-parchment-300 text-charcoal-800'
                      }`}
                      aria-label="Play track"
                    >
                      {isThisPlaying && isBuffering ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isThisPlaying && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current stroke-none" />
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
    </div>
  );
};
