export interface LyricLine {
    timeMs: number;
    text: string;
}

interface LrclibResponse {
    instrumental: boolean;
    syncedLyrics: string | null;
}

export interface LyricsRequest {
    trackName: string;
    artistName: string;
    albumName: string;
    durationMs: number;
}

const memoryCache = new Map<string, LyricLine[]>();

function cacheKey(request: LyricsRequest): string {
    return [
        request.trackName.trim().toLowerCase(),
        request.artistName.trim().toLowerCase(),
        request.albumName.trim().toLowerCase(),
        Math.round(request.durationMs / 1000)
    ].join("|");
}

function parseLrc(lrc: string): LyricLine[] {
    const lines: LyricLine[] = [];

    for (const rawLine of lrc.split(/\r?\n/)) {
        const timestampPattern =
            /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

        const matches = [...rawLine.matchAll(timestampPattern)];
        const text = rawLine.replace(timestampPattern, "").trim();

        if (!text || matches.length === 0) {
            continue;
        }

        for (const match of matches) {
            const minutes = Number(match[1]);
            const seconds = Number(match[2]);
            const fraction = match[3] ?? "0";

            let milliseconds = Number(fraction);

            if (fraction.length === 1) {
                milliseconds *= 100;
            } else if (fraction.length === 2) {
                milliseconds *= 10;
            } else {
                milliseconds = Number(fraction.slice(0, 3));
            }

            lines.push({
                timeMs:
                    minutes * 60_000 +
                    seconds * 1_000 +
                    milliseconds,
                text
            });
        }
    }

    return lines.sort((a, b) => a.timeMs - b.timeMs);
}

export async function getSyncedLyrics(
    request: LyricsRequest
): Promise<LyricLine[]> {
    const key = cacheKey(request);
    const cached = memoryCache.get(key);

    if (cached) {
        return cached;
    }

    const params = new URLSearchParams({
        track_name: request.trackName,
        artist_name: request.artistName,
        album_name: request.albumName,
        duration: String(Math.round(request.durationMs / 1000))
    });

    const response = await fetch(
        `https://lrclib.net/api/get?${params.toString()}`,
        {
            headers: {
                "Lrclib-Client": "LyricPresence/1.0"
            }
        }
    );

    if (response.status === 404) {
        memoryCache.set(key, []);
        return [];
    }

    if (!response.ok) {
        throw new Error(
            `LRCLIB request failed: ${response.status} ${await response.text()}`
        );
    }

    const data = await response.json() as LrclibResponse;

    if (data.instrumental || !data.syncedLyrics) {
        memoryCache.set(key, []);
        return [];
    }

    const parsed = parseLrc(data.syncedLyrics);
    memoryCache.set(key, parsed);

    return parsed;
}

export function getLyricAt(
    lines: LyricLine[],
    positionMs: number
): string | null {
    let low = 0;
    let high = lines.length - 1;
    let found: LyricLine | null = null;

    while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const line = lines[middle];

        if (line.timeMs <= positionMs) {
            found = line;
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }

    return found?.text ?? null;
}
