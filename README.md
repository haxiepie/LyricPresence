# 🎵 LyricPresence

Live synced Spotify lyrics in your Discord Rich Presence.

I made this because I wanted my Discord activity to show whatever lyric I was currently listening to.

That's pretty much it.

It somehow turned into an actual project.

![LyricPresence Demo](assets/demo.gif)

---

## What does this do?

LyricPresence takes whatever song you're currently listening to on Spotify, figures out where you are in the song, finds synchronized lyrics for it, and displays the current lyric through Discord Rich Presence.

Basically:

```text
Spotify
   ↓
Current song + playback position
   ↓
LRCLIB
   ↓
Found synced lyrics?
   ├── yes → use them
   │
   └── no
        ↓
      Lrcmux
        ↓
      Synced lyrics
        ↓
LyricPresence
   ↓
Discord Rich Presence
```

Your activity can display:

- 🎵 Current song
- 🎤 Artist
- 💬 Current lyric
- 🖼️ Album artwork
- ⏱️ Discord's native song progress bar
- ▶️ Current playback position
- ⏸️ Play/pause state
- 🔗 A button to open the song in Spotify

Lyrics automatically change as the song plays.

Skip the song? It'll switch.

Seek backwards? It'll catch up.

Pause? It'll pause.

At least that's the idea.

---

# ⚠️ READ THIS BEFORE INSTALLING

There are a couple things you should know before spending ten minutes setting everything up.

## You currently need Spotify Premium

The current version of LyricPresence uses Spotify's Web API.

Spotify currently requires Premium for the Development Mode setup this project uses.

You'll also need to create your **own Spotify Developer application**.

No, I cannot just give you mine.

---

## You need Discord Desktop

LyricPresence uses Discord Rich Presence, so the program needs to connect to the Discord desktop client.

The activity can still be **seen** from Discord mobile and browser, but LyricPresence itself runs on your computer.

---

## Don't leave this running for absolutely no reason

LyricPresence regularly checks Spotify for your playback state.

Spotify has API quotas.

If you're done listening to music, close the thing.

If you leave it running forever or start messing with the polling interval, you may eventually get:

```text
429 Too Many Requests
QUOTA_EXCEEDED
```

If that happens, congratulations.

Spotify is telling you to chill.

Close LyricPresence and give it some time before trying again.

Do not repeatedly restart it hoping the 429 will become afraid of you.

---

# Requirements

You'll need:

- Windows
- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Discord Desktop](https://discord.com/download)
- Spotify Premium
- A [Spotify Developer](https://developer.spotify.com/dashboard) application
- A [Discord Developer](https://discord.com/developers/applications) application

Everything LyricPresence itself uses is free.

Spotify Premium obviously is not.

---

# Installation

## 1. Download LyricPresence

Clone the repository:

```bash
git clone https://github.com/haxiepie/LyricPresence.git
```

Then enter the folder:

```bash
cd LyricPresence
```

Or download the repository as a ZIP from GitHub and extract it.

---

## 2. Install Node.js

Download Node.js from:

https://nodejs.org/

Check that it works:

```bash
node --version
```

If that prints a version number, you're good.

---

## 3. Install pnpm

LyricPresence uses pnpm for packages.

Install it with:

```bash
npm install -g pnpm
```

Check it:

```bash
pnpm --version
```

---

## 4. Install dependencies

Inside the LyricPresence folder:

```bash
pnpm install
```

That installs everything the project needs.

---

# Discord Setup

Now we need Discord to know what the hell LyricPresence is.

Go to:

https://discord.com/developers/applications

Click:

**New Application**

Name it whatever you want your Rich Presence application to be called.

For example:

```text
LyricPresence
```

Once it's created, find your:

```text
Application ID
```

Copy it.

We'll need that for `.env`.

---

## Rich Presence assets

You can upload an image for LyricPresence through the Discord Developer Portal.

That image can be used as a fallback if album artwork isn't available.

If you're making your own fork, you can use whatever icon you want.

---

# Spotify Setup

Go to:

https://developer.spotify.com/dashboard

Log into Spotify and create an application.

Again:

**Spotify currently requires Premium for the Development Mode setup this project uses.**

Once the app exists, copy your:

```text
Client ID
```

You do **not** need to put your Spotify Client Secret into LyricPresence.

---

## Redirect URI

Inside your Spotify application's settings, add:

```text
http://127.0.0.1:3000/callback
```

Make sure it matches exactly.

Save your changes.

---

# Setting up `.env`

In the main LyricPresence folder, create a file called:

```text
.env
```

Not:

```text
.env.txt
```

Windows loves doing that shit.

Your `.env` should look like this:

```env
DISCORD_CLIENT_ID=YOUR_DISCORD_APPLICATION_ID

SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_CLIENT_ID

SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback

LYRIC_OFFSET_MS=0

MAX_LYRIC_LENGTH=92
```

Replace:

```text
YOUR_DISCORD_APPLICATION_ID
```

and:

```text
YOUR_SPOTIFY_CLIENT_ID
```

with your actual IDs.

---

## DO NOT SHARE YOUR `.env`

The repository's `.gitignore` should prevent it from being uploaded to GitHub.

Still.

Don't upload it.

Don't send it to people.

Don't screenshot the entire thing and post it somewhere.

You get the idea.

---

# Running LyricPresence

Open a terminal inside the project folder and run:

```bash
pnpm dev
```

You should see something like:

```text
Connected to Discord as yourusername
Lyric offset: 0 ms
Maximum lyric length: 92
Spotify polling interval: 1000 ms
```

On your first run, Spotify may open your browser and ask you to authorize LyricPresence.

Accept it.

LyricPresence will create:

```text
.spotify-token.json
```

This stores your Spotify authorization locally so you don't have to log in every single time.

**Do not share that file either.**

It should also be ignored by Git.

Now start playing something on Spotify.

If everything worked, check your Discord profile.

You should see LyricPresence.

---

# How lyrics are found

LyricPresence currently uses two stages.

## 1. LRCLIB

[LRCLIB](https://lrclib.net/) is always checked first.

It's fast, free, and works pretty damn well.

If LRCLIB has synchronized lyrics for the song, LyricPresence uses them immediately.

You'll see something like:

```text
Loading lyrics for WHATS FUNNY? (HAHA) — BabyTron
LRCLIB responded in 0.28s
Lyrics provider: LRCLIB (71 lines)
Loaded 71 synced lyric lines.
```

If LRCLIB doesn't have the song:

```text
LRCLIB: no synced lyrics found.
Trying Lrcmux...
```

---

## 2. Lrcmux

[Lrcmux](https://lrcmux.dev/) is the fallback.

Lrcmux is a lyrics aggregation API. Instead of depending on one database, it can search multiple providers and return the best available result.

Its providers currently include things like:

- Musixmatch
- KuGou
- NetEase
- YouTube Music
- Genius

Some providers have word-level synchronization, some have line-level synchronization, and some only have plain text.

LyricPresence only cares about getting usable synchronized lines.

A normal fallback can look like:

```text
LRCLIB responded in 0.28s
LRCLIB: no synced lyrics found.
Trying Lrcmux...
Lrcmux: searching for "WHATS FUNNY? (HAHA)" by BabyTron...
Lrcmux responded in 2.24s
Lyrics provider: Lrcmux (73 lines)
Loaded 73 synced lyric lines.
```

Cached Lrcmux responses can be way faster.

I've seen some come back in around a tenth of a second.

---

# Configuration

There are a couple things you can change.

## Lyric delay

If your lyrics feel slightly early or late, change:

```env
LYRIC_OFFSET_MS=0
```

For example:

```env
LYRIC_OFFSET_MS=500
```

delays the lyric by 500 milliseconds.

And:

```env
LYRIC_OFFSET_MS=-500
```

shows it 500 milliseconds earlier.

Different lyric sources and different uploads can be synced slightly differently, so there isn't one magical value that will make every song perfect.

---

## Maximum lyric length

Discord only gives us so much room before a giant lyric starts looking like shit.

Change:

```env
MAX_LYRIC_LENGTH=92
```

to whatever you prefer.

If a lyric exceeds the limit, LyricPresence trims it instead of dumping an entire paragraph into your activity.

---

# How accurate are the lyrics?

idk.

No seriously, I can't give you an exact percentage.

LyricPresence gets synchronized lyrics from:

1. LRCLIB
2. Lrcmux as a fallback

And because Lrcmux itself aggregates multiple providers, two different songs may technically be getting their lyrics from completely different places.

Most songs I've tried work pretty well.

Some lyrics might be:

- slightly early
- slightly late
- incorrectly synced
- missing a line
- censored depending on the source
- completely unavailable

You might also notice that one song is synced perfectly while another feels a little off.

That's normal.

They might not even be coming from the same provider.

If timing is consistently early or late for you, try changing:

```env
LYRIC_OFFSET_MS=0
```

---

# FAQ

## Do I need Spotify Premium?

**Currently, yes.**

LyricPresence uses Spotify's Web API and requires you to create your own Spotify Developer application.

Spotify's current Development Mode setup requires Premium.

I would like to remove this requirement eventually.

---

## Do I need to provide my own API keys?

Yeah lol.

You need your own:

```text
Discord Application ID
Spotify Client ID
```

You do **not** need:

```text
Discord bot token
Spotify Client Secret
LRCLIB key
Lrcmux key
```

I am not putting my own personal developer credentials into a public GitHub repository for what I hope are extremely obvious reasons.

---

## Does this cost money?

LyricPresence itself does not.

Discord Developer applications are free.

LRCLIB is free.

Lrcmux is free.

Spotify's API doesn't charge you per request for this setup, but Spotify currently requires a Premium account for Development Mode.

So technically:

```text
LyricPresence: free
Spotify Premium: unfortunately not free
```

---

## Why am I getting `429 QUOTA_EXCEEDED`?

You made too many Spotify API requests.

You'll see something like:

```text
Spotify playback request failed: 429
```

and:

```text
"reason":"QUOTA_EXCEEDED"
```

If this happens:

**Close LyricPresence and chill for a while.**

Spotify is temporarily rejecting requests from your developer application.

You do not need to reinstall anything.

Your project did not explode.

Your Discord application did not break.

You just hit Spotify's quota.

I've personally been able to use LyricPresence for hours without much trouble by simply closing it when I'm not listening to music.

Which leads me to:

### Don't leave the damn thing running when you're not using it

There's no reason to spend your Spotify quota asking:

```text
you listening to something?

no

you listening to something?

no

you listening to something?

no
```

for six hours.

---

## Can I make LyricPresence poll Spotify more frequently?

Technically.

Should you?

Probably not.

I learned this one myself.

Lowering the Spotify polling interval makes LyricPresence notice skips/seeks faster, but it also burns through your Spotify API quota considerably faster.

Setting it to something stupid like one second is a fantastic way to discover what:

```text
QUOTA_EXCEEDED
```

means.

The actual lyric timing itself is calculated locally between Spotify checks.

Spotify does not need to be contacted every time the lyric changes.

---

## Can Lrcmux rate limit me?

Technically, yes.

Lrcmux currently allows up to:

```text
60 requests per minute
```

Cache hits are free and do not count against that limit.

For normal LyricPresence usage, this should be pretty difficult to hit because Lrcmux is only contacted when:

1. the song changes, and
2. LRCLIB didn't already find synced lyrics.

If Lrcmux does return a `429`, LyricPresence reads the `Retry-After` header and backs off from treating it like a normal result.

Unless you're skipping songs like you're trying to speedrun Spotify, you should be fine.

---

## Why does LRCLIB fail but Lrcmux works?

Because they're not the same database.

LRCLIB may not have a synchronized version of a song.

Lrcmux aggregates several different providers, so it can sometimes find something LRCLIB couldn't.

That's literally why it's there.

---

## Why does a song have lyrics somewhere else but not here?

Different services use different lyric databases.

LyricPresence tries:

```text
LRCLIB
↓
Lrcmux
```

And Lrcmux itself can check multiple providers.

That still doesn't mean it'll find everything.

A song can:

- have no synchronized lyrics anywhere
- only have plain text lyrics
- use different metadata between services
- be a remix or alternate version
- have a weird title
- have incomplete artist metadata
- simply fail to match correctly

So yes, Spotify, Musixmatch, Spicetify, or another service can occasionally have lyrics while LyricPresence doesn't.

I have unfortunately not yet achieved omniscience.

---

## Can I use this on mobile?

Not directly.

LyricPresence runs on your computer and communicates with Discord Desktop through Rich Presence.

You can **see** your activity from Discord mobile.

You cannot currently run LyricPresence itself from your phone.

---

## Why are lyrics slower on Discord mobile/browser?

This is usually Discord's side.

LyricPresence communicates directly with the Discord desktop client, so changes tend to appear there first.

Discord then has to propagate that activity to its servers and other clients.

Because of that:

```text
Discord Desktop → usually fastest
Discord Browser → sometimes delayed
Discord Mobile  → sometimes more delayed
```

I cannot force Discord mobile to refresh your activity faster.

Believe me, I would if I could.

---

## Can I close the terminal?

No.

Right now the terminal **is running LyricPresence**.

Close it and the Node process dies.

If you accidentally pause the terminal and everything suddenly stops updating, that's also not particularly helpful.

Windows Terminal is recommended over ancient Command Prompt.

Eventually I want LyricPresence to run as a proper system tray application so you don't need a terminal sitting there all day.

---

## Why did my terminal freeze?

If you're using old Windows Command Prompt, clicking/selecting text can sometimes pause the process because of QuickEdit mode.

Yes, that is incredibly stupid.

Use Windows Terminal if possible.

Also, if you accidentally hit:

```text
Ctrl + S
```

try:

```text
Ctrl + Q
```

---

## Does LyricPresence permanently download lyrics to my PC?

No.

Lyrics are fetched when needed and kept in memory while the application is running.

They are not currently stored as a permanent lyric library on your computer.

LyricPresence does save:

```text
.spotify-token.json
```

for Spotify authorization.

---

## What is `.spotify-token.json`?

Spotify uses OAuth.

When you authorize LyricPresence for the first time, the app stores the token information locally in:

```text
.spotify-token.json
```

That way you don't need to log in every single time.

Do not share it.

If you delete it, LyricPresence will simply ask you to authorize Spotify again the next time it runs.

---

## Does this work with local Spotify files?

Maybe.

I wouldn't depend on it.

Local files can have different or incomplete metadata, which makes matching them against LRCLIB/Lrcmux harder.

If the title and artist happen to match something one of the lyric providers recognizes, you might get lucky.

---

## Does this work with YouTube Music?

Not as a playback source.

LyricPresence currently gets playback information through Spotify.

Lrcmux may use YouTube Music as one of its **lyric sources**, but that does not mean LyricPresence can monitor YouTube Music playback.

Those are two completely different things.

---

## Why not just use Discord's normal Spotify activity?

Because that doesn't show live lyrics.

That's the entire reason I made this.

Discord already does a perfectly good job showing:

```text
song
artist
album
progress
```

I wanted:

```text
what the mf is currently saying
```

---

## Why not use a Discord custom status?

Funny story.

That was basically the original idea.

Constantly changing a Discord custom status to every lyric turns out to be an excellent way to get rate limited.

Also, your friends probably don't need 900 presence changes because you listened to one BabyTron album.

Rich Presence ended up being much better suited for this.

---

## Are there other apps that do this?

Probably.

idk I made this for funsies.

I wanted synchronized lyrics in my Discord activity, started screwing around with Discord RPC, and eventually ended up here.

I'm sure somebody on GitHub has made something similar.

Use whichever one you like.

---

## Is LyricPresence safe?

The entire project is open source, so you can read exactly what it's doing.

LyricPresence does **not** need:

- your Discord password
- your Spotify password
- a Discord bot token
- your Spotify Client Secret
- access to your DMs
- access to your Discord servers

Discord is handled through Rich Presence.

Spotify authentication happens through Spotify's authorization flow.

Your Spotify authorization information is stored locally in:

```text
.spotify-token.json
```

and your configuration lives in:

```text
.env
```

Both should remain ignored by Git.

If you somehow upload either of those publicly:

please revoke/replace the relevant credentials instead of hoping nobody notices.

---

# Troubleshooting

## `DISCORD_CLIENT_ID is missing from .env`

You either:

1. didn't create `.env`
2. put it in the wrong folder
3. named it `.env.txt`
4. didn't put your Discord Application ID inside it

Your `.env` belongs in the project root:

```text
LyricPresence/
├── .env
├── package.json
├── pnpm-lock.yaml
├── src/
└── tsconfig.json
```

---

## Spotify isn't detected

Make sure:

- Spotify is actually playing something
- your Spotify Client ID is correct
- your Redirect URI matches
- you completed authorization
- `.spotify-token.json` exists after authorization

If you're getting a `429`, see the quota section above.

---

## Discord isn't showing the activity

Make sure:

- Discord Desktop is open
- LyricPresence says it connected successfully
- your Discord Application ID is correct
- Discord is allowed to display your activity status

Restarting Discord can also help because Discord occasionally decides cooperation is optional.

---

## Lyrics aren't showing

Watch the terminal.

If LRCLIB misses, you should see:

```text
LRCLIB: no synced lyrics found.
Trying Lrcmux...
```

If Lrcmux succeeds:

```text
Lyrics provider: Lrcmux
```

If both fail, then neither provider returned usable synchronized lyrics for that track.

---

## Lrcmux is taking a few seconds

That's normal for a cold lookup.

Lrcmux may need to query one or more upstream providers before returning a result.

Cached responses can be much faster.

---

## Lyrics are early or late

Try changing:

```env
LYRIC_OFFSET_MS=0
```

Positive numbers make lyrics appear later.

Negative numbers make them appear earlier.

Example:

```env
LYRIC_OFFSET_MS=300
```

or:

```env
LYRIC_OFFSET_MS=-300
```

---

## `pnpm build` created a `dist/` folder

Yes.

That's supposed to happen.

Your source code is TypeScript:

```text
src/
├── index.ts
├── lyrics.ts
└── spotify.ts
```

Running:

```bash
pnpm build
```

compiles it into JavaScript:

```text
dist/
├── index.js
├── lyrics.js
└── spotify.js
```

`dist/` should normally be ignored by Git for this project.

---

# Development

If you want to mess with the source:

```bash
pnpm dev
```

That runs the TypeScript directly using `tsx`.

Build TypeScript:

```bash
pnpm build
```

That creates JavaScript inside:

```text
dist/
```

Run the compiled build:

```bash
pnpm start
```

The project currently uses:

- TypeScript
- Node.js
- pnpm
- `@xhayper/discord-rpc`
- Spotify Web API
- LRCLIB
- Lrcmux

---

# Current limitations

LyricPresence is still a pretty early project.

Currently:

- Windows is the main supported platform
- Spotify Premium is required
- Spotify Developer setup is required
- Discord Developer setup is required
- Spotify API quotas can happen
- lyric accuracy depends on third-party sources
- some songs still have no synchronized lyrics
- mobile/browser activity updates may lag behind desktop
- the terminal has to stay running
- there is no GUI yet

Which sounds like a lot when I write it all out.

It works though.

---

# What's next?

I have a bunch of stuff I'd like to eventually add.

## System tray app

This is probably the biggest one.

Instead of:

```text
open terminal
cd LyricPresence
pnpm dev
```

every time, I'd rather have a tiny tray icon where you can:

- start/stop LyricPresence
- change lyric delay
- reconnect services
- see the current song
- launch on Windows startup
- quit

Way cleaner.

---

## GSMTC playback

I'm experimenting with Windows' **Global System Media Transport Controls**.

The idea is to read Spotify's playback information directly from Windows instead of constantly asking Spotify's Web API.

A proof of concept already successfully read:

```text
Title
Artist
Album
Playback state
Position
Duration
```

directly from Spotify's Windows media session.

If this eventually replaces Spotify polling, it could:

- dramatically reduce Spotify API usage
- improve skip/seek detection
- potentially remove some Spotify Developer setup
- possibly make other desktop media players easier to support

This is still experimental.

---

## Better lyric matching

LRCLIB + Lrcmux already gives LyricPresence much better coverage than it had originally.

I'd still like to improve:

- weird song titles
- remixes
- alternate versions
- featured artists
- duration matching
- local caching
- choosing the best result when multiple sources disagree

There is always going to be some mf with:

```text
song_name_FINAL_v2_remix_(slowed+reverb)_prod.whatever
```

that ruins everything.

---

## Better installation

Eventually:

```text
Download LyricPresence.exe
Run
Done
```

would be significantly nicer than making normal people install Node and learn what the hell pnpm is.

We'll get there.

---

# Contributing

If you find a bug, feel free to open an issue.

If you know how to fix something, pull requests are welcome too.

This is my first actual GitHub project of this scale, so there's probably some weird shit somewhere.

If something breaks:

- tell me what happened
- tell me what you were doing
- include the error if possible
- include the song if it's a lyric matching problem

Please don't just open:

```text
it doesn't work
```

I cannot debug spiritual disturbances.

---

# Credits

## LRCLIB

Primary synchronized lyrics provider.

https://lrclib.net/

https://github.com/tranxuanthang/lrclib

---

## Lrcmux

Fallback lyrics aggregation API.

Used when LRCLIB doesn't return synchronized lyrics.

https://lrcmux.dev/

https://api.lrcmux.dev/

---

## Spotify for Developers

Current playback, album artwork, track URLs, and Spotify metadata.

https://developer.spotify.com/

---

## Discord Developer Platform

Rich Presence.

https://discord.com/developers/docs/

---

## @xhayper/discord-rpc

Discord RPC library used by LyricPresence.

https://www.npmjs.com/package/@xhayper/discord-rpc

---

# License

Currently licensed under ISC.

See the repository's license/package information for details.

---

# Why did I make this?

Because I thought it would look cool.

That's genuinely it.

I wanted Discord to show the lyric I was currently listening to, tried doing it through custom statuses, got into a fistfight with rate limits, moved over to Rich Presence, learned Spotify OAuth, added synced lyric parsing, added fallback providers, started poking Windows media APIs, and somehow this turned into an actual project.

So uh.

Enjoy.
