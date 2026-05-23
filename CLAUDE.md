# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install            # one-time setup; Node 20 (see .nvmrc)
npm run dev            # Vite dev server over HTTPS (self-signed cert via basic-ssl) on LAN
npm run build          # tsc --noEmit + vite build → dist/
npm run preview        # serve dist/ over HTTPS locally
npx wrangler deploy    # deploy dist/ to Cloudflare (see wrangler.jsonc)
```

There are no tests, lint, or formatter scripts — `tsc --noEmit` in `npm run build` is the only static check.

When testing on an iPhone over LAN, the dev URL must be **`https://`** (not http). Safari will warn about the self-signed cert; tap *Show Details → visit this website*. The basic-ssl plugin exists specifically because `navigator.mediaDevices` is undefined on insecure origins, which breaks the entire app on a real phone.

## Architecture

Single-page app with **no UI framework**. All app code lives in `src/main.ts` (~450 lines) as flat module-scope state plus event handlers — there is intentionally no component layer, no router, no store. Keep new features in the same flat style; only split files if a feature has a clearly independent surface area.

`index.html` is the structural layout (camera stage + bottom-bar controls + settings panel + post-record panel as sibling sections). `src/style.css` is hand-written CSS targeting iOS Safari (safe-area insets, `-webkit-` prefixes, `viewport-fit=cover`).

State is held in module-level `let`/`const`:
- `settings` — single object, persisted to `localStorage` under `tp.settings.v1` on every change.
- `scripts` — saved-script library, persisted under `tp.scripts.v1`. Bump the key suffix when changing the schema.
- `currentStream`, `recorder`, `recordedChunks`, `wakeLock`, `scrollPos`, `scrolling`, `countdownTimerId` — runtime state for the camera, recorder, wake lock, and prompter scroll loop.

The recording flow is a three-state machine driven by the `⏺` button: **idle → counting (if countdown > 0) → recording**. Tapping `⏺` during the countdown cancels it; tapping during recording stops the recorder, releases the wake lock, pauses the prompter, and resets it back to the top of the script. Preview taps are suppressed during the countdown phase.

The prompter scroll is a `requestAnimationFrame` loop translating `#prompter-text` upward by `speed * dt` pixels per frame. The loop self-terminates when the text has scrolled past a calculated limit. Restarting the loop resumes from the current `scrollPos`; `resetPrompter()` zeroes it.

## Platform constraints — these are not bugs

These shape what kinds of features can ship. Don't assume around them:

- **iOS Safari is the target.** Recording mime type falls through `video/mp4;codecs=avc1,mp4a` → `video/mp4` → webm variants. iOS will always land on mp4/H.264.
- **Backgrounding the tab on iOS stops the recording.** No workaround exists. The Wake Lock API only keeps the screen on; it can't keep capture alive across tab switches or screen lock.
- **`getUserMedia` requires a secure context.** Localhost over http counts, but a LAN IP over http does not. The dev server runs HTTPS for this reason.
- **`MediaRecorder` and Web Speech can't share the mic on iOS.** That's why voice-paced scrolling is explicitly out of scope — don't reintroduce it without confirming the user has an alternative input path.
- **`localStorage` can be evicted by Safari** after ~7 weeks of disuse or storage pressure. Treat saved scripts as best-effort persistence.

## Design decisions worth preserving

- **Text is overlay-only, never burned into the recorded video.** The recording is intentionally clean so users can re-cut without the script bar appearing. Don't switch to canvas compositing without explicit ask.
- **No backend, no accounts.** All persistence is `localStorage`. Any cloud sync needs explicit scoping.
- **Vanilla TS, no UI framework.** The whole app is one screen — React/Svelte would cost more bundle weight than they save.
- **Front camera preview is mirrored on-screen, but recording is not mirrored.** This matches how users expect to see themselves while filming. The CSS `transform: scaleX(-1)` is on the `<video>` element only, not the stream.

## Deployment

Cloudflare Workers static assets via `wrangler.jsonc` — `dist/` is uploaded with SPA fallback (`not_found_handling: "single-page-application"`). Build first (`npm run build`), then `npx wrangler deploy`.
