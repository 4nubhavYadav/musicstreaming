/**
 * Capacitor Native Bridge for Sora Audio
 *
 * Interfaces with the native SoraPlayer Android plugin when running inside
 * the Capacitor Android app container.
 */

import { Capacitor } from '@capacitor/core';
import { resolveAudioStream } from './streamResolver.js';

let SoraPlayer = null;
let bridgeVersion = 0;
let isInitialized = false;

export function getNativeBridgeVersion() {
  return bridgeVersion;
}

// Event listeners collection
const listeners = {
  stateChanged: new Set(),
  positionUpdate: new Set(),
  trackChanged: new Set(),
  queueEnded: new Set(),
  needMoreTracks: new Set(),
  error: new Set()
};

/**
 * Check if running natively inside Android app container
 */
export function isNativeApp() {
  if (typeof window === 'undefined') return false;

  // Domain security restriction
  const hostname = window.location.hostname;
  const isAllowedDomain =
    hostname === 'sora-audio.pages.dev' ||
    hostname.endsWith('.sora-audio.pages.dev') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';

  if (!isAllowedDomain) return false;

  return (
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable('SoraPlayer')
  );
}

/**
 * Initialize native bridge and register listeners
 */
export async function initNativeBridge() {
  if (isInitialized) return true;
  if (!isNativeApp()) return false;

  try {
    SoraPlayer = Capacitor.Plugins.SoraPlayer;
    if (!SoraPlayer) return false;

    // Check bridge version for backwards compatibility
    try {
      const verRes = await SoraPlayer.getBridgeVersion();
      bridgeVersion = verRes?.version || 1;
    } catch {
      bridgeVersion = 1;
    }

    // Register native event forwarders
    await SoraPlayer.addListener('stateChanged', (data) => {
      listeners.stateChanged.forEach((fn) => fn(data));
    });

    await SoraPlayer.addListener('positionUpdate', (data) => {
      listeners.positionUpdate.forEach((fn) => fn(data));
    });

    await SoraPlayer.addListener('trackChanged', (data) => {
      listeners.trackChanged.forEach((fn) => fn(data));
    });

    await SoraPlayer.addListener('queueEnded', (data) => {
      listeners.queueEnded.forEach((fn) => fn(data));
    });

    await SoraPlayer.addListener('needMoreTracks', (data) => {
      listeners.needMoreTracks.forEach((fn) => fn(data));
    });

    await SoraPlayer.addListener('error', (data) => {
      listeners.error.forEach((fn) => fn(data));
    });

    // Phase 4: Handle stream URL resolution request from native
    await SoraPlayer.addListener('needUrl', async (data) => {
      if (data?.videoId) {
        try {
          const stream = await resolveAudioStream(data.videoId);
          if (stream?.url) {
            await SoraPlayer.provideUrl({
              videoId: data.videoId,
              url: stream.url,
              expiry: stream.expiry
            });
          }
        } catch (err) {
          console.warn('[NativeBridge] provideUrl resolution error:', err);
        }
      }
    });

    isInitialized = true;
    return true;
  } catch (err) {
    console.warn('[NativeBridge] Init failed:', err);
    return false;
  }
}

/**
 * Subscribe to native playback events
 */
export function onNativeEvent(event, callback) {
  if (listeners[event]) {
    listeners[event].add(callback);
    return () => listeners[event].delete(callback);
  }
  return () => {};
}

/**
 * Native playback commands
 */
export async function nativeSetQueue(tracks, startIndex = 0) {
  if (!SoraPlayer) return;

  // Resolve stream URL for at least the first track immediately
  const formattedItems = await Promise.all(
    tracks.map(async (track, index) => {
      const videoId = track.id || track.idYoutube;
      let streamUrl = '';
      let expiry = 0;

      // Pre-resolve the initial playing track
      if (index === startIndex) {
        try {
          const resolved = await resolveAudioStream(videoId);
          if (resolved) {
            streamUrl = resolved.url;
            expiry = resolved.expiry;
          }
        } catch {
          // Fall back to on-demand needUrl
        }
      }

      return {
        videoId,
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        artworkUrl: track.artwork || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        streamUrl,
        expiry
      };
    })
  );

  return SoraPlayer.setQueue({ items: formattedItems, startIndex });
}

export async function nativeAppendToQueue(tracks) {
  if (!SoraPlayer) return;
  const items = tracks.map((track) => {
    const videoId = track.id || track.idYoutube;
    return {
      videoId,
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      artworkUrl: track.artwork || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      streamUrl: '',
      expiry: 0
    };
  });
  return SoraPlayer.appendToQueue({ items });
}

export async function nativePlay() {
  if (SoraPlayer) return SoraPlayer.play();
}

export async function nativePause() {
  if (SoraPlayer) return SoraPlayer.pause();
}

export async function nativeSeekTo(seconds) {
  if (SoraPlayer) return SoraPlayer.seekTo({ ms: Math.round(seconds * 1000) });
}

export async function nativeNext() {
  if (SoraPlayer) return SoraPlayer.next();
}

export async function nativePrevious() {
  if (SoraPlayer) return SoraPlayer.previous();
}

export async function nativeGetState() {
  if (SoraPlayer) return SoraPlayer.getState();
  return null;
}
