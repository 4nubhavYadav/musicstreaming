import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';

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
            autoplay: 0,
            controls: 0,
            disablekb: 1,
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
                event.target.loadVideoById({ videoId: vid, startSeconds: 0 });
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
            onError: (err) => {
              console.warn('YouTube Player Event Notice:', err);
              setIsBuffering(false);
              setTimeout(() => {
                nextTrackFnRef.current();
              }, 1200);
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
        right: 0,
        width: '240px',
        height: '160px',
        opacity: 0.001,
        pointerEvents: 'none',
        zIndex: -999,
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      <div id="sora-hidden-player-mount" />
    </div>
  );
};
