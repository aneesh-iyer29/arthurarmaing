# arthurarmaing

The official personal website of Arthur R. Mank, a Georgia Tech student who
paraglides into the world, pulls out his Sheikah Slate, and finds that the
entire map is Aneesh Iyer's face.

Plain static site with no build step:

- `index.html`, `style.css`, `script.js`: the page, the landing dialogue, and the Sheikah Slate.
- `flight3d.js`: the 3D descent onto Tech Green, built on CesiumJS (loaded from jsDelivr).
- `models/`: Arthur's low-poly gliding and standing models, with his face. Rebuild them with `node tools/build-models.js`.
- `img/aneesh-hyrule.jpg`: the Slate map, Aneesh's portrait turned into terrain. Rebuild it with `python3 tools/build-map.py`.
- `api/config.js`: a Vercel function that hands the page the Google Maps key.

## The loading screen

Laid out after the game's loading screen (and the [botw-loader](https://github.com/leviv/botw-loader)
recreation): a white band wipes across the top with hearts, stamina, stats, and bobbing icons,
tips cycle below (A or "Next tip" skips), and a logo block fills as the campus loads. All icons are
original SVG; no images, sounds, or fonts are taken from the game or from botw-loader.

## The 3D descent

Arthur glides in from Midtown, over the Connector, and lands on Tech Green, with the
camera following behind him, while a game-style HUD shows hearts, a draining stamina wheel,
and a minimap. On the title screen he stands on Tech Green with the camera circling him.
What he flies over depends on what's available:

1. **Google photorealistic 3D tiles** (the Google Earth look) when a Google Maps key is set.
2. **Satellite imagery** on a flat globe when there's no key, or the key is rejected.
3. **The original 2D cartoon descent** if the browser has no WebGL or Cesium fails to load.

To get the photorealistic version, create a key in Google Cloud with the **Map Tiles API**
enabled, and restrict it to your domain (it is visible to visitors either way). Then:

- **Vercel:** set the `GOOGLE_MAPS_API_KEY` environment variable and redeploy.
- **Anywhere else:** put the key in `config.js`.

The landing spot is the `TECH_GREEN` constant at the top of `flight3d.js` if it needs nudging.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

**Vercel:** import the repo with the framework preset set to "Other" and no build
command. `vercel.json` and `api/config.js` are picked up automatically. Add the custom
domain under Project Settings, then Domains.

**GitHub Pages, Netlify, Cloudflare Pages:** works as-is as a static site (use `config.js`
for the key). For GitHub Pages with a custom domain, add a `CNAME` file containing the domain.

Fan parody. Not affiliated with or endorsed by Nintendo. Every asset here is original or
a personal photo; nothing is taken from the game.
