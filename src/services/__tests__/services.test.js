import {
  parseMusicItem,
  parsePlaylistPanelItem,
  formatSecondsToDuration,
  INNERTUBE_CLIENT,
  SONGS_FILTER_PARAMS
} from '../innertubeService.js';

import {
  calculateSeedScore
} from '../recommendationService.js';

import {
  isDirectYoutubeQuery
} from '../musicService.js';

import {
  isTopicChannel,
  hasNegativeKeywords,
  isProvidedToYouTube,
  extractArtistName
} from '../filterService.js';

import {
  formatArtistCredit,
  extractCanonicalAlbum
} from '../musicBrainzService.js';

import {
  normalizeKey
} from '../cacheService.js';

async function runTests() {
  console.log('--- Running Tests for InnerTune YouTube Music Engine ---\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
    }
  }

  // 1. InnerTube Engine Client & Filter Constants
  assert(INNERTUBE_CLIENT.clientName === 'WEB_REMIX', 'Uses WEB_REMIX YouTube Music client');
  assert(Boolean(SONGS_FILTER_PARAMS), 'SONGS_FILTER_PARAMS constant defined');

  // 2. formatSecondsToDuration Helper
  assert(formatSecondsToDuration(211) === '3:31', 'Formats 211 seconds to 3:31');
  assert(formatSecondsToDuration(45) === '0:45', 'Formats 45 seconds to 0:45');
  assert(formatSecondsToDuration(3750) === '1:02:30', 'Formats 3750 seconds to 1:02:30');

  // 3. parseMusicItem from YouTube Music InnerTube responses
  const sampleMusicItem = {
    flexColumns: [
      {
        musicResponsiveListItemFlexColumnRenderer: {
          text: {
            runs: [{ text: 'BIRDS OF A FEATHER' }]
          }
        }
      },
      {
        musicResponsiveListItemFlexColumnRenderer: {
          text: {
            runs: [
              {
                text: 'Billie Eilish',
                navigationEndpoint: {
                  browseEndpoint: {
                    browseEndpointContextSupportedConfigs: {
                      browseEndpointContextMusicConfig: {
                        pageType: 'MUSIC_PAGE_TYPE_ARTIST'
                      }
                    }
                  }
                }
              },
              { text: ' • ' },
              {
                text: 'HIT ME HARD AND SOFT',
                navigationEndpoint: {
                  browseEndpoint: {
                    browseEndpointContextSupportedConfigs: {
                      browseEndpointContextMusicConfig: {
                        pageType: 'MUSIC_PAGE_TYPE_ALBUM'
                      }
                    }
                  }
                }
              },
              { text: ' • ' },
              { text: '3:31' }
            ]
          }
        }
      }
    ],
    overlay: {
      musicItemThumbnailOverlayRenderer: {
        content: {
          musicPlayButtonRenderer: {
            playNavigationEndpoint: {
              watchEndpoint: {
                videoId: 'WKZO-CWeOVA'
              }
            }
          }
        }
      }
    },
    thumbnail: {
      musicThumbnailRenderer: {
        thumbnail: {
          thumbnails: [
            { url: 'https://yt3.googleusercontent.com/abc=w60-h60-l90-rj', width: 60, height: 60 },
            { url: 'https://yt3.googleusercontent.com/abc=w120-h120-l90-rj', width: 120, height: 120 }
          ]
        }
      }
    }
  };

  const parsed = parseMusicItem(sampleMusicItem);
  assert(parsed !== null, 'Successfully parsed sample YouTube Music item');
  assert(parsed.id === 'WKZO-CWeOVA', 'Extracted correct videoId');
  assert(parsed.title === 'BIRDS OF A FEATHER', 'Extracted correct title');
  assert(parsed.artist === 'Billie Eilish', 'Extracted correct artist from MUSIC_PAGE_TYPE_ARTIST');
  assert(parsed.album === 'HIT ME HARD AND SOFT', 'Extracted correct album from MUSIC_PAGE_TYPE_ALBUM');
  assert(parsed.duration === '3:31', 'Extracted exact song duration');
  assert(parsed.artwork.includes('=w544-h544'), 'Upgraded thumbnail artwork to 544x544 high-res');

  // 4. Direct YouTube Link Detection
  assert(isDirectYoutubeQuery('WKZO-CWeOVA') === true, 'Detects 11-char video ID');
  assert(isDirectYoutubeQuery('https://www.youtube.com/watch?v=WKZO-CWeOVA') === true, 'Detects standard watch URL');
  assert(isDirectYoutubeQuery('https://youtu.be/WKZO-CWeOVA') === true, 'Detects youtu.be short URL');
  assert(isDirectYoutubeQuery('Billie Eilish BIRDS OF A FEATHER') === false, 'Rejects plain search query as direct link');

  // 5. Topic Channel Detection & Extraction (Legacy compatibility)
  assert(isTopicChannel('The Weeknd - Topic') === true, 'Identifies "The Weeknd - Topic" as Topic channel');
  assert(extractArtistName('The Weeknd - Topic') === 'The Weeknd', 'Extracts "The Weeknd" by removing " - Topic"');

  // 6. Negative Keyword Detection
  assert(hasNegativeKeywords('Blinding Lights (Acoustic Cover)') === true, 'Detects "cover"');
  assert(hasNegativeKeywords('Starboy (Club Remix)') === true, 'Detects "remix"');
  assert(hasNegativeKeywords('Blinding Lights') === false, 'Accepts clean title');

  // 7. Provided to YouTube by check
  assert(
    isProvidedToYouTube('Provided to YouTube by Universal Music Group\n\nStarboy...') === true,
    'Detects description starting with "Provided to YouTube by"'
  );

  // 8. Normalization
  assert(normalizeKey('  Blinding Lights - The Weeknd! ') === 'blinding lights the weeknd', 'Normalizes query key');

  // 9. Artist credit and releases
  const credits = [{ name: 'The Weeknd', joinphrase: ' feat. ' }, { name: 'Daft Punk' }];
  assert(formatArtistCredit(credits) === 'The Weeknd feat. Daft Punk', 'Formats joined artist credit correctly');

  const releases = [
    { title: 'Greatest Hits Bootleg', status: 'Bootleg' },
    { title: 'Starboy', status: 'Official', 'release-group': { 'primary-type': 'Album' } }
  ];
  assert(extractCanonicalAlbum(releases) === 'Starboy', 'Prefers official album release');

  // 10. parsePlaylistPanelItem (Radio / Up Next item parsing)
  const samplePanelItem = {
    videoId: 'kJQP7kiw5Fk',
    title: { runs: [{ text: 'Despacito' }] },
    longBylineText: {
      runs: [
        {
          text: 'Luis Fonsi',
          navigationEndpoint: {
            browseEndpoint: {
              browseEndpointContextSupportedConfigs: {
                browseEndpointContextMusicConfig: {
                  pageType: 'MUSIC_PAGE_TYPE_ARTIST'
                }
              }
            }
          }
        },
        { text: ' • ' },
        {
          text: 'VIDA',
          navigationEndpoint: {
            browseEndpoint: {
              browseEndpointContextSupportedConfigs: {
                browseEndpointContextMusicConfig: {
                  pageType: 'MUSIC_PAGE_TYPE_ALBUM'
                }
              }
            }
          }
        }
      ]
    },
    lengthText: { runs: [{ text: '3:48' }] },
    thumbnail: {
      thumbnails: [
        { url: 'https://lh3.googleusercontent.com/test=w120-h120' }
      ]
    }
  };

  const parsedPanel = parsePlaylistPanelItem(samplePanelItem);
  assert(parsedPanel !== null, 'Successfully parsed playlistPanelVideoRenderer');
  assert(parsedPanel.id === 'kJQP7kiw5Fk', 'Extracted panel item videoId');
  assert(parsedPanel.title === 'Despacito', 'Extracted panel item title');
  assert(parsedPanel.artist === 'Luis Fonsi', 'Extracted panel item artist from browseConfig');
  assert(parsedPanel.album === 'VIDA', 'Extracted panel item album from browseConfig');
  assert(parsedPanel.duration === '3:48', 'Extracted panel item duration');
  assert(parsedPanel.artwork.includes('=w544-h544'), 'Upgraded panel item thumbnail to 544x544');

  assert(parsePlaylistPanelItem(null) === null, 'Returns null for invalid panel item');
  assert(parsePlaylistPanelItem({}) === null, 'Returns null for panel item missing videoId');

  // 11. calculateSeedScore (Time-decay, completion %, likes, skips)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Freshly played full track with like
  const freshLikedTrack = {
    lastPlayed: now,
    completion: 100,
    playCount: 5,
    liked: true,
    skipCount: 0
  };
  const freshLikedScore = calculateSeedScore(freshLikedTrack, now);
  // (5 * 1.0 + 6 - 0) * exp(0) = 11.0
  assert(Math.abs(freshLikedScore - 11.0) < 0.01, 'Fresh liked track with 100% completion scores 11.0');

  // Track played 14 days ago with identical stats (should have ~36.8% of score due to 14-day exponential decay)
  const oldLikedTrack = {
    ...freshLikedTrack,
    lastPlayed: now - 14 * dayMs
  };
  const oldScore = calculateSeedScore(oldLikedTrack, now);
  assert(oldScore < freshLikedScore * 0.4 && oldScore > freshLikedScore * 0.35, '14-day decay reduces score by ~1/e (~36.8%)');

  // Track with heavy early skips
  const skippedTrack = {
    lastPlayed: now,
    completion: 20,
    playCount: 3,
    liked: false,
    skipCount: 2
  };
  const skippedScore = calculateSeedScore(skippedTrack, now);
  // (3 * 0.20 + 0 - 2 * 2.5) = 0.6 - 5.0 = -4.4
  assert(skippedScore < 0, 'Heavy skip track produces negative base score');

  // 12. Stream URL Expiry Evaluation (Phase 4)
  function isStreamExpiredOrExpiringSoon(expiryMs, thresholdMs = 60_000, currentTime = Date.now()) {
    if (!expiryMs || expiryMs <= 0) return false;
    return currentTime >= (expiryMs - thresholdMs);
  }

  const testNow = 1700000000000;
  // Stream expiring in 4 hours
  const freshExpiry = testNow + 4 * 3600 * 1000;
  assert(isStreamExpiredOrExpiringSoon(freshExpiry, 60_000, testNow) === false, 'Fresh 4-hour stream is not expiring soon');

  // Stream expiring in 45 seconds (below 60s threshold)
  const expiringSoon = testNow + 45_000;
  assert(isStreamExpiredOrExpiringSoon(expiringSoon, 60_000, testNow) === true, 'Stream expiring in 45s triggers renewal (<60s)');

  // Already expired stream
  const pastExpiry = testNow - 1000;
  assert(isStreamExpiredOrExpiringSoon(pastExpiry, 60_000, testNow) === true, 'Past expired stream triggers renewal');

  console.log(`\nResults: ${passed} / ${total} tests passed!`);
  if (passed === total) {
    console.log('ALL UNIT TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests();
