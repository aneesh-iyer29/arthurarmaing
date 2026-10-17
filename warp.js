/* The blue fade from the game: a column of light stands on Arthur, streaks of
   blue peel off him and climb away as he warps out, and they pour back down
   onto the spot where he warps in. Draws on a full screen canvas above
   everything else.

   out() ends with the screen covered (in blue, or in black when dark is set),
   and in() starts covered and clears. Both resolve when they finish. */
window.WarpFX = (() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = document.createElement("div");
  el.className = "warp";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="warp-glow"></div><canvas></canvas><div class="warp-dark"></div>';
  document.body.appendChild(el);
  const canvas = el.querySelector("canvas");
  const glow = el.querySelector(".warp-glow");
  const dark = el.querySelector(".warp-dark");
  const ctx = canvas.getContext("2d");
  let raf = 0;

  const size = () => {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  const spawn = (n, origin, rising) => Array.from({ length: n }, () => ({
    x: origin.x + (Math.random() - 0.5) * (40 + Math.random() * 120),
    y: rising ? origin.y + (Math.random() - 0.5) * 150 : -60 - Math.random() * innerHeight * 0.8,
    ty: origin.y + (Math.random() - 0.5) * 140,
    v: 260 + Math.random() * 640,
    len: 30 + Math.random() * 110,
    w: 1.2 + Math.random() * 3,
    delay: Math.random() * 0.5,
    hue: 182 + Math.random() * 22,
  }));

  const streak = (x, y, len, w, hue, a, up) => {
    if (a <= 0) return;
    const end = y + (up ? len : -len);
    const g = ctx.createLinearGradient(x, y, x, end);
    g.addColorStop(0, `hsla(${hue},100%,92%,${a})`);
    g.addColorStop(1, `hsla(${hue},100%,60%,0)`);
    ctx.strokeStyle = g;
    // A soft halo, then a bright core.
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = w * 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, end); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, end); ctx.stroke();
  };

  /* The column of light standing where Arthur is. */
  const column = (o, strength) => {
    if (strength <= 0) return;
    const half = 60 + 50 * strength;
    const g = ctx.createLinearGradient(o.x - half, 0, o.x + half, 0);
    g.addColorStop(0, "rgba(79,227,255,0)");
    g.addColorStop(0.5, `rgba(220,252,255,${0.85 * strength})`);
    g.addColorStop(1, "rgba(79,227,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(o.x - half, 0, half * 2, o.y - 40);
    // Fade out below his feet instead of stopping on a hard edge.
    for (let k = 0; k < 13; k += 1) {
      ctx.globalAlpha = 1 - k / 13;
      ctx.fillRect(o.x - half, o.y - 40 + k * 10, half * 2, 10);
    }
    ctx.globalAlpha = 1;
  };

  const run = ({ rising, ms, origin, toDark, fromDark }) => new Promise((done) => {
    cancelAnimationFrame(raf);
    size();
    el.classList.add("on");
    const o = origin || { x: innerWidth / 2, y: innerHeight * 0.6 };
    glow.style.setProperty("--ox", `${o.x}px`);
    glow.style.setProperty("--oy", `${o.y}px`);
    const parts = spawn(reduced ? 0 : Math.round(Math.min(340, innerWidth / 3)), o, rising);
    const total = ms / 1000;
    const start = performance.now();
    const frame = () => {
      const sec = (performance.now() - start) / 1000;
      const t = Math.min(1, sec / total);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = "lighter";
      if (rising) {
        column(o, ease(clamp01(t / 0.35)) * (1 - ease(clamp01((t - 0.7) / 0.3))));
        parts.forEach((p) => {
          const s = sec - p.delay * total * 0.6;
          if (s < 0) return;
          streak(p.x, p.y - p.v * s * (0.5 + s * 1.5), p.len, p.w, p.hue, clamp01(1.2 - s / total), true);
        });
        // The screen washes out to blue, then (for a loading screen) to black.
        glow.style.opacity = String(ease(clamp01((t - 0.2) / 0.55)));
        dark.style.opacity = toDark ? String(ease(clamp01((t - 0.72) / 0.28))) : "0";
      } else {
        column(o, 1 - ease(clamp01((t - 0.45) / 0.5)));
        parts.forEach((p) => {
          const s = sec - p.delay * total * 0.5;
          if (s < 0) return;
          const y = Math.min(p.ty, p.y + p.v * s * (1 + s * 2.2));
          const landed = y >= p.ty;
          streak(p.x, y, landed ? p.len * 0.5 : p.len, p.w, p.hue, landed ? clamp01(1 - (t - 0.5) * 2.5) : 1, false);
        });
        glow.style.opacity = String(1 - ease(clamp01((t - 0.25) / 0.7)));
        dark.style.opacity = fromDark ? String(1 - ease(clamp01(t / 0.3))) : "0";
      }
      ctx.globalCompositeOperation = "source-over";
      if (t < 1) raf = requestAnimationFrame(frame);
      else {
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        if (!rising) el.classList.remove("on");
        done();
      }
    };
    raf = requestAnimationFrame(frame);
  });

  return {
    /* Dissolve away. dark: finish on black (for a loading screen). */
    out: ({ origin, dark: toDark = false, ms = 1400 } = {}) => run({ rising: true, ms: reduced ? 250 : ms, origin, toDark }),
    /* Re-form. dark: start from black. */
    in: ({ origin, dark: fromDark = false, ms = 1400 } = {}) => run({ rising: false, ms: reduced ? 250 : ms, origin, fromDark }),
    /* Snap to covered or clear without animating. */
    cover: (darkToo) => { cancelAnimationFrame(raf); el.classList.add("on"); glow.style.opacity = "1"; dark.style.opacity = darkToo ? "1" : "0"; },
    clear: () => { cancelAnimationFrame(raf); el.classList.remove("on"); glow.style.opacity = "0"; dark.style.opacity = "0"; },
  };
})();
