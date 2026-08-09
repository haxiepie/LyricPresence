// Entry point for LyricPresence: syncs Spotify playback and updates Discord RPC
// with the currently playing song and the active lyric line (if available).
//
// Spotify handles playback metadata.
// LRCLIB is the primary lyric provider.
// If LRCLIB cannot find synced lyrics, Lrcmux is used as a fallback.
// Discord continues updating normally while lyric providers are queried.

import "dotenv/config";

import { Client } from "@xhayper/discord-rpc";

import {
    getCurrentPlayback,
    type CurrentPlayback
} from "./spotify.js";

import {
    getLyricAt,
    getSyncedLyrics,
    type LyricLine
} from "./lyrics.js";

const clientId =
    process.env.DISCORD_CLIENT_ID;

if (!clientId) {
    throw new Error(
        "DISCORD_CLIENT_ID is missing from .env"
    );
}

const client =
    new Client({
        clientId
    });


// -------------------------------------------------------
// Timing
// -------------------------------------------------------

// How often Spotify itself is checked.
//
// NOTE:
// Lower values use Spotify's API quota much faster.
// 1000ms is aggressive. Be careful with this.
const SPOTIFY_SYNC_INTERVAL_MS =
    1_000;


// Discord / lyric position update frequency.
//
// This does NOT query Spotify.
// It uses the locally estimated playback position.
const PRESENCE_UPDATE_INTERVAL_MS =
    250;


// Positive values delay lyrics.
//
// Negative values show lyrics earlier.
//
// Examples:
//
// LYRIC_OFFSET_MS=500
// -> lyric appears 500ms later
//
// LYRIC_OFFSET_MS=-500
// -> lyric appears 500ms earlier
const LYRIC_OFFSET_MS =
    Number(
        process.env.LYRIC_OFFSET_MS ??
        "0"
    );


// Maximum lyric length before trimming.
const MAX_LYRIC_LENGTH =
    Number(
        process.env.MAX_LYRIC_LENGTH ??
        "92"
    );


// -------------------------------------------------------
// Playback state
// -------------------------------------------------------

interface PlaybackClock {
    playback: CurrentPlayback;
    fetchedAt: number;
}


let currentClock:
    PlaybackClock | null =
    null;


let currentLyrics:
    LyricLine[] =
    [];


let currentTrackId:
    string | null =
    null;


let lastPresenceSignature =
    "";


let spotifySyncRunning =
    false;


let presenceUpdateRunning =
    false;


// -------------------------------------------------------
// Playback position
// -------------------------------------------------------

function getEstimatedProgressMs():
number {
    if (!currentClock) {
        return 0;
    }

    const {
        playback,
        fetchedAt
    } = currentClock;


    if (!playback.isPlaying) {
        return playback.progressMs;
    }


    return Math.min(
        playback.durationMs,

        playback.progressMs +
        (
            Date.now() -
            fetchedAt
        )
    );
}


// -------------------------------------------------------
// Lyric formatting
// -------------------------------------------------------

function trimLyric(
    lyric: string,
    maximumLength =
        MAX_LYRIC_LENGTH
): string {
    const normalized =
        lyric
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    if (
        maximumLength <= 0 ||
        normalized.length <=
        maximumLength
    ) {
        return normalized;
    }


    if (
        maximumLength <= 3
    ) {
        return normalized.slice(
            0,
            maximumLength
        );
    }


    const target =
        normalized.slice(
            0,
            maximumLength - 1
        );


    const lastSpace =
        target.lastIndexOf(
            " "
        );


    const cleanCut =
        lastSpace >=
        Math.floor(
            maximumLength *
            0.65
        )
            ? target.slice(
                0,
                lastSpace
            )
            : target;


    return (
        `${cleanCut.trimEnd()}…`
    );
}


// -------------------------------------------------------
// Spotify synchronization
// -------------------------------------------------------

async function syncSpotify():
Promise<void> {
    if (spotifySyncRunning) {
        return;
    }


    spotifySyncRunning =
        true;


    try {
        const playback =
            await getCurrentPlayback();


        // Nothing currently playing.
        if (!playback) {
            currentClock =
                null;

            currentLyrics =
                [];

            currentTrackId =
                null;

            lastPresenceSignature =
                "";

            return;
        }


        // Refresh our local playback clock.
        currentClock = {
            playback,
            fetchedAt:
                Date.now()
        };


        // Same song as before.
        //
        // No need to reload lyrics.
        if (
            playback.trackId ===
            currentTrackId
        ) {
            return;
        }


        // ------------------------------------------------
        // New song detected
        // ------------------------------------------------

        currentTrackId =
            playback.trackId;


        currentLyrics =
            [];


        lastPresenceSignature =
            "";


        const requestedTrackId =
            playback.trackId;


        console.log("");
        console.log(
            "────────────────────────────────"
        );

        console.log(
            `Loading lyrics for ` +
            `${playback.trackName} — ` +
            `${playback.artistName}`
        );

        console.log(
            "────────────────────────────────"
        );


        try {
            currentLyrics =
                await getSyncedLyrics({
                    trackName:
                        playback.trackName,

                    artistName:
                        playback.artistName,

                    albumName:
                        playback.albumName,

                    durationMs:
                        playback.durationMs
                });

            if (
                currentLyrics.length >
                0
            ) {
                console.log(
                    `Loaded ` +
                    `${currentLyrics.length} ` +
                    `synced lyric lines.`
                );
            } else {
                console.log(
                    "No synced lyrics found."
                );
            }
        } catch (error) {
            console.error(
                "Failed to load lyrics:",
                error
            );

            currentLyrics =
                [];
        }
    } catch (error) {
        console.error(
            "Failed to sync Spotify playback:",
            error
        );
    } finally {
        spotifySyncRunning =
            false;
    }
}


// -------------------------------------------------------
// Waiting presence
// -------------------------------------------------------

async function setWaitingPresence():
Promise<void> {
    if (
        lastPresenceSignature ===
        "waiting"
    ) {
        return;
    }


    await client.user?.setActivity({
        type: 2,

        details:
            "Waiting for Spotify",

        state:
            "Nothing is currently playing",

        largeImageKey:
            "lyricpresence",

        instance:
            false
    });


    lastPresenceSignature =
        "waiting";
}


// -------------------------------------------------------
// Discord Rich Presence
// -------------------------------------------------------

async function updatePresence():
Promise<void> {
    if (presenceUpdateRunning) {
        return;
    }


    presenceUpdateRunning =
        true;


    try {
        if (!currentClock) {
            await setWaitingPresence();

            return;
        }


        const playback =
            currentClock.playback;


        const progressMs =
            getEstimatedProgressMs();


        const rawLyric =
            getLyricAt(
                currentLyrics,

                progressMs -
                LYRIC_OFFSET_MS
            );


        const details =
            rawLyric

                ? trimLyric(
                    rawLyric
                )

                : currentLyrics.length ===
                  0

                    ? "No synced lyrics found"

                    : "♪ …";


        const state =
            `${playback.trackName} — ` +
            `${playback.artistName}`;


        const signature =
            [
                playback.trackId,
                playback.isPlaying,
                details,
                state
            ].join("|");


        if (
            signature ===
            lastPresenceSignature
        ) {
            return;
        }


        const playbackStart =
            Date.now() -
            progressMs;


        const playbackEnd =
            playbackStart +
            playback.durationMs;


        await client.user?.setActivity({
            // Listening activity.
            //
            // This gives us Discord's native
            // music progress bar.
            type: 2,

            // Current lyric.
            details,

            // Song and artist.
            state,

            // Spotify album artwork.
            largeImageKey:
                playback.albumArtUrl ??
                "lyricpresence",

            /*
             * Intentionally no largeImageText.
             *
             * Discord's Listening layout was
             * showing it as an extra duplicate
             * album/artist line.
             */

            startTimestamp:
                playback.isPlaying

                    ? playbackStart

                    : undefined,


            endTimestamp:
                playback.isPlaying

                    ? playbackEnd

                    : undefined,


            instance:
                false,


            buttons:
                playback.spotifyUrl
                    ? [
                        {
                            label:
                                "Open in Spotify",

                            url:
                                playback.spotifyUrl
                        }
                    ]
                    : []
        });


        lastPresenceSignature =
            signature;


        console.log(
            `${playback.trackName} — ` +
            `${playback.artistName}`
        );


        console.log(
            details
        );
    } catch (error) {
        console.error(
            "Failed to update Discord presence:",
            error
        );
    } finally {
        presenceUpdateRunning =
            false;
    }
}


// -------------------------------------------------------
// Startup
// -------------------------------------------------------

client.on(
    "ready",

    async () => {
        console.log(
            `Connected to Discord as ` +
            `${client.user?.username}`
        );


        console.log(
            `Lyric offset: ` +
            `${LYRIC_OFFSET_MS} ms`
        );


        console.log(
            `Maximum lyric length: ` +
            `${MAX_LYRIC_LENGTH}`
        );


        console.log(
            `Spotify polling interval: ` +
            `${SPOTIFY_SYNC_INTERVAL_MS} ms`
        );


        await syncSpotify();

        await updatePresence();


        setInterval(
            () => {
                void syncSpotify();
            },

            SPOTIFY_SYNC_INTERVAL_MS
        );


        setInterval(
            () => {
                void updatePresence();
            },

            PRESENCE_UPDATE_INTERVAL_MS
        );
    }
);


// -------------------------------------------------------
// Discord login
// -------------------------------------------------------

client
    .login()
    .catch(
        error => {
            console.error(
                "Failed to connect to Discord RPC:",
                error
            );
        }
    );