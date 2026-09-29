# Arcadia — landing page

Static marketing site for the Arcadia Android launcher. Plain HTML, CSS and
JavaScript: no framework, no build step, no web fonts, no analytics.

That last part is deliberate. The page's argument is that Arcadia cannot send your
data anywhere, so the page itself does not load anything third-party either.

## Layout

| path | what |
| --- | --- |
| `index.html` | the page |
| `style.css` | all styling, including the animated backdrop |
| `app.js` | scroll reveal, pointer glow, hero parallax |
| `privacy-policy.html` | privacy policy, also the URL Play requires |
| `assets/` | icon and product screenshots |

## Running it locally

```sh
python3 -m http.server 8787
```

## Before launch

- The Google Play button in `index.html` points at `PLAY_URL_PLACEHOLDER`. Replace
  it once the listing is live; until then it says "Coming soon" rather than 404ing.
- Screenshots come from an emulator with few apps installed. Replacing them with
  shots of a real, populated home screen would sell it better.
