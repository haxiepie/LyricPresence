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

const SPOTIFY_SYNC_INTERVAL_MS = 5_000;
const PRESENCE_UPDATE_INTERVAL_MS = 250;

/*
 * Positive values delay the lyric.
 * Negative values show the lyric earlier.
 *
 * Example:
 * LYRIC_OFFSET_MS=500   -> lyric appears 500 ms later
 * LYRIC_OFFSET_MS=-500  -> lyric appears 500 ms earlier
 */
const LYRIC_OFFSET_MS =
    Number(process.env.LYRIC_OFFSET_MS ?? "0");

/*
 * Discord may visually wrap or crop very long lines.
 * This keeps the lyric neat before it reaches Discord.
 */
const MAX_LYRIC_LENGTH =
    Number(process.env.MAX_LYRIC_LENGTH ?? "92");

interface PlaybackClock {
    playback: CurrentPlayback;
    fetchedAt: number;
}

let currentClock: PlaybackClock | null = null;
let currentLyrics: LyricLine[] = [];
let currentTrackId: string | null = null;
let lastPresenceSignature = "";
let spotifySyncRunning = false;
let presenceUpdateRunning = false;

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

async function syncSpotify(): Promise<void> {
    if (spotifySyncRunning) {
        return;
    }

    spotifySyncRunning = true;

    try {
        const playback =
            await getCurrentPlayback();

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

        if (
            playback.trackId !==
            currentTrackId
        ) {
            currentTrackId =
                playback.trackId;

            currentLyrics = [];
            lastPresenceSignature = "";

            console.log(
                `Loading lyrics for ${playback.trackName} — ${playback.artistName}`
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

                console.log(
                    `Loaded ${currentLyrics.length} synced lyric lines.`
                );
            } catch (error) {
                console.error(
                    "Failed to load lyrics:",
                    error
                );

                currentLyrics = [];
            }
        }
    } catch (error) {
        console.error(
            "Failed to sync Spotify playback:",
            error
        );
    } finally {
        spotifySyncRunning = false;
    }
}

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
        details: "Waiting for Spotify",
        state: "Nothing is currently playing",
        largeImageKey: "lyricpresence",
        instance: false
    });

    lastPresenceSignature = "waiting";
}

async function updatePresence():
Promise<void> {
    if (presenceUpdateRunning) {
        return;
    }

    presenceUpdateRunning = true;

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
                ? trimLyric(rawLyric)
                : currentLyrics.length === 0
                    ? "No synced lyrics found"
                    : "♪ …";

        const state =
            `${playback.trackName} — ${playback.artistName}`;

        const signature = [
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
            type: 2,
            details,
            state,

            largeImageKey:
                playback.albumArtUrl ??
                "lyricpresence",

            /*
             * Intentionally no largeImageText.
             * Discord's listening layout was displaying it as an extra
             * album/artist line under the song.
             */

            startTimestamp:
                playback.isPlaying
                    ? playbackStart
                    : undefined,

            endTimestamp:
                playback.isPlaying
                    ? playbackEnd
                    : undefined,

            instance: false,

            buttons: [
                {
                    label:
                        "Open in Spotify",

                    url:
                        playback.spotifyUrl
                }
            ]
        });

        lastPresenceSignature =
            signature;

        console.log(
            `${playback.trackName} — ${playback.artistName}`
        );

        console.log(details);
    } catch (error) {
        console.error(
            "Failed to update Discord presence:",
            error
        );
    } finally {
        presenceUpdateRunning = false;
    }
}

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
