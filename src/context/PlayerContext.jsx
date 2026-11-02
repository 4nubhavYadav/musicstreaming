import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  getRadioQueue,
  getNextContinuation,
  getRelated,
  recordTrackStart,
  recordTrackProgress,
  recordTrackLike,
  isNativeApp,
  initNativeBridge,
  onNativeEvent,
  nativeSetQueue,
  nativeAppendToQueue,
  nativePlay,
  nativePause,
  nativeSeekTo,
  nativeNext,
  nativePrevious
} from '../services';

const PlayerContext = createContext(null);

export const PlayerProvider = ({ children }) => {
  // Recently Played storage
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('sora_recently_played_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [currentTrack, setCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem('sora_recently_played_list');
      const list = saved ? JSON.parse(saved) : [];
      return list.length > 0 ? list[0] : null;
    } catch {
      return null;
    }
  });

  const [queue, setQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('sora_recently_played_list');
      const list = saved ? JSON.parse(saved) : [];
      return list.length > 0 ? list : [];
    } catch {
      return [];
    }
  });

  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);

  // Loop / Repeat mode: 'off' | 'one' | 'all'
  const [repeatMode, setRepeatMode] = useState(() => {
    try {
      return localStorage.getItem('sora_repeat_mode') || 'off';
    } catch {
      return 'off';
    }
  });

  const [loopToast, setLoopToast] = useState(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);

  // Liked tracks storage (stores full track objects)
  const [likedTracks, setLikedTracks] = useState(() => {
    try {
      const saved = localStorage.getItem('sora_liked_tracks_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const likedTrackIds = likedTracks.map((t) => t.id || t.idYoutube);

  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const [sleepTimerSecondsLeft, setSleepTimerSecondsLeft] = useState(null);

  // Related & Radio Queue state
  const [relatedData, setRelatedData] = useState(null);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const continuationTokenRef = useRef(null);
  const isLoadingContinuationRef = useRef(false);
  const radioSessionIdRef = useRef(0);

  const audioRef = useRef(null);
  const activeEngineRef = useRef('yt'); // 'yt' | 'native'
  const [isNative, setIsNative] = useState(false);
  const isNativeRef = useRef(false);
  const ytPlayerRef = useRef(null);
  const isSeekingRef = useRef(false);
  const pendingTrackRef = useRef(null);
  const repeatModeRef = useRef(repeatMode);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const currentTrackRef = useRef(currentTrack);

  // Keep refs in sync
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    isNativeRef.current = isNative;
  }, [isNative]);

  // Phase 5: Initialize native bridge if running inside Capacitor Android
  useEffect(() => {
    if (isNativeApp()) {
      initNativeBridge().then((ready) => {
        if (ready) {
          setIsNative(true);
          isNativeRef.current = true;
          activeEngineRef.current = 'native';
        }
      });
    }
  }, []);

  // Persist Recently Played
  useEffect(() => {
    try {
      localStorage.setItem('sora_recently_played_list', JSON.stringify(recentlyPlayed));
    } catch (e) {
      console.warn('Could not persist recent tracks', e);
    }
  }, [recentlyPlayed]);

  // Persist Liked tracks
  useEffect(() => {
    try {
      localStorage.setItem('sora_liked_tracks', JSON.stringify(likedTrackIds));
    } catch (e) {
      console.warn('Could not persist liked tracks', e);
    }
  }, [likedTrackIds]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimerSecondsLeft === null) return;
    if (sleepTimerSecondsLeft <= 0) {
      if (activeEngineRef.current === 'native' && audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current?.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerSecondsLeft]);

  const setPlayerInstance = (player) => {
    ytPlayerRef.current = player;
  };

  const maybeAppendMoreTracks = useCallback(() => {
    const currentQ = queueRef.current;
    const currentIndex = queueIndexRef.current;
    const remaining = currentQ.length - (currentIndex + 1);

    if (
      remaining < 3 &&
      continuationTokenRef.current &&
      !isLoadingContinuationRef.current
    ) {
      isLoadingContinuationRef.current = true;
      getNextContinuation(continuationTokenRef.current)
        .then((result) => {
          continuationTokenRef.current = result.continuation;
          if (result.tracks && result.tracks.length > 0) {
            const existingIds = new Set(
              queueRef.current.map((t) => t.id || t.idYoutube)
            );
            const recentIds = new Set(
              recentlyPlayed.slice(0, 50).map((t) => t.id || t.idYoutube)
            );

            const newUnique = result.tracks.filter((t) => {
              const id = t.id || t.idYoutube;
              if (!id || !t.title || existingIds.has(id) || recentIds.has(id)) {
                return false;
              }
              existingIds.add(id);
              return true;
            });

            if (newUnique.length > 0) {
              setQueue((prev) => [...prev, ...newUnique]);
              if (isNativeRef.current) {
                nativeAppendToQueue(newUnique);
              }
            }
          }
        })
        .catch((e) => console.warn('Failed to load continuation:', e))
        .finally(() => {
          isLoadingContinuationRef.current = false;
        });
    }
  }, [recentlyPlayed]);

  const playTrack = (track = null, newQueue = null) => {
    const targetTrack = track || currentTrack;
    if (!targetTrack) return;

    const videoId = targetTrack.idYoutube || targetTrack.id;

    // Immediate fast path: trigger audio load & play synchronously inside user touch/click event
    if (!isNativeRef.current) {
      activeEngineRef.current = 'yt';
      if (ytPlayerRef.current && (ytPlayerRef.current.loadVideoById || ytPlayerRef.current.cueVideoById)) {
        try {
          if (typeof ytPlayerRef.current.loadVideoById === 'function') {
            try {
              ytPlayerRef.current.loadVideoById(videoId, 0);
            } catch {
              ytPlayerRef.current.loadVideoById({ videoId, startSeconds: 0 });
            }
          }
          if (typeof ytPlayerRef.current.playVideo === 'function') {
            ytPlayerRef.current.playVideo();
          }
        } catch (err) {
          console.warn('Fast-path YT Player launch notice:', err);
        }
      } else {
        pendingTrackRef.current = targetTrack;
      }
    }

    // Update Recently Played (deduplicate and keep up to 50)
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter(
        (t) => (t.id || t.idYoutube) !== videoId
      );
      return [targetTrack, ...filtered].slice(0, 50);
    });

    const isCustomQueue = Boolean(newQueue && newQueue.length > 1);

    if (newQueue && newQueue.length > 0) {
      setQueue(newQueue);
      const idx = newQueue.findIndex(
        (t) => (t.id || t.idYoutube) === videoId
      );
      setQueueIndex(idx !== -1 ? idx : 0);
    } else if (track) {
      const idx = queue.findIndex(
        (t) => (t.id || t.idYoutube) === videoId
      );
      if (idx !== -1) {
        setQueueIndex(idx);
      } else {
        setQueue((prev) => [track, ...prev]);
        setQueueIndex(0);
      }
    }

    setCurrentTrack(targetTrack);
    setCurrentTime(0);
    setIsBuffering(true);
    setIsPlaying(true);

    // Record listening history (Phase 2)
    recordTrackStart(targetTrack);

    // If starting a track without custom multi-song queue, automatically build algorithmic radio queue
    if (!isCustomQueue && videoId) {
      const currentSession = ++radioSessionIdRef.current;
      continuationTokenRef.current = null;
      setIsLoadingRelated(true);

      getRadioQueue(videoId)
        .then((result) => {
          if (radioSessionIdRef.current !== currentSession) return;

          continuationTokenRef.current = result.continuation;

          if (result.tracks && result.tracks.length > 0) {
            const recentIds = new Set(
              recentlyPlayed.slice(0, 50).map((t) => t.id || t.idYoutube)
            );
            recentIds.add(videoId);

            const seen = new Set([videoId]);
            const dedupedTracks = result.tracks.filter((t) => {
              const id = t.id || t.idYoutube;
              if (!id || !t.title || seen.has(id) || recentIds.has(id)) {
                return false;
              }
              seen.add(id);
              return true;
            });

            if (dedupedTracks.length > 0) {
              setQueue((prev) => {
                const currentT =
                  prev.find((t) => (t.id || t.idYoutube) === videoId) ||
                  targetTrack;
                return [currentT, ...dedupedTracks];
              });
              setQueueIndex(0);
            }
          }

          // Fetch Related tab content (browseId starting with MPTRt_)
          if (result.relatedBrowseId) {
            getRelated(result.relatedBrowseId)
              .then((relData) => {
                if (radioSessionIdRef.current === currentSession) {
                  setRelatedData(relData);
                }
              })
              .catch(() => {})
              .finally(() => {
                if (radioSessionIdRef.current === currentSession) {
                  setIsLoadingRelated(false);
                }
              });
          } else {
            setIsLoadingRelated(false);
          }
        })
        .catch((err) => {
          console.warn('Radio queue error:', err);
          setIsLoadingRelated(false);
        });
    }

    // In native mode, route playback to ExoPlayer via nativeSetQueue
    if (isNativeRef.current) {
      const queueToSend = isCustomQueue
        ? newQueue
        : queue.length > 0
        ? queue
        : [targetTrack];
      const startIdx = queueToSend.findIndex(
        (t) => (t.id || t.idYoutube) === videoId
      );
      nativeSetQueue(queueToSend, startIdx !== -1 ? startIdx : 0);
      setIsPlaying(true);
      return;
    }
  };

  const pauseTrack = () => {
    if (isNativeRef.current) {
      nativePause();
      setIsPlaying(false);
      return;
    }
    if (activeEngineRef.current === 'native' && audioRef.current) {
      audioRef.current.pause();
    }
    if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch (err) {
        // ignore
      }
    }
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      if (isNativeRef.current) {
        nativePlay();
        setIsPlaying(true);
        return;
      }
      if (activeEngineRef.current === 'native' && audioRef.current && audioRef.current.src) {
        audioRef.current.play().catch(() => playTrack(currentTrack));
        setIsPlaying(true);
      } else if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } else {
        playTrack(currentTrack);
      }
    }
  };

  // 100% reliable restart for looping current track
  const restartCurrentTrack = () => {
    if (activeEngineRef.current === 'native' && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
        setCurrentTime(0);
        return;
      } catch (e) {
        console.warn('restart native audio error', e);
      }
    }

    const targetTrack = currentTrackRef.current || currentTrack;
    const vid = targetTrack?.idYoutube || targetTrack?.id;
    if (ytPlayerRef.current && vid) {
      try {
        if (ytPlayerRef.current.seekTo) {
          ytPlayerRef.current.seekTo(0, true);
        } else if (ytPlayerRef.current.loadVideoById) {
          ytPlayerRef.current.loadVideoById({
            videoId: vid,
            startSeconds: 0
          });
        }
        if (ytPlayerRef.current.playVideo) {
          ytPlayerRef.current.playVideo();
        }
        setIsPlaying(true);
        setCurrentTime(0);
      } catch (e) {
        console.warn('restartCurrentTrack error', e);
      }
    }
  };

  const nextTrack = () => {
    // Record skip progress for history store (Phase 2)
    if (currentTrackRef.current) {
      const comp = duration > 0 ? (currentTime / duration) * 100 : 0;
      recordTrackProgress(currentTrackRef.current, comp, true);
    }

    if (isNativeRef.current) {
      nativeNext();
      return;
    }

    // If repeat mode is 'one', repeat this exact track
    if (repeatModeRef.current === 'one') {
      restartCurrentTrack();
      return;
    }

    const currentQ = queueRef.current;
    if (!currentQ || currentQ.length === 0) return;

    if (currentQ.length === 1) {
      if (repeatModeRef.current === 'all') {
        restartCurrentTrack();
      } else {
        pauseTrack();
      }
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * currentQ.length);
    } else {
      nextIndex = queueIndexRef.current + 1;
      if (nextIndex >= currentQ.length) {
        if (repeatModeRef.current === 'all') {
          nextIndex = 0;
        } else {
          pauseTrack();
          return;
        }
      }
    }

    setQueueIndex(nextIndex);
    const nextItem = currentQ[nextIndex];
    if (nextItem) {
      playTrack(nextItem, currentQ);
    }

    // Proactively buffer more tracks if fewer than 3 remain
    maybeAppendMoreTracks();
  };

  const onTrackEnded = useCallback(() => {
    // Record full 100% completion
    if (currentTrackRef.current) {
      recordTrackProgress(currentTrackRef.current, 100, false);
    }
    if (repeatModeRef.current === 'one') {
      restartCurrentTrack();
    } else {
      nextTrack();
    }
  }, [nextTrack, restartCurrentTrack]);

  // Phase 5: Subscribe to native playback events when running inside Android container
  useEffect(() => {
    if (!isNative) return;

    const unsubState = onNativeEvent('stateChanged', ({ state, isPlaying: nativePlaying }) => {
      setIsPlaying(Boolean(nativePlaying));
      setIsBuffering(state === 'buffering');
    });

    const unsubPos = onNativeEvent('positionUpdate', ({ positionMs, durationMs }) => {
      if (!isSeekingRef.current) {
        setCurrentTime(positionMs / 1000);
        if (durationMs > 0) setDuration(durationMs / 1000);
      }
    });

    const unsubTrack = onNativeEvent('trackChanged', (item) => {
      if (item && item.videoId) {
        const matching =
          queueRef.current.find((t) => (t.id || t.idYoutube) === item.videoId) || {
            id: item.videoId,
            idYoutube: item.videoId,
            title: item.title,
            artist: item.artist,
            artwork: item.artworkUrl
          };
        setCurrentTrack(matching);
        if (typeof item.index === 'number') {
          setQueueIndex(item.index);
        }
        recordTrackStart(matching);
      }
    });

    const unsubQueueEnd = onNativeEvent('queueEnded', () => {
      onTrackEnded();
    });

    const unsubNeedMore = onNativeEvent('needMoreTracks', () => {
      maybeAppendMoreTracks();
    });

    const unsubError = onNativeEvent('error', (err) => {
      console.warn('[NativePlayback] Native error, fallback to web:', err);
      setIsBuffering(false);
      if (ytPlayerRef.current && currentTrackRef.current) {
        const vid = currentTrackRef.current.idYoutube || currentTrackRef.current.id;
        try {
          ytPlayerRef.current.loadVideoById(vid, 0);
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } catch {}
      }
    });

    return () => {
      unsubState();
      unsubPos();
      unsubTrack();
      unsubQueueEnd();
      unsubNeedMore();
      unsubError();
    };
  }, [isNative, onTrackEnded, maybeAppendMoreTracks]);

  const prevTrack = () => {
    if (currentTime > 3) {
      seek(0);
      return;
    }

    if (currentTrackRef.current) {
      const comp = duration > 0 ? (currentTime / duration) * 100 : 0;
      recordTrackProgress(currentTrackRef.current, comp, true);
    }

    if (isNativeRef.current) {
      nativePrevious();
      return;
    }

    const currentQ = queueRef.current;
    if (!currentQ || currentQ.length === 0) return;

    if (currentQ.length === 1) {
      restartCurrentTrack();
      return;
    }

    let prevIndex = queueIndexRef.current - 1;
    if (prevIndex < 0) {
      prevIndex = currentQ.length - 1;
    }
    setQueueIndex(prevIndex);
    const prevItem = currentQ[prevIndex];
    if (prevItem) {
      playTrack(prevItem, currentQ);
    }
  };

  const seek = (timeInSeconds) => {
    setCurrentTime(timeInSeconds);
    if (isNativeRef.current) {
      nativeSeekTo(timeInSeconds);
      return;
    }
    if (activeEngineRef.current === 'native' && audioRef.current) {
      try {
        audioRef.current.currentTime = timeInSeconds;
      } catch (e) {
        console.warn('audio seek error', e);
      }
    }
    if (ytPlayerRef.current && ytPlayerRef.current.seekTo) {
      try {
        ytPlayerRef.current.seekTo(timeInSeconds, true);
      } catch (e) {
        console.warn('seek error', e);
      }
    }
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => {
      let nextMode;
      let msg;
      // Cycle: off -> one (loop song) -> all (loop queue) -> off
      if (prev === 'off') {
        nextMode = 'one';
        msg = '🔂 Looping Current Song';
      } else if (prev === 'one') {
        nextMode = 'all';
        msg = '🔁 Looping Entire Queue';
      } else {
        nextMode = 'off';
        msg = '➡️ Loop Off';
      }

      try {
        localStorage.setItem('sora_repeat_mode', nextMode);
      } catch (e) {
        // ignore
      }

      repeatModeRef.current = nextMode;
      if (audioRef.current) {
        audioRef.current.loop = nextMode === 'one';
      }

      setLoopToast(msg);
      setTimeout(() => setLoopToast(null), 2500);
      return nextMode;
    });
  };

  const toggleLike = (trackOrId) => {
    if (!trackOrId) return;
    const id = typeof trackOrId === 'string' ? trackOrId : trackOrId.id || trackOrId.idYoutube;
    const trackObj =
      typeof trackOrId === 'object'
        ? trackOrId
        : currentTrack && (currentTrack.id === id || currentTrack.idYoutube === id)
        ? currentTrack
        : recentlyPlayed.find((t) => (t.id || t.idYoutube) === id);

    setLikedTracks((prev) => {
      const exists = prev.some((t) => (t.id || t.idYoutube) === id);
      let updated;
      if (exists) {
        updated = prev.filter((t) => (t.id || t.idYoutube) !== id);
      } else if (trackObj) {
        updated = [trackObj, ...prev];
      } else {
        updated = prev;
      }

      // Record in local history store (Phase 2)
      recordTrackLike(id, !exists, trackObj);

      try {
        localStorage.setItem('sora_liked_tracks_list', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save liked tracks', e);
      }
      return updated;
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

  // MediaSession API for Native Lock Screen & Dynamic Island Controls (Web path only)
  useEffect(() => {
    if (!isNative && 'mediaSession' in navigator && currentTrack) {
      const posterUrl =
        currentTrack.artwork || `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'YouTube Music',
        artwork: [
          { src: posterUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: posterUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: posterUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: posterUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: posterUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (activeEngineRef.current === 'native' && audioRef.current) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else if (ytPlayerRef.current?.playVideo) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else {
          playTrack(currentTrackRef.current);
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 10;
        seek(Math.max(0, (audioRef.current?.currentTime || currentTime) - skip));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 10;
        seek(Math.min(duration || 300, (audioRef.current?.currentTime || currentTime) + skip));
      });

      navigator.mediaSession.setActionHandler('stop', () => pauseTrack());
    }
  }, [currentTrack, currentTime, duration]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Sync position state with system lock screen scrubber
  useEffect(() => {
    if (
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: 1,
          position: Math.min(Math.max(0, currentTime), duration)
        });
      } catch (e) {
        // ignore
      }
    }
  }, [currentTime, duration]);

  if (typeof window !== 'undefined') {
    window.__sora = {
      playTrack,
      currentTrack,
      queue,
      isPlaying,
      getYTPlayer: () => ytPlayerRef.current,
      getAudio: () => audioRef.current,
      isNative: isNativeRef.current
    };
  }

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
        relatedData,
        isLoadingRelated,
        isShuffle,
        repeatMode,
        repeatModeRef,
        loopToast,
        isNowPlayingOpen,
        recentlyPlayed,
        likedTracks,
        likedTrackIds,
        sleepTimerMinutes,
        sleepTimerSecondsLeft,
        isSeekingRef,
        pendingTrackRef,
        restartCurrentTrack,
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
        onTrackEnded,
        seek,
        toggleShuffle,
        cycleRepeat,
        toggleLike,
        isLiked,
        isNative,
        activeEngineRef,
        openNowPlaying: () => setIsNowPlayingOpen(true),
        closeNowPlaying: () => setIsNowPlayingOpen(false),
        startSleepTimer
      }}
    >
      {children}

      {/* Native HTML5 Audio Engine (for direct streams or fallback) */}
      <audio
        ref={audioRef}
        id="sora-native-audio"
        playsInline
        webkit-playsinline="true"
        preload="auto"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
          zIndex: -1000
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
        }}
        onWaiting={() => {
          setIsBuffering(true);
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onTimeUpdate={() => {
          if (audioRef.current && !isSeekingRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (repeatModeRef.current === 'one') {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          } else if (repeatModeRef.current === 'all') {
            nextTrack();
          } else {
            setIsPlaying(false);
          }
        }}
      />
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
