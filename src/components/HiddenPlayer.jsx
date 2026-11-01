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
    isSeekingRef
  } = usePlayer();

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    let checkYtInterval = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      const ytId = currentTrack?.idYoutube || currentTrack?.id || 'SDNA934EEVk';

      try {
        playerRef.current = new window.YT.Player('sora-hidden-player-mount', {
          height: '1',
          width: '1',
          videoId: ytId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: (event) => {
              setPlayerInstance(event.target);
            },
            onStateChange: (event) => {
              // YT.PlayerState: PLAYING (1), PAUSED (2), BUFFERING (3), ENDED (0)
              if (event.data === 1) {
                setIsPlaying(true);
                setIsBuffering(false);
                const dur = event.target.getDuration();
                if (dur && dur > 0) setDuration(dur);
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === 3) {
                setIsBuffering(true);
              } else if (event.data === 0) {
                setIsPlaying(false);
                nextTrack();
              }
            },
            onError: (err) => {
              console.warn('YouTube Audio Player Notice:', err);
              setIsBuffering(false);
              // In case video is restricted or unavailable, advance after 1.5s
              setTimeout(() => {
                nextTrack();
              }, 1500);
            }
          }
        });
      } catch (err) {
        console.warn('Player init issue:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkYtInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYtInterval);
          initPlayer();
        }
      }, 250);
    }

    return () => {
      if (checkYtInterval) clearInterval(checkYtInterval);
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // cleanup
        }
      }
    };
  }, []);

  // Update playback time polling
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime && !isSeekingRef.current) {
          try {
            const time = playerRef.current.getCurrentTime();
            const dur = playerRef.current.getDuration();
            if (typeof time === 'number') setCurrentTime(time);
            if (typeof dur === 'number' && dur > 0) setDuration(dur);
          } catch {
            // ignore cross-origin polling hiccups
          }
        }
      }, 350);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        width: '1px',
        height: '1px',
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: -9999
      }}
      aria-hidden="true"
    >
      <div id="sora-hidden-player-mount" />
    </div>
  );
};
