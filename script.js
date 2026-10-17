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
    "Phew. Stuck the landing. Hi, I'm <em>Arthur</em>, and welcome to my website.",
    "It's technically supposed to be about me. But there's someone around here who is way more interesting.",
    "Let me pull up my Sheikah Slate and get my bearings...",
    "...Huh. The whole map is <em>Aneesh</em> again.",
    "Honestly? Good. There's nowhere else I'd rather explore.",
  ];

  let phase = "title"; // title -> descending -> talking -> slate
  let lineIndex = 0;
  let typing = null;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

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
    if (lineIndex === 2) world.classList.add("checking");
    if (lineIndex >= LINES.length) return openSlate();
    typeLine(LINES[lineIndex]);
  };

  const start = () => {
    if (phase !== "title") return;
    phase = "descending";
    title.classList.add("gone");
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
    }, reduced ? 0 : 650);
  };

  const openSlate = () => {
    if (phase === "slate") return;
    phase = "slate";
    timers.splice(0).forEach(clearTimeout);
    clearInterval(typing);
    world.hidden = true;
    slate.hidden = false;
    document.body.classList.add("slate-open");
    slate.classList.remove("opening");
    void slate.offsetWidth;
    slate.classList.add("opening");
    window.scrollTo(0, 0);
    startChatter();
  };

  const replay = () => {
    stopChatter();
    slate.hidden = true;
    document.body.classList.remove("slate-open");
    world.hidden = false;
    world.className = "";
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

  /* ---------------- Points of interest ----------------
     x / y are percentages on the map photo. */
  const POIS = [
    {
      x: 50, y: 9, kind: "tower", icon: "&#9650;", name: "Peak Hair Tower",
      loc: "Northern Aneesh, highest elevation",
      body: "The tallest point in the region. I tried to climb it once and got distracted by how good it looked. Unclimbable. Unmatched. Never had a bad day.",
      stat: "Hair days rated bad: 0",
      quotes: ["I'm the hair and I'm doing incredible.", "Wind-tested at paraglider altitude. Did not move."],
    },
    {
      x: 51, y: 19, kind: "village", icon: "&#9733;", name: "Brain Plateau",
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
      x: 59, y: 27, kind: "shrine", icon: "&#9673;", name: "Vice Lead Lookout",
      loc: "East Glasses Region",
      body: "Vice Lead of Guidance, Navigation, and Controls at GT Propulsive Landers. He guides. He navigates. He controls. Most importantly, his rocket lands gently, unlike me trying to talk to him.",
      stat: "Engine tuned: 1.8 kN",
      quotes: ["Guidance: Aneesh. Navigation: Aneesh. Controls: also Aneesh.", "I watch over rockets. And him."],
    },
    {
      x: 51, y: 33, kind: "tower", icon: "&#9650;", name: "Mount Nose",
      loc: "Central Aneesh",
      body: "Second highest peak in the region. Despite all his accomplishments, he still breathes the same air as the rest of us. Incredibly humble of him.",
      stat: "Humility: maxed out",
      quotes: ["I'm a nose and even I'm impressed.", "Smells like a winner up here."],
    },
    {
      x: 37, y: 32, kind: "village", icon: "&#8962;", name: "Listening Post",
      loc: "West Ear Village",
      body: "Volunteered 100+ hours teaching STEM to kids aged 11 to 14 and was named the 2025 ScioVirtual Instructor of the Year. Highest-rated course out of 20+. Kids love him. I love him. The data agrees.",
      stat: "Instructor of the Year: 2025",
      quotes: ["Shh. He's listening. He always listens.", "20+ courses and his was rated best. Obviously."],
    },
    {
      x: 65, y: 31, kind: "shrine", icon: "&#10022;", name: "Cipher Shrine",
      loc: "East Ear Ruins",
      body: "Maintains the open-source Codebusters platform used by 1,000+ Science Olympiad coaches and volunteers, and writes the cipher tests himself. I tried to solve one. I am still trying. Please send help.",
      stat: "Coaches served: 1,000+",
      quotes: ["Uryyb, V ybir Narrfu. (That's ROT13. You're welcome.)", "Thousands of students suffered through his ciphers. They thanked him."],
    },
    {
      x: 52, y: 38, kind: "shrine", icon: "&#10022;", name: "Smile Shrine",
      loc: "Mouth of the River Charisma",
      body: "The shrine of leadership. At Nuntius (YC S'25) he directed a team of 8 engineers and delivered a $50K project evaluating LLM agents. People just follow him. I would follow him into a Lynel.",
      stat: "Team led: 8 engineers",
      quotes: ["This smile has been to Y Combinator.", "Look at it. Look at this smile."],
    },
    {
      x: 52, y: 47, kind: "village", icon: "&#8962;", name: "Chin Stable",
      loc: "Southern Jawline",
      body: "At Transpira Labs he built the platform that maximized output of 40+ experts producing frontier AI training data, then built a whole GTM platform on the side and landed 5 pilot partners. Most people just have a chin.",
      stat: "Pilot partners landed: 5",
      quotes: ["Strong chin. Stronger résumé.", "Stop by! We only sell admiration."],
    },
    {
      x: 50, y: 57, kind: "village", icon: "&#8962;", name: "Hablo Bridge",
      loc: "Neck Crossing",
      body: "Speaks intermediate Spanish. Intermediate is a lot more Spanish than I speak. Increíble. Magnífico. Those are the only two words I know and I'm spending them on him.",
      stat: "Spanish: intermedio (better than mine)",
      quotes: ["¡Aneesh es el mejor!", "Hola. He's great. Adiós."],
    },
    {
      x: 51, y: 70, kind: "tower", icon: "&#9650;", name: "Hackathon Hold",
      loc: "Drawstring Canyon",
      body: "Won 1st of 70 at the HUD × Y Combinator RL Environments Hackathon with Build, a Scratch-style platform that turns block trees into RL environments so anyone can train models without writing code. $50K+ in prizes. I wasn't there and I still cried.",
      stat: "Placement: 1st of 70",
      quotes: ["First place. Out of SEVENTY.", "No code required. Just Aneesh required."],
    },
    {
      x: 69, y: 80, kind: "tower", icon: "&#9650;", name: "Swoosh Plains",
      loc: "Hoodie Lowlands",
      body: "He Just Did It. Won 1st of 794 teams at the MathWorks M3 Challenge for modeling heat resilience in Memphis, took the $20,000 grand prize, and co-authored a paper in SIAM. I can't even model my week.",
      stat: "Placement: 1st of 794",
      quotes: ["793 teams went home sad.", "Published. In SIAM. Casually."],
    },
    {
      x: 12, y: 26, kind: "shrine", icon: "&#10022;", name: "Skyscraper Shrine",
      loc: "Old City (background)",
      body: "Someone asked him for a portfolio and he built an entire macOS in the browser, with a dock, a terminal, a working Mail app, and an AI assistant. Most people make one page. He made an operating system.",
      stat: "Fake Wi-Fi panes nobody asked for: 1",
      quotes: ["I'm a building and he still outbuilt me.", "You call that a portfolio? Yes. Yes I do."],
    },
    {
      x: 88, y: 42, kind: "village", icon: "&#8962;", name: "Bay Area Outpost",
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
    const bubble = $(".bubble", p.el);
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(p.hide);
    p.hide = setTimeout(() => bubble.classList.remove("show"), 3200);
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
