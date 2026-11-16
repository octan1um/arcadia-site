# Arcadia — landing page

Static marketing site for the Arcadia Android launcher. Plain HTML, CSS and
JavaScript: no framework, no build step and no web fonts. This website does not embed analytics or load third-party resources.

Privacy commitment: **Your phone. Your rules. Zero ads. No data sold. Built to respect your privacy.**

The public policy describes the currently shipped app. Unactivated Firebase work is held separately: do not publish speculative release promises or claim that system-provider requests and user-selected cloud backups can never use the network. Before enabling any usage collection, align the implementation, concise policy disclosures and Play Data safety answers.

## Layout

| path | what |
| --- | --- |
| `index.html` | the page |
| `style.css` | all styling: the paper palette, per-section accents, the CSS device frames, the motion |
| `app.js` | scroll reveal, the hero headline rising word by word, clips that play only while on screen |
| `privacy-policy.html` | privacy policy, also the URL Play requires |
| `terms-of-service.html` | terms for the app and website, including lawful warranty and liability exclusions |
| `accessibility/index.html` | how the optional accessibility service is used, the page Play's accessibility declaration links to; its video is `media/arcadia-accessibility-demo.mp4` with `media/arcadia-accessibility-demo-poster.jpg` |
| `assets/` | icon and product screenshots; `assets/w44/` holds the relaunch stills and clips; `assets/w48/` the Glass and Hue pictures (`tools/build-looks.mjs`) |
| `tools/` | render and measurement scripts (see below) |

## Design

The November 2026 relaunch (W44): one idea per section, Apple-inspired. Each section has an
eyebrow, a large tight headline whose second line carries the section's colour, two lines of
copy and one device moment. Order: hero (the open Fold's home with the cover phone playing a
real hold), Hold any icon (`#panel`), Notifications (`#notifications`), Folded or open
(`#fold`), Make it yours as a bento (`#widgets`, `#scenes`), Glass and Hue (`#looks`), And there is more (`#features`,
`#control`), a dark privacy section with the approved line (`#privacy`), and the closing
call to action (`#get`).

- Paper tones throughout, one vivid accent family per section drawn from the screens, the
  privacy section dark. The system font stack only; no web fonts.
- Device frames are CSS (`.dev.cover`, `.dev.open`): metal edge, black bezel, the capture at
  its own aspect, the hinge marks on the open Fold's frame (nothing is drawn over a screen), in percentages so they scale.
  Proportions match the Play v2 slides (`play/html-20261115-v2` in arcadia-marketing).
- Screens are `assets/w44/`: WebP stills and two muted H.264 clips with WebP posters, made
  from the 15 Nov Fold captures with nothing blurred or masked.
- Motion is transform and opacity only, revealed on scroll; everything is visible without
  JavaScript and under `prefers-reduced-motion`, where clips stay on their poster.
- Glass and Hue (`#looks`) is Kashim's own Home in two of the four looks (Default, Dark, Glass,
  Hue), from his Fold on 16 Nov, scaled only. app.js stacks the pair in one frame and crossfades
  (opacity only, a timer that runs only while the section is on screen, six turns, then still;
  a press on the Glass/Hue switch stops it). No script or less motion: side by side, captioned.
  There is deliberately no drag divider: a line down an open Fold reads as a seam.
- Avoid `text-wrap: balance`: with this page's headlines it hangs Chromium 130's layout
  (headless renders never reach `load`). Headlines break with explicit `<br>` instead.

## Running it locally

```sh
python3 -m http.server 8099
```

## Checking a change

Every visual change is rendered at the four widths the page is judged at and the
numbers are read before anything is called done. Renders go to `tools/renders/`,
which is git-ignored.

```sh
LD_LIBRARY_PATH=/home/node/.openclaw/browser-libs/lib \
BASE=http://127.0.0.1:8099 OUT=tools/renders node tools/render-page.mjs
```

(This container has no system fonts: without
`FONTCONFIG_FILE=/home/node/.openclaw/workspace/.toolchains/fontconfig/fonts.conf` headless
Chromium draws no text at all.)

It prints, per width: page height, elements past the viewport, the largest image as
drawn, console errors, requests that leave the local server (must be none), images
without alt text, heading-order skips and in-page anchors, and writes a full-page
and an above-the-fold screenshot. `MOTION=reduce` renders the reduced-motion page.
Read the full-page renders; an element screenshot of a section taller than the
viewport stitches and lies.

The feature animations are paused while off screen, so a full-page render shows
their first, empty frame. `tools/render-features.mjs` scrolls them into view, checks
the observer lets them run, and captures exact frames of the loop plus the
reduced-motion still.

## Before launch

- The Google Play button in `index.html` points at `PLAY_URL_PLACEHOLDER`. Replace
  it once the listing is live; until then it says "Coming soon" rather than 404ing.
- The screenshots and the stacked-widgets clip are dark-mode captures from an
  emulator with few apps installed. Light-mode captures of the same subjects drop
  into the same frames; the frames put a soft wallpaper behind anything narrower
  than themselves.
