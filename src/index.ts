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
const PRESENCE_UPDATE_INTERVAL_MS = 1_000;
const PROGRESS_BAR_LENGTH = 11;
const LYRIC_OFFSET_MS = 0;

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

function formatTime(milliseconds: number): string {
    const safeMilliseconds = Math.max(0, milliseconds);
    const totalSeconds = Math.floor(safeMilliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
}

function createProgressBar(
    progressMs: number,
    durationMs: number
): string {
    if (durationMs <= 0) {
        return `●${"─".repeat(PROGRESS_BAR_LENGTH - 1)}`;
    }

    const ratio = Math.min(
        1,
        Math.max(0, progressMs / durationMs)
    );

    const position = Math.min(
        PROGRESS_BAR_LENGTH - 1,
        Math.max(
            0,
            Math.round(
                ratio * (PROGRESS_BAR_LENGTH - 1)
            )
        )
    );

    return Array.from(
        { length: PROGRESS_BAR_LENGTH },
        (_, index) => index === position ? "●" : "─"
    ).join("");
}

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

async function setWaitingPresence(): Promise<void> {
    const signature = "waiting";

    if (signature === lastPresenceSignature) {
        return;
    }

    await client.user?.setActivity({
        details: "Waiting for Spotify",
        state: "Nothing is currently playing",
        largeImageKey: "lyricpresence",
        largeImageText: "LyricPresence",
        instance: false
    });

    lastPresenceSignature = signature;
}

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

        const currentLyric = getLyricAt(
            currentLyrics,
            progressMs - LYRIC_OFFSET_MS
        );

        const progressBar = createProgressBar(
            progressMs,
            playback.durationMs
        );

        const timeText =
            `${formatTime(progressMs)} / ` +
            `${formatTime(playback.durationMs)}`;

        const details =
            currentLyric ??
            (currentLyrics.length === 0
                ? "No synced lyrics found"
                : "♪ …");

        const state =
            `${playback.trackName} — ${playback.artistName} · ` +
            `${progressBar} ${timeText}`;

        const signature = [
            playback.trackId,
            playback.isPlaying,
            details,
            progressBar
        ].join("|");

        if (signature === lastPresenceSignature) {
            return;
        }

        const playbackStart =
            Date.now() - progressMs;

        const playbackEnd =
            playbackStart + playback.durationMs;

        await client.user?.setActivity({
            details,
            state,

            largeImageKey:
                playback.albumArtUrl ??
                "lyricpresence",

            largeImageText:
                `${playback.albumName} — ${playback.artistName}`,

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
                    label: "Open in Spotify",
                    url: playback.spotifyUrl
                }
            ]
        });

        lastPresenceSignature = signature;

        console.log(
            `${formatTime(progressMs)} ${details}`
        );
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
