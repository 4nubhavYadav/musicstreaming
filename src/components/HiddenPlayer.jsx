import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { resolveAlternatePlayableId } from '../services/musicService';

export const HiddenPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    setPlayerInstance,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsBuffering,
    nextTrack,
    onTrackEnded,
    restartCurrentTrack,
    repeatModeRef,
    isSeekingRef,
    pendingTrackRef,
    activeEngineRef
  } = usePlayer();

  const playerRef = useRef(null);
  const isReadyRef = useRef(false);
  const timeUpdateTimerRef = useRef(null);
  const nextTrackFnRef = useRef(nextTrack);
  const onTrackEndedFnRef = useRef(onTrackEnded);
  const restartTrackFnRef = useRef(restartCurrentTrack);
  const loopTriggeredRef = useRef(false);
  const currentTrackRef = useRef(currentTrack);
  const retriedTracksRef = useRef(new Set());

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    nextTrackFnRef.current = nextTrack;
  }, [nextTrack]);

  useEffect(() => {
    onTrackEndedFnRef.current = onTrackEnded;
  }, [onTrackEnded]);

  useEffect(() => {
    restartTrackFnRef.current = restartCurrentTrack;
  }, [restartCurrentTrack]);

  useEffect(() => {
    const initYT = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      const defaultId = currentTrack?.idYoutube || currentTrack?.id || 'OmKAn8rNbKg';

      try {
        playerRef.current = new window.YT.Player('sora-hidden-player-mount', {
          height: '160',
          width: '240',
          videoId: defaultId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              isReadyRef.current = true;
              setPlayerInstance(event.target);

              if (pendingTrackRef?.current) {
                const vid = pendingTrackRef.current.idYoutube || pendingTrackRef.current.id;
                try {
                  event.target.loadVideoById(vid, 0);
                } catch {
                  event.target.loadVideoById({ videoId: vid, startSeconds: 0 });
                }
                event.target.playVideo();
                pendingTrackRef.current = null;
              }
            },
            onStateChange: (event) => {
              // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED, -1: UNSTARTED
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                setIsBuffering(false);
                const dur = event.target.getDuration();
                if (dur && dur > 0) setDuration(dur);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === window.YT.PlayerState.BUFFERING) {
                setIsBuffering(true);
              } else if (event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);

                // Handle completion, history tracking, and autoplay advance
                if (onTrackEndedFnRef.current) {
                  onTrackEndedFnRef.current();
                } else if (repeatModeRef.current === 'one') {
                  restartTrackFnRef.current();
                } else {
                  nextTrackFnRef.current();
                }
              }
            },
            onError: async (err) => {
              console.warn('YouTube Player Event Notice:', err);
              setIsBuffering(false);

              const currentT = currentTrackRef.current;
              const currentVid = currentT?.idYoutube || currentT?.id;

              // If Error 150 / 101 (embed restricted) or 100/2, attempt smart alternate resolution
              if (currentT && currentVid && !retriedTracksRef.current.has(currentVid)) {
                retriedTracksRef.current.add(currentVid);
                try {
                  const altId = await resolveAlternatePlayableId(currentT);
                  if (altId && altId !== currentVid && playerRef.current && playerRef.current.loadVideoById) {
                    currentT.idYoutube = altId;
                    try {
                      playerRef.current.loadVideoById(altId, 0);
                    } catch {
                      playerRef.current.loadVideoById({ videoId: altId, startSeconds: 0 });
                    }
                    if (playerRef.current.playVideo) {
                      playerRef.current.playVideo();
                    }
                    setIsBuffering(true);
                    return;
                  }
                } catch (e) {
                  console.warn('[HiddenPlayer] Alternate resolution notice:', e);
                }
              }

              // If alternate resolution was not available or also failed:
              // Stop cleanly without blindly skipping through the queue into a stuck state.
              setIsPlaying(false);
              setIsBuffering(false);
            }
          }
        });
      } catch (e) {
        console.warn('Failed to construct YT.Player:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      window.onYouTubeIframeAPIReady = initYT;
      if (!document.getElementById('yt-iframe-api-tag')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-tag';
        tag.src = 'https://www.youtube.com/iframe_api';
        const first = document.getElementsByTagName('script')[0];
        if (first && first.parentNode) {
          first.parentNode.insertBefore(tag, first);
        } else {
          document.head.appendChild(tag);
        }
      }
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Time tracking for fallback YouTube engine
  useEffect(() => {
    if (isPlaying && activeEngineRef?.current === 'yt') {
      timeUpdateTimerRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime && !isSeekingRef.current) {
          try {
            const cur = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            if (typeof cur === 'number') setCurrentTime(cur);
            if (typeof dur === 'number' && dur > 0) setDuration(dur);

            // Active loop protection: if within 0.5s of the end and in single track loop
            if (repeatModeRef.current === 'one' && dur > 3 && cur >= (dur - 0.5) && !loopTriggeredRef.current) {
              loopTriggeredRef.current = true;
              restartTrackFnRef.current();
              setTimeout(() => {
                loopTriggeredRef.current = false;
              }, 2500);
            }
          } catch {
            // cross origin security polling
          }
        }
      }, 300);
    } else {
      if (timeUpdateTimerRef.current) {
        clearInterval(timeUpdateTimerRef.current);
      }
    }

    return () => {
      if (timeUpdateTimerRef.current) {
        clearInterval(timeUpdateTimerRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '1px',
        height: '1px',
        opacity: 1, // Full opacity prevents browser background execution throttling
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        clipPath: 'inset(50%)'
      }}
      aria-hidden="true"
    >
      <div id="sora-hidden-player-mount" />
    </div>
  );
};
