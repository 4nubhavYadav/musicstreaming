import React from 'react';
import { Heart, Play, Music2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { FEATURED_ALBUM, RECENTLY_PLAYED, ZEN_COLLECTIONS } from '../data/catalog';

export const LibraryView = () => {
  const { likedTrackIds, playTrack } = usePlayer();

  const allTracks = [
    ...FEATURED_ALBUM.tracks,
    ...RECENTLY_PLAYED,
    ...ZEN_COLLECTIONS
  ];

  const favoriteTracks = allTracks.filter(t => likedTrackIds.includes(t.id));

  const handlePlayFavorites = () => {
    if (favoriteTracks.length > 0) {
      playTrack(favoriteTracks[0], favoriteTracks);
    }
  };

  return (
    <div className="px-6 pt-7 pb-28 animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif text-2xl font-semibold text-charcoal-900 tracking-tight">
          Library
        </h2>
        <span className="text-xs font-sans text-sage-800 bg-sage-100 px-2.5 py-1 rounded-full font-medium">
          {favoriteTracks.length} saved
        </span>
      </div>
      <p className="text-xs font-sans text-charcoal-600 mb-6">
        Your saved tracks and ambient collections.
      </p>

      {/* Liked Songs Hero Card */}
      <div 
        onClick={handlePlayFavorites}
        className="bg-gradient-to-br from-sage-700 to-sage-800 text-parchment-50 p-5 rounded-3xl shadow-zen mb-7 cursor-pointer group active:scale-98 transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Heart className="w-5 h-5 fill-terracotta-400 text-terracotta-400" />
          </div>
          <button 
            className="w-10 h-10 rounded-full bg-white text-sage-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
            aria-label="Play Liked Songs"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        </div>
        <h3 className="font-serif text-xl font-medium text-white mb-0.5">
          Liked Tracks
        </h3>
        <p className="text-xs font-sans text-parchment-200/80">
          {favoriteTracks.length} tracks
        </p>
      </div>

      {/* Favorites List with Real Music Posters */}
      <div className="mb-8">
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
          Favorites
        </span>

        {favoriteTracks.length === 0 ? (
          <div className="text-center py-8 bg-parchment-50/50 rounded-2xl border border-dashed border-sage-200">
            <Music2 className="w-8 h-8 text-sage-600/50 mx-auto mb-2" />
            <p className="text-xs text-charcoal-600 font-sans">
              No favorites saved yet. Tap the heart on any track.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {favoriteTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, favoriteTracks)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200 border border-sage-100/60 cursor-pointer active:scale-98 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 shadow-sm border border-black/5">
                    <img 
                      src={track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`} 
                      alt={track.title} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-medium text-charcoal-900 truncate">
                      {track.title}
                    </h4>
                    <p className="text-[11px] font-sans text-charcoal-600 truncate">
                      {track.artist}
                    </p>
                  </div>
                </div>

                <button
                  className="w-8 h-8 rounded-full bg-parchment-200 group-hover:bg-sage-700 group-hover:text-white flex items-center justify-center text-charcoal-800 transition-colors"
                  aria-label="Play"
                >
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curated Soundscapes with Real Posters */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
          Featured Collections
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div 
            onClick={() => playTrack(FEATURED_ALBUM.tracks[0], FEATURED_ALBUM.tracks)}
            className="p-3 bg-parchment-50 border border-sage-100 rounded-2xl cursor-pointer hover:bg-parchment-200 transition-all group"
          >
            <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-charcoal-800 shadow-sm">
              <img 
                src={FEATURED_ALBUM.artwork} 
                alt="Golden Horizons" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <h4 className="text-xs font-medium text-charcoal-900 truncate">Golden Horizons</h4>
            <p className="text-[10px] text-charcoal-600 truncate">Tycho Discography</p>
          </div>

          <div 
            onClick={() => playTrack(ZEN_COLLECTIONS[0], ZEN_COLLECTIONS)}
            className="p-3 bg-parchment-50 border border-sage-100 rounded-2xl cursor-pointer hover:bg-parchment-200 transition-all group"
          >
            <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-charcoal-800 shadow-sm">
              <img 
                src={ZEN_COLLECTIONS[0].artwork} 
                alt="Nuvole Bianche" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            </div>
            <h4 className="text-xs font-medium text-charcoal-900 truncate">Piano Calm</h4>
            <p className="text-[10px] text-charcoal-600 truncate">Ludovico Einaudi</p>
          </div>
        </div>
      </div>
    </div>
  );
};
