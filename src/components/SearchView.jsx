import React, { useState, useEffect, useRef } from 'react';
import {
  Search as SearchIcon,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Disc3,
  X
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import {
  searchSongs,
  getSearchSuggestions,
  resolveDirectTrack,
  isDirectYoutubeQuery
} from '../services';

export const SearchView = () => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const searchDebounceRef = useRef(null);
  const containerRef = useRef(null);

  // Quick discovery suggestions for empty state
  const quickPicks = [
    'Billie Eilish',
    'The Weeknd',
    'Coldplay',
    'Taylor Swift',
    'Arijit Singh',
    'Kendrick Lamar'
  ];

  // Fetch autocomplete suggestions as user types
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || isDirectYoutubeQuery(query)) {
      setSuggestions([]);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const list = await getSearchSuggestions(query);
        setSuggestions(list);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, 220);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query]);

  const executeSearch = async (searchTerm) => {
    const rawQuery = (searchTerm !== undefined ? searchTerm : query).trim();
    if (!rawQuery) {
      setSearchResults([]);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuggestions([]);

    try {
      // 1. Direct YouTube link or 11-char ID
      if (isDirectYoutubeQuery(rawQuery)) {
        const directTrack = await resolveDirectTrack(rawQuery);
        if (directTrack) {
          playTrack(directTrack);
          setSearchResults([directTrack]);
          setIsLoading(false);
          return;
        }
      }

      // 2. Official YouTube Music search via InnerTune engine
      const tracks = await searchSongs(rawQuery);
      setSearchResults(tracks);

      if (tracks.length === 0) {
        setErrorMessage(
          'No songs found. Try searching for a different song or artist.'
        );
      }
    } catch (err) {
      console.error('[SearchView] Search error:', err);
      setErrorMessage(
        err.message || 'An error occurred while searching. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    document.activeElement?.blur();
    executeSearch(query);
  };

  const handleSelectSuggestion = (sug) => {
    setQuery(sug);
    setSuggestions([]);
    document.activeElement?.blur();
    executeSearch(sug);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setSearchResults([]);
    setErrorMessage(null);
  };

  return (
    <div
      ref={containerRef}
      className="px-6 pt-6 pb-20 animate-in fade-in duration-200"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-serif text-2xl font-semibold text-charcoal-900 tracking-tight">
          Search Music
        </h2>
      </div>

      {/* Search Input Box */}
      <div className="relative mb-4">
        <form onSubmit={handleFormSubmit} className="relative">
          <input
            type="text"
            value={query}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => {
              // Delay blur so clicks on suggestions register
              setTimeout(() => setIsInputFocused(false), 250);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setSearchResults([]);
                setSuggestions([]);
                setErrorMessage(null);
              }
            }}
            placeholder="Search track, artist, or paste YouTube link..."
            className="w-full bg-parchment-50 border border-white/10 rounded-2xl py-3.5 pl-11 pr-20 text-sm font-sans text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 shadow-sm transition-all"
          />
          <SearchIcon className="w-4 h-4 text-charcoal-400 absolute left-4 top-1/2 -translate-y-1/2" />

          {/* Right Action Buttons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {query && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-charcoal-400 hover:text-charcoal-900 rounded-full transition-colors"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-charcoal-400 animate-spin" />
            ) : query ? (
              <button
                type="submit"
                className="text-xs font-semibold text-black px-2.5 py-1 bg-sage-700 hover:bg-sage-800 rounded-lg transition-colors"
              >
                Go
              </button>
            ) : null}
          </div>
        </form>

        {/* Real-time Autocomplete Suggestions Dropdown */}
        {isInputFocused && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-black/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-zen overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150">
            <div className="py-1">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSuggestion(sug)}
                  className="w-full text-left px-4 py-2.5 text-xs text-charcoal-800 hover:bg-parchment-200 flex items-center gap-2.5 transition-colors"
                >
                  <SearchIcon className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                  <span className="truncate">{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-terracotta-100 border border-terracotta-400 text-terracotta-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-terracotta-400 flex-shrink-0 mt-0.5" />
          <p className="font-medium flex-1">{errorMessage}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
              Official Songs ({searchResults.length})
            </span>
            <span className="text-[10px] text-charcoal-500 font-medium flex items-center gap-1">
              <Disc3 className="w-3 h-3 text-charcoal-400" />
              YouTube Music
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {searchResults.map((track) => {
              const isThisPlaying =
                (currentTrack?.id || currentTrack?.idYoutube) ===
                (track.id || track.idYoutube);

              return (
                <div
                  key={track.id || track.idYoutube}
                  onClick={() => playTrack(track, searchResults)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200 border border-white/5 cursor-pointer active:scale-98 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-black border border-white/10 shadow-sm relative">
                      <img
                        src={
                          track.artwork ||
                          `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`
                        }
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src = `https://i.ytimg.com/vi/${track.id}/hqdefault.jpg`;
                        }}
                      />
                      {isThisPlaying && isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-sage-700 animate-ping" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Track Title */}
                      <h4
                        className={`text-xs font-serif font-medium tracking-tight truncate ${
                          isThisPlaying
                            ? 'text-charcoal-900 font-semibold'
                            : 'text-charcoal-800'
                        }`}
                      >
                        {track.title}
                      </h4>

                      {/* Artist Name */}
                      <p className="text-[11px] font-sans text-charcoal-500 truncate mt-0.5">
                        {track.artist}
                      </p>

                      {/* Album / Badges */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-medium bg-parchment-200 text-charcoal-800 px-1.5 py-0.2 rounded-md border border-white/5">
                          Studio Audio
                        </span>
                        {track.album && (
                          <span className="text-[9px] text-charcoal-400 truncate max-w-[140px]">
                            · {track.album}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-charcoal-400 tabular-nums">
                      {track.duration}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(track, searchResults);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-black'
                          : 'bg-parchment-200 text-charcoal-800 hover:bg-sage-700 hover:text-black'
                      }`}
                      aria-label="Play audio"
                    >
                      {isThisPlaying && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-black" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Minimal Empty State with Clean Suggestions */
        <div className="mt-8 px-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
            Suggested Artists
          </span>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => {
                  setQuery(pick);
                  executeSearch(pick);
                }}
                className="text-xs font-sans px-3.5 py-1.5 rounded-full bg-parchment-50/90 hover:bg-parchment-200 border border-white/10 text-charcoal-700 hover:text-charcoal-900 transition-all active:scale-95"
              >
                {pick}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
