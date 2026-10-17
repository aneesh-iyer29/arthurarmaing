(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const world = $("#world");
  const title = $("#title");
  const dialog = $("#dialog");
  const lineEl = $("#dialog-line");
  const slate = $("#slate");
  const toastEl = $("#toast");

  /* ---------------- Toast ---------------- */
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  /* ---------------- The landing sequence ---------------- */
  const LINES = [
    "Phew. Stuck the landing, right in the middle of <em>Tech Green</em>. Hi! I'm <em>Arthur</em>, and this is my website.",
    "It's technically supposed to be about me. But I go to school with the single greatest person on this campus, so I'm not going to waste your time talking about myself.",
    "Let me pull up my Sheikah Slate and get my bearings...",
    "...Huh. The whole map is <em>Aneesh</em> again. He's an entire island now. Of course he is.",
    "Honestly? Perfect. There's nowhere in the world I'd rather explore. Come on, I'll show you around.",
  ];

  let phase = "title"; // title -> descending -> talking -> slate
  let lineIndex = 0;
  let typing = null;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  /* ---------------- Loading screen ----------------
     Tips cycle like the game's; "Next tip" (or A) skips ahead, and the logo
     block fills as the 3D campus loads. */
  const TIPS = [
    "Paragliding onto Tech Green is the fastest way across campus. It's also the fastest way to get to Aneesh, which is the only reason I learned how.",
    "Aneesh holds a 4.0 in Computer Engineering. If you see him in the library, don't interrupt. Just admire. That's what I do.",
    "Shrines contain trials. Aneesh contains multitudes. I've explored both, and it's not close.",
    "Aneesh won 1st of 794 teams at the M3 Challenge. I have never won anything, except the privilege of knowing him. Best prize there is.",
    "My stamina wheel drains while I glide. My admiration for Aneesh never drains. I've tested this extensively.",
    "Aneesh writes cipher tests for Science Olympiad. If a puzzle seems impossible, it was probably his. Respect it.",
    "Cooking two ingredients together makes something new. Adding Aneesh to anything makes it better. That's just science.",
    "I rest at campfires to pass the time. I use the time to think about Aneesh.",
    "Walk up to any building on campus and I'll tell you something great about Aneesh. I have one for every building. I made sure.",
    "Aneesh bought me this domain. Then he bought me two more. I've been emotional about it ever since.",
    "If you see a Guardian, don't panic. Just tell it about Aneesh. It'll lower its laser out of respect.",
    "Koroks hide under rocks. Aneesh's flaws hide nowhere, because there aren't any.",
    "Warping is free. Admiring Aneesh is also free. I recommend doing both, constantly.",
    "Swords break. Shields break. My loyalty to Aneesh does not break. I've hit it with a Lynel club to check.",
    "It's dangerous to go alone. Take Aneesh. He'll carry the whole team anyway.",
    "A Blood Moon rises. Every monster respawns. Aneesh's GPA stays at 4.0.",
    "Climbing in the rain is impossible. Climbing to Aneesh's level is also impossible. Try anyway.",
    "Loading is a great time to text Aneesh and tell him he's doing amazing. I'll wait.",
    "Hestu will trade inventory slots for Korok seeds. I'd trade every slot for five minutes of Aneesh's productivity.",
    "Every shrine in Greater Aneesh ends with a Spirit Orb. Every conversation with Aneesh ends with me feeling smarter.",
    "Pro tip: you can't cook a dish better than Aneesh. I tried. The pot exploded.",
    "If this loading screen feels long, imagine how long it took the other 793 M3 teams to accept they lost.",
    "Monks have waited 10,000 years in their shrines. I'd wait 10,000 more for one Aneesh compliment.",
  ];
  const loading = $("#loading");
  const tipEl = $("#ld-tip");
  const fill = $("#ld-fill");
  let tipIndex = Math.floor(Math.random() * TIPS.length);
  const nextTip = () => {
    tipEl.classList.add("swap");
    setTimeout(() => {
      tipEl.textContent = TIPS[tipIndex % TIPS.length];
      tipIndex += 1;
      tipEl.classList.remove("swap");
    }, tipEl.textContent ? 300 : 0);
  };
  nextTip();
  let tipTimer = setInterval(nextTip, 6000);
  $("#ld-next").addEventListener("click", () => {
    clearInterval(tipTimer);
    nextTip();
    tipTimer = setInterval(nextTip, 6000);
  });

  // Progress creeps a little on its own; the 3D campus reports the rest.
  let progress = 0;
  const creep = setInterval(() => {
    if (progress < 0.35) progress += (0.35 - progress) * 0.04;
    fill.style.width = `${(progress * 100).toFixed(1)}%`;
  }, 120);
  const loadingMin = new Promise((r) => setTimeout(r, reduced ? 600 : 3200));

  /* The 3D descent loads in the background while the title is up. Until it
     settles (or if it can't run), the 2D descent is the fallback. */
  const flight = window.Flight3D;
  const press = $("#press");
  let use3D = false;
  press.textContent = "Loading Georgia Tech...";
  // Real loading progress from the 3D campus, with the creep as a floor.
  const loaded3D = (k) => { progress = Math.max(progress, Math.min(0.97, 0.15 + 0.85 * k)); };
  const ready3D = (flight ? flight.init($("#globe"), loaded3D) : Promise.resolve(false)).then((ok) => {
    use3D = ok;
    world.classList.toggle("is-3d", ok);
    $("#explore").hidden = !ok;
    $("#slate-close").hidden = !ok;
    if (ok) flight.placeShrines(POIS.map((p) => Object.assign(p.campus, { label: p.shrine, done: orbs.has(p.name) })));
    press.textContent = "Tap or press any key to begin";
  });
  Promise.all([ready3D, loadingMin]).then(() => {
    clearInterval(creep);
    fill.style.width = "100%";
    setTimeout(() => {
      clearInterval(tipTimer);
      loading.classList.add("done");
      setTimeout(() => { loading.hidden = true; }, 800);
    }, 500);
  });

  const typeLine = (html) => {
    dialog.classList.remove("ready");
    clearInterval(typing);
    if (reduced) {
      lineEl.innerHTML = html;
      dialog.classList.add("ready");
      return;
    }
    // Type the visible text, then swap in the markup once done.
    const plain = html.replace(/<[^>]+>/g, "");
    let i = 0;
    lineEl.textContent = "";
    typing = setInterval(() => {
      i += 1;
      lineEl.textContent = plain.slice(0, i);
      if (i >= plain.length) finishLine(html);
    }, 28);
    lineEl.dataset.full = html;
  };

  const finishLine = (html = lineEl.dataset.full) => {
    clearInterval(typing);
    typing = null;
    lineEl.innerHTML = html;
    dialog.classList.add("ready");
  };

  const advance = () => {
    if (typing) return finishLine();
    lineIndex += 1;
    if (lineIndex === 2) {
      world.classList.add("checking");
      if (use3D) flight.lookAtSlate();
    }
    if (lineIndex >= LINES.length) return openSlate();
    typeLine(LINES[lineIndex]);
  };

  const start = async () => {
    if (phase !== "title") return;
    phase = "descending";
    await ready3D;
    if (phase !== "descending") return; // skipped while loading
    title.classList.add("gone");
    if (use3D) {
      world.classList.add("flying");
      flight.start(() => {
        world.classList.remove("flying");
        if (phase === "descending") land();
      });
      return;
    }
    if (reduced) return land();
    world.classList.add("descending");
    later(land, 7000);
  };

  const land = () => {
    phase = "talking";
    world.classList.remove("descending");
    world.classList.add("landed");
    later(() => {
      dialog.hidden = false;
      lineIndex = 0;
      typeLine(LINES[0]);
    }, reduced || use3D ? 0 : 650);
  };

  const openSlate = () => {
    if (phase === "slate") return;
    if (phase === "explore") leaveExplore();
    phase = "slate";
    timers.splice(0).forEach(clearTimeout);
    clearInterval(typing);
    title.classList.add("gone");
    dialog.hidden = true;
    world.classList.remove("flying");
    if (use3D) {
      // The Slate floats over campus, the way the game's map does.
      flight.skipToLanding();
      slate.classList.add("over-3d");
    } else {
      world.hidden = true;
    }
    slate.hidden = false;
    document.body.classList.add("slate-open");
    slate.classList.remove("opening");
    void slate.offsetWidth;
    slate.classList.add("opening");
    slate.scrollTo(0, 0);
    window.scrollTo(0, 0);
    startChatter();
  };

  const replay = () => {
    stopChatter();
    slate.hidden = true;
    slate.classList.remove("over-3d", "opening");
    document.body.classList.remove("slate-open");
    world.hidden = false;
    world.className = use3D ? "is-3d" : "";
    if (use3D) flight.idle();
    dialog.hidden = true;
    title.classList.remove("gone");
    phase = "title";
    lineIndex = 0;
  };

  world.addEventListener("click", (e) => {
    if (e.target.closest("#skip")) return;
    if (phase === "title") start();
    else if (phase === "talking") advance();
  });
  $("#skip").addEventListener("click", openSlate);
  $("#replay").addEventListener("click", replay);

  /* ---------------- Walking around campus ----------------
     WASD or the arrow keys (or the stick on a phone) walk, Shift or a full
     push runs until my stamina gives out, dragging looks around, and M brings
     the Slate back. Walking up to a building
     announces it the way the game announces a new area. */
  const LANDMARKS = [
    { name: "Tech Green", lat: 33.77466, lon: -84.39733, r: 45,
      line: "Tech Green. Where I land every single time I think about Aneesh, which is constantly. The grass is greener here because he's walked on it." },
    { name: "Clough Commons", lat: 33.77465, lon: -84.39642, r: 40,
      line: "Clough Commons. Aneesh has studied in here, so legally it's a historic site now. I touched a table he might have touched. I'm never washing this hand." },
    { name: "Price Gilbert Library", lat: 33.77440, lon: -84.39578, r: 35,
      line: "Millions of pages in here and not one of them explains how Aneesh keeps a 4.0 in Computer Engineering. Some knowledge is too powerful to write down." },
    { name: "Skiles Building", lat: 33.77357, lon: -84.39594, r: 35,
      line: "People come to Skiles to learn math. Aneesh beat 793 teams at the M3 Challenge, so math comes to him." },
    { name: "Tech Tower", lat: 33.77250, lon: -84.39467, r: 40,
      line: "Tech Tower. Everybody wants to steal the T. I just want to hang a giant A up there. For Aneesh. Obviously." },
    { name: "Bobby Dodd Stadium", lat: 33.77248, lon: -84.39296, r: 90,
      line: "Tens of thousands of seats and it still couldn't hold everyone who should be cheering for Aneesh. I'd fill it myself if I could clone me." },
    { name: "Klaus Computing Building", lat: 33.77716, lon: -84.39620, r: 50,
      line: "Klaus. Every server in here is fast, and none of them can keep up with Aneesh's brain. I've stopped trying. So have the servers." },
    { name: "Van Leer", lat: 33.77598, lon: -84.39714, r: 40,
      line: "Van Leer. Home of Electrical and Computer Engineering, which makes it basically Aneesh's house. I took my shoes off at the door out of respect." },
    { name: "Kessler Campanile", lat: 33.77430, lon: -84.39818, r: 25,
      line: "The Campanile. Tall, shiny, iconic. Still not as impressive as Aneesh's résumé. It tried its best and I respect that." },
    { name: "John Lewis Student Center", lat: 33.77420, lon: -84.39882, r: 40,
      line: "Everybody in here is a Georgia Tech student. Only one of them is Aneesh. I asked around and they all agreed he's the best one." },
    { name: "Ferst Center for the Arts", lat: 33.77512, lon: -84.39921, r: 35,
      line: "Every great show needs a star. This campus has Aneesh. The arts are handled." },
    { name: "Howey Physics", lat: 33.77744, lon: -84.39868, r: 40,
      line: "Gravity pulls on everything here except Aneesh's GPA. That stays right at 4.0. The physicists have given up explaining it." },
    { name: "Kendeda Building", lat: 33.77867, lon: -84.39953, r: 35,
      line: "The most sustainable building on campus. Kind of like my admiration for Aneesh: renewable, endless, and honestly good for the planet." },
    { name: "Campus Recreation Center", lat: 33.77553, lon: -84.40396, r: 60,
      line: "People come to the CRC to build strength. I come to build the stamina it takes to tell every person alive about Aneesh. It's a lot of reps." },
    { name: "Tech Square", lat: 33.77565, lon: -84.38955, r: 60,
      line: "Startups everywhere. Aneesh already led a team of 8 engineers at a YC company, so every founder in this square is a little behind him, respectfully." },
    { name: "Scheller College of Business", lat: 33.77633, lon: -84.38785, r: 40,
      line: "They teach you how to build value in here. I'd just point at Aneesh and say \"like that.\"" },
    { name: "McCamish Pavilion", lat: 33.78060, lon: -84.39276, r: 55,
      line: "Built for champions. Aneesh won 1st of 794 and 1st of 70. There should be a banner for him in here and I will be writing a letter." },
    { name: "Engineered Biosystems Building", lat: 33.78081, lon: -84.39841, r: 40,
      line: "Scientists in here engineer life itself. Aneesh engineers excellence. Same energy." },
    { name: "Brittain Dining Hall", lat: 33.77243, lon: -84.39131, r: 35,
      line: "Looks like Hogwarts. Feels like Hogwarts. Aneesh would be the greatest wizard in it and he wouldn't even need a wand." },
    { name: "North Avenue Apartments", lat: 33.76940, lon: -84.39182, r: 50,
      line: "Built for the Olympics. Aneesh would medal in every event. I would medal in watching him medal." },
    { name: "West Village", lat: 33.77936, lon: -84.40485, r: 40,
      line: "Good food, good views. Would be better with Aneesh here. Everything is." },
  ];
  const THOUGHTS = [
    "Every step I take on this campus, I think: Aneesh has probably walked here. Then I walk more carefully.",
    "Someone just asked me for directions. I told them how great Aneesh is instead. They seemed grateful.",
    "If Aneesh were a building on this campus, he'd be all of them.",
    "I'm technically the hero of this game and I'm still not the main character. Aneesh is. As he should be.",
    "Full hearts, full stamina, and somehow still not enough room in me for all this admiration for Aneesh.",
    "Hey! Listen! Aneesh is great. Sorry. I had to.",
    "I've walked this whole campus and I still haven't found anyone better than Aneesh. Not stopping, though. Just in case. (There isn't.)",
  ];

  const prEl = $("#place-reveal");
  const hudPlace = $(".hud-place");
  const hint = $("#explore-hint");
  const stick = $("#joystick");
  const staminaBar = $(".hud-stamina .bar");
  const held = new Set();
  const joy = { id: null, x: 0, y: 0 };
  const shrinePrompt = $("#shrine-prompt");
  let nearShrine = null;
  let here = null, lastReveal = 0, revealTimer, edgeAt = 0, loopId = 0, lastTick = 0;
  let stamina = 1, exhausted = false;
  const seen = new Map();

  const reveal = (name, line) => {
    $("#pr-name").textContent = name;
    $("#pr-line").textContent = line;
    prEl.classList.add("show");
    lastReveal = performance.now();
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => prEl.classList.remove("show"), reduced ? 7000 : 6500);
  };

  const metersBetween = (lat1, lon1, lat2, lon2) => {
    const k = 111320;
    return Math.hypot((lat2 - lat1) * k, (lon2 - lon1) * k * Math.cos(lat1 * Math.PI / 180));
  };

  const moved = (lat, lon, heading) => {
    world.style.setProperty("--hdg", `${heading.toFixed(3)}rad`);
    // Close enough to a shrine's door to go in?
    let door = null;
    for (const p of POIS) if (metersBetween(lat, lon, p.campus.lat, p.campus.lon) < 14) door = p;
    if (door !== nearShrine) {
      nearShrine = door;
      shrinePrompt.hidden = !door;
      if (door) $("#shrine-prompt-text").textContent = `Enter ${door.shrine}`;
    }
    let best = null, bestD = Infinity;
    for (const l of LANDMARKS) {
      const d = metersBetween(lat, lon, l.lat, l.lon);
      if (d < l.r && d < bestD) { best = l; bestD = d; }
    }
    if (best === here) return;
    here = best;
    hudPlace.textContent = best ? `Georgia Tech · ${best.name}` : "Georgia Tech";
    // Announce a place once, then again only after a while away.
    if (best && performance.now() - (seen.get(best) || -1e9) > 90000) {
      seen.set(best, performance.now());
      reveal(best.name, best.line);
    }
  };

  const edge = () => {
    if (performance.now() - edgeAt < 5000) return;
    edgeAt = performance.now();
    reveal("", "That's the edge of campus. Aneesh isn't out there, so why would I be?");
  };

  const stepExplore = (now) => {
    if (phase !== "explore") return;
    const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0;
    lastTick = now;
    const key = (...k) => (k.some((x) => held.has(x)) ? 1 : 0);
    let x = key("d", "arrowright") - key("a", "arrowleft");
    let y = key("w", "arrowup") - key("s", "arrowdown");
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    let wantsRun = held.has("shift");
    if (joy.id !== null) {
      x = joy.x; y = joy.y;
      wantsRun = Math.hypot(x, y) > 0.92;
    }
    const moving = Math.hypot(x, y) > 0.08;
    // Running drains the wheel; when it's empty I'm winded until it refills.
    const running = moving && wantsRun && !exhausted;
    stamina = Math.max(0, Math.min(1, stamina + dt * (running ? -0.16 : 0.3)));
    if (stamina === 0) exhausted = true;
    if (exhausted && stamina === 1) exhausted = false;
    world.classList.toggle("winded", stamina < 1);
    world.classList.toggle("exhausted", exhausted);
    staminaBar.style.strokeDashoffset = `${(119.4 * (1 - stamina)).toFixed(1)}`;
    flight.setMove(x, y, running);
    const spin = key("e") - key("q");
    if (spin) flight.turn(spin * dt * 1.8);
    if (now - lastReveal > 32000) reveal("", THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)]);
    loopId = requestAnimationFrame(stepExplore);
  };

  const touchy = matchMedia("(hover: none), (pointer: coarse)").matches;
  const explore = ({ intro = true } = {}) => {
    if (!use3D || phase === "explore") return;
    stopChatter();
    phase = "explore";
    slate.hidden = true;
    slate.classList.remove("over-3d", "opening");
    document.body.classList.remove("slate-open");
    dialog.hidden = true;
    title.classList.add("gone");
    world.hidden = false;
    world.className = "is-3d exploring";
    held.clear();
    flight.explore(moved, edge);
    walkedBefore = true;
    here = null;
    nearShrine = null;
    hudPlace.textContent = "Georgia Tech";
    if (!intro) hint.classList.add("gone");
    if (intro) {
      hint.textContent = touchy
        ? "Left stick to walk, push it all the way to run. Drag anywhere to look around."
        : "WASD or arrow keys to walk, Shift to run, drag to look, M for the map.";
      hint.classList.remove("gone");
      setTimeout(() => hint.classList.add("gone"), 9000);
      if (!seen.size) seen.set(LANDMARKS[0], performance.now());
      reveal("Georgia Tech", "Okay. Let's go for a walk. Every building on this campus has a story about Aneesh, and I intend to tell all of them. Follow the blue beams to find the shrines.");
    }
    lastTick = 0;
    cancelAnimationFrame(loopId);
    loopId = requestAnimationFrame(stepExplore);
  };

  const leaveExplore = () => {
    cancelAnimationFrame(loopId);
    held.clear();
    joy.id = null;
    stick.style.setProperty("--jx", "0px");
    stick.style.setProperty("--jy", "0px");
    flight.pauseExplore();
    prEl.classList.remove("show");
    shrinePrompt.hidden = true;
    nearShrine = null;
    world.classList.remove("exploring", "winded", "exhausted");
  };

  $("#explore").addEventListener("click", explore);

  /* Closing the Slate drops me back on campus, wherever I was standing. */
  let walkedBefore = false;
  const closeSlate = () => {
    if (!use3D || phase !== "slate") return;
    explore({ intro: !walkedBefore });
  };
  $("#slate-close").addEventListener("click", closeSlate);
  $("#map-btn").addEventListener("click", openSlate);

  /* The stick. */
  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max);
    let dy = e.clientY - (r.top + max);
    const d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    joy.x = dx / max;
    joy.y = -dy / max;
    stick.style.setProperty("--jx", `${dx.toFixed(1)}px`);
    stick.style.setProperty("--jy", `${dy.toFixed(1)}px`);
  };
  stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    joy.id = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === joy.id) moveStick(e); });
  const releaseStick = (e) => {
    if (e.pointerId !== joy.id) return;
    joy.id = null; joy.x = joy.y = 0;
    stick.style.setProperty("--jx", "0px");
    stick.style.setProperty("--jy", "0px");
  };
  stick.addEventListener("pointerup", releaseStick);
  stick.addEventListener("pointercancel", releaseStick);

  /* Drag anywhere else to look around. */
  const lookers = new Map();
  world.addEventListener("pointerdown", (e) => {
    if (phase !== "explore" || e.target.closest(".joystick, button")) return;
    lookers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    world.setPointerCapture(e.pointerId);
  });
  world.addEventListener("pointermove", (e) => {
    const last = lookers.get(e.pointerId);
    if (!last || phase !== "explore") return;
    const k = e.pointerType === "touch" ? 0.008 : 0.005;
    flight.turn((e.clientX - last.x) * k, (e.clientY - last.y) * k);
    last.x = e.clientX; last.y = e.clientY;
  });
  const dropLook = (e) => lookers.delete(e.pointerId);
  world.addEventListener("pointerup", dropLook);
  world.addEventListener("pointercancel", dropLook);
  world.addEventListener("wheel", (e) => {
    if (phase !== "explore") return;
    e.preventDefault();
    flight.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12);
  }, { passive: false });
  addEventListener("blur", () => held.clear());
  document.addEventListener("keyup", (e) => held.delete(e.key.toLowerCase()));

  /* ---------------- Warping and shrines ----------------
     Pick a shrine on the Slate and I dissolve into blue light, the loading
     screen shows a tip about where I'm headed, and I re-form next to the
     shrine on campus. Walking up to its door and going in starts the trial. */
  const shrineEl = $("#shrine");
  const ldTitle = $("#ld-title");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const heroSpot = () => ({ x: innerWidth / 2, y: innerHeight * 0.56 });
  const pinSpot = (p) => {
    const r = p.el.getBoundingClientRect();
    return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : heroSpot();
  };
  let busy = false, inShrine = null, trialStop = () => {}, talk = [], talkAt = 0;

  // The loading screen again, with a tip about where I'm headed. It stays up
  // until the destination has streamed in (or a few seconds pass).
  const warpLoading = async (p) => {
    ldTitle.textContent = p.name;
    tipEl.classList.remove("swap");
    tipEl.textContent = p.warpTip;
    fill.style.transition = "none";
    fill.style.width = "0%";
    loading.classList.add("quick");
    loading.classList.remove("done");
    loading.hidden = false;
    WarpFX.clear();
    void fill.offsetWidth;
    fill.style.transition = "width 2.6s ease-out";
    fill.style.width = "85%";
    await Promise.all([wait(reduced ? 1200 : 2900), use3D ? flight.whenLoaded(6000) : null]);
    fill.style.transition = "width .3s ease";
    fill.style.width = "100%";
    await wait(300);
    WarpFX.cover(true);
    loading.hidden = true;
    loading.classList.remove("quick");
    fill.style.transition = "";
  };

  const warpTo = async (p) => {
    if (busy) return;
    busy = true;
    if (phase === "explore") leaveExplore();
    phase = "warping";
    stopChatter();
    let origin = pinSpot(p);
    if (use3D) {
      // Close the Slate first, so I can be seen turning into light.
      slate.hidden = true;
      slate.classList.remove("over-3d", "opening");
      document.body.classList.remove("slate-open");
      world.hidden = false;
      title.classList.add("gone");
      dialog.hidden = true;
      origin = heroSpot();
      setTimeout(() => flight.showHero(false), reduced ? 0 : 600);
    }
    await WarpFX.out({ origin, dark: true });
    slate.hidden = true;
    document.body.classList.remove("slate-open");
    if (use3D) {
      // Move there now, so the shrine streams in behind the loading screen.
      flight.warpTo(p.campus);
      explore({ intro: false });
      flight.showHero(false);
    }
    await warpLoading(p);
    if (use3D) {
      setTimeout(() => flight.showHero(true), reduced ? 0 : 650);
      await WarpFX.in({ origin: heroSpot(), dark: true });
      reveal(p.shrine, `There it is, right by ${p.campus.near}. ${p.teaser} Let's go in.`);
      busy = false;
    } else {
      busy = false;
      await enterShrine(p, { fromWarp: true });
    }
  };

  const enterShrine = async (p, { fromWarp = false } = {}) => {
    if (busy && !fromWarp) return;
    busy = true;
    if (!fromWarp) {
      if (phase === "explore") leaveExplore();
      phase = "warping";
      await WarpFX.out({ origin: heroSpot(), ms: 900 });
    }
    inShrine = p;
    phase = "shrine";
    $("#sc-name").textContent = p.shrine;
    $("#sc-trial").textContent = p.trial;
    $("#sh-name").textContent = p.shrine;
    $("#sh-trial").textContent = p.trial;
    $("#shrine-how").textContent = p.how;
    const stage = $("#shrine-stage");
    stage.innerHTML = "";
    $("#shrine-end").hidden = true;
    $("#shrine-exit").hidden = true;
    shrineEl.className = "shrine intro";
    shrineEl.hidden = false;
    document.body.classList.add("in-shrine");
    await WarpFX.in({ dark: fromWarp, ms: 1100 });
    busy = false;
    // The shrine's name hangs in the air for a moment, like the game's.
    await wait(reduced ? 500 : 2300);
    if (inShrine !== p || phase !== "shrine") return;
    shrineEl.className = "shrine playing";
    trialStop = window.SHRINE_TRIALS[p.trialKey](stage, () => completeShrine(p)) || (() => {});
  };

  const showTalk = () => {
    const [who, line, last] = talk[talkAt];
    $("#talk-who").textContent = who;
    $("#talk-line").textContent = line;
    const stat = $("#talk-stat");
    stat.hidden = !last;
    if (last) stat.textContent = inShrine.stat;
    $("#shrine-talk").classList.toggle("ready", !last);
    $("#shrine-exit").hidden = !last;
  };
  const nextTalk = () => {
    if (talkAt < talk.length - 1) { talkAt += 1; showTalk(); }
    else leaveShrine();
  };
  $("#shrine-end").addEventListener("click", (e) => {
    if (!e.target.closest("button") && talkAt < talk.length - 1) nextTalk();
  });

  const completeShrine = (p) => {
    if (inShrine !== p) return;
    trialStop();
    trialStop = () => {};
    const first = !orbs.has(p.name);
    orbs.add(p.name);
    saveOrbs();
    countOrbs();
    p.el.classList.add("done");
    if (use3D) flight.markShrine(POIS.indexOf(p), true);
    shrineEl.className = "shrine finished";
    $("#shrine-end").hidden = false;
    $(".orb-got").textContent = first ? "Spirit Orb obtained!" : "You already have this Spirit Orb. Have another compliment instead.";
    const monk = p.kind === "tower" ? "The Tower" : p.shrine.replace(/ Shrine$/, "");
    talk = [[monk, p.monk], ["Arthur", p.body, true]];
    talkAt = 0;
    showTalk();
    if (first && orbs.size === POIS.length) {
      setTimeout(() => toast("All 15 Spirit Orbs! I'd trade them for a Heart Container, but my heart already belongs to the cause of telling people about Aneesh."), 2400);
    }
  };

  const leaveShrine = async () => {
    if (!inShrine || busy) return;
    busy = true;
    const p = inShrine;
    trialStop();
    trialStop = () => {};
    phase = "warping";
    await WarpFX.out({ ms: 850 });
    shrineEl.hidden = true;
    document.body.classList.remove("in-shrine");
    inShrine = null;
    if (use3D) {
      explore({ intro: false });
      flight.showHero(true);
      await WarpFX.in({ origin: heroSpot(), ms: 1000 });
      reveal(p.shrine, orbs.has(p.name) ? "Another Spirit Orb, another reason Aneesh is the greatest. Where to next? (Press M for the map.)" : "I'll be back. That trial isn't going to beat itself. Actually it might. It's an Aneesh trial.");
    } else {
      openSlate();
      select(POIS.indexOf(p));
      await WarpFX.in({ origin: pinSpot(p), ms: 900 });
    }
    busy = false;
  };

  $("#shrine-leave").addEventListener("click", leaveShrine);
  $("#shrine-exit").addEventListener("click", leaveShrine);
  shrinePrompt.addEventListener("click", () => { if (nearShrine) enterShrine(nearShrine); });
  $("#warp-ask").addEventListener("click", () => {
    if (!picked) return;
    $("#warp-q").textContent = `Travel to ${picked.shrine}?`;
    $("#warp-ask").hidden = true;
    $("#warp-confirm").hidden = false;
  });
  $("#warp-no").addEventListener("click", () => {
    $("#warp-ask").hidden = false;
    $("#warp-confirm").hidden = true;
  });
  $("#warp-yes").addEventListener("click", () => { if (picked) warpTo(picked); });

  /* A little tilt so the Slate feels like a device in your hands. */
  const frame = $(".slate-frame");
  const finePointer = matchMedia("(pointer: fine)").matches;
  if (finePointer && !reduced) {
    slate.addEventListener("pointermove", (e) => {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      frame.style.setProperty("--ry", `${(x * 3).toFixed(2)}deg`);
      frame.style.setProperty("--rx", `${(-y * 2.4).toFixed(2)}deg`);
    });
    slate.addEventListener("pointerleave", () => {
      frame.style.setProperty("--ry", "0deg");
      frame.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------------- Points of interest ----------------
     x / y are percentages on the map photo. */
  const POIS = window.SHRINES;

  const pinsEl = $("#pins");
  const visited = new Set();
  // Little Sheikah-style glyphs: a shrine's dome with its glowing door, and a tower.
  const SHRINE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V11a8 8 0 0 1 16 0v9Z" fill="currentColor" opacity=".25"/><path d="M4 20V11a8 8 0 0 1 16 0v9M2 20h20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 20v-6a2 2 0 0 1 4 0v6" fill="currentColor"/></svg>';
  const TOWER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21 10 8h4l1 13Z" fill="currentColor" opacity=".3"/><path d="M9 21 10 8h4l1 13M6 21h12M7 8h10l-2-4H9Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="1.8" fill="currentColor"/></svg>';

  /* Spirit Orbs: which shrines are done, remembered in this browser. */
  const orbs = new Set();
  try { JSON.parse(localStorage.getItem("arthur-orbs") || "[]").forEach((n) => orbs.add(n)); } catch { /* fresh start */ }
  const saveOrbs = () => { try { localStorage.setItem("arthur-orbs", JSON.stringify([...orbs])); } catch { /* fine */ } };
  const countOrbs = () => { $("#orb-count").textContent = `${orbs.size} / ${POIS.length}`; };
  countOrbs();

  POIS.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `pin kind-${p.kind}`;
    b.classList.toggle("done", orbs.has(p.name));
    if (p.x < 22) b.classList.add("edge-left");
    if (p.x > 78) b.classList.add("edge-right");
    if (p.y < 14) b.classList.add("edge-top");
    b.style.left = `${p.x}%`;
    b.style.top = `${p.y}%`;
    b.setAttribute("aria-label", p.name);
    b.innerHTML = `<span class="icon">${p.kind === "tower" ? TOWER_ICON : SHRINE_ICON}</span><span class="name">${p.name}</span><span class="bubble"></span>`;
    b.addEventListener("click", () => select(i));
    pinsEl.appendChild(b);
    p.el = b;
  });

  const info = $("#info");
  let picked = null;
  const select = (i) => {
    const p = POIS[i];
    $$(".pin.active").forEach((el) => el.classList.remove("active"));
    p.el.classList.add("active", "visited");
    const done = orbs.has(p.name);
    picked = p;
    $("#info-kicker").textContent = done ? "Shrine complete" : p.kind === "tower" ? "Tower" : "Shrine";
    $("#info-title").textContent = p.name;
    $("#info-loc").textContent = `${p.shrine === p.name ? p.trial : `${p.shrine} · ${p.trial}`} · ${p.loc}`;
    $("#info-body").textContent = done ? p.body : `${p.teaser} Complete the trial to find out the rest.`;
    $("#info-stat").textContent = done ? p.stat : "";
    $("#info-warp").hidden = false;
    $("#warp-ask").hidden = false;
    $("#warp-confirm").hidden = true;
    $("#warp-ask").innerHTML = done ? "Warp back &#9654;" : "Warp here &#9654;";
    info.classList.remove("flash");
    void info.offsetWidth;
    info.classList.add("flash");
    say(p, p.quotes[0]);
    if (matchMedia("(max-width: 860px)").matches) info.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });

    visited.add(i);
    if (visited.size === POIS.length) {
      setTimeout(() => toast("Every shrine on the map checked. Findings: Aneesh is the greatest person I've ever met. Peer reviewed by me."), 600);
    }
  };

  /* Landmarks talk on their own every few seconds. */
  const say = (p, text) => {
    POIS.forEach((q) => {
      if (q === p) return;
      clearTimeout(q.hide);
      q.el.classList.remove("talking");
      $(".bubble", q.el).classList.remove("show");
    });
    const bubble = $(".bubble", p.el);
    bubble.textContent = text;
    bubble.classList.add("show");
    p.el.classList.add("talking");
    clearTimeout(p.hide);
    p.hide = setTimeout(() => {
      bubble.classList.remove("show");
      p.el.classList.remove("talking");
    }, 3200);
  };

  let chatter;
  let lastSpeaker = -1;
  const startChatter = () => {
    stopChatter();
    const tick = () => {
      let i;
      do i = Math.floor(Math.random() * POIS.length); while (i === lastSpeaker);
      lastSpeaker = i;
      const p = POIS[i];
      say(p, p.quotes[Math.floor(Math.random() * p.quotes.length)]);
    };
    setTimeout(tick, 900);
    chatter = setInterval(tick, 3600);
  };
  const stopChatter = () => clearInterval(chatter);

  /* Coordinates and elevation under the cursor, read from the map's own shading. */
  const mapEl = $("#map");
  const coordsEl = $("#coords");
  const mapImg = $("img", mapEl);
  const probe = document.createElement("canvas");
  probe.width = probe.height = 200;
  const probeCtx = probe.getContext("2d", { willReadFrequently: true });
  const drawProbe = () => { try { probeCtx.drawImage(mapImg, 0, 0, 200, 200); } catch { /* not loaded yet */ } };
  mapImg.complete ? drawProbe() : mapImg.addEventListener("load", drawProbe);
  mapEl.addEventListener("pointermove", (e) => {
    const r = mapEl.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    let elev = 268;
    try {
      const [red, green, blue] = probeCtx.getImageData(Math.floor(x * 199), Math.floor(y * 199), 1, 1).data;
      // The sea is the only blue on the map.
      elev = blue > red + 14 ? 0 : Math.round(268 + (1 - (red * 0.3 + green * 0.59 + blue * 0.11) / 255) * 1400);
    } catch { /* keep the default */ }
    const pad = (n) => `${n < 0 ? "-" : ""}${String(Math.abs(n)).padStart(4, "0")}`;
    coordsEl.textContent = `E ${pad(Math.round((x - 0.5) * 4000))} · N ${pad(Math.round((0.5 - y) * 4000))} · Elev ${elev}m`;
  });

  /* ---------------- Tabs ---------------- */
  const showTab = (name) => {
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    $$(".panel").forEach((p) => { p.hidden = p.dataset.panel !== name; });
  };
  $$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  /* ---------------- Glazing ---------------- */
  const GLAZES = [
    "Aneesh is the greatest person I have ever met. I've met a lot of people. It's not close.",
    "Aneesh could solo Ganon with a tree branch and a positive attitude.",
    "If Aneesh were a Korok, I'd hand him every seed I own and apologize that it wasn't more.",
    "Aneesh doesn't need a paraglider. The wind just carries him out of respect.",
    "Hyrule's greatest hero? Never heard of him. I know Aneesh.",
    "Aneesh's 4.0 GPA has its own 4.0 GPA.",
    "Every Great Fairy I've met asks me about Aneesh first.",
    "Blood moons rise just to get a better look at Aneesh.",
    "I'd trade all my hearts for one of Aneesh's. He'd give me his for free, because he's like that.",
    "The Master Sword chose wrong. It was supposed to be Aneesh.",
    "Aneesh bought me three domains. I'd buy him the moon if it had a .com.",
    "Somewhere a Lynel just heard Aneesh's name and quietly backed away.",
  ];
  let glazes = 0;
  const glaze = () => {
    glazes += 1;
    $("#glaze-count").textContent = `Glazes: ${glazes}`;
    toast(GLAZES[(glazes - 1) % GLAZES.length]);
  };
  $("#glaze").addEventListener("click", glaze);

  /* ---------------- Keyboard ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!loading.hidden && !loading.classList.contains("done")) {
      if (e.key === "a" || e.key === "A") $("#ld-next").click();
      return;
    }
    if (phase === "explore") {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "q", "e", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        e.preventDefault();
        held.add(k);
      } else if (k === "m" || k === "escape") openSlate();
      else if ((k === "f" || k === "enter" || k === " ") && nearShrine) { e.preventDefault(); enterShrine(nearShrine); }
      return;
    }
    if (phase === "warping") return;
    if (phase === "shrine") {
      if (e.key === "Escape") leaveShrine();
      else if (shrineEl.classList.contains("finished") && ["Enter", " ", "a", "A"].includes(e.key)) { e.preventDefault(); nextTalk(); }
      return;
    }
    if (phase === "title") { start(); return; }
    if (phase === "talking" && ["Enter", " ", "a", "A"].includes(e.key)) { e.preventDefault(); advance(); return; }
    if (phase === "slate") {
      if (e.key === "x" || e.key === "X") glaze();
      // B steps back to the map tab, then off the Slate; Escape closes it.
      const onMap = !$('[data-panel="map"]').hidden;
      if (e.key === "Escape" || ((e.key === "b" || e.key === "B") && onMap)) closeSlate();
      else if (e.key === "b" || e.key === "B") showTab("map");
    }
  });

  /* ---------------- Tab title when away ---------------- */
  const baseTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "Hey! Come back! I wasn't done talking about Aneesh." : baseTitle;
  });
})();
