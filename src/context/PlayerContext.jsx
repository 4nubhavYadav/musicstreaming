import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { FEATURED_ALBUM, RECENTLY_PLAYED } from '../data/catalog';

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  const initialTrack = FEATURED_ALBUM.tracks[0];
  const initialQueue = [
    ...FEATURED_ALBUM.tracks,
    ...RECENTLY_PLAYED
  ];

  const [currentTrack, setCurrentTrack] = useState(initialTrack);
  const [queue, setQueue] = useState(initialQueue);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(316);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('all');
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [likedTrackIds, setLikedTrackIds] = useState(() => {
    try {
      const saved = localStorage.getItem('sora_liked_tracks');
      return saved ? JSON.parse(saved) : [initialTrack.id];
    } catch {
      return [initialTrack.id];
    }
  });

  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(null);

  const ytPlayerRef = useRef(null);
  const isSeekingRef = useRef(false);
  const pendingTrackRef = useRef(null);

  // Liked tracks save
  useEffect(() => {
    try {
      localStorage.setItem('sora_liked_tracks', JSON.stringify(likedTrackIds));
    } catch (e) {
      console.warn('Liked tracks persistence error', e);
    }
  }, [likedTrackIds]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) return;
    if (sleepTimerSecondsLeft <= 0) {
      pauseTrack();
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft]);

  // MediaSession API
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Sora Zen Music',
        artwork: [
          { src: currentTrack.artwork, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => playTrack());
      navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const setPlayerInstance = (player) => {
    ytPlayerRef.current = player;
  };

  const playTrack = (track = null, newQueue = null) => {
    const targetTrack = track || currentTrack;
    
    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(t => (t.id || t.idYoutube) === (targetTrack.id || targetTrack.idYoutube));
      setQueueIndex(idx !== -1 ? idx : 0);
    } else if (track) {
      const idx = queue.findIndex(t => (t.id || t.idYoutube) === (track.id || track.idYoutube));
      if (idx !== -1) {
        setQueueIndex(idx);
      } else {
        setQueue(prev => [track, ...prev]);
        setQueueIndex(0);
      }
    }

    const videoId = targetTrack.idYoutube || targetTrack.id;
    const isDifferentTrack = !currentTrack || (currentTrack.id || currentTrack.idYoutube) !== videoId;

    if (isDifferentTrack) {
      setCurrentTrack(targetTrack);
      setCurrentTime(0);
    }

    if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
      try {
        if (isDifferentTrack) {
          ytPlayerRef.current.loadVideoById({
            videoId: videoId,
            startSeconds: 0
          });
        }
        ytPlayerRef.current.playVideo();
      } catch (err) {
        console.warn('playVideo call failed', err);
      }
    } else {
      pendingTrackRef.current = targetTrack;
    }

    setIsPlaying(true);
    setIsBuffering(true);
  };

  const pauseTrack = () => {
    if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (err) {
        console.warn('pauseVideo call failed', err);
      }
    }
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(currentTrack);
    }
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      seek(0);
      playTrack(currentTrack);
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          pauseTrack();
          return;
        }
      }
    }

    setQueueIndex(nextIndex);
    const nextItem = queue[nextIndex];
    if (nextItem) {
      playTrack(nextItem);
    }
  };

  const prevTrack = () => {
    if (currentTime > 4) {
      seek(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = queue.length - 1;
    }
    setQueueIndex(prevIndex);
    const prevItem = queue[prevIndex];
    if (prevItem) {
      playTrack(prevItem);
    }
  };

  const seek = (timeInSeconds) => {
    setCurrentTime(timeInSeconds);
    if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
      try {
        ytPlayerRef.current.seekTo(timeInSeconds, true);
      } catch (e) {
        console.warn('seek error', e);
      }
    }
  };

  const toggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  const cycleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'all') return 'one';
      if (prev === 'one') return 'off';
      return 'all';
    });
  };

  const toggleLike = (trackId) => {
    setLikedTrackIds(prev => {
      if (prev.includes(trackId)) {
        return prev.filter(id => id !== trackId);
      } else {
        return [...prev, trackId];
      }
    });
  };

  const isLiked = (trackId) => likedTrackIds.includes(trackId);

  const startSleepTimer = (minutes) => {
    if (minutes === null) {
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
    } else {
      setSleepTimerMinutes(minutes);
      setSleepTimerSecondsLeft(minutes * 60);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        queue,
        queueIndex,
        isShuffle,
        repeatMode,
        isNowPlayingOpen,
        likedTrackIds,
        sleepTimerMinutes,
        sleepTimerSecondsLeft,
        isSeekingRef,
        pendingTrackRef,
        setPlayerInstance,
        setCurrentTime,
        setDuration,
        setIsPlaying,
        setIsBuffering,
        playTrack,
        pauseTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seek,
        toggleShuffle,
        cycleRepeat,
        toggleLike,
        isLiked,
        openNowPlaying: () => setIsNowPlayingOpen(true),
        closeNowPlaying: () => setIsNowPlayingOpen(false),
        startSleepTimer
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
