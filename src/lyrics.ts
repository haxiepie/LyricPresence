export interface LyricLine {
    timeMs: number;
    text: string;
}

export interface LyricsRequest {
    trackName: string;
    artistName: string;
    albumName: string;
    durationMs: number;
}

interface LrclibResponse {
    instrumental?: boolean;
    syncedLyrics?: string | null;
}

const cache = new Map<string, LyricLine[]>();

const LRCLIB_BASE_URL = "https://lrclib.net";
const LRCMUX_BASE_URL = "https://api.lrcmux.dev";

function keyOf(
    request: LyricsRequest
): string {
    return [
        request.trackName
            .trim()
            .toLowerCase(),

        request.artistName
            .trim()
            .toLowerCase(),

        request.albumName
            .trim()
            .toLowerCase(),

        Math.round(
            request.durationMs / 1000
        )
    ].join("|");
}

function timestampToMs(
    minutes: string,
    seconds: string,
    fraction = "0"
): number {
    let milliseconds =
        Number(fraction);

    if (fraction.length === 1) {
        milliseconds *= 100;
    } else if (
        fraction.length === 2
    ) {
        milliseconds *= 10;
    } else if (
        fraction.length >= 3
    ) {
        milliseconds =
            Number(
                fraction.slice(0, 3)
            );
    }

    return (
        Number(minutes) * 60_000 +
        Number(seconds) * 1_000 +
        milliseconds
    );
}

function parseLrc(
    lrc: string
): LyricLine[] {
    const result: LyricLine[] = [];

    for (
        const rawLine
        of lrc.split(/\r?\n/)
    ) {
        const timestampPattern =
            /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

        const matches =
            [...rawLine.matchAll(
                timestampPattern
            )];

        const text =
            rawLine
                .replace(
                    timestampPattern,
                    ""
                )
                .trim();

        if (
            !text ||
            matches.length === 0
        ) {
            continue;
        }

        for (
            const match
            of matches
        ) {
            result.push({
                timeMs:
                    timestampToMs(
                        match[1],
                        match[2],
                        match[3] ?? "0"
                    ),

                text
            });
        }
    }

    return result.sort(
        (a, b) =>
            a.timeMs - b.timeMs
    );
}

function makeLrclibCompatParams(
    request: LyricsRequest
): URLSearchParams {
    return new URLSearchParams({
        track_name:
            request.trackName,

        artist_name:
            request.artistName,

        album_name:
            request.albumName,

        duration:
            String(
                Math.round(
                    request.durationMs /
                    1000
                )
            )
    });
}

async function getFromLrclib(
    request: LyricsRequest
): Promise<LyricLine[]> {
    const parameters =
        makeLrclibCompatParams(
            request
        );

    const startedAt =
        performance.now();

    const response =
        await fetch(
            `${LRCLIB_BASE_URL}/api/get?${parameters.toString()}`,
            {
                headers: {
                    "Lrclib-Client":
                        "LyricPresence/1.1"
                }
            }
        );

    const elapsedSeconds =
        (
            (
                performance.now() -
                startedAt
            ) /
            1000
        ).toFixed(2);

    console.log(
        `LRCLIB responded in ${elapsedSeconds}s`
    );

    if (
        response.status === 404 ||
        response.status === 204
    ) {
        return [];
    }

    if (!response.ok) {
        throw new Error(
            `LRCLIB ${response.status}: ` +
            `${await response.text()}`
        );
    }

    const data: LrclibResponse =
        await response.json();

    if (
        data.instrumental ||
        !data.syncedLyrics
    ) {
        return [];
    }

    return parseLrc(
        data.syncedLyrics
    );
}

async function getFromLrcmux(
    request: LyricsRequest
): Promise<LyricLine[]> {
    const parameters =
        makeLrclibCompatParams(
            request
        );

    const url =
        `${LRCMUX_BASE_URL}` +
        `/compat/lrclib/api/get?` +
        parameters.toString();

    console.log(
        `Lrcmux: searching for ` +
        `"${request.trackName}" by ` +
        `${request.artistName}...`
    );

    const startedAt =
        performance.now();

    const response =
        await fetch(
            url,
            {
                headers: {
                    "User-Agent":
                        "LyricPresence v1.1 " +
                        "(https://github.com/haxiepie/LyricPresence)"
                }
            }
        );

    const elapsedSeconds =
        (
            (
                performance.now() -
                startedAt
            ) /
            1000
        ).toFixed(2);

    console.log(
        `Lrcmux responded in ${elapsedSeconds}s`
    );

    if (
        response.status === 404 ||
        response.status === 204
    ) {
        return [];
    }

    if (
        response.status === 429
    ) {
        const retryAfter =
            response.headers.get(
                "Retry-After"
            );

        console.warn(
            `Lrcmux rate limited.` +
            (
                retryAfter
                    ? ` Retry after ${retryAfter}s.`
                    : ""
            )
        );

        return [];
    }

    if (!response.ok) {
        throw new Error(
            `Lrcmux ${response.status}: ` +
            `${await response.text()}`
        );
    }

    const data: LrclibResponse =
        await response.json();

    if (
        data.instrumental ||
        !data.syncedLyrics
    ) {
        return [];
    }

    return parseLrc(
        data.syncedLyrics
    );
}

export async function getSyncedLyrics(
    request: LyricsRequest
): Promise<LyricLine[]> {
    const key =
        keyOf(request);

    if (
        cache.has(key)
    ) {
        return cache.get(key)!;
    }

    // ---------------------------------------------------
    // 1. LRCLIB
    // ---------------------------------------------------

    try {
        const lines =
            await getFromLrclib(
                request
            );

        if (
            lines.length > 0
        ) {
            console.log(
                `Lyrics provider: ` +
                `LRCLIB ` +
                `(${lines.length} lines)`
            );

            cache.set(
                key,
                lines
            );

            return lines;
        }

        console.log(
            "LRCLIB: no synced lyrics found."
        );
    } catch (error) {
        console.warn(
            "LRCLIB failed:",
            error
        );
    }

    // ---------------------------------------------------
    // 2. Lrcmux fallback
    // ---------------------------------------------------

    console.log(
        "Trying Lrcmux..."
    );

    try {
        const lines =
            await getFromLrcmux(
                request
            );

        if (
            lines.length > 0
        ) {
            console.log(
                `Lyrics provider: ` +
                `Lrcmux ` +
                `(${lines.length} lines)`
            );

            cache.set(
                key,
                lines
            );

            return lines;
        }

        console.log(
            "Lrcmux: no synced lyrics found."
        );
    } catch (error) {
        console.warn(
            "Lrcmux failed:",
            error
        );
    }

    cache.set(
        key,
        []
    );

    return [];
}

export function getLyricAt(
    lines: LyricLine[],
    positionMs: number
): string | null {
    let low = 0;
    let high =
        lines.length - 1;

    let found:
        LyricLine | null =
        null;

    while (
        low <= high
    ) {
        const middle =
            Math.floor(
                (low + high) / 2
            );

        const line =
            lines[middle];

        if (
            line.timeMs <=
            positionMs
        ) {
            found = line;
            low =
                middle + 1;
        } else {
            high =
                middle - 1;
        }
    }

    return found?.text ?? null;
}
