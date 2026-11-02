import React from 'react';
import { Heart, Play, Music2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const LibraryView = () => {
  const { likedTracks = [], playTrack, toggleLike, currentTrack, isPlaying } = usePlayer();

  const handlePlayAll = () => {
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  return (
    <div className="px-6 pt-7 pb-28 animate-in fade-in duration-200">
      {/* Library Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif text-2xl font-semibold text-charcoal-900 tracking-tight">
          Library
        </h2>
        <span className="text-xs font-sans text-sage-800 bg-sage-100 px-2.5 py-1 rounded-full font-medium">
          {likedTracks.length} saved
        </span>
      </div>
      <p className="text-xs font-sans text-charcoal-600 mb-6">
        Your saved tracks and favorites.
      </p>

      {/* Liked Tracks Banner */}
      <div
        onClick={handlePlayAll}
        className="bg-gradient-to-br from-sage-700 to-sage-800 text-parchment-50 p-5 rounded-3xl shadow-zen mb-7 cursor-pointer group active:scale-98 transition-all"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Heart className="w-5 h-5 fill-terracotta-400 text-terracotta-400" />
          </div>
          {likedTracks.length > 0 && (
            <button
              className="w-10 h-10 rounded-full bg-white text-sage-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
              aria-label="Play all saved tracks"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          )}
        </div>
        <h3 className="font-serif text-xl font-medium text-white mb-0.5">
          Liked Tracks
        </h3>
        <p className="text-xs font-sans text-parchment-200/80">
          {likedTracks.length} {likedTracks.length === 1 ? 'track' : 'tracks'}
        </p>
      </div>

      {/* Saved Tracks List */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
          Saved Music
        </span>

        {likedTracks.length === 0 ? (
          <div className="text-center py-12 px-4 bg-parchment-50/70 rounded-3xl border border-dashed border-sage-200">
            <Music2 className="w-8 h-8 text-sage-600/50 mx-auto mb-2" />
            <p className="text-xs font-medium text-charcoal-800 font-sans mb-1">
              No saved tracks yet
            </p>
            <p className="text-[11px] text-charcoal-500 font-sans max-w-[220px] mx-auto">
              Tap the heart icon on any song to save it directly to your library.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {likedTracks.map((track) => {
              const isThisPlaying =
                (currentTrack?.id || currentTrack?.idYoutube) ===
                (track.id || track.idYoutube);

              return (
                <div
                  key={track.id || track.idYoutube}
                  onClick={() => playTrack(track, likedTracks)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200/80 border border-sage-100/60 cursor-pointer active:scale-98 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 shadow-sm border border-black/5">
                      <img
                        src={track.artwork || `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-medium tracking-tight truncate ${
                          isThisPlaying ? 'text-sage-800 font-semibold' : 'text-charcoal-900'
                        }`}
                      >
                        {track.title}
                      </h4>
                      <p className="text-[11px] font-sans text-charcoal-600 truncate mt-0.5">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleLike(track)}
                      className="p-1.5 text-terracotta-500 hover:text-terracotta-600 rounded-full active:scale-90 transition-transform"
                      aria-label="Remove from library"
                    >
                      <Heart className="w-4 h-4 fill-terracotta-500" />
                    </button>

                    <button
                      onClick={() => playTrack(track, likedTracks)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-white'
                          : 'bg-parchment-200 text-charcoal-800 group-hover:bg-sage-700 group-hover:text-white'
                      }`}
                      aria-label="Play track"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
