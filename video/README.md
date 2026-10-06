# Medyze — 10-second product film

A portfolio film built from the **real, running Medyze app**. Nothing here
re-implements the UI: Playwright drives the production build and every frame
of product footage is a screenshot of it. This folder is isolated from the
app — it imports nothing from it and changes nothing in it.

## Pipeline

| Step | File | What it does |
|---|---|---|
| 1. Capture | `capture.mjs` | Drives the app: types "Dolo 650" into the search, hovers/clicks the Dolo 650 card, opens the comparison modal, clicks **ADD** on the cheapest shown offer whose pharmacy has a verified URL, **Continue**, then **Buy at …**. Saves screenshots (1440×810 @2x), DOM geometry, and the on-screen data (prices, pharmacy, `href`) to `captures/`. CSS transitions are captured frame by frame by slowing animations over CDP and seeking each one to *i*/60 s. |
| 2. Audio | `audio.py` | Seeded synthesis from `timeline.json`: soft clicks on the real click frames, keystroke ticks, refocus whooshes, two low thumps. Exactly 10.000 s. |
| 3. Render | `render.mjs` + `compositor/` | `window.render(t)` positions a camera over the captures and draws the kinetic typography; 600 frames → H.264 1920×1080 60 fps with AAC audio. Same input, same output. |

All timing lives in `timeline.json` (seconds). Typography follows one rule —
**blur → sharp**: incoming text starts blurred, tracked out, slightly offset
and scaled, and lands fully sharp on the frame its interaction happens;
outgoing text gains blur, compresses its tracking and fades.

## Run it

Needs the same two public env vars the app uses, and network access to the
Supabase project host.

```bash
# from the repo root
export NEXT_PUBLIC_SUPABASE_URL=...            # same as .env.local
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
npm ci && npm run build && npm start &         # production build: no dev overlay

cd video
npm install
npm run film        # capture → audio → render
# → output/medyze-product-film.mp4
```

Useful while iterating:

```bash
node render.mjs --stills 2.3,5.4,7.3      # single frames → output/stills/
node render.mjs --type-only               # typography only, no captures needed
```

## Data integrity

* Prices, pharmacy names, the selected offer and the destination URL are read
  from the running app's DOM (and cross-checked through the same RLS-scoped
  publishable key). The film never contains a hard-coded price or URL.
* The outbound pharmacy tab is blocked during capture; the film shows Medyze's
  own "Redirecting to the brand website" handoff and the real `href`, never a
  recreated pharmacy page.
* One editing cut: in the product a search result opens the detail page,
  while the comparison modal opens from a medicine card. The film cuts from the
  search dropdown to the Dolo 650 card rather than inventing a link between them.
