import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Key, Sparkles, AlertCircle, Check, Loader2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { ZEN_COLLECTIONS, RECENTLY_PLAYED, FEATURED_ALBUM } from '../data/catalog';

export const SearchView = () => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('sora_yt_api_key') || '';
  });
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySavedNotice, setKeySavedNotice] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const moodPills = [
    'Tycho',
    'Novo Amor',
    'Ólafur Arnalds',
    'Ludovico Einaudi',
    'Brian Eno',
    'Bonobo',
    'Marconi Union',
    'Lofi Hip Hop'
  ];

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('sora_yt_api_key', apiKey.trim());
    setKeySavedNotice(true);
    setTimeout(() => setKeySavedNotice(false), 2500);
    setShowKeyInput(false);
  };

  const extractYoutubeId = (text) => {
    if (!text) return null;
    const clean = text.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const decodeHtml = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const executeSearch = async (searchTerm) => {
    const q = searchTerm || query;
    if (!q.trim()) return;

    setSearchError(null);
    setIsLoading(true);

    // 1. Check if user pasted a YouTube URL or direct Video ID
    const directId = extractYoutubeId(q);
    if (directId) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${directId}`);
        const data = await res.json();
        const directTrack = {
          id: directId,
          idYoutube: directId,
          title: data.title || 'YouTube Audio',
          artist: data.author_name || 'YouTube',
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
          title: 'YouTube Audio',
          artist: 'Direct Stream',
          album: 'YouTube',
          artwork: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          duration: 'Audio'
        };
        playTrack(directTrack);
        setSearchResults([directTrack]);
        setIsLoading(false);
        return;
      }
    }

    // 2. If YouTube Data API Key is provided, use official Google YouTube Data API v3
    if (apiKey.trim()) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
          q
        )}&type=video&videoCategoryId=10&key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.error?.message || 'YouTube Data API error');
        }
        const data = await res.json();
        const items = (data.items || []).map((item) => {
          const vid = item.id.videoId;
          return {
            id: vid,
            idYoutube: vid,
            title: decodeHtml(item.snippet.title),
            artist: decodeHtml(item.snippet.channelTitle),
            album: 'YouTube Music',
            artwork: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
            duration: 'Track'
          };
        });
        setSearchResults(items);
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('YouTube API call failed, falling back to free search:', err);
        setSearchError(err.message);
      }
    }

    // 3. Fallback: Free Invidious/Piped public mirrors
    const mirrors = [
      `https://yt.chocolatemoo53.com/api/v1/search?q=${encodeURIComponent(q)}&type=video`,
      `https://inv.nadeko.net/api/v1/search?q=${encodeURIComponent(q)}&type=video`
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
          const items = (data || []).slice(0, 15).map((item) => {
            const vid = item.videoId || item.id;
            return {
              id: vid,
              idYoutube: vid,
              title: item.title,
              artist: item.author || 'Artist',
              album: 'YouTube',
              artwork: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              duration: item.lengthSeconds
                ? `${Math.floor(item.lengthSeconds / 60)}:${item.lengthSeconds % 60 < 10 ? '0' : ''}${item.lengthSeconds % 60}`
                : '3:30'
            };
          });

          if (items.length > 0) {
            setSearchResults(items);
            found = true;
            break;
          }
        }
      } catch (e) {
        // try next mirror
      }
    }

    // 4. If mirrors unavailable, search local catalog
    if (!found) {
      const all = [...FEATURED_ALBUM.tracks, ...RECENTLY_PLAYED, ...ZEN_COLLECTIONS];
      const filtered = all.filter(
        (t) =>
          t.title.toLowerCase().includes(q.toLowerCase()) ||
          t.artist.toLowerCase().includes(q.toLowerCase())
      );
      setSearchResults(filtered);
    }

    setIsLoading(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleMoodClick = (mood) => {
    setQuery(mood);
    executeSearch(mood);
  };

  return (
    <div className="px-6 pt-7 pb-28 animate-in fade-in duration-200">
      
      {/* Top Header & API Key Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-charcoal-900 tracking-tight">
            Search
          </h2>
          <p className="text-xs font-sans text-charcoal-600 mt-0.5">
            Search any YouTube song or paste a video link.
          </p>
        </div>

        <button
          onClick={() => setShowKeyInput((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-sans font-medium transition-all ${
            apiKey.trim()
              ? 'bg-sage-100 text-sage-800 border border-sage-200'
              : 'bg-parchment-200 text-charcoal-600 border border-charcoal-200'
          }`}
          aria-label="YouTube API Settings"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{apiKey.trim() ? 'API Key Active' : 'Add API Key'}</span>
        </button>
      </div>

      {/* YouTube API Key Input Drawer */}
      {showKeyInput && (
        <form onSubmit={handleSaveApiKey} className="mb-5 p-4 rounded-2xl bg-parchment-50 border border-sage-200 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-charcoal-900">
              YouTube Data API v3 Key
            </span>
            {keySavedNotice && (
              <span className="text-[11px] text-sage-800 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <p className="text-[11px] text-charcoal-600 mb-3 leading-relaxed">
            Enter your free Google Cloud YouTube Data API v3 key for unlimited official search results.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 bg-parchment-200/60 border border-sage-200 rounded-xl px-3 py-2 text-xs font-mono text-charcoal-900 focus:outline-none focus:border-sage-600"
            />
            <button
              type="submit"
              className="bg-sage-700 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-sage-800 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Search Input Bar */}
      <form onSubmit={handleFormSubmit} className="relative mb-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist, song, or paste YouTube URL..."
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

      {/* Error notice */}
      {searchError && (
        <div className="mb-4 p-3 rounded-xl bg-terracotta-100/60 border border-terracotta-400/50 text-[11px] text-terracotta-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Quick Mood Search Tags */}
      <div className="mb-6">
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-2.5 block">
          Suggestions
        </span>
        <div className="flex flex-wrap gap-2">
          {moodPills.map((mood) => (
            <button
              key={mood}
              onClick={() => handleMoodClick(mood)}
              className="text-xs font-sans bg-parchment-200/80 hover:bg-parchment-300 text-charcoal-800 px-3 py-1.5 rounded-full transition-colors active:scale-95"
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results / Music Posters List */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
          {searchResults.length > 0 ? `Results (${searchResults.length})` : 'Popular Tracks'}
        </span>

        <div className="flex flex-col gap-2.5">
          {(searchResults.length > 0 ? searchResults : [...FEATURED_ALBUM.tracks, ...RECENTLY_PLAYED]).map(
            (track) => {
              const isThisPlaying =
                (currentTrack?.id || currentTrack?.idYoutube) === (track.id || track.idYoutube);

              return (
                <div
                  key={track.id || track.idYoutube}
                  onClick={() => playTrack(track, searchResults.length > 0 ? searchResults : null)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/80 hover:bg-parchment-200 border border-sage-100/70 cursor-pointer active:scale-98 transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-2">
                    {/* Real Music Poster Thumbnail */}
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
                        playTrack(track, searchResults.length > 0 ? searchResults : null);
                      }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        isThisPlaying && isPlaying
                          ? 'bg-sage-700 text-white'
                          : 'bg-parchment-200 text-charcoal-800 hover:bg-sage-700 hover:text-white'
                      }`}
                      aria-label="Play track"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

    </div>
  );
};
