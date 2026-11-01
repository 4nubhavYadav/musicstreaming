import React, { useState } from 'react';
import { Search as SearchIcon, Play, Loader2, Music2, Clock } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export const SearchView = () => {
  const { playTrack, currentTrack, isPlaying, recentlyPlayed } = usePlayer();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const extractYoutubeId = (text) => {
    if (!text) return null;
    const clean = text.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const decodeHtml = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const executeSearch = async (searchTerm) => {
    const rawQuery = searchTerm !== undefined ? searchTerm : query;
    if (!rawQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    // 1. Direct YouTube link or ID check
    const directId = extractYoutubeId(rawQuery);
    if (directId) {
      try {
        const res = await fetch(
          `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${directId}`
        );
        const data = await res.json();
        const directTrack = {
          id: directId,
          idYoutube: directId,
          title: data.title || 'Audio Track',
          artist: data.author_name || 'Artist',
          album: 'Direct Stream',
          artwork: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          duration: 'Audio'
        };
        playTrack(directTrack);
        setSearchResults([directTrack]);
        setIsLoading(false);
        return;
      } catch {
        const directTrack = {
          id: directId,
          idYoutube: directId,
          title: 'Audio Track',
          artist: 'Direct Stream',
          album: 'Direct',
          artwork: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          duration: 'Audio'
        };
        playTrack(directTrack);
        setSearchResults([directTrack]);
        setIsLoading(false);
        return;
      }
    }

    // 2. Search strictly for pure audio (appending "official audio" to avoid dialogue/music video intros)
    const audioSearchQuery = `${rawQuery.trim()} official audio`;

    const mirrors = [
      `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(audioSearchQuery)}&type=video`,
      `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(audioSearchQuery)}&type=video`
    ];

    let found = false;
    for (const mirror of mirrors) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(mirror, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          let items = (data || []).map((item) => {
            const vid = item.videoId || item.id;
            return {
              id: vid,
              idYoutube: vid,
              title: decodeHtml(item.title || ''),
              artist: decodeHtml(item.author || 'Artist'),
              album: 'Audio Stream',
              artwork: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              duration: item.lengthSeconds
                ? `${Math.floor(item.lengthSeconds / 60)}:${item.lengthSeconds % 60 < 10 ? '0' : ''}${item.lengthSeconds % 60}`
                : '3:30'
            };
          });

          // Filter out music videos that contain video sound effects/acting intros
          const videoExcludePatterns = [
            /\bofficial music video\b/i,
            /\bofficial video\b/i,
            /\bmusic video\b/i,
            /\bshort film\b/i,
            /\bvideo clip\b/i,
            /\bmv\b/i
          ];

          // Prioritize pure audio tracks
          const filteredAudio = items.filter((item) => {
            const t = item.title.toLowerCase();
            return !videoExcludePatterns.some((pattern) => pattern.test(t));
          });

          const finalResults = (filteredAudio.length > 0 ? filteredAudio : items).slice(0, 16);

          if (finalResults.length > 0) {
            setSearchResults(finalResults);
            found = true;
            break;
          }
        }
      } catch (e) {
        // try next mirror
      }
    }

    // 3. Fallback to local catalog if mirrors unavailable
    if (!found) {
      const all = [...recentlyPlayed];
      const localMatches = all.filter(
        (t) =>
          t.title.toLowerCase().includes(rawQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(rawQuery.toLowerCase())
      );
      setSearchResults(localMatches);
    }

    setIsLoading(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <div className="px-6 pt-7 pb-28 animate-in fade-in duration-200">
      
      {/* Search Header */}
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-semibold text-charcoal-900 tracking-tight">
          Search Music
        </h2>
        <p className="text-xs font-sans text-charcoal-600 mt-0.5">
          Audio only · No video intros or sound effects.
        </p>
      </div>

      {/* Clean Minimalist Search Input */}
      <form onSubmit={handleFormSubmit} className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              setSearchResults([]);
            }
          }}
          placeholder="Search track, artist, or paste YouTube link..."
          className="w-full bg-parchment-50 border border-sage-200/80 rounded-2xl py-3.5 pl-11 pr-10 text-xs font-sans text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sage-700 focus:ring-1 focus:ring-sage-700 shadow-sm transition-all"
        />
        <SearchIcon className="w-4 h-4 text-charcoal-400 absolute left-4 top-1/2 -translate-y-1/2" />
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-sage-700 absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />
        ) : query ? (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-sage-800 px-2.5 py-1 bg-sage-100 rounded-lg hover:bg-sage-200"
          >
            Go
          </button>
        ) : null}
      </form>

      {/* When user has searched: show results */}
      {searchResults.length > 0 ? (
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
            Audio Results ({searchResults.length})
          </span>

          <div className="flex flex-col gap-2.5">
            {searchResults.map((track) => {
              const isThisPlaying =
                (currentTrack?.id || currentTrack?.idYoutube) ===
                (track.id || track.idYoutube);

              return (
                <div
                  key={track.id || track.idYoutube}
                  onClick={() => playTrack(track, searchResults)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200 border border-sage-100/70 cursor-pointer active:scale-98 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 border border-black/5 shadow-sm">
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track, searchResults);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-white'
                          : 'bg-parchment-200 text-charcoal-800 hover:bg-sage-700 hover:text-white'
                      }`}
                      aria-label="Play audio"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* When search is empty: Show Recently Played songs only (no generic suggestions) */
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Recently Played</span>
          </span>

          {recentlyPlayed.length === 0 ? (
            <div className="text-center py-10 bg-parchment-50/50 rounded-2xl border border-dashed border-sage-200">
              <Music2 className="w-7 h-7 text-sage-600/40 mx-auto mb-2" />
              <p className="text-xs text-charcoal-600 font-sans">
                Type an artist or song name above to find clean studio audio.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentlyPlayed.slice(0, 8).map((track) => {
                const isThisPlaying =
                  (currentTrack?.id || currentTrack?.idYoutube) ===
                  (track.id || track.idYoutube);

                return (
                  <div
                    key={track.id || track.idYoutube}
                    onClick={() => playTrack(track, recentlyPlayed)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/70 hover:bg-parchment-200/80 border border-sage-100/60 cursor-pointer active:scale-98 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-charcoal-800 border border-black/5 shadow-sm">
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

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track, recentlyPlayed);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-white'
                          : 'bg-parchment-200 text-charcoal-800 group-hover:bg-sage-700 group-hover:text-white'
                      }`}
                      aria-label="Play track"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
