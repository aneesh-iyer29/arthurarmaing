# arthurarmaing

The official personal website of Arthur R. Mank, told in his own words. He
paraglides onto Tech Green, pulls out his Sheikah Slate, and finds that the
entire map is an island shaped like Aneesh Iyer. Then he walks you around
campus and has something nice to say about Aneesh at every building.

Plain static site with no build step:

- `index.html`, `style.css`, `script.js`: the page, the landing dialogue, and the Sheikah Slate.
- `flight3d.js`: the 3D descent onto Tech Green and walking around campus, built on CesiumJS (loaded from jsDelivr).
- `models/`: Arthur's low-poly gliding and standing models, with his face. Rebuild them with `node tools/build-models.js`.
- `img/aneesh-hyrule.jpg`: the Slate map, Aneesh's silhouette turned into an island (his face is the terrain) in a game-style sea with a few outlying isles. Rebuild it with `python3 tools/build-map.py`. If you move an isle, move its marker in `script.js` too.
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

1. **Google photorealistic 3D tiles** (the Google Earth look) when a Cesium ion token or a Google Maps key is set.
2. **Satellite imagery** on a flat globe when there's neither, or the key is rejected.
3. **The original 2D cartoon descent** if the browser has no WebGL or Cesium fails to load.

### Free option: Cesium ion

1. Sign up at [ion.cesium.com](https://ion.cesium.com) (the free Community plan is fine for a non-commercial site).
2. Open **Asset Depot**, find **Google Photorealistic 3D Tiles**, and click **Add to my assets**.
3. Under **Access Tokens**, create a token with the default scopes and that asset selected. Add the site's
   domain under allowed URLs, since visitors can see the token.
4. **Vercel:** set the `CESIUM_ION_TOKEN` environment variable and redeploy. **Elsewhere:** put it in `config.js`.

### Google Maps key

Create a key in Google Cloud with the **Map Tiles API** enabled (needs billing turned on; there's a free
monthly allowance) and restrict it to your domain. Set `GOOGLE_MAPS_API_KEY` in Vercel, or put it in
`config.js`. If both are set, the Google key is tried first.

The landing spot is the `TECH_GREEN` constant at the top of `flight3d.js` if it needs nudging.

## Walking around campus

"Walk around campus" in the Slate drops Arthur on Tech Green to explore on foot:

- **Keyboard:** WASD or the arrow keys walk, Shift runs (until the stamina wheel empties), Q and E turn the camera, V switches to first person, M or Escape opens the Slate.
- **Mouse:** drag to look around, scroll to zoom.
- **Phone:** the stick in the bottom left walks (push it all the way to run), and dragging anywhere else looks around.

Walking up to a building announces it the way the game announces a new area, with a line from Arthur
about Aneesh. The buildings and their lines are the `LANDMARKS` list in `script.js` (coordinates from
OpenStreetMap). With the photoreal 3D tiles his feet follow whatever is under them, rooftops included;
on the satellite fallback the ground is flat.

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
