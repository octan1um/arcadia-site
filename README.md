# Arcadia — landing page

Static marketing site for the Arcadia Android launcher. Plain HTML, CSS and
JavaScript: no framework, no build step and no web fonts. This website does not embed analytics or load third-party resources.

Privacy commitment: **Your phone. Your rules. Zero ads. No data sold. Built to respect your privacy.**

The public policy describes the currently shipped app. Unactivated Firebase work is held separately: do not publish speculative release promises or claim that system-provider requests and user-selected cloud backups can never use the network. Before enabling any usage collection, align the implementation, concise policy disclosures and Play Data safety answers.

## Layout

| path | what |
| --- | --- |
| `index.html` | the page |
| `style.css` | all styling: the light palette, the backdrop, the three feature animations |
| `app.js` | scroll reveal, the hold-to-open hero demo, pausing loops that are off screen |
| `privacy-policy.html` | privacy policy, also the URL Play requires |
| `assets/` | icon and product screenshots |
| `tools/` | render and measurement scripts (see below) |

## Design

The page is light: warm paper, warm greys for type, the app icon's cyan and
periwinkle for accents, and an italic serif for the one emphasised phrase in each
heading. The launcher itself is dark glass over a wallpaper; the abstract pieces on
the page (the opener, the three animated features) draw the wallpaper and use
frosted white for the glass, so they read as the same idea in daylight.

`#features` explains icon stacks, the game launcher and media controls with CSS
animations drawn in the page: shapes for icons, a finger, and the thing that opens.
They are transform and opacity only, share one 7-second clock, are paused while off
screen, and collapse to a single open still under `prefers-reduced-motion`.

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

prints, per width: page height, elements past the viewport, the largest image as
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
