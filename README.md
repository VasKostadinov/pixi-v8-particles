# pixi-v8-particles

A particle-emitter library for [pixi.js](https://pixijs.com) v8, with a standalone visual editor.

The runtime is a port of [pixijs-userland/particle-emitter](https://github.com/pixijs-userland/particle-emitter) adapted for pixi.js v8 (the v5/v6 packages are replaced with the v8 unified imports, and both classic `Container` and v8 `ParticleContainer` parents are supported transparently).

The editor is a small Vite app that drives the same behavior metadata the upstream editor uses, and exports clean V3-format JSON.

## Repo layout

```
src/                  library — Emitter, behaviors, config types
editor/               standalone editor app (Vite)
  index.html
  vite.config.ts
  src/
.github/workflows/    GitHub Pages deploy workflow for the editor
```

## Library usage

```ts
import { Emitter, type EmitterConfigV3 } from "pixi-v8-particles";
import { Container, Texture } from "pixi.js";

const config: EmitterConfigV3 = {
  /* ...editor-exported JSON... */
};

const parent = new Container();
const emitter = new Emitter(parent, config);

app.ticker.add((time) => emitter.update(time.deltaMS * 0.001));
```

Texture references in editor-exported JSON are URL strings (or empty for "no texture"). The library substitutes `Texture.WHITE` for empty/blank strings automatically and calls `Texture.from(url)` otherwise — so editor JSON drops in directly.

For the v8 fast path, pass a `ParticleContainer` parent and the third arg `FastParticle`:

```ts
import { Emitter, FastParticle } from "pixi-v8-particles";
import { ParticleContainer } from "pixi.js";

const parent = new ParticleContainer({ dynamicProperties: { /* ... */ } });
const emitter = new Emitter(parent, config, FastParticle);
```

## Editor

```bash
npm install
npm run dev       # local dev server (http://localhost:5180)
npm run build     # production build to editor/dist
npm run preview   # serve the built bundle
```

The editor is published to GitHub Pages on every push to `main` (see [`.github/workflows/deploy-editor.yml`](.github/workflows/deploy-editor.yml)).

### Enabling GitHub Pages

After pushing this repo to GitHub for the first time:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**
2. Push to `main` (or trigger the workflow manually from Actions tab)
3. URL will be `https://<user>.github.io/<repo>/`

The editor's [vite.config.ts](editor/vite.config.ts) uses `base: "./"`, so it works at any subpath without further configuration.

## Editor features

- **Behavior cards** — drag to reorder, collapse, inline remove. Cards are colour-coded by category (art / color / alpha / scale / movement / rotation / blend / spawn).
- **Gradient editor** for colour stops — click the bar to add, drag markers to retime, click a marker for the native colour picker, right-click to delete.
- **Row editor** for numeric stops — time slider + value input per stop, `stepped` toggle, add/remove buttons.
- **Add behaviour** popover, categorized.
- **Sub-config tabs** for ShapeSpawn (torus / rect / polygonalChain).
- **Live preview** with FPS + particle count HUD.
- **Copy JSON** / **Download** / **Reset**.
- Resizable splitter, width persisted to `localStorage`.

## License

The vendored runtime ([src/](src/), files marked `@ts-nocheck`) originates from pixijs-userland/particle-emitter, MIT-licensed. The editor and the v8 adaptations are MIT.
