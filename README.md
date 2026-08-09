# 🎵 LyricPresence

Live synced Spotify lyrics in your Discord Rich Presence.

I made this because I wanted my Discord activity to show whatever lyric I was currently listening to.

That's pretty much it.

It somehow turned into an actual project.

![LyricPresence Demo](assets/demo.gif)

---

# What does this do?

LyricPresence takes whatever song you're currently listening to on Spotify, finds synchronized lyrics for it, figures out which lyric you're currently hearing, and displays it through Discord Rich Presence.

Basically:

```text
Spotify
   ↓
Current Song
   ↓
LRCLIB
   ↓
Found it?
   ├── yes → Synced Lyrics
   │
   └── no
        ↓
      Lrcmux
        ↓
      Synced Lyrics
        ↓
LyricPresence
   ↓
Discord Rich Presence
```

Your activity can display things like:

- 🎵 The current song
- 🎤 The artist
- 💬 The current lyric
- 🖼️ Album artwork
- ⏱️ Discord's native song progress bar
- ▶️ Your current playback position
- ⏸️ Whether your music is paused

Lyrics automatically change as the song plays.

Skip the song? It'll switch.

Seek backwards? It'll catch up.

Pause? It'll pause.

At least that's the idea.

---

# How does it work?

There are basically three parts to LyricPresence.

### Spotify

Spotify's Web API tells LyricPresence what you're currently listening to.

That includes things like:

```text
song
artist
album
album artwork
song duration
playback position
playing/paused
```

LyricPresence periodically refreshes that information and estimates your playback position between Spotify requests.

That means Spotify does **not** need to be contacted every 250 milliseconds just because the lyric changed.

That would be stupid.

And Spotify would probably beat my ass with a `429`.

### Lyrics

Once LyricPresence detects a new song, it checks **LRCLIB** first.

If LRCLIB has synchronized lyrics:

```text
nice
↓
use those
```

If LRCLIB doesn't have them:

```text
LRCLIB
↓
nope
↓
Lrcmux
```

Lrcmux is a lyrics aggregation API that can search multiple providers.

This gives LyricPresence significantly better coverage than relying on one lyric database.

### Discord

Once we have synchronized lyrics, LyricPresence compares their timestamps against your estimated Spotify playback position.

The current line gets sent through Discord Rich Presence.

Discord handles actually displaying the activity.

---

# ⚠️ READ THIS BEFORE INSTALLING

There are a couple things you should know before spending ten minutes setting everything up.

## You currently need Spotify Premium.

The current version of LyricPresence uses Spotify's Web API.

Spotify currently requires Premium for the Development Mode setup used by this project.

You'll also need to create your **own Spotify Developer application**.

No, I cannot just give you mine.

## You need Discord Desktop.

LyricPresence uses Discord Rich Presence.

That means the program needs to connect to the Discord desktop client running on your computer.

Your activity can still be **seen** from:

- Discord Desktop
- Discord Browser
- Discord Mobile

but LyricPresence itself currently runs on your computer.

## Don't leave this running for absolutely no reason.

LyricPresence regularly checks Spotify for your current playback.

Spotify has API quotas.

If you're done listening to music, close the thing.

If you leave it running forever or start messing with the polling rate, you may eventually get:

```text
429 Too Many Requests
QUOTA_EXCEEDED
```

If that happens, congratulations.

Spotify is telling you to chill.

Close LyricPresence and give it some time before trying again.

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

Everything used by LyricPresence itself is free.

Spotify Premium obviously is not.

You do **not** need:

- a Discord bot
- a Discord bot token
- a Spotify Client Secret
- an LRCLIB API key
- an Lrcmux API key
- to pay for a lyrics API

---

# Installation

## 1. Download LyricPresence

You can clone the repository:

```bash
git clone https://github.com/haxiepie/LyricPresence.git
```

Then enter the folder:

```bash
cd LyricPresence
```

Or just download the repository as a ZIP from GitHub and extract it.

---

## 2. Install Node.js

Download Node.js from:

https://nodejs.org/

You can check that it's installed with:

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

Then check:

```bash
pnpm --version
```

If that prints a version number, we're still alive.

---

## 4. Install the dependencies

Inside the LyricPresence folder, run:

```bash
pnpm install
```

That installs everything the project needs.

---

# Discord Setup

Now we need Discord to know what the hell LyricPresence is.

Go here:

https://discord.com/developers/applications

Click:

**New Application**

Name it whatever you want your activity/application to be called.

For example:

```text
LyricPresence
```

Once you've created it, find your:

```text
Application ID
```

Copy it.

We'll need that in a second.

## Rich Presence assets

You can also upload an image for LyricPresence through the Discord Developer Portal.

LyricPresence normally attempts to use the current album artwork.

The application image can act as a fallback when album artwork isn't available.

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

You do **not** need to put your Client Secret into LyricPresence.

## Redirect URI

Inside your Spotify application's settings, add:

```text
http://127.0.0.1:3000/callback
```

Make sure it matches exactly.

Save your settings.

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

Your file should look something like this:

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

You should eventually see something like:

```text
Connected to Discord as yourusername
Lyric offset: 0 ms
Maximum lyric length: 92
```

On your first run, Spotify may open your browser and ask you to authorize LyricPresence.

Accept it.

LyricPresence will create:

```text
.spotify-token.json
```

This stores your Spotify authorization locally so you don't have to log in every single time.

**Do not share that file either.**

It's also supposed to stay ignored by Git.

Now start playing something on Spotify.

If everything worked, check your Discord profile.

You should see LyricPresence.

---

# What should the terminal look like?

When LRCLIB has the song, you'll see something roughly like:

```text
Loading lyrics for Song — Artist
LRCLIB responded in 0.20s
Lyrics provider: LRCLIB (65 lines)
Loaded 65 synced lyric lines.
```

If LRCLIB doesn't have it:

```text
Loading lyrics for Song — Artist
LRCLIB responded in 0.28s
LRCLIB: no synced lyrics found.
Trying Lrcmux...
Lrcmux: searching for "Song" by Artist...
Lrcmux responded in 1.24s
Lyrics provider: Lrcmux (73 lines)
Loaded 73 synced lyric lines.
```

If neither one has synchronized lyrics:

```text
LRCLIB: no synced lyrics found.
Trying Lrcmux...
Lrcmux: no synced lyrics found.
No synced lyrics found.
```

Then you're cooked.

---

# Where do the lyrics come from?

LyricPresence currently uses two stages.

## 1. LRCLIB

[LRCLIB](https://lrclib.net/) is always checked first.

They're basically the first:

```text
hey you got this song?
```

If LRCLIB returns synchronized lyrics, LyricPresence uses them immediately.

## 2. Lrcmux

If LRCLIB doesn't have synchronized lyrics, LyricPresence falls back to:

[Lrcmux](https://lrcmux.dev/)

Lrcmux is a lyrics aggregation API.

At the time of writing, Lrcmux can query providers including:

- Genius
- KuGou
- Musixmatch
- NetEase
- YouTube Music

Those providers have different catalogs and different synchronization capabilities.

LyricPresence only cares about getting usable synchronized lyrics back.

You don't need to configure any of those providers yourself.

You also don't need an Lrcmux API key.

The whole process is basically:

```text
new song
   ↓
LRCLIB
   ↓
got synced lyrics?
   ├── yes → done
   │
   └── no
        ↓
      Lrcmux
        ↓
      got synced lyrics?
        ├── yes → done
        │
        └── no → damn
```

---

# How accurate are the lyrics?

idk.

No seriously, I can't give you an exact percentage.

LyricPresence doesn't write or manually synchronize any of the lyrics itself.

It gets synchronized lyric data from LRCLIB and, when necessary, Lrcmux.

Because Lrcmux itself can aggregate several providers, two songs displayed by LyricPresence may not even ultimately come from the same lyric database.

Most songs I've tried work pretty well.

Some lyrics might be:

- slightly early
- slightly late
- incorrectly synced
- missing a line
- censored depending on the source
- completely unavailable

There are also different levels of synchronization.

Some providers have line-by-line timestamps.

Some can have word-level timestamps.

Some songs only have plain text lyrics.

LyricPresence needs timestamps to know what you're currently hearing.

If the timing is consistently slightly off for you, that's what `LYRIC_OFFSET_MS` is for.

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

makes it appear 500 milliseconds earlier.

There isn't one magical value that'll make every song perfect.

Different songs can have different synchronization quality depending on where the lyrics came from.

---

## Maximum lyric length

Discord only gives us so much room before a giant lyric starts looking like shit.

Change:

```env
MAX_LYRIC_LENGTH=92
```

to whatever you prefer.

If a lyric exceeds the limit, LyricPresence tries to trim it at a reasonable word boundary instead of dumping an entire paragraph into your activity.

---

# FAQ

## Do I need Spotify Premium?

**Currently, yes.**

The current version uses Spotify's Web API and requires you to create your own Spotify Developer application.

Spotify's current Development Mode requirements require Premium for this setup.

I would like to remove this requirement eventually.

---

## Do I need to provide my own keys?

Yeah lol.

You need your own:

```text
Discord Application ID
Spotify Client ID
```

I am not putting my personal developer credentials in a public GitHub repository for what I hope are extremely obvious reasons.

---

## Do I need a Spotify Client Secret?

No.

The current authorization setup does not require you to put your Spotify Client Secret into LyricPresence.

Don't.

---

## Do the APIs cost money?

No.

Creating the Discord application doesn't cost anything.

Creating the Spotify developer application itself doesn't have an API fee, although Spotify currently requires a Premium account for the Development Mode setup LyricPresence uses.

LRCLIB is free.

Lrcmux is also free to use under its current public API limits.

---

## Does Lrcmux have a rate limit?

Yeah, but normal LyricPresence usage should be nowhere near it.

Lrcmux currently documents a limit of:

```text
60 requests per minute
```

Cache hits are free and don't count against that limit.

LyricPresence also doesn't constantly spam Lrcmux.

It only needs Lrcmux when:

```text
new song
↓
LRCLIB couldn't find synced lyrics
↓
try Lrcmux
```

If Lrcmux responds with a `429`, LyricPresence checks its `Retry-After` response.

Unless you're somehow changing songs more than once every second, I wouldn't spend much time worrying about this one.

---

## Why am I getting `429 QUOTA_EXCEEDED` from Spotify?

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

You don't need to reinstall anything.

Your project didn't explode.

Your Discord application didn't break.

You just hit Spotify's quota.

I've been able to use LyricPresence for hours at a time without much trouble by simply closing it when I'm not listening to music.

Which leads me to:

### Don't leave the damn thing running when you're not using it.

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

## Can I make LyricPresence check Spotify more frequently?

Technically.

Should you?

Probably not.

I learned this one myself.

Lowering the Spotify polling interval makes LyricPresence detect skips, seeks, and other playback changes faster.

It also burns through your Spotify API quota considerably faster.

Setting it to something stupidly aggressive is a fantastic way to discover what:

```text
QUOTA_EXCEEDED
```

means.

The lyrics themselves do **not** require Spotify to be contacted every time the displayed line changes.

LyricPresence estimates your current playback position locally between Spotify checks.

---

## Why does a song have lyrics somewhere else but not here?

Different services use different databases.

LyricPresence tries to make this less annoying by using:

```text
LRCLIB
↓
Lrcmux
```

and Lrcmux itself aggregates multiple providers.

That gives LyricPresence considerably better coverage than it had when LRCLIB was the only source.

It still won't find literally everything.

A song can:

- have no synchronized lyrics
- only have plain text lyrics
- have different metadata between services
- be an obscure remix
- have a slightly different title
- have a different featured-artist format
- simply fail to match

So yes, Spotify or another application can occasionally have lyrics while LyricPresence doesn't.

I have unfortunately not yet achieved omniscience.

---

## Why does Spicetify have lyrics but LyricPresence doesn't?

Same reason.

Different lyric providers.

Spicetify extensions can use completely different sources and matching logic.

LyricPresence now has a fallback through Lrcmux, so this should happen less often than it used to.

But there's still no guarantee that two unrelated applications will find the exact same lyrics.

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

Windows Terminal is recommended over ancient Command Prompt.

Eventually I want LyricPresence to run as a proper system tray application so you don't need a terminal sitting there all day.

---

## Does LyricPresence permanently download lyrics to my PC?

No.

Lyrics are fetched when needed and kept in memory while the application is running.

They aren't currently stored as a permanent lyric library on your computer.

LyricPresence does store:

```text
.spotify-token.json
```

for Spotify authorization.

That's different.

---

## Does this work with local Spotify files?

Maybe.

I wouldn't depend on it.

Local files can have different or incomplete metadata, which makes matching them against online lyric databases much harder.

If the title and artist happen to match something the providers recognize, you might get lucky.

---

## Does this work with YouTube Music?

Not as the playback source.

At least not this version.

LyricPresence currently gets **playback information** through Spotify.

Lrcmux may use YouTube Music as one of its lyric sources, but that's completely separate from LyricPresence actually monitoring YouTube Music playback.

I am experimenting with reading playback directly through Windows instead, which could eventually make support for other media players possible.

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

## Why not read Discord's existing Spotify activity?

That sounds easier than it actually is.

Discord already knows what Spotify is playing, but its Rich Presence/activity system isn't designed as a nice public playback API for another local application to consume however it wants.

Spotify's API gives LyricPresence structured playback information directly.

I'm also experimenting with Windows media sessions through GSMTC as another possible solution.

---

## Why not use a Discord custom status?

Funny story.

That was basically the original idea.

Constantly changing a Discord custom status to every lyric turns out to be an excellent way to get rate limited.

Also, your friends probably don't need 900 status changes because you listened to one BabyTron album.

Rich Presence ended up being much better suited for this.

---

## Are there other apps that do this?

Probably.

idk I made this for funsies.

I wanted synchronized lyrics in my Discord activity, started screwing around with Discord RPC, and eventually ended up here.

I'm sure somebody on GitHub has made something similar.

Use whichever one you like.

---

# Is LyricPresence safe?

The entire project is open source, so you can read exactly what it's doing.

LyricPresence does **not** need:

- your Discord password
- your Spotify password
- a Discord bot token
- access to your DMs
- access to your Discord servers
- your Spotify Client Secret

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

1. didn't create `.env`,
2. put it in the wrong folder,
3. named it `.env.txt`,
4. or didn't put your Discord Application ID inside it.

Your `.env` belongs in the root:

```text
LyricPresence/
├── .env
├── package.json
├── pnpm-lock.yaml
├── src/
└── tsconfig.json
```

---

## Discord isn't showing the activity

Make sure:

- Discord Desktop is open
- LyricPresence says it connected successfully
- your Discord Application ID is correct
- Discord is allowed to display your activity status

Restarting Discord can also help because Discord occasionally decides cooperation is optional.

---

## Spotify isn't detected

Make sure:

- Spotify is actually playing something
- your Spotify Client ID is correct
- your Redirect URI matches
- you completed authorization
- `.spotify-token.json` exists after authorization

If you're getting a `429`, see the Spotify quota section above.

---

## Lyrics aren't showing

Watch the terminal when the song changes.

You should see LyricPresence try LRCLIB.

If that fails, it should automatically try Lrcmux.

Something like:

```text
LRCLIB: no synced lyrics found.
Trying Lrcmux...
```

If you eventually see:

```text
Lrcmux: no synced lyrics found.
No synced lyrics found.
```

neither source returned usable synchronized lyrics for that track.

You can also check:

https://lrclib.net/

and:

https://lrcmux.dev/

---

## Lrcmux is taking a few seconds

That's normal.

LRCLIB is checked first.

Lrcmux only gets involved when LRCLIB misses.

Lrcmux is an aggregator, so an uncached request may require it to search other lyric providers before returning something.

Cached responses can be considerably faster.

---

## The lyrics are early or late

Try changing:

```env
LYRIC_OFFSET_MS=0
```

Positive values delay the lyric.

Negative values make it appear earlier.

For example:

```env
LYRIC_OFFSET_MS=300
```

or:

```env
LYRIC_OFFSET_MS=-300
```

---

## Album artwork isn't showing

LyricPresence attempts to use the album artwork URL returned with the current Spotify track.

If Discord can't use the image, your Discord application asset can act as the fallback.

Make sure you've configured an appropriate Rich Presence asset in the Discord Developer Portal if you want one.

---

## The terminal froze

If you're using old Windows Command Prompt, clicking/selecting text can sometimes pause console behavior because Windows is apparently still haunted by decisions made twenty years ago.

Use [Windows Terminal](https://github.com/microsoft/terminal) if possible.

Also, if you accidentally hit:

```text
Ctrl + S
```

try:

```text
Ctrl + Q
```

---

# Development

If you want to mess with the source:

```bash
pnpm dev
```

This runs the TypeScript source directly using `tsx`.

## Build

To compile the TypeScript:

```bash
pnpm build
```

This creates:

```text
dist/
```

with compiled JavaScript files such as:

```text
dist/
├── index.js
├── lyrics.js
└── spotify.js
```

You normally don't need to manually edit anything inside `dist/`.

It's generated from `src/`.

## Run the compiled build

After building:

```bash
pnpm start
```

runs:

```text
dist/index.js
```

So:

```text
pnpm dev
```

is convenient while developing.

```text
pnpm build
pnpm start
```

runs the compiled version.

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
- lyrics depend on LRCLIB/Lrcmux availability and matching
- Spotify API quotas can happen
- mobile/browser activity updates may lag behind desktop
- the terminal has to stay running
- there is no GUI yet

Which sounds like a lot when I write it all out.

It works though.

---

# What's next?

I have a bunch of stuff I'd like to eventually add.

None of this is a promise.

It's basically the pile of:

```text
wouldn't it be cool if...
```

that got me into this situation in the first place.

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

The actual GUI could stay tiny because there really isn't much the user needs to stare at.

---

## GSMTC playback

I'm experimenting with Windows' **Global System Media Transport Controls**.

The idea is to read Spotify's playback information directly from Windows instead of constantly asking Spotify's Web API.

The proof of concept can already read things like:

```text
Title
Artist
Album
Playback state
Position
Duration
```

directly from Spotify's Windows media session.

If this works well enough for the actual project, it could dramatically reduce Spotify API usage.

It could also potentially make support for other media players possible later.

For now, though:

**Spotify Web API remains the actual playback backend.**

---

## Better lyric matching

We already went from:

```text
LRCLIB
↓
give up
```

to:

```text
LRCLIB
↓
Lrcmux
```

which has massively improved coverage.

I'd still like to improve things like:

- weird song titles
- featured artists
- remixes
- alternate versions
- metadata normalization
- provider selection
- caching

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
- include the terminal output if possible
- include steps to reproduce it if you can

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

Huge thanks to the people maintaining it and contributing synchronized lyrics.

---

## Lrcmux

Fallback lyrics aggregation API.

When LRCLIB doesn't have synchronized lyrics for a track, LyricPresence tries Lrcmux.

https://lrcmux.dev/

https://api.lrcmux.dev/

Lrcmux can aggregate lyrics from multiple providers, which is why LyricPresence's coverage is considerably better with it.

---

## Spotify for Developers

Current playback and Spotify metadata.

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

I wanted Discord to show the lyric I was currently listening to.

Originally I tried doing it through custom statuses.

That turned into:

```text
rate limits
↓
pain
↓
Discord RPC
↓
Spotify OAuth
↓
synchronized lyric parsing
↓
LRCLIB
↓
Lrcmux
↓
Windows media APIs
↓
why is this an actual project now
```

And somehow we're here.

So uh.

Enjoy.