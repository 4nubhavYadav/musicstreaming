import { ARTWORKS } from './artworks';

export const FEATURED_ALBUM = {
  id: 'featured-golden-horizons',
  title: 'Golden Horizons',
  artist: 'Tycho',
  description: 'Warm, expansive instrumentals for quiet mornings and open roads.',
  artwork: ARTWORKS.aWalk,
  tracks: [
    {
      id: 'SDNA934EEVk',
      title: 'A Walk',
      artist: 'Tycho',
      album: 'Golden Horizons',
      duration: '5:16',
      artwork: ARTWORKS.aWalk
    },
    {
      id: 'yMy14Zs0u28',
      title: 'Awake',
      artist: 'Tycho',
      album: 'Golden Horizons',
      duration: '4:43',
      artwork: ARTWORKS.aWalk
    },
    {
      id: 'IuGO6WHcruU',
      title: 'Hours',
      artist: 'Tycho',
      album: 'Golden Horizons',
      duration: '5:44',
      artwork: ARTWORKS.aWalk
    }
  ]
};

export const RECENTLY_PLAYED = [
  {
    id: '0iWqT2iE4f8',
    title: 'Small Moments',
    artist: 'Leif Vollebekk',
    album: 'Twin Solitude',
    duration: '3:45',
    artwork: ARTWORKS.smallMoments
  },
  {
    id: 'MACzQc6FlRM',
    title: 'Fading West',
    artist: 'Novo Amor',
    album: 'Birthplace',
    duration: '3:32',
    artwork: ARTWORKS.fadingWest
  },
  {
    id: 'E9tnLMV7m3s',
    title: 'Things We Don\'t Say',
    artist: 'Ólafur Arnalds',
    album: 're:member',
    duration: '3:18',
    artwork: ARTWORKS.thingsWeDontSay
  },
  {
    id: 'wTWLzI7mDps',
    title: 'In Tandem',
    artist: 'Yosi Horikawa',
    album: 'Vapor',
    duration: '4:50',
    artwork: ARTWORKS.inTandem
  }
];

export const ZEN_COLLECTIONS = [
  {
    id: 'deep-rest',
    title: 'Weightless Drift',
    artist: 'Marconi Union',
    album: 'Ambient Transmissions',
    idYoutube: 'UfcAVejslrU',
    artwork: ARTWORKS.fadingWest,
    duration: '8:05'
  },
  {
    id: 'pianoworks',
    title: 'Nuvole Bianche',
    artist: 'Ludovico Einaudi',
    album: 'Una Mattina',
    idYoutube: '4VR-6AS0-l4',
    artwork: ARTWORKS.smallMoments,
    duration: '5:57'
  },
  {
    id: 'ascent',
    title: 'An Ending (Ascent)',
    artist: 'Brian Eno',
    album: 'Apollo: Atmospheres',
    idYoutube: 'hMXaE9Uuvb8',
    artwork: ARTWORKS.thingsWeDontSay,
    duration: '4:24'
  }
];
