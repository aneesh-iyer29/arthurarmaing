/* The 3D descent: Arthur paraglides over Atlanta and lands on Tech Green,
   seen in third person. Uses Google's photorealistic 3D tiles when it can:
   directly with a Google Maps key, or through a free Cesium ion token (both
   from the Vercel env via /api/config, or config.js). Otherwise it falls
   back to a satellite map. If WebGL or Cesium is unavailable, init() resolves
   false and the page keeps its 2D descent. */
window.Flight3D = (() => {
  const CESIUM = "https://cdn.jsdelivr.net/npm/cesium@1.145.0/Build/Cesium/";

  // Google Photorealistic 3D Tiles in Cesium ion's asset depot.
  const ION_GOOGLE_TILES = 2275207;

  // Center of Tech Green. Nudge this if the landing spot looks off.
  const TECH_GREEN = { lat: 33.7744, lon: -84.3975 };
  // Ground height used when it can't be sampled (meters above the ellipsoid).
  const GROUND_FALLBACK = 268;

  // [lat, lon, meters above Tech Green, seconds]. In from Midtown, over the
  // Connector, across campus, and down onto the lawn.
  const PATH = [
    [33.7792, -84.3822, 620, 0],
    [33.7780, -84.3862, 520, 4],
    [33.7770, -84.3900, 400, 8],
    [33.7764, -84.3930, 280, 12],
    [33.7752, -84.3948, 170, 16],
    [33.7745, -84.3960, 80, 20],
    [33.7743, -84.3969, 22, 23.5],
    [33.7744, -84.3974, 2, 25.5],
    [TECH_GREEN.lat, TECH_GREEN.lon, 0, 26.5],
  ];
  const FLIGHT_SECONDS = PATH[PATH.length - 1][3];
  // Noon in spring, so the sun is high and the sky is blue.
  const START_TIME = "2026-04-15T16:30:00Z";

  let C, viewer, scene, ground = GROUND_FALLBACK, photoreal = false;
  // Which map source ended up in use and why, for ?debug and the console.
  const status = { source: "none", notes: [], tilesLoaded: 0, tilesFailed: 0 };
  const note = (msg) => { status.notes.push(msg); console.info(`[Arthur 3D] ${msg}`); showDebug(); };
  const describe = (err) => {
    if (!err) return "unknown error";
    if (err.statusCode) {
      let body = "";
      try { body = typeof err.response === "string" ? err.response : JSON.stringify(err.response); } catch { /* ignore */ }
      return `HTTP ${err.statusCode}${body ? ` ${body.slice(0, 160)}` : ""}`;
    }
    return err.message || String(err);
  };
  const debugOn = /[?&]debug\b/.test(location.search);
  let debugEl;
  const showDebug = () => {
    if (!debugOn) return;
    if (!debugEl) {
      debugEl = document.createElement("pre");
      debugEl.style.cssText = "position:fixed;left:8px;top:8px;z-index:99;max-width:min(560px,calc(100% - 16px));margin:0;padding:8px 10px;border-radius:8px;background:rgba(0,0,0,.8);color:#9ff;font:11px/1.45 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none";
      document.body.appendChild(debugEl);
    }
    debugEl.textContent = [`source: ${status.source}`, `3D tiles loaded: ${status.tilesLoaded}, failed: ${status.tilesFailed}`, ...status.notes].join("\n");
  };
  let mode = "idle";
  let glider, stander, positions, t0, t1;
  let orbit = 0, heading = 0, travelHeading = 0;
  let shot = null; // camera move in progress { from, to, start, ms, done }

  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  const loadCss = (href) => {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href;
    document.head.appendChild(l);
  };

  const hasWebGL = () => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch { return false; }
  };

  const getKeys = async () => {
    const keys = { google: window.ARTHUR_GOOGLE_MAPS_KEY || "", ion: window.ARTHUR_CESIUM_ION_TOKEN || "" };
    try {
      const res = await fetch("/api/config", { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const cfg = await res.json();
        keys.google = cfg.googleMapsKey || keys.google;
        keys.ion = cfg.cesiumIonToken || keys.ion;
      }
    } catch { /* not on Vercel */ }
    return keys;
  };

  /* Google's 3D tiles, straight from Google or via Cesium ion. */
  const loadPhotoreal = async ({ google, ion }) => {
    note(`keys: google ${google ? "set" : "missing"}, ion ${ion ? "set" : "missing"}`);
    if (google) {
      try {
        C.GoogleMaps.defaultApiKey = google;
        const t = await C.createGooglePhotorealistic3DTileset({ key: google });
        status.source = "google";
        return t;
      } catch (err) {
        note(`Google key rejected: ${describe(err)}`);
      }
    }
    if (ion) {
      try {
        C.Ion.defaultAccessToken = ion;
        const t = await C.Cesium3DTileset.fromIonAssetId(ION_GOOGLE_TILES);
        status.source = "ion";
        return t;
      } catch (err) {
        note(`Cesium ion failed (check the token, its allowed URLs, and that Google Photorealistic 3D Tiles is in My Assets): ${describe(err)}`);
      }
    }
    return null;
  };

  const at = (lat, lon, h) => C.Cartesian3.fromDegrees(lon, lat, ground + h);
  const upAt = (p) => C.Ellipsoid.WGS84.geodeticSurfaceNormal(p, new C.Cartesian3());
  const lift = (p, m) => C.Cartesian3.add(p, C.Cartesian3.multiplyByScalar(upAt(p), m, new C.Cartesian3()), new C.Cartesian3());

  /* Compass heading (radians, clockwise from north) of the move from a to b. */
  const headingBetween = (a, b) => {
    const enu = C.Transforms.eastNorthUpToFixedFrame(a);
    const inv = C.Matrix4.inverse(enu, new C.Matrix4());
    const d = C.Matrix4.multiplyByPoint(inv, b, new C.Cartesian3());
    return Math.atan2(d.x, d.y);
  };

  /* Model orientation that faces a compass heading, standing upright. */
  const facing = (p, h) => {
    const enu = C.Transforms.eastNorthUpToFixedFrame(p);
    const east = C.Matrix4.getColumn(enu, 0, new C.Cartesian4());
    const north = C.Matrix4.getColumn(enu, 1, new C.Cartesian4());
    const up = upAt(p);
    const fwd = C.Cartesian3.normalize(new C.Cartesian3(
      east.x * Math.sin(h) + north.x * Math.cos(h),
      east.y * Math.sin(h) + north.y * Math.cos(h),
      east.z * Math.sin(h) + north.z * Math.cos(h)), new C.Cartesian3());
    const left = C.Cartesian3.cross(up, fwd, new C.Cartesian3());
    const m = new C.Matrix3(fwd.x, left.x, up.x, fwd.y, left.y, up.y, fwd.z, left.z, up.z);
    return C.Quaternion.fromRotationMatrix(m);
  };

  const lerpAngle = (a, b, t) => {
    let d = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    return a + d * t;
  };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  const look = (target, h, pitch, range) => {
    scene.camera.lookAt(target, new C.HeadingPitchRange(h, pitch, range));
  };

  /* Smoothly move the camera between two framings around Arthur. */
  const moveCamera = (to, ms) => new Promise((done) => {
    shot = { from: { ...currentFrame }, to, start: performance.now(), ms, done };
  });
  let currentFrame = { h: 0, pitch: -0.3, range: 900, lift: 0 };

  const tick = () => {
    if (!viewer) return;
    const tg = at(TECH_GREEN.lat, TECH_GREEN.lon, 0);

    if (mode === "idle") {
      // Title view: circle Arthur where he stands on the lawn.
      orbit += 0.0016;
      currentFrame = { h: orbit, pitch: -0.14, range: 9, lift: 1.1 };
      look(lift(tg, 1.1), orbit, -0.14, 9);
      return;
    }

    if (mode === "fly") {
      const now = viewer.clock.currentTime;
      const p = positions.getValue(now);
      if (!p) return;
      const aheadTime = C.JulianDate.addSeconds(now, 0.6, new C.JulianDate());
      const ahead = C.JulianDate.lessThan(aheadTime, t1) ? positions.getValue(aheadTime) : null;
      if (ahead) travelHeading = headingBetween(p, ahead);
      heading = lerpAngle(heading, travelHeading, 0.06);

      // Start wide, then tuck in behind him.
      const elapsed = C.JulianDate.secondsDifference(now, t0);
      const k = ease(Math.min(1, elapsed / 4));
      const range = 60 - 49 * k;
      const pitch = -0.5 + 0.3 * k;
      currentFrame = { h: heading, pitch, range, lift: 1.8 };
      look(lift(p, 1.8), heading, pitch, range);

      if (C.JulianDate.greaterThanOrEquals(now, t1)) land();
      return;
    }

    if (shot) {
      const t = Math.min(1, (performance.now() - shot.start) / shot.ms);
      const e = ease(t);
      currentFrame = {
        h: lerpAngle(shot.from.h, shot.to.h, e),
        pitch: shot.from.pitch + (shot.to.pitch - shot.from.pitch) * e,
        range: shot.from.range + (shot.to.range - shot.from.range) * e,
        lift: shot.from.lift + (shot.to.lift - shot.from.lift) * e,
      };
      if (t >= 1) { const d = shot.done; shot = null; d(); }
    }
    look(lift(tg, currentFrame.lift), currentFrame.h, currentFrame.pitch, currentFrame.range);
  };

  let onLanded = () => {};

  const land = () => {
    mode = "landed";
    viewer.clock.shouldAnimate = false;
    const tg = at(TECH_GREEN.lat, TECH_GREEN.lon, 0);
    viewer.entities.remove(glider);
    glider = null;
    stander = viewer.entities.add({
      position: tg,
      orientation: facing(tg, travelHeading),
      model: { uri: "models/arthur-stand.glb", scale: 1 },
    });
    // Swing around to see his face for the dialogue.
    moveCamera({ h: travelHeading + Math.PI - 0.6, pitch: -0.12, range: 4.6, lift: 1.3 }, 2200).then(() => onLanded());
  };

  /* Over the shoulder, down at the Slate in his hand. */
  const lookAtSlate = () => moveCamera({ h: travelHeading + 0.5, pitch: -0.5, range: 2.1, lift: 1.35 }, 1400);

  const init = async (container) => {
    if (!hasWebGL()) return false;
    try {
      window.CESIUM_BASE_URL = CESIUM;
      loadCss(CESIUM + "Widgets/widgets.css");
      await loadScript(CESIUM + "Cesium.js");
      C = window.Cesium;
      C.Ion.defaultAccessToken = "";

      viewer = new C.Viewer(container, {
        baseLayer: false,
        animation: false, timeline: false, baseLayerPicker: false, geocoder: false,
        homeButton: false, sceneModePicker: false, navigationHelpButton: false,
        fullscreenButton: false, infoBox: false, selectionIndicator: false,
        shouldAnimate: false,
      });
      scene = viewer.scene;
      scene.screenSpaceCameraController.enableInputs = false;
      scene.skyAtmosphere.show = true;
      scene.fog.enabled = true;
      viewer.clock.currentTime = C.JulianDate.fromIso8601(START_TIME);
      scene.preRender.addEventListener(tick);

      // Satellite imagery on the globe is always there underneath, so the
      // ground never goes blank while (or if) the 3D tiles stream in.
      viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maximumLevel: 19,
        credit: "Imagery: Esri, Maxar, Earthstar Geographics",
      }));
      scene.globe.baseColor = C.Color.fromCssColorString("#5b7d4a");

      const tileset = await loadPhotoreal(await getKeys());
      if (tileset) {
        tileset.tileLoad.addEventListener(() => {
          status.tilesLoaded += 1;
          if (status.tilesLoaded === 1) scene.globe.show = false;
          if (status.tilesLoaded % 25 === 1) showDebug();
        });
        tileset.tileFailed.addEventListener((e) => {
          status.tilesFailed += 1;
          if (status.tilesFailed <= 3) note(`3D tile failed: ${e && e.message ? e.message : "unknown"}`);
        });
        scene.primitives.add(tileset);
        // Hold the loading screen until campus has actually streamed in.
        await Promise.race([
          new Promise((r) => tileset.initialTilesLoaded.addEventListener(r)),
          new Promise((r) => setTimeout(r, 12000)),
        ]);
        if (status.tilesLoaded > 0) {
          photoreal = true;
        } else {
          note("no 3D tiles arrived in 12s, using the satellite map");
          scene.primitives.remove(tileset);
          scene.globe.show = true;
        }
      }
      if (!photoreal) {
        status.source = "satellite";
        ground = 0;
      }
      note(`using: ${status.source}`);

      if (photoreal) {
        sampleGround();
        await groundReady;
      }
      idle();
      return true;
    } catch (err) {
      console.warn("3D descent unavailable, using the 2D one.", err);
      try { viewer && viewer.destroy(); } catch { /* ignore */ }
      viewer = null;
      return false;
    }
  };

  /* Find the real height of the lawn so he lands on it, not in it. */
  let groundReady = Promise.resolve();
  const sampleGround = () => {
    groundReady = (async () => {
      try {
        const [c] = await Promise.race([
          scene.sampleHeightMostDetailed([C.Cartographic.fromDegrees(TECH_GREEN.lon, TECH_GREEN.lat)], [], 0.5),
          new Promise((r) => setTimeout(() => r([]), 6000)),
        ]);
        if (c && Number.isFinite(c.height)) ground = c.height;
      } catch { /* keep the fallback */ }
    })();
  };

  const start = async (landed) => {
    onLanded = landed;
    await groundReady;
    if (stander) { viewer.entities.remove(stander); stander = null; }
    if (glider) { viewer.entities.remove(glider); glider = null; }

    t0 = C.JulianDate.fromIso8601(START_TIME);
    t1 = C.JulianDate.addSeconds(t0, FLIGHT_SECONDS, new C.JulianDate());
    positions = new C.SampledPositionProperty();
    for (const [lat, lon, h, s] of PATH) positions.addSample(C.JulianDate.addSeconds(t0, s, new C.JulianDate()), at(lat, lon, h));
    positions.setInterpolationOptions({ interpolationDegree: 2, interpolationAlgorithm: C.HermitePolynomialApproximation });

    glider = viewer.entities.add({
      position: positions,
      orientation: new C.VelocityOrientationProperty(positions),
      model: { uri: "models/arthur-glide.glb", scale: 1 },
    });

    const clock = viewer.clock;
    clock.startTime = t0.clone();
    clock.stopTime = t1.clone();
    clock.currentTime = t0.clone();
    clock.clockRange = C.ClockRange.CLAMPED;
    clock.multiplier = 1;
    clock.shouldAnimate = true;
    heading = travelHeading = headingBetween(at(PATH[0][0], PATH[0][1], 0), at(PATH[1][0], PATH[1][1], 0));
    mode = "fly";
  };

  /* Jump straight to the landed state (used by Skip). */
  const skipToLanding = () => {
    if (!viewer) return;
    if (mode === "fly") viewer.clock.currentTime = t1.clone();
    else if (mode === "idle") {
      travelHeading = headingBetween(at(PATH[5][0], PATH[5][1], 0), at(TECH_GREEN.lat, TECH_GREEN.lon, 0));
      if (!stander) land();
      mode = "landed";
    }
    shot = null;
    currentFrame = { h: travelHeading + 0.5, pitch: -0.5, range: 2.1, lift: 1.35 };
  };

  /* Back to the slow orbit over campus, ready for another run. */
  const idle = () => {
    if (!viewer) return;
    if (stander) { viewer.entities.remove(stander); stander = null; }
    if (glider) { viewer.entities.remove(glider); glider = null; }
    viewer.clock.shouldAnimate = false;
    shot = null;
    const tg = at(TECH_GREEN.lat, TECH_GREEN.lon, 0);
    travelHeading = headingBetween(at(PATH[5][0], PATH[5][1], 0), tg);
    stander = viewer.entities.add({
      position: tg,
      orientation: facing(tg, travelHeading),
      model: { uri: "models/arthur-stand.glb", scale: 1 },
    });
    mode = "idle";
  };

  return {
    init, start, lookAtSlate, skipToLanding, idle,
    get ready() { return !!viewer; },
    get photoreal() { return photoreal; },
    status,
  };
})();
