# Prompter

A minimal, mobile-first teleprompter web app. Records video from your phone's
camera while a script scrolls over the live preview — so your eyes stay on the
lens instead of darting away to read.

The recorded video file is **clean** (no burned-in text); the script overlay is
only there to guide you while you film.

## Features

- Live front- or rear-camera preview, fullscreen
- Auto-scrolling script overlay, with:
  - Adjustable scroll speed (10–300 px/s)
  - Adjustable font size (24–120 px)
  - Adjustable eye-line guide (the red line you try to keep your gaze on)
  - Optional dim band behind the text for readability over bright scenes
  - Optional horizontal flip for use with a physical teleprompter rig
- Tap anywhere on the preview to pause/resume the scroll
- Record camera + audio to a single mp4 (or webm where mp4 isn't supported)
- Live REC timer and recording indicator
- Post-recording playback view with download or native iOS share sheet
- Script library saved to `localStorage` — name and re-load past scripts
- Screen Wake Lock acquired during recording so the phone doesn't dim/lock
- Installable as a PWA — runs fullscreen with no Safari chrome

## Tech stack

- [Vite 7](https://vitejs.dev/) + TypeScript, vanilla DOM (no UI framework)
- `getUserMedia` for the camera/mic stream
- `MediaRecorder` for capture (mp4/H.264 on iOS, webm/VP9 elsewhere)
- Screen Wake Lock API
- Web Share API (`navigator.share` with files) for one-tap save to Photos/Messages
- `@vitejs/plugin-basic-ssl` so dev server serves HTTPS (required for camera
  access from a phone on your LAN)

Built footprint is ~13 KB gzipped (HTML + CSS + JS combined).

## Getting started

Requirements: Node 20+ (Node 25 tested), npm 10+.

```bash
npm install
npm run dev
```

Vite prints two URLs:

```
Local:   https://localhost:5173/
Network: https://192.168.x.x:5173/
```

Open the **Network** URL on your phone (same Wi-Fi). Safari will warn about the
self-signed cert — tap **Show Details** → **visit this website** → **Visit
Website**. After that, the camera/mic prompt will appear when you trigger any
control.

> **Why HTTPS matters here:** browsers expose `navigator.mediaDevices` only on
> secure contexts. `localhost` over plain HTTP is treated as secure, but a LAN
> IP over plain HTTP is not — so `getUserMedia` would be `undefined` on your
> phone. The basic-ssl plugin solves this with a per-session self-signed cert.

### Build for production

```bash
npm run build      # type-check + bundle to dist/
npm run preview    # serve dist/ over https locally
```

To deploy, host `dist/` on any static host that supports HTTPS (Vercel,
Netlify, Cloudflare Pages, GitHub Pages with a custom domain, etc.).

## Installing to iPhone home screen

The fullscreen PWA experience is much better than running in a Safari tab — you
get the entire screen, no URL bar eating space, and a proper app icon.

1. Open the deployed (or dev) URL in Safari on the iPhone.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch from the home screen icon. Permissions are remembered.

## How to use

1. Tap the **gear icon** in the top-right to open settings.
2. Paste or type your script. Adjust speed, font size, and eye-line position.
3. Close the settings panel.
4. Tap the **▶︎** button (or anywhere on the preview) to start scrolling
   without recording, to rehearse.
5. Tap the red **⏺** button to start recording. The prompter starts scrolling
   automatically, the timer appears in the top-left, and the screen stays on.
6. Tap **⏺** again to stop. A playback view appears with **Download**,
   **Share…**, or **Discard**.

Tap the **⤾** button to flip between front and rear cameras. The front camera
preview is mirrored on screen so you see yourself naturally, but the recording
is not mirrored.

## Project structure

```
.
├── index.html              # UI shell — settings panel, camera stage, controls
├── public/
│   ├── icon.svg            # PWA icon
│   └── manifest.webmanifest
├── src/
│   ├── main.ts             # All logic: settings, camera, scroll loop, recorder
│   └── style.css           # iOS-friendly fullscreen styling with safe-area
├── vite.config.ts          # HTTPS dev server config
├── tsconfig.json
└── package.json
```

## iOS Safari quirks worth knowing

These are platform constraints, not bugs in this app:

- **Recording only works in mp4/H.264.** The app tries a sequence of supported
  mime types and falls back gracefully, but on iOS you'll always get mp4.
- **Backgrounding the tab stops the recording.** Safari pauses media capture
  the moment you leave the tab or lock the screen. Wake Lock keeps the screen
  on while you're recording, but switching apps still ends the take.
- **`localStorage` can be evicted.** Safari may purge a site's local storage
  if it goes unused for ~7 weeks or under storage pressure. Important scripts
  should live somewhere more permanent (paste them in fresh, or eventually we
  could add export/import).
- **The first camera/mic permission prompt requires a user gesture.** That's
  why we trigger it on a button tap, not on page load.
- **Self-signed certs aren't trusted across launches.** For real ongoing dev
  on a phone, consider [mkcert](https://github.com/FiloSottile/mkcert) to
  install a locally-trusted CA on the phone, or use an ngrok / Cloudflare
  tunnel that provides a valid public cert.

## Design decisions

A few things explicitly chosen during scoping:

- **On-screen text only, never burned in.** Keeps the recording clean, dodges
  the canvas-compositing cost, and avoids quality loss from re-encoding a
  composited stream.
- **iPhone-first, not cross-platform.** The whole point is filming on a phone,
  and the lowest-common-denominator codec (mp4/H.264) works everywhere anyway.
- **No backend, no accounts.** Scripts live in `localStorage`. Zero infra.
- **No voice-paced scrolling.** Speech recognition wants the microphone and
  so does `MediaRecorder` — you can't reliably do both on iOS Safari at the
  same time. Auto-scroll at adjustable speed is simpler and more predictable.
- **Vanilla TS, no UI framework.** The app is one screen; a framework would
  cost more bundle size than it saves in code.

## Possible next steps

Not committed to any of these — just things worth considering:

- Bluetooth remote / second-device pairing for hands-free pause/resume
- Export/import script library as JSON (for backup or cross-device sync)
- Quick-jump markers in the script (e.g. `## chapter`) and a chapter list
- Word-of-the-line highlighting that drifts with scroll position
- Optional countdown before recording starts (3-2-1)
- Estimated read time based on word count and current speed
- A small "tap and hold to scrub" affordance on the preview to seek within
  the script

## License

Unlicensed / personal project. Add a license file if that changes.
