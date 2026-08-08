# 🎵 LyricPresence

Live synced Spotify lyrics in your Discord Rich Presence.

I made this because I wanted my Discord activity to show whatever lyric I was currently listening to.

That's pretty much it.

It somehow turned into an actual project.

![LyricPresence Demo](https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdnEyM3RramRxaTBpd2l5NTN2M3A4Ym1uNTVkb3U1OHZ1Zmg3OW5qcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QwMnmotyAbFV9dbL4c/giphy.gif)

## What does this do?

LyricPresence takes whatever song you're currently listening to on Spotify, finds synced lyrics for it using [LRCLIB](https://lrclib.net/), and displays the current lyric through Discord Rich Presence.

Basically:

```text
Spotify
   ↓
Current Song
   ↓
LRCLIB
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

# ⚠️ READ THIS BEFORE INSTALLING

There are a couple things you should know before spending ten minutes setting everything up.

### You currently need Spotify Premium.

The current version of LyricPresence uses Spotify's Web API.

Spotify currently requires Premium for the Development Mode setup used by this project.

You'll also need to create your **own Spotify Developer application**.

No, I cannot just give you mine.

### You need Discord Desktop.

This uses Discord Rich Presence, so the program needs to connect to the Discord desktop client.

The activity can still be **seen** from Discord mobile and browser, but LyricPresence itself runs on your computer.

### Don't leave this running for absolutely no reason.

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

Check it with:

```bash
pnpm --version
```

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

Name it whatever you want your activity to be called.

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

### Rich Presence assets

You can also upload an image for LyricPresence through the Discord Developer Portal.

This can be used as a fallback image when album artwork isn't available.

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

### Redirect URI

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

It's also ignored by Git.

Now start playing something on Spotify.

If everything worked, check your Discord profile.

You should see LyricPresence.

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

delays the lyrics by 500 milliseconds.

And:

```env
LYRIC_OFFSET_MS=-500
```

makes them appear 500 milliseconds earlier.

Different songs on LRCLIB can have slightly different synchronization, so there isn't one magical value that will make every song perfect.

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

LyricPresence currently gets synchronized lyrics from [LRCLIB](https://lrclib.net/).

LRCLIB contains lyrics contributed through its service and its own sources, so quality depends on what's available for that specific song.

Most songs I've tried work pretty well.

Some lyrics might be:

- slightly early
- slightly late
- incorrectly synced
- missing a line
- completely unavailable

There are also songs where lyrics might appear in something like Spicetify but **not** in LyricPresence.

That doesn't necessarily mean LyricPresence broke.

Spicetify can use other lyric providers. LyricPresence currently uses LRCLIB.

If another provider has the song and LRCLIB doesn't, I can't magically summon the lyrics out of my ass.

Not yet, anyway.

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

## Do the API keys cost money?

No.

Creating the Discord application doesn't cost anything.

Creating the Spotify developer application itself doesn't have an API fee, although Spotify currently requires a Premium account for the Development Mode setup LyricPresence uses.

LRCLIB is also free.

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

## Can I make LyricPresence update Spotify more frequently?

Technically.

Should you?

Probably not.

I learned this one myself.

Lowering the Spotify polling interval makes LyricPresence check Spotify more frequently, but it also burns through your API quota considerably faster.

Setting it to something stupid like one second is a fantastic way to discover what:

```text
QUOTA_EXCEEDED
```

means.

The lyrics themselves do not require Spotify to be contacted for every lyric update.

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

## Does LyricPresence permanently download lyrics to my PC?

No.

Lyrics are fetched when needed and kept in memory while the application is running.

They aren't currently stored as a permanent lyric library on your computer.

LyricPresence does store:

```text
.spotify-token.json
```

for Spotify authorization.

---

## Where do the lyrics come from?

[LRCLIB](https://lrclib.net/)

They're the ones doing the hard part.

LyricPresence basically asks:

```text
hey you got this song?
```

and then uses the synchronized timestamps they provide.

---

## Why does a song have lyrics somewhere else but not here?

Different services use different lyric providers.

A song existing on Musixmatch, Spotify, Spicetify, or somewhere else does not guarantee that LRCLIB has synchronized lyrics for it.

Multiple lyric providers are something I'd like to support eventually.

---

## Does this work with local Spotify files?

Maybe.

I wouldn't depend on it.

Local files can have different or incomplete metadata, which makes matching them against LRCLIB much harder.

If the title and artist happen to match something LRCLIB recognizes, you might get lucky.

---

## Does this work with YouTube Music?

No.

At least not this version.

LyricPresence currently gets playback information through Spotify.

However, I'm experimenting with reading playback directly through Windows instead, which could eventually make support for other media players possible.

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

Also, your friends probably don't need 900 presence/status changes because you listened to one BabyTron album.

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

If you're getting a `429`, see the quota section above.

---

## Lyrics aren't showing

First check whether LRCLIB actually has synchronized lyrics for that song:

https://lrclib.net/

If it doesn't, LyricPresence doesn't have anything to display.

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

# Current limitations

LyricPresence is still a pretty early project.

Currently:

- Windows is the main supported platform
- Spotify Premium is required
- Spotify Developer setup is required
- Discord Developer setup is required
- LRCLIB is the only lyric provider
- API quotas can happen
- mobile/browser activity updates may lag behind desktop
- the terminal has to stay running
- there is no GUI yet

Which sounds like a lot when I write it all out.

It works though.

---

# What's next?

I have a bunch of stuff I'd like to eventually add.

### System tray app

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

### GSMTC playback

I'm currently experimenting with Windows' **Global System Media Transport Controls**.

The idea is to read Spotify's playback information directly from Windows instead of constantly asking Spotify's Web API.

The proof of concept can already read:

```text
Title
Artist
Album
Playback state
Position
Duration
```

directly from Spotify's Windows media session.

If this works well enough for the actual project, it could dramatically reduce Spotify API usage and potentially remove some of the current setup requirements.

### More lyric providers

LRCLIB is great, but it doesn't have everything.

Eventually I'd like fallback providers so:

```text
LRCLIB doesn't have it
↓
try another source
↓
maybe another
```

instead of immediately giving up.

### Better installation

Eventually:

```text
Download LyricPresence.exe
Run
Done
```

would be significantly nicer than making normal people install Node and learn what the hell pnpm is.

We'll get there.

---

# Development

If you want to mess with the source:

```bash
pnpm dev
```

Build TypeScript:

```bash
pnpm build
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

---

# Contributing

If you find a bug, feel free to open an issue.

If you know how to fix something, pull requests are welcome too.

This is my first actual GitHub project of this scale, so there's probably some weird shit somewhere.

If something breaks:

tell me what happened,
tell me what you were doing,
and if possible include the error.

Please don't just open:

```text
it doesn't work
```

I cannot debug spiritual disturbances.

---

# Credits

### LRCLIB

Provides the synchronized lyrics.

https://lrclib.net/

https://github.com/tranxuanthang/lrclib

### Spotify for Developers

Current playback and Spotify metadata.

https://developer.spotify.com/

### Discord Developer Platform

Rich Presence.

https://discord.com/developers/docs/

### @xhayper/discord-rpc

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

I wanted Discord to show the lyric I was currently listening to, tried doing it through custom statuses, got into a fistfight with rate limits, moved over to Rich Presence, and somehow ended up learning Spotify OAuth, Discord RPC, synchronized lyric parsing, TypeScript, and Windows media APIs along the way.

So uh.

Enjoy.
