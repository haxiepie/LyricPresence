import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import open from "open";

const spotifyClientId = (() => {
    const value =
        process.env.SPOTIFY_CLIENT_ID;

    if (!value) {
        throw new Error(
            "SPOTIFY_CLIENT_ID is missing from .env"
        );
    }

    return value;
})();

const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    "http://127.0.0.1:3000/callback";

const tokenFile = path.resolve(
    process.cwd(),
    ".spotify-token.json"
);

const scopes = [
    "user-read-currently-playing",
    "user-read-playback-state"
];

interface StoredToken {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    scope?: string;
    token_type?: string;
}

interface SpotifyTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
}

interface SpotifyArtist {
    name: string;
}

interface SpotifyImage {
    url: string;
    width: number | null;
    height: number | null;
}

interface SpotifyAlbum {
    name: string;
    images: SpotifyImage[];
}

interface SpotifyTrack {
    id: string;
    name: string;
    duration_ms: number;

    external_urls: {
        spotify: string;
    };

    artists: SpotifyArtist[];
    album: SpotifyAlbum;
}

interface SpotifyCurrentlyPlayingResponse {
    is_playing: boolean;
    progress_ms: number | null;
    item: SpotifyTrack | null;
    timestamp: number;
}

export interface CurrentPlayback {
    trackId: string;
    trackName: string;
    artistName: string;
    albumName: string;
    albumArtUrl: string | null;
    spotifyUrl: string;
    progressMs: number;
    durationMs: number;
    isPlaying: boolean;
}

function base64UrlEncode(
    input: Buffer
): string {
    return input
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function createCodeVerifier(): string {
    return base64UrlEncode(
        crypto.randomBytes(64)
    );
}

function createCodeChallenge(
    verifier: string
): string {
    return base64UrlEncode(
        crypto
            .createHash("sha256")
            .update(verifier)
            .digest()
    );
}

async function saveToken(
    token: StoredToken
): Promise<void> {
    await fs.writeFile(
        tokenFile,
        JSON.stringify(token, null, 2),
        "utf8"
    );
}

async function readToken():
Promise<StoredToken | null> {
    try {
        const contents = await fs.readFile(
            tokenFile,
            "utf8"
        );

        return JSON.parse(contents) as StoredToken;
    } catch {
        return null;
    }
}

async function exchangeAuthorizationCode(
    code: string,
    verifier: string
): Promise<StoredToken> {
    const body = new URLSearchParams({
        client_id: spotifyClientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier
    });

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body
        }
    );

    if (!response.ok) {
        throw new Error(
            `Spotify token exchange failed: ` +
            `${response.status} ${await response.text()}`
        );
    }

    const data =
        await response.json() as SpotifyTokenResponse;

    const storedToken: StoredToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at:
            Date.now() +
            data.expires_in * 1000,
        scope: data.scope,
        token_type: data.token_type
    };

    await saveToken(storedToken);

    return storedToken;
}

async function refreshAccessToken(
    token: StoredToken
): Promise<StoredToken> {
    if (!token.refresh_token) {
        throw new Error(
            "Spotify refresh token is missing."
        );
    }

    const body = new URLSearchParams({
        client_id: spotifyClientId,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token
    });

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },

            body
        }
    );

    if (!response.ok) {
        throw new Error(
            `Spotify token refresh failed: ` +
            `${response.status} ${await response.text()}`
        );
    }

    const data =
        await response.json() as SpotifyTokenResponse;

    const refreshedToken: StoredToken = {
        access_token: data.access_token,

        refresh_token:
            data.refresh_token ??
            token.refresh_token,

        expires_at:
            Date.now() +
            data.expires_in * 1000,

        scope: data.scope,
        token_type: data.token_type
    };

    await saveToken(refreshedToken);

    return refreshedToken;
}

async function authorizeSpotify():
Promise<StoredToken> {
    const verifier =
        createCodeVerifier();

    const challenge =
        createCodeChallenge(verifier);

    const state = base64UrlEncode(
        crypto.randomBytes(24)
    );

    const authorizeUrl = new URL(
        "https://accounts.spotify.com/authorize"
    );

    authorizeUrl.search =
        new URLSearchParams({
            client_id: spotifyClientId,
            response_type: "code",
            redirect_uri: redirectUri,
            scope: scopes.join(" "),
            state,
            code_challenge_method: "S256",
            code_challenge: challenge
        }).toString();

    const callbackUrl =
        new URL(redirectUri);

    const authorizationCode =
        await new Promise<string>(
            (resolve, reject) => {
                const server =
                    http.createServer(
                        (request, response) => {
                            try {
                                const requestUrl =
                                    new URL(
                                        request.url ?? "/",
                                        redirectUri
                                    );

                                if (
                                    requestUrl.pathname !==
                                    callbackUrl.pathname
                                ) {
                                    response.writeHead(404);
                                    response.end("Not found.");
                                    return;
                                }

                                const returnedState =
                                    requestUrl.searchParams.get(
                                        "state"
                                    );

                                const error =
                                    requestUrl.searchParams.get(
                                        "error"
                                    );

                                const code =
                                    requestUrl.searchParams.get(
                                        "code"
                                    );

                                if (error) {
                                    response.writeHead(
                                        400,
                                        {
                                            "Content-Type":
                                                "text/plain"
                                        }
                                    );

                                    response.end(
                                        `Spotify authorization failed: ${error}`
                                    );

                                    server.close();

                                    reject(
                                        new Error(
                                            `Spotify authorization failed: ${error}`
                                        )
                                    );

                                    return;
                                }

                                if (
                                    returnedState !== state ||
                                    !code
                                ) {
                                    response.writeHead(
                                        400,
                                        {
                                            "Content-Type":
                                                "text/plain"
                                        }
                                    );

                                    response.end(
                                        "Invalid Spotify callback."
                                    );

                                    server.close();

                                    reject(
                                        new Error(
                                            "Invalid Spotify callback."
                                        )
                                    );

                                    return;
                                }

                                response.writeHead(
                                    200,
                                    {
                                        "Content-Type":
                                            "text/html; charset=utf-8"
                                    }
                                );

                                response.end(`
                                    <h1>LyricPresence connected</h1>
                                    <p>You can close this tab.</p>
                                `);

                                server.close();

                                resolve(code);
                            } catch (error) {
                                server.close();
                                reject(error);
                            }
                        }
                    );

                server.listen(
                    Number(callbackUrl.port),
                    callbackUrl.hostname,
                    () => {
                        console.log(
                            "Opening Spotify authorization..."
                        );

                        void open(
                            authorizeUrl.toString()
                        );
                    }
                );

                server.on(
                    "error",
                    reject
                );
            }
        );

    return exchangeAuthorizationCode(
        authorizationCode,
        verifier
    );
}

async function getValidToken():
Promise<StoredToken> {
    const token =
        await readToken();

    if (!token) {
        return authorizeSpotify();
    }

    if (
        Date.now() >=
        token.expires_at - 60_000
    ) {
        try {
            return await refreshAccessToken(
                token
            );
        } catch {
            console.warn(
                "Spotify refresh failed. Reauthorizing."
            );

            return authorizeSpotify();
        }
    }

    return token;
}

export async function getCurrentPlayback():
Promise<CurrentPlayback | null> {
    let token =
        await getValidToken();

    let response = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        {
            headers: {
                Authorization:
                    `Bearer ${token.access_token}`
            }
        }
    );

    if (response.status === 401) {
        token =
            await refreshAccessToken(token);

        response = await fetch(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {
                headers: {
                    Authorization:
                        `Bearer ${token.access_token}`
                }
            }
        );
    }

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(
            `Spotify playback request failed: ` +
            `${response.status} ${await response.text()}`
        );
    }

    const data =
        await response.json() as SpotifyCurrentlyPlayingResponse;

    if (!data.item) {
        return null;
    }

    return {
        trackId:
            data.item.id,

        trackName:
            data.item.name,

        artistName:
            data.item.artists
                .map(artist => artist.name)
                .join(", "),

        albumName:
            data.item.album.name,

        albumArtUrl:
            data.item.album.images[0]?.url ??
            null,

        spotifyUrl:
            data.item.external_urls.spotify,

        progressMs:
            data.progress_ms ?? 0,

        durationMs:
            data.item.duration_ms,

        isPlaying:
            data.is_playing
    };
}