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
    "Phew. Stuck the landing, right in the middle of <em>Tech Green</em>. Hi, I'm <em>Arthur</em>, and welcome to my website.",
    "It's technically supposed to be about me. But there's someone at Georgia Tech who is way more interesting.",
    "Let me pull up my Sheikah Slate and get my bearings...",
    "...Huh. The whole map is <em>Aneesh</em> again.",
    "Honestly? Good. There's nowhere else I'd rather explore.",
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
    "Paragliding onto Tech Green is the fastest way across campus. It is also the fastest way to reach Aneesh, which is the point.",
    "Aneesh holds a 4.0 in Computer Engineering. If you see him in the library, do not interrupt. Just admire.",
    "Shrines contain trials. Aneesh contains multitudes. Both reward the curious.",
    "Aneesh won 1st of 794 teams at the M3 Challenge. Arthur has never won anything, except the privilege of knowing him.",
    "Your stamina wheel drains while you glide. Your admiration for Aneesh never drains.",
    "Aneesh writes cipher tests for Science Olympiad. If a puzzle seems impossible, it was probably his.",
    "Cooking two ingredients together can create something new. Combining Aneesh with anything creates something better.",
    "Rest at a campfire to pass the time. Arthur uses the time to think about Aneesh.",
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

  // Progress creeps toward 90% on its own and finishes when loading does.
  let progress = 0;
  const creep = setInterval(() => {
    progress += (0.9 - progress) * 0.06;
    fill.style.width = `${(progress * 100).toFixed(1)}%`;
  }, 120);
  const loadingMin = new Promise((r) => setTimeout(r, reduced ? 600 : 3200));

  /* The 3D descent loads in the background while the title is up. Until it
     settles (or if it can't run), the 2D descent is the fallback. */
  const flight = window.Flight3D;
  const press = $("#press");
  let use3D = false;
  press.textContent = "Loading Georgia Tech...";
  const ready3D = (flight ? flight.init($("#globe")) : Promise.resolve(false)).then((ok) => {
    use3D = ok;
    world.classList.toggle("is-3d", ok);
    $("#explore").hidden = !ok;
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
    firstPersonOn = false;
    viewBtn.firstChild.textContent = "First person ";
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
     push runs until my stamina gives out, dragging looks around, V swaps to
     first person, and M brings the Slate back. Walking up to a building
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
  let here = null, lastReveal = 0, revealTimer, edgeAt = 0, loopId = 0, lastTick = 0;
  let stamina = 1, exhausted = false, firstPersonOn = false;
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
  const explore = () => {
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
    hint.textContent = touchy
      ? "Left stick to walk, push it all the way to run. Drag anywhere to look around."
      : "WASD or arrow keys to walk, Shift to run, drag to look, V for first person, M for the map.";
    hint.classList.remove("gone");
    setTimeout(() => hint.classList.add("gone"), 9000);
    here = null;
    if (!seen.size) seen.set(LANDMARKS[0], performance.now());
    reveal("Georgia Tech", "Okay. Let's go for a walk. Every building on this campus has a story about Aneesh, and I intend to tell all of them.");
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
    world.classList.remove("exploring", "winded", "exhausted");
  };

  $("#explore").addEventListener("click", explore);
  $("#map-btn").addEventListener("click", openSlate);
  const viewBtn = $("#view-btn");
  const swapView = () => {
    firstPersonOn = flight.toggleView();
    viewBtn.firstChild.textContent = firstPersonOn ? "Third person " : "First person ";
  };
  viewBtn.addEventListener("click", swapView);

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
    if (phase !== "explore" || e.target.closest(".joystick, .explore-buttons")) return;
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
  const POIS = [
    {
      x: 50, y: 18, kind: "tower", icon: "&#9650;", name: "Peak Hair Tower",
      loc: "Northern Aneesh, highest elevation",
      body: "The tallest point in the region. I tried to climb it once and got distracted by how good it looked. Unclimbable. Unmatched. Never had a bad day.",
      stat: "Hair days rated bad: 0",
      quotes: ["I'm the hair and I'm doing incredible.", "Wind-tested at paraglider altitude. Did not move."],
    },
    {
      x: 51, y: 23, kind: "village", icon: "&#9733;", name: "Brain Plateau",
      loc: "Forehead Highlands",
      body: "Like the Great Plateau, except instead of a tutorial area it's a Computer Engineering major at Georgia Tech holding a 4.0. Shrines up here are all solved already.",
      stat: "GPA: 4.0 out of 4.0",
      quotes: ["4.0. Four point zero. Say it with me.", "Computer Engineering. Cybersecurity. Systems. He does all of it."],
    },
    {
      x: 43, y: 28, kind: "shrine", icon: "&#9673;", name: "Lens of Truth",
      loc: "West Glasses Region",
      body: "Sees everything. Built 3 extended Kalman filters fusing IMU, GPS, and LIDAR for a rocket lander and hit a 0.63% average deviation from ground truth. The man always knows where things are, which is how he found me.",
      stat: "Estimation error: 0.63%",
      quotes: ["I've seen things. Mostly Aneesh being great.", "Sensor fusion? He fuses greatness."],
    },
    {
      x: 56, y: 28, kind: "shrine", icon: "&#9673;", name: "Vice Lead Lookout",
      loc: "East Glasses Region",
      body: "Vice Lead of Guidance, Navigation, and Controls at GT Propulsive Landers. He guides. He navigates. He controls. Most importantly, his rocket lands gently, unlike me trying to talk to him.",
      stat: "Engine tuned: 1.8 kN",
      quotes: ["Guidance: Aneesh. Navigation: Aneesh. Controls: also Aneesh.", "I watch over rockets. And him."],
    },
    {
      x: 50, y: 33, kind: "tower", icon: "&#9650;", name: "Mount Nose",
      loc: "Central Aneesh",
      body: "Second highest peak in the region. Despite all his accomplishments, he still breathes the same air as the rest of us. Incredibly humble of him.",
      stat: "Humility: maxed out",
      quotes: ["I'm a nose and even I'm impressed.", "Smells like a winner up here."],
    },
    {
      x: 41.5, y: 33.5, kind: "village", icon: "&#8962;", name: "Listening Post",
      loc: "West Ear Village",
      body: "Volunteered 100+ hours teaching STEM to kids aged 11 to 14 and was named the 2025 ScioVirtual Instructor of the Year. Highest-rated course out of 20+. Kids love him. I love him. The data agrees.",
      stat: "Instructor of the Year: 2025",
      quotes: ["Shh. He's listening. He always listens.", "20+ courses and his was rated best. Obviously."],
    },
    {
      x: 59.5, y: 31, kind: "shrine", icon: "&#10022;", name: "Cipher Shrine",
      loc: "East Ear Ruins",
      body: "Maintains the open-source Codebusters platform used by 1,000+ Science Olympiad coaches and volunteers, and writes the cipher tests himself. I tried to solve one. I am still trying. Please send help.",
      stat: "Coaches served: 1,000+",
      quotes: ["Uryyb, V ybir Narrfu. (That's ROT13. You're welcome.)", "Thousands of students suffered through his ciphers. They thanked him."],
    },
    {
      x: 51.5, y: 38, kind: "shrine", icon: "&#10022;", name: "Smile Shrine",
      loc: "Mouth of the River Charisma",
      body: "The shrine of leadership. At Nuntius (YC S'25) he directed a team of 8 engineers and delivered a $50K project evaluating LLM agents. People just follow him. I would follow him into a Lynel.",
      stat: "Team led: 8 engineers",
      quotes: ["This smile has been to Y Combinator.", "Look at it. Look at this smile."],
    },
    {
      x: 51.5, y: 45, kind: "village", icon: "&#8962;", name: "Chin Stable",
      loc: "Southern Jawline",
      body: "At Transpira Labs he built the platform that maximized output of 40+ experts producing frontier AI training data, then built a whole GTM platform on the side and landed 5 pilot partners. Most people just have a chin.",
      stat: "Pilot partners landed: 5",
      quotes: ["Strong chin. Stronger résumé.", "Stop by! We only sell admiration."],
    },
    {
      x: 50, y: 52, kind: "village", icon: "&#8962;", name: "Hablo Bridge",
      loc: "Neck Crossing",
      body: "Speaks intermediate Spanish. Intermediate is a lot more Spanish than I speak. Increíble. Magnífico. Those are the only two words I know and I'm spending them on him.",
      stat: "Spanish: intermedio (better than mine)",
      quotes: ["¡Aneesh es el mejor!", "Hola. He's great. Adiós."],
    },
    {
      x: 51, y: 63, kind: "tower", icon: "&#9650;", name: "Hackathon Hold",
      loc: "Drawstring Canyon",
      body: "Won 1st of 70 at the HUD × Y Combinator RL Environments Hackathon with Build, a Scratch-style platform that turns block trees into RL environments so anyone can train models without writing code. $50K+ in prizes. I wasn't there and I still cried.",
      stat: "Placement: 1st of 70",
      quotes: ["First place. Out of SEVENTY.", "No code required. Just Aneesh required."],
    },
    {
      x: 69, y: 74, kind: "tower", icon: "&#9650;", name: "Swoosh Plains",
      loc: "Hoodie Lowlands",
      body: "He Just Did It. Won 1st of 794 teams at the MathWorks M3 Challenge for modeling heat resilience in Memphis, took the $20,000 grand prize, and co-authored a paper in SIAM. I can't even model my week.",
      stat: "Placement: 1st of 794",
      quotes: ["793 teams went home sad.", "Published. In SIAM. Casually."],
    },
    {
      x: 11, y: 30, kind: "shrine", icon: "&#10022;", name: "Skyscraper Shrine",
      loc: "Old City (background)",
      body: "Someone asked him for a portfolio and he built an entire macOS in the browser, with a dock, a terminal, a working Mail app, and an AI assistant. Most people make one page. He made an operating system.",
      stat: "Fake Wi-Fi panes nobody asked for: 1",
      quotes: ["I'm a building and he still outbuilt me.", "You call that a portfolio? Yes. Yes I do."],
    },
    {
      x: 90, y: 40, kind: "village", icon: "&#8962;", name: "Bay Area Outpost",
      loc: "Far East (San Francisco)",
      body: "Builds RL environments, evals, and benchmarks for frontier LLMs. The AIs are learning from him. So am I. We're classmates now.",
      stat: "AIs taught: a lot",
      quotes: ["Even the robots look up to him.", "The frontier? He IS the frontier."],
    },
  ];

  const pinsEl = $("#pins");
  const visited = new Set();

  POIS.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `pin kind-${p.kind}`;
    if (p.x < 22) b.classList.add("edge-left");
    if (p.x > 78) b.classList.add("edge-right");
    if (p.y < 14) b.classList.add("edge-top");
    b.style.left = `${p.x}%`;
    b.style.top = `${p.y}%`;
    b.setAttribute("aria-label", p.name);
    b.innerHTML = `<span class="icon"><span>${p.icon}</span></span><span class="name">${p.name}</span><span class="bubble"></span>`;
    b.addEventListener("click", () => select(i));
    pinsEl.appendChild(b);
    p.el = b;
  });

  const info = $("#info");
  const select = (i) => {
    const p = POIS[i];
    $$(".pin.active").forEach((el) => el.classList.remove("active"));
    p.el.classList.add("active", "visited");
    $("#info-title").textContent = p.name;
    $("#info-loc").textContent = p.loc;
    $("#info-body").textContent = p.body;
    $("#info-stat").textContent = p.stat;
    info.classList.remove("flash");
    void info.offsetWidth;
    info.classList.add("flash");
    say(p, p.quotes[0]);
    if (matchMedia("(max-width: 860px)").matches) info.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });

    visited.add(i);
    if (visited.size === POIS.length) {
      setTimeout(() => toast("Region fully explored. Findings: Aneesh is the best person I've ever met."), 600);
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
    "Aneesh is the best person I have ever met.",
    "Aneesh could solo Ganon with a tree branch.",
    "If Aneesh were a Korok, I'd give him all my seeds.",
    "Aneesh doesn't need a paraglider. The wind just carries him.",
    "Hyrule's greatest hero? Never heard of him. I know Aneesh.",
    "Aneesh's 4.0 GPA has a 4.0 GPA.",
    "Every Great Fairy I've met asks about Aneesh.",
    "Blood moons rise just to get a better look at Aneesh.",
    "I would trade all my hearts for one of Aneesh's.",
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
      } else if (k === "v") swapView();
      else if (k === "m" || k === "escape") openSlate();
      return;
    }
    if (phase === "title") { start(); return; }
    if (phase === "talking" && ["Enter", " ", "a", "A"].includes(e.key)) { e.preventDefault(); advance(); return; }
    if (phase === "slate") {
      if (e.key === "x" || e.key === "X") glaze();
      if (e.key === "b" || e.key === "B" || e.key === "Escape") showTab("map");
    }
  });

  /* ---------------- Tab title when away ---------------- */
  const baseTitle = document.title;
  document.addEventListener("visibilitychange", () => {
    document.title = document.hidden ? "Hey! Listen! Aneesh is great." : baseTitle;
  });
})();
