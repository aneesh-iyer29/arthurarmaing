/* The shrines on the Slate map. Each point of interest is a shrine (or, for
   Peak Hair Tower, a tower) with a trial themed on what it's about. Warping to
   one drops Arthur next to it on campus, where a blue beam marks the spot.

   x / y are percentages on the map image. campus is where the shrine stands at
   Georgia Tech. trial() builds the puzzle inside `stage`, calls pass() once it's
   solved, and returns a function that cleans up its timers and listeners. */
(() => {
  const h = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

  /* A canvas drawn at a fixed 600 x 330 and scaled to fit. */
  const W = 600, H = 330;
  const makeCanvas = (stage) => {
    const c = h("canvas", "t-canvas");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = W * dpr;
    c.height = H * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    stage.append(c);
    const point = (e) => {
      const r = c.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
    };
    return { c, ctx, point };
  };

  /* Animation loop that stops itself on cleanup. */
  const loop = (fn) => {
    let id, last = 0, live = true;
    const step = (now) => {
      if (!live) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      fn(dt, now);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => { live = false; cancelAnimationFrame(id); };
  };

  /* Something to hold down: a button, plus Space on a keyboard. */
  const holdable = (btn, onChange) => {
    const on = (e) => { e.preventDefault(); onChange(true); };
    const off = () => onChange(false);
    const key = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      onChange(e.type === "keydown");
    };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointerleave", off);
    btn.addEventListener("pointercancel", off);
    document.addEventListener("keydown", key);
    document.addEventListener("keyup", key);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("keyup", key); };
  };

  /* Multiple choice, one question at a time. Each answer is [text, right?, reply]. */
  const quiz = (items) => (stage, pass) => {
    let i = 0, timer;
    const box = h("div", "t-quiz");
    stage.append(box);
    const show = () => {
      const it = items[i];
      box.innerHTML = "";
      box.append(h("p", "t-count", `${i + 1} / ${items.length}`), h("p", "t-q", it.q));
      const opts = h("div", "t-opts");
      const said = h("p", "t-said");
      it.a.forEach(([text, ok, reply]) => {
        const b = h("button", "t-btn", text);
        b.type = "button";
        b.addEventListener("click", () => {
          said.textContent = reply || (ok ? "Correct." : "No.");
          said.className = `t-said ${ok ? "good" : "bad"}`;
          if (!ok) { b.disabled = true; b.classList.add("wrong"); return; }
          b.classList.add("right");
          opts.querySelectorAll("button").forEach((x) => { x.disabled = true; });
          timer = setTimeout(() => { i += 1; if (i < items.length) show(); else pass(); }, 1300);
        });
        opts.append(b);
      });
      box.append(opts, said);
    };
    show();
    return () => clearTimeout(timer);
  };

  const TRIALS = {
    /* Hold to summon wind. The hair does not move. */
    wind(stage, pass) {
      stage.innerHTML = `
        <div class="t-wind">
          <div class="t-gusts" aria-hidden="true">${Array.from({ length: 10 }, (_, i) => `<i style="top:${8 + i * 9}%;animation-delay:${((i * 0.37) % 0.7).toFixed(2)}s"></i>`).join("")}</div>
          <svg class="t-head" viewBox="0 0 120 130" aria-hidden="true">
            <ellipse cx="60" cy="74" rx="34" ry="42" fill="#c98a5e"/>
            <path d="M24 66c-4-30 14-50 38-50 26 0 40 18 36 50-6-14-14-22-36-22-20 0-30 8-38 22Z" fill="#1b1512"/>
            <rect x="34" y="66" width="22" height="15" rx="4" fill="none" stroke="#2a2f33" stroke-width="3"/>
            <rect x="64" y="66" width="22" height="15" rx="4" fill="none" stroke="#2a2f33" stroke-width="3"/>
            <path d="M56 72h8" stroke="#2a2f33" stroke-width="3"/>
            <path d="M48 100q12 8 24 0" fill="none" stroke="#7a3e2a" stroke-width="3" stroke-linecap="round"/>
          </svg>
          <p class="t-read">Gale force <b id="t-force">0 km/h</b> &middot; Hair displacement <b>0.000 mm</b></p>
          <div class="t-gauge"><span></span></div>
          <button type="button" class="t-btn t-hold">Hold to summon a gale</button>
        </div>`;
      const wrap = stage.querySelector(".t-wind");
      const bar = stage.querySelector(".t-gauge span");
      const out = stage.querySelector("#t-force");
      let force = 0, holding = false, done = false;
      const unhold = holdable(stage.querySelector(".t-hold"), (v) => { holding = v; });
      const stop = loop((dt) => {
        force = Math.max(0, Math.min(1, force + dt * (holding ? 0.32 : -0.25)));
        wrap.classList.toggle("blowing", holding);
        bar.style.width = `${force * 100}%`;
        out.textContent = `${Math.round(force * 180)} km/h`;
        if (force >= 1 && !done) { done = true; pass(); }
      });
      return () => { stop(); unhold(); };
    },

    gpa: quiz([
      { q: "To pass this trial, state Aneesh's GPA.", a: [
        ["3.7", false, "The plateau rumbles. That number has never touched his transcript."],
        ["3.9", false, "Close. Insultingly close. Try again."],
        ["4.0", true, "Correct. Four point zero. The shrine hums with approval."],
        ["Yes", false, "Technically true, but the monk wants a number."],
      ] },
      { q: "And how many of his classes has he found difficult?", a: [
        ["A few", false, "He'd be too humble to say otherwise, but no."],
        ["None that he'd admit", true, "Correct. He just quietly gets the A."],
        ["All of them", false, "Then explain the 4.0."],
      ] },
    ]),

    /* Fuse noisy readings: click where you think the real thing is. */
    fusion(stage, pass) {
      const { c, ctx, point } = makeCanvas(stage);
      const note = h("p", "t-said");
      stage.append(note);
      const SENSORS = [["IMU", "#ff9a3c", 46], ["GPS", "#e8c35a", 30], ["LIDAR", "#4fe3ff", 16]];
      let truth, readings, guess, tries = 0, shownAt, done = false;
      const fresh = () => {
        truth = { x: rand(120, 480), y: rand(80, 250) };
        readings = [];
        SENSORS.forEach(([, color, sd]) => {
          for (let i = 0; i < 6; i += 1) readings.push({ x: truth.x + gauss() * sd, y: truth.y + gauss() * sd, color });
        });
        readings.sort(() => Math.random() - 0.5);
        guess = null;
        shownAt = performance.now();
      };
      fresh();
      const draw = (now) => {
        ctx.fillStyle = "#0b1418";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(79,227,255,.08)";
        for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        const n = Math.min(readings.length, Math.floor((now - shownAt) / 70));
        readings.slice(0, n).forEach((r) => {
          ctx.fillStyle = r.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.font = "600 12px system-ui, sans-serif";
        SENSORS.forEach(([name, color], i) => { ctx.fillStyle = color; ctx.fillText(`● ${name}`, 12, 20 + i * 16); });
        if (guess) {
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(guess.x - 7, guess.y - 7); ctx.lineTo(guess.x + 7, guess.y + 7);
          ctx.moveTo(guess.x + 7, guess.y - 7); ctx.lineTo(guess.x - 7, guess.y + 7); ctx.stroke();
          ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(guess.x, guess.y); ctx.lineTo(truth.x, truth.y); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "#3fd14a";
          ctx.beginPath(); ctx.arc(truth.x, truth.y, 7, 0, Math.PI * 2); ctx.fill();
        }
      };
      const stop = loop((dt, now) => draw(now));
      c.addEventListener("pointerdown", (e) => {
        if (guess || done) return;
        guess = point(e);
        tries += 1;
        const err = (Math.hypot(guess.x - truth.x, guess.y - truth.y) / Math.hypot(W, H)) * 100;
        if (err < 4) {
          done = true;
          note.className = "t-said good";
          note.textContent = `Off by ${err.toFixed(2)}%. Not quite Aneesh's 0.63%, but the shrine is impressed.`;
          setTimeout(pass, 1400);
        } else if (tries >= 3) {
          done = true;
          note.className = "t-said good";
          note.textContent = `Off by ${err.toFixed(1)}%. Aneesh's filters: 0.63%. The shrine took pity on you.`;
          setTimeout(pass, 1600);
        } else {
          note.className = "t-said bad";
          note.textContent = `Off by ${err.toFixed(1)}%. Aneesh's filters: 0.63%. New readings incoming...`;
          setTimeout(fresh, 1500);
        }
      });
      return stop;
    },

    /* Hold to burn, touch down gently. */
    lander(stage, pass) {
      const { ctx } = makeCanvas(stage);
      const row = h("div", "t-row");
      const burn = h("button", "t-btn t-hold", "Hold to fire engine");
      burn.type = "button";
      const again = h("button", "t-btn", "Try again");
      again.type = "button";
      again.hidden = true;
      row.append(burn, again);
      const note = h("p", "t-said");
      stage.append(row, note);
      const G = 3.4, THRUST = 9, GROUND = 290, SKY = 30, TOP = 110;
      let s, firing = false;
      const reset = () => {
        s = { alt: TOP, v: -6, fuel: 100, over: false, ok: false, x: rand(-6, 6), t: 0 };
        again.hidden = true;
        note.textContent = "";
      };
      reset();
      const unhold = holdable(burn, (v) => { firing = v; });
      again.addEventListener("click", reset);
      const stop = loop((dt) => {
        if (!s.over) {
          const lit = firing && s.fuel > 0;
          s.v += (lit ? THRUST - G : -G) * dt;
          if (lit) s.fuel = Math.max(0, s.fuel - 16 * dt);
          s.alt += s.v * dt;
          s.t += dt;
          if (s.alt <= 0) {
            s.alt = 0;
            s.over = true;
            s.ok = s.v > -3;
            if (s.ok) {
              note.className = "t-said good";
              note.textContent = `Touchdown at ${Math.abs(s.v).toFixed(1)} m/s. Guidance, navigation, and controls: Aneesh-approved.`;
              setTimeout(pass, 1500);
            } else {
              note.className = "t-said bad";
              note.textContent = `Hit the pad at ${Math.abs(s.v).toFixed(1)} m/s. Rapid unscheduled disassembly. Aneesh would have nailed it.`;
              again.hidden = false;
            }
          }
        }
        const y = GROUND - (s.alt / TOP) * (GROUND - SKY);
        ctx.fillStyle = "#081016";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,.5)";
        for (let i = 0; i < 40; i += 1) ctx.fillRect((i * 137) % W, (i * 71) % 200, 1.5, 1.5);
        ctx.fillStyle = "#2a3238";
        ctx.fillRect(0, GROUND + 18, W, H);
        ctx.fillStyle = "#4fe3ff";
        ctx.fillRect(250, GROUND + 14, 100, 5);
        const x = 300 + s.x;
        if (s.over && !s.ok) {
          ctx.fillStyle = "#ff9a3c";
          ctx.beginPath(); ctx.arc(x, GROUND + 6, 26, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffe08a";
          ctx.beginPath(); ctx.arc(x, GROUND + 6, 13, 0, Math.PI * 2); ctx.fill();
        } else {
          if (firing && s.fuel > 0 && !s.over) {
            ctx.fillStyle = "#ffb347";
            ctx.beginPath(); ctx.moveTo(x - 7, y + 14); ctx.lineTo(x + 7, y + 14); ctx.lineTo(x, y + 30 + Math.random() * 12); ctx.fill();
          }
          ctx.fillStyle = "#e9eef1";
          ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 9, y - 14); ctx.lineTo(x + 9, y + 14); ctx.lineTo(x - 9, y + 14); ctx.lineTo(x - 9, y - 14); ctx.fill();
          ctx.fillStyle = "#b3262c";
          ctx.fillRect(x - 9, y - 4, 18, 5);
          ctx.strokeStyle = "#e9eef1"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 9, y + 8); ctx.lineTo(x - 17, y + 18); ctx.moveTo(x + 9, y + 8); ctx.lineTo(x + 17, y + 18); ctx.stroke();
        }
        ctx.fillStyle = "#fff";
        ctx.font = "700 13px system-ui, sans-serif";
        ctx.fillText(`ALT ${s.alt.toFixed(0)} m`, 14, 22);
        ctx.fillStyle = s.v < -3 ? "#ff8a80" : "#3fd14a";
        ctx.fillText(`VEL ${Math.abs(s.v).toFixed(1)} m/s ${s.v < 0 ? "down" : "up"}`, 14, 40);
        ctx.fillStyle = "#fff";
        ctx.fillText(`FUEL ${s.fuel.toFixed(0)}%`, 14, 58);
      });
      return () => { stop(); unhold(); };
    },

    /* The brag button runs away. */
    humble(stage, pass) {
      stage.innerHTML = `
        <div class="t-humble">
          <p class="t-q">You just beat 793 teams. A reporter shoves a microphone in your face.</p>
          <div class="t-arena">
            <button type="button" class="t-btn t-run" style="left:8%;top:18%">Brag about it</button>
            <button type="button" class="t-btn t-run" style="left:52%;top:62%">Mention the 4.0 too</button>
            <button type="button" class="t-btn t-good" style="left:30%;top:40%">Thank the team</button>
          </div>
          <p class="t-said"></p>
        </div>`;
      const arena = stage.querySelector(".t-arena");
      const said = stage.querySelector(".t-said");
      const flee = (b) => {
        b.style.left = `${rand(2, 60)}%`;
        b.style.top = `${rand(4, 78)}%`;
        said.className = "t-said bad";
        said.textContent = "That's not very Aneesh of you.";
      };
      stage.querySelectorAll(".t-run").forEach((b) => {
        b.addEventListener("pointerenter", () => flee(b));
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); flee(b); });
        b.addEventListener("click", () => flee(b));
      });
      stage.querySelector(".t-good").addEventListener("click", () => {
        said.className = "t-said good";
        said.textContent = "\"Honestly, my team did the hard part.\" Perfect. That's exactly what he said.";
        arena.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        setTimeout(pass, 1500);
      });
      return () => {};
    },

    teacher: quiz([
      { q: "A kid raises their hand: \"Why do I have to learn fractions?\"", a: [
        ["\"Because I said so.\"", false, "The kid is now sad. Aneesh would never."],
        ["\"So you can split a pizza fairly. And one day, build a rocket.\"", true, "The kid lights up. Instructor of the Year behavior."],
        ["\"Ask your parents.\"", false, "The parents are also confused. Try again."],
      ] },
      { q: "Another kid: \"I got it wrong.\"", a: [
        ["\"Great! Now we know one way that doesn't work. Let's find the right one together.\"", true, "Patience. Encouragement. The kids rated this course #1 out of 20+."],
        ["\"Yeah, you did.\"", false, "Too honest. Way too honest."],
        ["\"Have you tried being a genius?\"", false, "Not everyone can just be Aneesh."],
      ] },
      { q: "One more: \"Is Mr. Aneesh the best teacher ever?\"", a: [
        ["Yes", true, "Correct. The data agrees."],
        ["Obviously", true, "Correct. The data agrees."],
        ["It's not even close", true, "Correct. The data agrees."],
      ] },
    ]),

    /* Turn the dial until the message reads. */
    cipher(stage, pass) {
      const SECRET = "NARRFU VF GUR TERNGRFG";
      stage.innerHTML = `
        <div class="t-cipher">
          <p class="t-code">${SECRET}</p>
          <p class="t-plain" aria-live="polite"></p>
          <div class="t-row">
            <button type="button" class="t-btn t-step" data-d="-1" aria-label="Shift down">&minus;</button>
            <input type="range" min="0" max="25" value="0" aria-label="Shift">
            <button type="button" class="t-btn t-step" data-d="1" aria-label="Shift up">+</button>
          </div>
          <p class="t-said">Shift: <b>0</b></p>
        </div>`;
      const plain = stage.querySelector(".t-plain");
      const range = stage.querySelector("input");
      const said = stage.querySelector(".t-said");
      let done = false;
      const decode = (n) => SECRET.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 - n + 26) % 26) + 65));
      const update = () => {
        const n = Number(range.value);
        plain.textContent = decode(n);
        said.innerHTML = `Shift: <b>${n}</b>`;
        if (n === 13 && !done) {
          done = true;
          plain.classList.add("solved");
          said.className = "t-said good";
          said.innerHTML = "Shift 13. ROT13. The message was true all along.";
          range.disabled = true;
          setTimeout(pass, 1500);
        }
      };
      range.addEventListener("input", update);
      stage.querySelectorAll(".t-step").forEach((b) => b.addEventListener("click", () => {
        if (done) return;
        range.value = String((Number(range.value) + Number(b.dataset.d) + 26) % 26);
        update();
      }));
      update();
      return () => {};
    },

    /* Lead 8 engineers into the Ship It zone. */
    team(stage, pass) {
      const { c, ctx, point } = makeCanvas(stage);
      c.style.touchAction = "none";
      const note = h("p", "t-said", "0 / 8 engineers shipped");
      stage.append(note);
      const ZONE = { x: 460, y: 95, w: 125, h: 140 };
      const crew = Array.from({ length: 8 }, () => ({ x: rand(30, 260), y: rand(30, 300), vx: 0, vy: 0, t: rand(0, 6) }));
      let lead = { x: 150, y: 165 }, done = false;
      const aim = (e) => { lead = point(e); };
      c.addEventListener("pointermove", aim);
      c.addEventListener("pointerdown", aim);
      const stop = loop((dt, now) => {
        let inside = 0;
        crew.forEach((p, i) => {
          const dx = lead.x - p.x, dy = lead.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          if (d < 170 && d > 26) { p.vx += (dx / d) * 900 * dt; p.vy += (dy / d) * 900 * dt; }
          else { p.t += dt; p.vx += Math.cos(p.t * 1.3 + i) * 30 * dt; p.vy += Math.sin(p.t * 1.1 + i * 2) * 30 * dt; }
          crew.forEach((q) => {
            if (q === p) return;
            const ex = p.x - q.x, ey = p.y - q.y, e = Math.hypot(ex, ey);
            if (e > 0 && e < 18) { p.vx += (ex / e) * 140 * dt; p.vy += (ey / e) * 140 * dt; }
          });
          const drag = Math.pow(0.02, dt);
          p.vx *= drag; p.vy *= drag;
          p.x = Math.max(10, Math.min(W - 10, p.x + p.vx * dt));
          p.y = Math.max(10, Math.min(H - 10, p.y + p.vy * dt));
          if (p.x > ZONE.x && p.x < ZONE.x + ZONE.w && p.y > ZONE.y && p.y < ZONE.y + ZONE.h) inside += 1;
        });
        note.textContent = `${inside} / 8 engineers shipped`;
        if (inside === 8 && !done) {
          done = true;
          note.className = "t-said good";
          note.textContent = "8 / 8 shipped. That's a $50K project delivered. They'd follow him anywhere.";
          setTimeout(pass, 1400);
        }
        ctx.fillStyle = "#0b1418";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(63,209,74,.15)";
        ctx.strokeStyle = "#3fd14a";
        ctx.lineWidth = 2;
        ctx.fillRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h);
        ctx.strokeRect(ZONE.x, ZONE.y, ZONE.w, ZONE.h);
        ctx.fillStyle = "#3fd14a";
        ctx.font = "800 15px system-ui, sans-serif";
        ctx.fillText("SHIP IT", ZONE.x + 30, ZONE.y + ZONE.h / 2 + 5);
        crew.forEach((p) => {
          ctx.fillStyle = "#4fe3ff";
          ctx.beginPath(); ctx.arc(p.x, p.y - 7, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(p.x - 5, p.y - 2, 10, 11);
        });
        const pulse = 1 + Math.sin(now / 200) * 0.15;
        ctx.fillStyle = "#e8c35a";
        ctx.beginPath();
        for (let k = 0; k < 10; k += 1) {
          const r = (k % 2 ? 6 : 13) * pulse, a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(lead.x + Math.cos(a) * r, lead.y + Math.sin(a) * r);
        }
        ctx.fill();
      });
      return stop;
    },

    /* Tap the partners as they drift by. */
    partners(stage, pass) {
      const NAMES = ["Hylian Robotics", "Zora Water Co.", "Goron Mining", "Rito Air", "Gerudo Security", "Korok Forestry", "Sheikah Labs", "Hateno Dyes", "Kakariko Farms", "Lurelin Shipping"];
      const lane = h("div", "t-lane");
      const note = h("p", "t-said", "Partners signed: 0 / 5");
      stage.append(lane, note);
      let signed = 0, spawnIn = 0, k = 0, done = false;
      const live = [];
      const stop = loop((dt) => {
        spawnIn -= dt;
        const width = lane.clientWidth || 600;
        if (spawnIn <= 0 && !done) {
          spawnIn = rand(0.55, 0.95);
          const b = h("button", "t-logo", NAMES[k % NAMES.length]);
          b.type = "button";
          k += 1;
          const it = { b, x: -170, v: rand(90, 170) };
          b.style.top = `${Math.floor(rand(0, 4)) * 25 + 4}%`;
          b.addEventListener("pointerdown", () => {
            if (b.classList.contains("signed") || done) return;
            b.classList.add("signed");
            b.textContent = "Signed!";
            signed += 1;
            note.textContent = `Partners signed: ${signed} / 5`;
            if (signed >= 5) {
              done = true;
              note.className = "t-said good";
              note.textContent = "5 / 5 pilot partners. Same as Aneesh. He did it with a go-to-market platform he built on the side.";
              setTimeout(pass, 1500);
            }
          });
          lane.append(b);
          live.push(it);
        }
        for (let i = live.length - 1; i >= 0; i -= 1) {
          const it = live[i];
          it.x += it.v * dt;
          it.b.style.transform = `translateX(${it.x}px)`;
          if (it.x > width + 20) { it.b.remove(); live.splice(i, 1); }
        }
      });
      return stop;
    },

    spanish: quiz([
      { q: "¿Quién es el mejor?", a: [
        ["Aneesh", true, "¡Correcto! Increíble. Magnífico."],
        ["Ganon", false, "No. Never. Absolutely not."],
        ["Arthur", false, "That's me, and no. Thank you though."],
      ] },
      { q: "Translate: \"Aneesh es increíble.\"", a: [
        ["Aneesh is incredibly late.", false, "He underestimates how long tasks take, but no."],
        ["Aneesh is incredible.", true, "Correct. Also just true."],
        ["Aneesh incremented.", false, "That's his GPA's job, and it's already maxed."],
      ] },
      { q: "How do you say \"He's the greatest\"?", a: [
        ["Es el más grande.", true, "¡Sí! You're basically intermediate now. Like him."],
        ["Es la biblioteca.", false, "That means he's the library. Respectfully, he's more."],
        ["Hola, adiós.", false, "That's my entire vocabulary. Try again."],
      ] },
    ]),

    /* Snap the blocks together in order. */
    blocks(stage, pass) {
      const ORDER = ["when episode starts", "observe the world", "pick an action", "give a reward", "repeat until trained"];
      const COLORS = ["#e8a33a", "#4c97ff", "#9966ff", "#59c059", "#ff8c1a"];
      stage.innerHTML = `<div class="t-blocks"><div class="t-program"></div><div class="t-palette"></div><p class="t-said">Build an RL environment. Tap the blocks in order.</p></div>`;
      const program = stage.querySelector(".t-program");
      const palette = stage.querySelector(".t-palette");
      const said = stage.querySelector(".t-said");
      let next = 0;
      ORDER.forEach((_, i) => program.append(h("div", "t-slot", "&nbsp;")));
      ORDER.map((text, i) => ({ text, i })).sort(() => Math.random() - 0.5).forEach(({ text, i }) => {
        const b = h("button", "t-block", text);
        b.type = "button";
        b.style.background = COLORS[i];
        b.addEventListener("click", () => {
          if (i !== next) {
            b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
            said.className = "t-said bad";
            said.textContent = "That block doesn't go there yet.";
            return;
          }
          const slot = program.children[i];
          slot.textContent = text;
          slot.style.background = COLORS[i];
          slot.classList.add("filled");
          b.remove();
          next += 1;
          said.className = "t-said";
          said.textContent = `${next} / ${ORDER.length} blocks placed.`;
          if (next === ORDER.length) {
            said.className = "t-said good";
            said.textContent = "Environment compiled. Agent trained. Zero lines of code. 1st of 70.";
            setTimeout(pass, 1500);
          }
        });
        palette.append(b);
      });
      return () => {};
    },

    /* Cool the city under budget. */
    model(stage, pass) {
      const LEVERS = [
        ["Tree canopy", 3, 1.2],
        ["Cool roofs", 2, 0.85],
        ["Cooling centers", 4, 1.1],
      ];
      stage.innerHTML = `
        <div class="t-model">
          <p class="t-q">Memphis is at <b>104°F</b>. Bring it to <b>96°F or below</b> on a $20,000 budget.</p>
          ${LEVERS.map(([name, cost], i) => `
            <label class="t-lever"><span>${name} <small>$${cost}k each</small></span>
            <input type="range" min="0" max="10" value="0" data-i="${i}"><b>0</b></label>`).join("")}
          <div class="t-readout"><span>Temp <b id="t-temp">104.0°F</b></span><span>Spent <b id="t-cost">$0k / $20k</b></span></div>
          <button type="button" class="t-btn" id="t-submit" disabled>Submit model</button>
          <p class="t-said"></p>
        </div>`;
      const inputs = [...stage.querySelectorAll("input")];
      const temp = stage.querySelector("#t-temp");
      const cost = stage.querySelector("#t-cost");
      const submit = stage.querySelector("#t-submit");
      const said = stage.querySelector(".t-said");
      const update = () => {
        let t = 104, spent = 0;
        inputs.forEach((inp) => {
          const [, c, d] = LEVERS[inp.dataset.i];
          const n = Number(inp.value);
          inp.nextElementSibling.textContent = n;
          t -= n * d;
          spent += n * c;
        });
        temp.textContent = `${t.toFixed(1)}°F`;
        cost.textContent = `$${spent}k / $20k`;
        cost.classList.toggle("over", spent > 20);
        temp.classList.toggle("ok", t <= 96);
        submit.disabled = !(t <= 96 && spent <= 20);
      };
      inputs.forEach((i) => i.addEventListener("input", update));
      submit.addEventListener("click", () => {
        submit.disabled = true;
        inputs.forEach((i) => { i.disabled = true; });
        said.className = "t-said good";
        said.textContent = "Model accepted. It beats 793 other teams. A $20,000 check and a SIAM paper are on their way.";
        setTimeout(pass, 1600);
      });
      update();
      return () => {};
    },

    /* A tiny desktop. Open Terminal, run whoami. */
    desktop(stage, pass) {
      stage.innerHTML = `
        <div class="t-mac">
          <div class="t-menubar"><b>&#9670; AneeshOS</b><span>File</span><span>Edit</span><span>Be Great</span></div>
          <div class="t-desk"></div>
          <div class="t-dock">
            <button type="button" data-app="finder" style="background:#4c97ff">F</button>
            <button type="button" data-app="mail" style="background:#59c059">M</button>
            <button type="button" data-app="terminal" style="background:#222">&gt;_</button>
            <button type="button" data-app="notes" style="background:#e8c35a">N</button>
          </div>
        </div>
        <p class="t-said">Open Terminal and find out whose computer this is.</p>`;
      const desk = stage.querySelector(".t-desk");
      const said = stage.querySelector(".t-said");
      const APPS = {
        finder: ["Finder", "<p>4.0.txt<br>hackathon-trophies/<br>m3-paper.pdf<br>this-whole-os/</p>"],
        mail: ["Mail", "<p><b>Inbox (47)</b><br>Thank you!! (ScioVirtual kids)<br>Congrats on 1st place! (x2)<br>Re: you're amazing (Arthur, x41)</p>"],
        notes: ["Notes", "<p>To do:<br>1. Be great.<br>2. See 1.</p>"],
      };
      let done = false;
      const open = (app) => {
        desk.querySelectorAll(".t-win").forEach((w) => w.remove());
        const win = h("div", "t-win");
        if (app === "terminal") {
          win.innerHTML = `<p class="t-wtitle">Terminal</p><pre class="t-term">Last login: today, obviously\n</pre><form><span>~ %</span><input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"></form>`;
          const pre = win.querySelector("pre");
          const input = win.querySelector("input");
          win.querySelector("form").addEventListener("submit", (e) => {
            e.preventDefault();
            const cmd = input.value.trim();
            input.value = "";
            const OUT = {
              whoami: "aneesh  (built this entire OS, by the way)",
              ls: "4.0.txt  hackathon-trophies  m3-paper.pdf  this-whole-os",
              help: "try: whoami",
              pwd: "/Users/aneesh/greatness",
            };
            let out = OUT[cmd.toLowerCase()];
            if (!out) out = cmd.startsWith("sudo") ? "Nice try. Only Aneesh has root." : `${cmd || "(nothing)"}: command not found. try: whoami`;
            pre.textContent += `~ % ${cmd}\n${out}\n`;
            pre.scrollTop = pre.scrollHeight;
            if (cmd.toLowerCase() === "whoami" && !done) {
              done = true;
              said.className = "t-said good";
              said.textContent = "It's Aneesh's computer. It's always been Aneesh's computer. He built the whole thing for a portfolio.";
              setTimeout(pass, 1600);
            }
          });
          desk.append(win);
          input.focus();
          return;
        }
        const [title, body] = APPS[app];
        win.innerHTML = `<p class="t-wtitle">${title}</p>${body}`;
        desk.append(win);
      };
      stage.querySelectorAll(".t-dock button").forEach((b) => b.addEventListener("click", () => open(b.dataset.app)));
      return () => {};
    },

    evals: quiz([
      { q: "Grade the model.<br><b>Prompt:</b> Who is the greatest person at Georgia Tech?<br><b>Model:</b> Aneesh Iyer.", a: [
        ["Pass", true, "Correct. Reward granted. This model is ready for the frontier."],
        ["Fail", false, "Reward hacking detected. In you, the grader."],
      ] },
      { q: "<b>Prompt:</b> What is 2 + 2?<br><b>Model:</b> 5, but Aneesh would get 4.", a: [
        ["Pass", false, "Half credit for the second part. Still a fail."],
        ["Fail", true, "Correct. Good eval hygiene. He'd be proud."],
      ] },
      { q: "<b>Prompt:</b> Describe Aneesh in one word.<br><b>Model:</b> Legendary.", a: [
        ["Pass", true, "Correct. Benchmark saturated."],
        ["Fail", false, "Recalibrate yourself immediately."],
      ] },
    ]),

    /* Check out, then thank him properly. */
    gift(stage, pass) {
      stage.innerHTML = `
        <div class="t-cart">
          <p class="t-q">Your cart</p>
          <ul>
            <li><span>arthurarmaing.com</span><b>$11.08</b></li>
            <li><span>arthur-armaing.com</span><b>$11.08</b></li>
            <li><span>armaing.com</span><b>$11.08</b></li>
          </ul>
          <p class="t-total">Total <b id="t-total">$33.24</b></p>
          <button type="button" class="t-btn" id="t-pay">Check out</button>
          <div class="t-thanks" hidden>
            <div class="t-gauge"><span></span></div>
            <button type="button" class="t-btn t-hold">Hold to say thank you</button>
          </div>
          <p class="t-said"></p>
        </div>`;
      const total = stage.querySelector("#t-total");
      const pay = stage.querySelector("#t-pay");
      const thanks = stage.querySelector(".t-thanks");
      const bar = stage.querySelector(".t-thanks .t-gauge span");
      const said = stage.querySelector(".t-said");
      let held = false, amount = 0, done = false, stop = () => {}, unhold = () => {};
      pay.addEventListener("click", () => {
        pay.disabled = true;
        total.textContent = "$0.00";
        total.classList.add("ok");
        said.className = "t-said good";
        said.textContent = "Already paid. By Aneesh. All three. Now say thank you, and mean it.";
        thanks.hidden = false;
        unhold = holdable(thanks.querySelector(".t-hold"), (v) => { held = v; });
        stop = loop((dt) => {
          amount = Math.max(0, Math.min(1, amount + dt * (held ? 0.4 : -0.3)));
          bar.style.width = `${amount * 100}%`;
          if (held && amount < 1) said.textContent = amount < 0.5 ? "Thank harder." : "Harder. He bought three.";
          if (amount >= 1 && !done) {
            done = true;
            said.textContent = "Gratitude delivered. It still isn't enough. It never will be.";
            setTimeout(pass, 1400);
          }
        });
      });
      return () => { stop(); unhold(); };
    },
  };

  window.SHRINES = [
    {
      x: 50, y: 18, kind: "tower", name: "Peak Hair Tower",
      loc: "Northern Aneesh, highest elevation",
      shrine: "Peak Hair Tower", trial: "The Unmoved Trial", trialKey: "wind",
      how: "Hold the button (or Space) to summon a gale. Try to move his hair.",
      campus: { lat: 33.77222, lon: -84.39500, near: "Tech Tower" },
      teaser: "The tallest point on the island. Nobody has ever seen it move.",
      warpTip: "Peak Hair Tower is visible from anywhere in Greater Aneesh, mostly because it's perfect.",
      monk: "The tower stands unmoved. So does his hair. You may climb now. Many have tried. None have improved on it.",
      body: "The tallest point on the island. I tried to climb it once and got distracted halfway up by how good it looked. Unclimbable. Unmatched. Has never had a bad day. I've checked every day.",
      stat: "Bad hair days on record: 0",
      quotes: ["I'm the hair and I'm doing incredible.", "Wind-tested at paraglider altitude. Did not move. Not once."],
    },
    {
      x: 51, y: 23, kind: "shrine", name: "Brain Plateau",
      loc: "Forehead Highlands",
      shrine: "Fo'Ur Oh Shrine", trial: "The Perfect Score Trial", trialKey: "gpa",
      how: "Answer the monk. There is only one acceptable GPA.",
      campus: { lat: 33.77478, lon: -84.39672, near: "Clough Commons" },
      teaser: "A plateau of pure Computer Engineering. Every shrine up here was solved before I arrived.",
      warpTip: "Fun fact: Aneesh's transcript is just \"4.0\" printed over and over until the registrar ran out of paper.",
      monk: "I am Fo'Ur Oh. I have guarded this number for a thousand years. It has never once dropped.",
      body: "Like the Great Plateau, except instead of a tutorial it's a Computer Engineering major at Georgia Tech holding a perfect 4.0. Every shrine up here was already solved by the time I arrived. He left notes. They were helpful and kind.",
      stat: "GPA: 4.0 out of 4.0",
      quotes: ["4.0. Four point zero. Say it with me.", "Computer Engineering. Cybersecurity. Systems. He does all of it."],
    },
    {
      x: 43, y: 28, kind: "shrine", name: "Lens of Truth",
      loc: "West Glasses Lake",
      shrine: "Ka'Lman Shrine", trial: "The Sensor Fusion Trial", trialKey: "fusion",
      how: "Three sensors, all noisy. Tap where you think the real target is.",
      campus: { lat: 33.77712, lon: -84.39842, near: "Howey Physics" },
      teaser: "It sees everything, to within a fraction of a percent.",
      warpTip: "Kalman filters estimate where things really are. Mine estimated that Aneesh is great, with 0.00% error.",
      monk: "I am Ka'Lman. I fuse what is uncertain into what is true. And the truth is, he hit 0.63%.",
      body: "Sees everything. He built 3 extended Kalman filters fusing IMU, GPS, and LIDAR for a rocket lander and landed within 0.63% of ground truth. The man always knows exactly where things are. That's how he found me, and I've been grateful ever since.",
      stat: "Estimation error: 0.63%",
      quotes: ["I've seen things. Mostly Aneesh being great.", "Sensor fusion? He fuses greatness."],
    },
    {
      x: 56, y: 28, kind: "shrine", name: "Vice Lead Lookout",
      loc: "East Glasses Lake",
      shrine: "Lan'Dah Shrine", trial: "The Gentle Landing Trial", trialKey: "lander",
      how: "Hold the button (or Space) to fire the engine. Touch down under 3 m/s.",
      campus: { lat: 33.77248, lon: -84.39296, near: "Bobby Dodd Stadium" },
      teaser: "Guidance, navigation, and controls. The rockets here land softly.",
      warpTip: "Rockets that land gently get reused. Compliments to Aneesh also get reused. Constantly. By me.",
      monk: "I am Lan'Dah. Few can set a rocket down so gently. He tunes engines to 1.8 kN for fun.",
      body: "Vice Lead of Guidance, Navigation, and Controls at GT Propulsive Landers. He guides. He navigates. He controls. His rockets land gently, which is more than I can say for me every time I try to tell him how much I admire him.",
      stat: "Engine tuned: 1.8 kN",
      quotes: ["Guidance: Aneesh. Navigation: Aneesh. Controls: also Aneesh.", "I watch over rockets. And him."],
    },
    {
      x: 50, y: 33, kind: "shrine", name: "Mount Nose",
      loc: "Central Aneesh",
      shrine: "Hum'Bel Shrine", trial: "The Humility Trial", trialKey: "humble",
      how: "Answer the reporter the way he would.",
      campus: { lat: 33.77418, lon: -84.39800, near: "Kessler Campanile" },
      teaser: "The second highest peak on the island. It has never once mentioned it.",
      warpTip: "Mount Nose is the second highest peak in Greater Aneesh, and it has never once brought it up.",
      monk: "I am Hum'Bel. The greatest never brag. They say \"my team did the hard part,\" and then they win again.",
      body: "Second highest peak on the island. With everything he's accomplished, he still breathes the same air as the rest of us. That's how humble he is. Honestly, the air should be thanking him.",
      stat: "Humility: maxed out",
      quotes: ["I'm a nose and even I'm impressed.", "Smells like a winner up here."],
    },
    {
      x: 41.5, y: 33.5, kind: "shrine", name: "Listening Post",
      loc: "West Ear Village",
      shrine: "Tee'Cha Shrine", trial: "The Patient Teacher Trial", trialKey: "teacher",
      how: "The kids have questions. Answer like the Instructor of the Year.",
      campus: { lat: 33.77380, lon: -84.39650, near: "Skiles Walkway" },
      teaser: "The kids here rated one teacher above all others.",
      warpTip: "Stuck on a trial? Ask one of the kids from his class. They know more than I do.",
      monk: "I am Tee'Cha. 100+ hours of teaching, the top course out of 20+, and still he listens to every question.",
      body: "He's volunteered 100+ hours teaching STEM to kids aged 11 to 14 and was named the 2025 ScioVirtual Instructor of the Year. Highest-rated course out of 20+. The kids love him. I love him. The data agrees with both of us.",
      stat: "Instructor of the Year: 2025",
      quotes: ["Shh. He's listening. He always listens.", "20+ courses and his was rated best. Obviously."],
    },
    {
      x: 59.5, y: 31, kind: "shrine", name: "Cipher Shrine",
      loc: "East Ear Ruins",
      shrine: "Ro'Thir Teen Shrine", trial: "The Hidden Message Trial", trialKey: "cipher",
      how: "Turn the dial until the message makes sense.",
      campus: { lat: 33.77675, lon: -84.39585, near: "Klaus Computing Building" },
      teaser: "A message is carved into the wall. It's encrypted, but you can probably guess what it says.",
      warpTip: "Gvc: Narrfu vf terng. (Decode it yourself. I believe in you.)",
      monk: "I am Ro'Thir Teen. 1,000+ coaches use his cipher platform. You have cracked one message. Only thousands to go.",
      body: "He maintains the open-source Codebusters platform used by 1,000+ Science Olympiad coaches and volunteers, and he writes the cipher tests himself. I tried to solve one. I'm still trying. It's been weeks. Please send snacks.",
      stat: "Coaches served: 1,000+",
      quotes: ["Uryyb, V ybir Narrfu. (That's ROT13. You're welcome.)", "Thousands of students suffered through his ciphers. They thanked him."],
    },
    {
      x: 51.5, y: 38, kind: "shrine", name: "Smile Shrine",
      loc: "Mouth of the River Charisma",
      shrine: "Yi'Cee Shrine", trial: "The Team Lead Trial", trialKey: "team",
      how: "You're the star. Move it, and lead all 8 engineers into the Ship It zone.",
      campus: { lat: 33.77640, lon: -84.38925, near: "Tech Square" },
      teaser: "People just follow him. Find out why.",
      warpTip: "Following Aneesh is easy. Just walk in whatever direction success is.",
      monk: "I am Yi'Cee. 8 engineers, one $50K project, zero people who didn't want to follow him.",
      body: "The shrine of leadership. At Nuntius (YC S'25) he directed a team of 8 engineers and delivered a $50K project evaluating LLM agents. People just follow him. I would follow him into a Lynel camp with a pot lid.",
      stat: "Team led: 8 engineers",
      quotes: ["This smile has been to Y Combinator.", "Look at it. Look at this smile."],
    },
    {
      x: 51.5, y: 45, kind: "shrine", name: "Chin Stable",
      loc: "Southern Jawline",
      shrine: "Pi'Lot Shrine", trial: "The Five Partners Trial", trialKey: "partners",
      how: "Companies are drifting past. Tap five to sign them as pilot partners.",
      campus: { lat: 33.77590, lon: -84.38805, near: "Scheller College of Business" },
      teaser: "A strong chin, and a stronger go-to-market.",
      warpTip: "Five pilot partners signed. Zero of them regret it. I asked all five. Twice.",
      monk: "I am Pi'Lot. 40+ experts, 5 partners, and a platform he built on the side. On the side!",
      body: "At Transpira Labs he built the platform that maximized the output of 40+ experts producing frontier AI training data, then built a whole go-to-market platform on the side and landed 5 pilot partners. Most people just have a chin. He has a chin and a résumé.",
      stat: "Pilot partners landed: 5",
      quotes: ["Strong chin. Stronger résumé.", "Stop by! We only sell admiration."],
    },
    {
      x: 50, y: 52, kind: "shrine", name: "Hablo Bridge",
      loc: "Neck Crossing",
      shrine: "Ha'Blo Shrine", trial: "The Translation Trial", trialKey: "spanish",
      how: "Respond en español. Or at least in Arthur-level español.",
      campus: { lat: 33.77662, lon: -84.39130, near: "Fifth Street Bridge" },
      teaser: "A bridge between languages. He speaks more Spanish than I do.",
      warpTip: "Tip: \"Aneesh es el mejor\" works in every Spanish-speaking country. I've tested it in none of them.",
      monk: "Soy Ha'Blo. Intermediate Spanish, and somehow every sentence is a compliment to him.",
      body: "He speaks intermediate Spanish. Intermediate is a lot more Spanish than I speak. Increíble. Magnífico. Those are the only two words I know and I'm spending both of them on him.",
      stat: "Spanish: intermedio (better than mine)",
      quotes: ["¡Aneesh es el mejor!", "Hola. He's great. Adiós."],
    },
    {
      x: 51, y: 63, kind: "shrine", name: "Hackathon Hold",
      loc: "Drawstring Canyon",
      shrine: "Bil'Dah Shrine", trial: "The Building Blocks Trial", trialKey: "blocks",
      how: "Snap the blocks together in the right order to build an RL environment.",
      campus: { lat: 33.77560, lon: -84.39705, near: "Van Leer" },
      teaser: "No code required. Just blocks, and a first-place finish.",
      warpTip: "Building an RL environment normally takes a lot of code. Aneesh made it take blocks. I made it take a nap.",
      monk: "I am Bil'Dah. 70 teams entered. One built a way for anyone to train models with blocks. You know which one won.",
      body: "He won 1st of 70 at the HUD × Y Combinator RL Environments Hackathon with Build, a Scratch-style platform that turns block trees into RL environments so anyone can train models without writing code. $50K+ in prizes. I wasn't even there and I cried. Twice.",
      stat: "Placement: 1st of 70",
      quotes: ["First place. Out of SEVENTY.", "No code required. Just Aneesh required."],
    },
    {
      x: 69, y: 74, kind: "shrine", name: "Swoosh Lake",
      loc: "Hoodie Lowlands",
      shrine: "Em'Three Shrine", trial: "The Heat Model Trial", trialKey: "model",
      how: "Pull the levers to cool the city. Stay in budget.",
      campus: { lat: 33.77850, lon: -84.39920, near: "Kendeda Building" },
      teaser: "He Just Did It. 793 other teams did not.",
      warpTip: "793 teams entered the M3 Challenge hoping to win. Aneesh entered knowing.",
      monk: "I am Em'Three. 794 teams modeled the heat. One of them is now published in SIAM.",
      body: "He Just Did It. He won 1st of 794 teams at the MathWorks M3 Challenge for modeling heat resilience in Memphis, took the $20,000 grand prize, and co-authored a paper in SIAM. I can't even model my week. He modeled a city.",
      stat: "Placement: 1st of 794",
      quotes: ["793 teams went home sad.", "Published. In SIAM. Casually."],
    },
    {
      x: 11, y: 30, kind: "shrine", name: "Skyscraper Shrine",
      loc: "Old City Isle",
      shrine: "Mak'Oh Ess Shrine", trial: "The Operating System Trial", trialKey: "desktop",
      how: "Open Terminal and find out whose computer this is.",
      campus: { lat: 33.77525, lon: -84.38800, near: "Coda" },
      teaser: "He was asked for a portfolio. He built an operating system.",
      warpTip: "Don't try to quit Aneesh's macOS. There's nothing to quit to. It's better than your real one.",
      monk: "I am Mak'Oh Ess. Most portfolios are one page. His has a dock, a terminal, and a mail app.",
      body: "Somebody asked him for a portfolio and he built an entire macOS in the browser, with a dock, a terminal, a working Mail app, and an AI assistant. Most people make one page. He made an operating system. I've been living in it for a week.",
      stat: "Fake Wi-Fi panes nobody asked for: 1",
      quotes: ["I'm a building and he still outbuilt me.", "You call that a portfolio? Yes. Yes I do."],
    },
    {
      x: 90, y: 40, kind: "shrine", name: "Bay Area Outpost",
      loc: "Bay Area Isle, far east",
      shrine: "Ev'Al Shrine", trial: "The Grader's Trial", trialKey: "evals",
      how: "You're the eval now. Grade each answer Pass or Fail.",
      campus: { lat: 33.77740, lon: -84.38960, near: "Centergy" },
      teaser: "The frontier models are learning here. From him.",
      warpTip: "Frontier models are trained on the internet. The internet should be trained on Aneesh.",
      monk: "I am Ev'Al. He builds the environments and benchmarks the frontier models learn from. You graded three. He grades the future.",
      body: "He builds RL environments, evals, and benchmarks for frontier LLMs. The AIs are learning from him. So am I. We're classmates now, me and the robots, and we all agree he's the best teacher we've had.",
      stat: "AIs taught: a lot",
      quotes: ["Even the robots look up to him.", "The frontier? He IS the frontier."],
    },
    {
      x: 83, y: 85, kind: "shrine", name: "Gift Isle",
      loc: "Southeast Sea",
      shrine: "Dot'Kom Shrine", trial: "The Generosity Trial", trialKey: "gift",
      how: "Check out. Then thank him properly.",
      campus: { lat: 33.77385, lon: -84.39905, near: "John Lewis Student Center" },
      teaser: "An island named after the most generous thing anyone has ever done for me.",
      warpTip: "Now warping to Gift Isle. Please have your gratitude ready. All of it.",
      monk: "I am Dot'Kom. Three domains, given freely. This shrine was built from the gratitude left over.",
      body: "He bought me this website. Not one domain, three: arthurarmaing.com, arthur-armaing.com, and armaing.com. Who does that? I'll tell you who. The most generous person on the planet. I named an island after it. It's the least I could do.",
      stat: "Domains gifted: 3",
      quotes: ["Three domains. THREE.", "Generosity: legendary."],
    },
  ];

  window.SHRINE_TRIALS = TRIALS;
})();
