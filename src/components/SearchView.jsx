import React, { useState } from 'react';
import { Search as SearchIcon, Play, Plus, Sparkles, ExternalLink } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { getZenArtwork } from '../data/artworks';
import { ZEN_COLLECTIONS, RECENTLY_PLAYED, FEATURED_ALBUM } from '../data/catalog';

export const SearchView = () => {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const moodPills = [
    { label: 'Quiet Mornings', query: 'Tycho ambient instrumentals' },
    { label: 'Deep Focus', query: 'Brian Eno Marconi Union ambient' },
    { label: 'Modern Classical', query: 'Olafur Arnalds Ludovico Einaudi piano' },
    { label: 'Nature & Stream', query: 'Forest stream birds ambient sound' },
    { label: 'Lo-Fi Zen', query: 'ChilledCow lofi quiet beats' },
  ];

  const extractYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleCustomUrlSubmit = (e) => {
    e.preventDefault();
    const id = extractYoutubeId(customUrl);
    if (id) {
      const customTrack = {
        id: id,
        idYoutube: id,
        title: 'Custom YouTube Stream',
        artist: 'Ambient Audio',
        album: 'Direct Stream',
        duration: 'Stream',
        artwork: getZenArtwork('Custom', 'Audio')
      };
      playTrack(customTrack);
      setCustomUrl('');
    } else {
      alert('Please enter a valid YouTube video link or ID (e.g. https://youtu.be/...)');
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Check if user pasted a YouTube URL in search bar
    const potentialId = extractYoutubeId(query);
    if (potentialId) {
      const customTrack = {
        id: potentialId,
        idYoutube: potentialId,
        title: 'YouTube Stream',
        artist: query.slice(0, 24),
        album: 'Web Stream',
        duration: 'Audio',
        artwork: getZenArtwork(query, 'Stream')
      };
      playTrack(customTrack);
      setQuery('');
      return;
    }

    setIsSearching(true);

    try {
      // Use public invidious/piped instance for free video search without API key quotas
      const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`);
      if (res.ok) {
        const data = await res.json();
        const items = (data.items || []).slice(0, 8).map(item => ({
          id: item.url ? item.url.replace('/watch?v=', '') : item.id,
          idYoutube: item.url ? item.url.replace('/watch?v=', '') : item.id,
          title: item.title || query,
          artist: item.uploaderName || 'Artist',
          album: 'Search Discovery',
          duration: item.duration ? `${Math.floor(item.duration / 60)}:${item.duration % 60 < 10 ? '0' : ''}${item.duration % 60}` : '3:30',
          artwork: getZenArtwork(item.title, item.uploaderName)
        }));
        setSearchResults(items);
      } else {
        throw new Error('Fallback to catalog');
      }
    } catch {
      // Fallback client filter
      const allCatalog = [...FEATURED_ALBUM.tracks, ...RECENTLY_PLAYED, ...ZEN_COLLECTIONS];
      const filtered = allCatalog.filter(
        t => t.title.toLowerCase().includes(query.toLowerCase()) || 
             t.artist.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.length > 0 ? filtered : [
        {
          id: 'hMXaE9Uuvb8',
          idYoutube: 'hMXaE9Uuvb8',
          title: query,
          artist: 'Zen Search Result',
          album: 'Discovered',
          duration: '4:15',
          artwork: getZenArtwork(query, 'Zen')
        }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectMood = (mood) => {
    setQuery(mood.query);
    handleSearchSubmit({ preventDefault: () => {} });
  };

  return (
    <div className="px-6 pt-6 pb-28 animate-in fade-in duration-200">
      <h2 className="font-serif text-2xl font-semibold text-charcoal-900 mb-1">
        Explore & Search
      </h2>
      <p className="text-xs font-sans text-charcoal-600 mb-5">
        Search any track on YouTube or stream directly via link.
      </p>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artist, track or paste YouTube link..."
          className="w-full bg-parchment-50 border border-sage-100 rounded-2xl py-3 pl-11 pr-4 text-xs font-sans text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sage-600 focus:ring-1 focus:ring-sage-600 shadow-sm transition-all"
        />
        <SearchIcon className="w-4 h-4 text-charcoal-400 absolute left-4 top-1/2 -translate-y-1/2" />
        {query && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-sage-800 px-2 py-1 bg-sage-100 rounded-lg"
          >
            Search
          </button>
        )}
      </form>

      {/* Direct YouTube URL stream pill */}
      <form onSubmit={handleCustomUrlSubmit} className="flex gap-2 mb-6">
        <input
          type="url"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="Or paste direct YouTube URL..."
          className="flex-1 bg-parchment-50/70 border border-sage-100 rounded-xl py-2 px-3 text-[11px] font-sans text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-sage-600"
        />
        <button
          type="submit"
          className="bg-sage-700 text-white rounded-xl px-3 py-2 text-[11px] font-medium flex items-center gap-1 active:scale-95 transition-transform"
        >
          <Play className="w-3 h-3 fill-white" />
          <span>Stream</span>
        </button>
      </form>

      {/* Mood Tags */}
      <div className="mb-6">
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-2.5 block">
          Curated Zen Moods
        </span>
        <div className="flex flex-wrap gap-2">
          {moodPills.map((mood) => (
            <button
              key={mood.label}
              onClick={() => selectMood(mood)}
              className="text-xs font-sans bg-parchment-200/70 hover:bg-parchment-300 text-charcoal-800 px-3.5 py-1.5 rounded-full transition-colors active:scale-95"
            >
              {mood.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 mb-3 block">
          {searchResults.length > 0 ? 'Results' : 'Recommended For You'}
        </span>

        <div className="flex flex-col gap-2">
          {(searchResults.length > 0 ? searchResults : ZEN_COLLECTIONS).map((item) => (
            <div
              key={item.id || item.idYoutube}
              onClick={() => playTrack(item)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-parchment-50/70 hover:bg-parchment-200 border border-sage-100/50 cursor-pointer active:scale-98 transition-all group"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-parchment-200">
                  <img src={item.artwork} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-medium text-charcoal-900 truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] font-sans text-charcoal-600 truncate">
                    {item.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans text-charcoal-400">
                  {item.duration}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playTrack(item);
                  }}
                  className="w-8 h-8 rounded-full bg-sage-700 text-white flex items-center justify-center shadow-sm"
                  aria-label="Play track"
                >
                  <Play className="w-3 h-3 fill-white ml-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
