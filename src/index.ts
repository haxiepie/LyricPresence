// Entry point for LyricPresence: syncs Spotify playback and updates Discord RPC
// with the currently playing song and the active lyric line (if available).
//
// The file sets up a Discord RPC client, periodically polls Spotify for the
// current playback state, loads synced lyrics for new tracks, and updates the
// activity shown in Discord with a trimmed lyric line and playback timestamps.
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

const clientId = process.env.DISCORD_CLIENT_ID;

if (!clientId) {
    throw new Error(
        "DISCORD_CLIENT_ID is missing from .env"
    );
}

const client = new Client({
    clientId
});

// How often to poll Spotify for the current playback state.
const SPOTIFY_SYNC_INTERVAL_MS = 1_000;

// How often to update Discord presence (keeps lyrics in sync smoothly).
const PRESENCE_UPDATE_INTERVAL_MS = 250;

/*
 * Positive values delay the lyric.
 * Negative values show the lyric earlier.
 *
 * Example:
 * LYRIC_OFFSET_MS=500   -> lyric appears 500 ms later
 * LYRIC_OFFSET_MS=-500  -> lyric appears 500 ms earlier
 */
// Global offset applied to lyric timing (ms). Positive delays lyric, negative
// shows it earlier. Configurable via LYRIC_OFFSET_MS env var.
const LYRIC_OFFSET_MS =
    Number(process.env.LYRIC_OFFSET_MS ?? "0");

/*
 * Discord may visually wrap or crop very long lines.
 * This keeps the lyric neat before it reaches Discord.
 */
// Maximum length for lyric lines before trimming to avoid Discord truncation.
const MAX_LYRIC_LENGTH =
    Number(process.env.MAX_LYRIC_LENGTH ?? "92");

// Stores a snapshot of the playback data and the timestamp it was fetched at.
interface PlaybackClock {
    playback: CurrentPlayback;
    fetchedAt: number;
}

// Runtime state used across sync/update loops.
let currentClock: PlaybackClock | null = null;
let currentLyrics: LyricLine[] = [];
let currentTrackId: string | null = null;
let lastPresenceSignature = ""; // avoids redundant Discord updates
let spotifySyncRunning = false; // prevents overlapping Spotify fetches
let presenceUpdateRunning = false; // prevents overlapping presence updates

function getEstimatedProgressMs(): number {
    if (!currentClock) {
        return 0;
    }

    const { playback, fetchedAt } = currentClock;

    if (!playback.isPlaying) {
        return playback.progressMs;
    }

    return Math.min(
        playback.durationMs,
        playback.progressMs +
        (Date.now() - fetchedAt)
    );
}

// Returns the estimated playback progress (ms). If the track is playing, the
// function extrapolates progress based on the time the playback snapshot was
// fetched; otherwise returns the static progress reported by Spotify.

function trimLyric(
    lyric: string,
    maximumLength = MAX_LYRIC_LENGTH
): string {
    const normalized = lyric
        .replace(/\s+/g, " ")
        .trim();

    if (
        maximumLength <= 0 ||
        normalized.length <= maximumLength
    ) {
        return normalized;
    }

    if (maximumLength <= 3) {
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
        target.lastIndexOf(" ");

    const cleanCut =
        lastSpace >= Math.floor(maximumLength * 0.65)
            ? target.slice(0, lastSpace)
            : target;

    return `${cleanCut.trimEnd()}…`;
}

// Normalizes and trims a lyric line to a readable length. Tries to cut at a
// natural word boundary, falling back to a hard cut and appending an ellipsis.

async function syncSpotify(): Promise<void> {
    if (spotifySyncRunning) {
        return;
    }

    spotifySyncRunning = true;

    try {
        const playback = await getCurrentPlayback();

        if (!playback) {
            currentClock = null;
            currentLyrics = [];
            currentTrackId = null;
            lastPresenceSignature = "";
            return;
        }

        currentClock = {
            playback,
            fetchedAt: Date.now()
        };

        if (playback.trackId !== currentTrackId) {
            currentTrackId = playback.trackId;
            currentLyrics = [];
            lastPresenceSignature = "";

            console.log(
                `Loading lyrics for ${playback.trackName} — ${playback.artistName}`
            );

            try {
                currentLyrics = await getSyncedLyrics({
                    trackName: playback.trackName,
                    artistName: playback.artistName,
                    albumName: playback.albumName,
                    durationMs: playback.durationMs
                });

                console.log(
                    `Loaded ${currentLyrics.length} synced lyric lines.`
                );
            } catch (error) {
                console.error("Failed to load lyrics:", error);
                currentLyrics = [];
            }
        }
    } catch (error) {
        console.error("Failed to sync Spotify playback:", error);
    } finally {
        spotifySyncRunning = false;
    }
}

// Polls the Spotify API for the current playback. If a new track is detected,
// loads synced lyrics for that track. Uses a guard to avoid concurrent runs.

async function setWaitingPresence(): Promise<void> {
    if (lastPresenceSignature === "waiting") {
        return;
    }

    await client.user?.setActivity({
        type: 2,
        details: "Waiting for Spotify",
        state: "Nothing is currently playing",
        largeImageKey: "lyricpresence",
        instance: false
    });

    lastPresenceSignature = "waiting";
}

// Sets a simple presence when there's no current playback.

async function updatePresence(): Promise<void> {
    if (presenceUpdateRunning) {
        return;
    }

    presenceUpdateRunning = true;

    try {
        if (!currentClock) {
            await setWaitingPresence();
            return;
        }

        const playback = currentClock.playback;
        const progressMs = getEstimatedProgressMs();
        const rawLyric = getLyricAt(currentLyrics, progressMs - LYRIC_OFFSET_MS);

        const details = rawLyric
            ? trimLyric(rawLyric)
            : currentLyrics.length === 0
                ? "No synced lyrics found"
                : "♪ …";

        const state = `${playback.trackName} — ${playback.artistName}`;

        const signature = [
            playback.trackId,
            playback.isPlaying,
            details,
            state
        ].join("|");

        if (signature === lastPresenceSignature) {
            return;
        }

        const playbackStart = Date.now() - progressMs;
        const playbackEnd = playbackStart + playback.durationMs;

        await client.user?.setActivity({
            type: 2,
            details,
            state,
            largeImageKey: playback.albumArtUrl ?? "lyricpresence",
            /*
             * Intentionally no largeImageText.
             * Discord's listening layout was displaying it as an extra
             * album/artist line under the song.
             */
            startTimestamp: playback.isPlaying ? playbackStart : undefined,
            endTimestamp: playback.isPlaying ? playbackEnd : undefined,
            instance: false,
            buttons: [
                {
                    label: "Open in Spotify",
                    url: playback.spotifyUrl
                }
            ]
        });

        lastPresenceSignature = signature;

        console.log(`${playback.trackName} — ${playback.artistName}`);
        console.log(details);
    } catch (error) {
        console.error("Failed to update Discord presence:", error);
    } finally {
        presenceUpdateRunning = false;
    }
}

// Updates Discord activity to show current song and the currently active lyric
// line. Avoids unnecessary updates by comparing a signature of the important
// presence fields (track, play state, details, state).

client.on("ready", async () => {
    console.log(
        `Connected to Discord as ${client.user?.username}`
    );

    console.log(
        `Lyric offset: ${LYRIC_OFFSET_MS} ms`
    );

    console.log(
        `Maximum lyric length: ${MAX_LYRIC_LENGTH}`
    );

    await syncSpotify();
    await updatePresence();

    setInterval(() => {
        void syncSpotify();
    }, SPOTIFY_SYNC_INTERVAL_MS);

    setInterval(() => {
        void updatePresence();
    }, PRESENCE_UPDATE_INTERVAL_MS);
});

client.login().catch(error => {
    console.error(
        "Failed to connect to Discord RPC:",
        error
    );
});
