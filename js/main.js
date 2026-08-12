/* ============================================================
   SKYLARK EXIM — scroll-scrubbed cold chain
   Canvas 2D frame scrub · Lenis + GSAP ScrollTrigger
   Two paths, one trunk. Trunk frames stored once.
   ============================================================ */
(() => {
  "use strict";

  // the trunk splits for one beat: fish processing (t2) on the ocean path,
  // the four-format shrimp line (t2s) on the pond path — both re-converge
  // on the same lab-bench frame before freezing
  const PATHS = {
    ocean: { clips: ["opening", "a1", "a2", "a3", "a4", "t1", "t2", "t3", "t4"], lab: "t2" },
    pond:  { clips: ["opening", "b1", "b2", "b3", "t1", "t2s", "t3", "t4"], lab: "t2s" },
  };

  // per-clip scroll band length (vh) and copy overlays for branch sections
  const BRANCH_SECTIONS = {
    ocean: [
      { clip: "a1", vh: 40, eyebrow: null, head: null, lede: null },
      { clip: "a2", vh: 50, eyebrow: null, head: null, lede: null },
      { clip: "a3", vh: 95, eyebrow: "01 · The ocean — the hold",
        head: "What the ocean gives, it gives once.",
        lede: "Swordfish and yellowfin off the open Bay, in full daylight. Straight over the gunwale, on ice within minutes of the water. The clock starts at the surface." },
      { clip: "a4", vh: 40, eyebrow: null, head: null, lede: null },
    ],
    pond: [
      { clip: "b1", vh: 45, eyebrow: null, head: null, lede: null },
      { clip: "b2", vh: 95, eyebrow: "01 · The pond — the ledger",
        head: "A history we can own.",
        lede: "Pond of origin, feed, inputs, harvest date — recorded before a carton exists. Not a story. A record." },
      { clip: "b3", vh: 45, eyebrow: null, head: null, lede: null },
    ],
  };

  // HUD program: [zone, tempStart, tempEnd, step] per clip
  const HUD_PROG = {
    opening: { zone: "ORIGIN",  t0: 28,  t1: 28,  step: 1 },
    a1:      { zone: "ORIGIN",  t0: 28,  t1: 26,  step: 2 },
    a2:      { zone: "ORIGIN",  t0: 26,  t1: 24,  step: 3 },
    a3:      { zone: "ORIGIN",  t0: 24,  t1: 4,   step: 4 },
    a4:      { zone: "TRANSIT", t0: 4,   t1: 2,   step: 5 },
    b1:      { zone: "ORIGIN",  t0: 28,  t1: 27,  step: 2 },
    b2:      { zone: "ORIGIN",  t0: 27,  t1: 26,  step: 3 },
    b3:      { zone: "TRANSIT", t0: 26,  t1: 2,   step: 5 },
    t1:      { zone: "INTAKE",  t0: 2,   t1: 0,   step: 6 },
    t2:      { zone: "PROCESS", t0: 0,   t1: 0,   step: 7 },
    t2s:     { zone: "PROCESS", t0: 0,   t1: 0,   step: 7 },
    t3:      { zone: "COLD",    t0: -2,  t1: -20, step: 8 },
    t4:      { zone: "EXPORT",  t0: -20, t1: -20, step: 9 },
  };

  const BRANCH_HUD = {
    ocean: { k: ["Vessel", "Landed", "Off water"], v: ["MFV SAGARIKA-VII", "04:52 IST", "00:41 HRS"] },
    pond:  { k: ["Pond ID", "Feed log", "Harvest"], v: ["AP-KKD-114", "COMPLETE", "D-0 05:20"] },
  };

  const qs = (s, el) => (el || document).querySelector(s);
  const canvas = qs("#film");
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileMQ = matchMedia("(max-width: 767px)");
  let isMobile = mobileMQ.matches;

  let MANIFEST = null;
  let activePath = "ocean";
  let avifOK = false;

  /* ---------- format detection ---------- */
  const AVIF_PROBE =
    "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  function detectAvif() {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = AVIF_PROBE;
    });
  }

  /* ---------- frame store ---------- */
  // frames[clip] = { count, bitmaps: Array<ImageBitmap|null>, quality: Uint8Array (0 none,1 proxy,2 full) }
  const store = {};
  let inflight = 0;
  const fetchQueue = [];

  function frameURL(clip, i, proxy) {
    const dpi = isMobile ? MANIFEST.mobile : MANIFEST.desktop;
    const ext = avifOK ? "avif" : "webp";
    const n = String(i + 1).padStart(4, "0");
    return proxy
      ? `${dpi.dir}/${clip}/p/${n}.webp`
      : `${dpi.dir}/${clip}/${n}.${ext}`;
  }

  function pump() {
    while (inflight < 6 && fetchQueue.length) {
      const job = fetchQueue.shift();
      inflight++;
      fetch(job.url)
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((b) => createImageBitmap(b))
        .then((bmp) => {
          const s = store[job.clip];
          if (!s) return;
          if (job.quality >= s.quality[job.i]) {
            const old = s.bitmaps[job.i];
            s.bitmaps[job.i] = bmp;
            s.quality[job.i] = job.quality;
            if (old && old !== bmp) old.close?.();
            if (job.clip === state.clip) {
              if (job.i === state.frame) state.dirty = true;
              // hidden documents get no rAF — repaint on any arrival for the
              // active clip so the canvas is never blank (nearest frame wins)
              if (document.hidden) { state.dirty = true; renderFrame(); }
            }
          } else bmp.close?.();
        })
        .catch(() => {})
        .finally(() => { inflight--; pump(); });
    }
  }

  function enqueue(clip, i, proxy) {
    const s = store[clip];
    const q = proxy ? 1 : 2;
    if (!s || s.quality[i] >= q) return;
    fetchQueue.push({ clip, i, url: frameURL(clip, i, proxy), quality: q });
  }

  function loadClip(clip) {
    const dpi = isMobile ? MANIFEST.mobile : MANIFEST.desktop;
    const count = dpi.clips[clip];
    if (store[clip]) return;
    store[clip] = { count, bitmaps: new Array(count).fill(null), quality: new Uint8Array(count) };
    // proxy strip first — every Nth frame, tiny, instant scrub
    for (let i = 0; i < count; i += MANIFEST.proxyEvery) enqueue(clip, i, true);
    // then full-res in batches of 40
    let batchStart = 0;
    const batch = () => {
      if (!store[clip]) return;            // evicted mid-stream, stop feeding it
      const end = Math.min(batchStart + 40, count);
      for (let i = batchStart; i < end; i++) enqueue(clip, i, false);
      batchStart = end;
      pump();
      if (batchStart < count) setTimeout(batch, 350);
    };
    batch();
    pump();
  }

  /* Decoded frames are uncompressed RGBA: a 1600x900 ImageBitmap is 5.5 MB, so
     one 65-frame clip costs ~357 MB. Nothing used to release them during a
     scroll, so walking the whole page left all 12 clips resident - over 4 GB.
     That is what stalls the tab and leaves frames stuck. Keep a sliding window
     of clips around the playhead and hand the rest back. */
  const CLIP_WINDOW = 1; // clips retained either side of the current one

  function releaseClip(clip) {
    const s = store[clip];
    if (!s) return;
    s.bitmaps.forEach((b) => b && b.close?.());
    delete store[clip];
  }

  function evictDistantClips(clip) {
    const order = PATHS[activePath].clips;
    const i = order.indexOf(clip);
    if (i < 0) return;
    const keep = new Set(["opening", clip]);   // opening is the boot frame, cheap to hold
    for (let d = 1; d <= CLIP_WINDOW; d++) {
      if (order[i + d]) keep.add(order[i + d]);
      if (order[i - d]) keep.add(order[i - d]);
    }
    for (const k of Object.keys(store)) if (!keep.has(k)) releaseClip(k);
    // drop queued work for clips that are no longer resident
    for (let n = fetchQueue.length - 1; n >= 0; n--) {
      if (!store[fetchQueue[n].clip]) fetchQueue.splice(n, 1);
    }
  }

  function nearestLoaded(clip, i) {
    const s = store[clip];
    if (!s) return null;
    if (s.bitmaps[i]) return s.bitmaps[i];
    for (let d = 1; d < s.count; d++) {
      if (s.bitmaps[i - d]) return s.bitmaps[i - d];
      if (s.bitmaps[i + d]) return s.bitmaps[i + d];
    }
    return null;
  }

  /* ---------- draw loop ---------- */
  const state = { clip: "opening", frame: 0, dirty: true, lastKey: "" };

  function renderFrame() {
    if (!state.dirty) return;
    const key = state.clip + ":" + state.frame;
    const bmp = nearestLoaded(state.clip, state.frame);
    if (!bmp) return;
    state.dirty = false;
    state.lastKey = key;
    // cover-fit
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s, h = bmp.height * s;
    ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h);
  }

  function draw() {
    requestAnimationFrame(draw);
    renderFrame();
  }

  function setFrame(clip, frame) {
    const s = store[clip];
    if (s) frame = Math.max(0, Math.min(s.count - 1, frame));
    if (clip !== state.clip || frame !== state.frame) {
      state.clip = clip;
      state.frame = frame;
      state.dirty = true;
      // rAF starves in hidden/throttled documents — render on state change there
      if (document.hidden) renderFrame();
    }
  }

  /* ---------- HUD ---------- */
  const hud = {
    el: qs("#hud"),
    temp: qs("#hud-temp"), zone: qs("#hud-zone"), step: qs("#hud-step"),
    batch: qs("#hud-batch"), stamp: qs("#hud-stamp"),
    k: [qs("#hb-k1"), qs("#hb-k2"), qs("#hb-k3")],
    v: [qs("#hb-v1"), qs("#hb-v2"), qs("#hb-v3")],
    last: {}, lastWrite: 0,
  };
  let batchLocked = false;
  let batchSeq = 137;

  // scrub handlers stage the latest state; a 100ms flush applies it —
  // last write wins, no per-frame DOM writes
  let hudPending = null;
  function hudWrite(clip, p) {
    hudPending = { clip, p };
  }
  setInterval(() => {
    if (!hudPending) return;
    const { clip, p } = hudPending;
    hudPending = null;
    hudApply(clip, p);
  }, 100);

  function hudApply(clip, p) {
    const prog = HUD_PROG[clip];
    if (!prog) return;
    const temp = prog.t0 + (prog.t1 - prog.t0) * p;
    const tstr = (temp > 0 ? "+" : temp < 0 ? "−" : "") + Math.abs(temp).toFixed(1) + "°C";
    const step = String(prog.step).padStart(2, "0") + " / 09";
    if (hud.last.t !== tstr) { hud.temp.textContent = tstr; hud.last.t = tstr; }
    if (hud.last.z !== prog.zone) { hud.zone.textContent = prog.zone; hud.last.z = prog.zone; }
    if (hud.last.s !== step) { hud.step.textContent = step; hud.last.s = step; }

    // batch id increments through origin, locks at the lab, releases upstream
    const pastLab = ["t2", "t3", "t4"].includes(clip);
    if (pastLab && !batchLocked) {
      batchLocked = true;
      hud.batch.textContent = "VZ-2608-" + batchSeq + " · LOCKED";
    } else if (!pastLab) {
      if (batchLocked) batchLocked = false;
      const seq = 130 + prog.step;
      if (seq !== batchSeq || hud.batch.textContent.includes("LOCKED")) {
        batchSeq = seq;
        hud.batch.textContent = "VZ-2608-" + batchSeq;
      }
    }
    // residue stamp snaps in at T2
    const cleared = clip === "t2" && p > 0.45 || ["t3", "t4"].includes(clip);
    if (hud.last.c !== cleared) {
      hud.last.c = cleared;
      hud.stamp.textContent = cleared ? "RESIDUE: CLEARED" : "RESIDUE: —";
      hud.stamp.classList.toggle("cleared", cleared);
    }
  }

  function hudBranch(path) {
    const b = BRANCH_HUD[path];
    for (let i = 0; i < 3; i++) {
      hud.k[i].textContent = b.k[i];
      hud.v[i].textContent = b.v[i];
    }
  }

  /* ---------- sections ---------- */
  function buildBranch(path) {
    const root = qs("#branch-root");
    root.innerHTML = "";
    for (const sec of BRANCH_SECTIONS[path]) {
      const el = document.createElement("section");
      el.className = "band";
      el.dataset.clip = sec.clip;
      el.dataset.vh = sec.vh;
      if (sec.head) {
        el.innerHTML = `
          <div class="copy-slab over-copy">
            <div class="copy-inner">
              <p class="eyebrow">${sec.eyebrow}</p>
              <h2 class="headline">${sec.head}</h2>
              <p class="lede">${sec.lede}</p>
            </div>
          </div>`;
        el.classList.add("has-copy");
      }
      root.appendChild(el);
    }
  }

  let triggers = [];
  function killTriggers() {
    triggers.forEach((t) => t.kill());
    triggers = [];
  }

  function buildTriggers() {
    killTriggers();
    const bands = document.querySelectorAll("section.band");
    const lastBand = bands[bands.length - 1];
    bands.forEach((band) => {
      const clip = band.dataset.clip;
      band.style.height = (Number(band.dataset.vh) || 110) + "vh";
      // film scrub: the clip owns the canvas while its band crosses viewport
      // center — chained clips share boundary frames, so handoffs are seamless.
      // The last band completes at its own bottom edge so the globe locks in
      // before the information zone begins.
      const st = ScrollTrigger.create({
        trigger: band,
        start: "top 50%",
        end: band === lastBand ? "bottom bottom" : "bottom 50%",
        scrub: 0.4,
        onUpdate: (self) => {
          const s = store[clip];
          const count = s ? s.count : 64;
          const f = Math.round(self.progress * (count - 1));
          setFrame(clip, f);
          hudWrite(clip, self.progress);
        },
      });
      triggers.push(st);
      // prefetch well before the band reaches center
      const pf = ScrollTrigger.create({
        trigger: band,
        start: "top bottom",
        onEnter: () => prefetchNeighbors(clip),
        onEnterBack: () => prefetchNeighbors(clip),
      });
      triggers.push(pf);
      // copy slabs: gentle rise + fade, transform/opacity only
      const slab = band.querySelector(".copy-inner");
      if (slab) {
        const tw = gsap.fromTo(slab,
          { autoAlpha: 0, y: 60 },
          {
            autoAlpha: 1, y: 0, ease: "power2.out",
            scrollTrigger: {
              trigger: band, start: "top 62%", end: "top 18%", scrub: 0.4,
            },
          });
        triggers.push(tw.scrollTrigger);
      }
    });

    // film + hud + scrim visibility
    const gateEnd = ScrollTrigger.create({
      trigger: "#sec-opening",
      start: "top 85%",
      onEnter: () => { canvas.classList.add("on"); qs("#scrim").classList.add("on"); hud.el.classList.add("on"); },
      onLeaveBack: () => { canvas.classList.remove("on"); qs("#scrim").classList.remove("on"); hud.el.classList.remove("on"); },
    });
    triggers.push(gateEnd);

    // the HUD belongs to the film — retire it in the information zone
    const infoZone = ScrollTrigger.create({
      trigger: "#info",
      start: "top 60%",
      onEnter: () => hud.el.classList.remove("on"),
      onLeaveBack: () => hud.el.classList.add("on"),
    });
    triggers.push(infoZone);

    // progress spine
    const spine = gsap.to("#spine-fill", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 0.4 },
    });
    gsap.set("#spine-fill", { scaleY: 0 });
    triggers.push(spine.scrollTrigger);

    ScrollTrigger.refresh();
  }

  function prefetchNeighbors(clip) {
    const order = PATHS[activePath].clips;
    const i = order.indexOf(clip);
    if (i >= 0) {
      evictDistantClips(clip);   // release before allocating, so the two never overlap
      loadClip(clip);
      if (order[i + 1]) loadClip(order[i + 1]);
      if (order[i - 1]) loadClip(order[i - 1]);
    }
  }

  /* ---------- path switching ---------- */
  function setPath(path, jumpTo) {
    activePath = path;
    document.body.dataset.path = path;
    buildBranch(path);
    hudBranch(path);
    qs("#sec-lab").dataset.clip = PATHS[path].lab;
    // switch line copy
    const sw = qs("#switch-line");
    sw.innerHTML = path === "ocean"
      ? `You came by sea. <a id="switch-path">See the pond →</a>`
      : `You came by the pond. <a id="switch-path">See the ocean →</a>`;
    qs("#switch-path").addEventListener("click", () => {
      const next = activePath === "ocean" ? "pond" : "ocean";
      setPath(next, "#branch-root");
    });
    buildTriggers();
    // preload path start
    loadClip("opening");
    loadClip(PATHS[path].clips[1]);
    if (jumpTo) {
      const target = qs(jumpTo);
      const y = target.getBoundingClientRect().top + window.scrollY;
      (lenis ? lenis.scrollTo(y, { immediate: false, duration: 1.1 }) : window.scrollTo({ top: y }));
    }
  }

  /* ---------- reduced motion path ---------- */
  function reducedMotionSetup() {
    // static keyframes instead of scrub — same copy, no film
    document.querySelectorAll("section.band").forEach((band) => {
      const clip = band.dataset.clip;
      const img = document.createElement("img");
      img.className = "rm-frame";
      img.loading = "lazy";
      img.alt = "";
      img.src = `assets/keyframes/${clip}.jpg`;
      band.style.height = "auto";
      band.prepend(img);
    });
    qs("#hud").style.display = "none";
  }

  /* ---------- boot ---------- */
  let lenis = null;

  // frame tier for the current viewport; drops every cached bitmap and
  // reloads the active clip when the mobile/desktop breakpoint flips
  function applyViewportTier() {
    const dpi = isMobile ? MANIFEST.mobile : MANIFEST.desktop;
    canvas.width = dpi.w;
    canvas.height = dpi.h;
    for (const k of Object.keys(store)) releaseClip(k);
    fetchQueue.length = 0;
    state.dirty = true;
    loadClip("opening");
    prefetchNeighbors(state.clip);
  }

  function watchViewport() {
    let t = null;
    const onChange = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const nowMobile = mobileMQ.matches;
        if (nowMobile !== isMobile) {
          isMobile = nowMobile;
          applyViewportTier();
        }
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }, 250);
    };
    window.addEventListener("resize", onChange);
    mobileMQ.addEventListener?.("change", onChange);
  }

  async function boot() {
    // never trust a zero-size viewport (background prerender, hidden panes,
    // restored sessions) — wait until the window has real dimensions
    if (innerWidth === 0 || innerHeight === 0) {
      await new Promise((resolve) => {
        const tick = () => (innerWidth > 0 && innerHeight > 0) ? resolve() : setTimeout(tick, 120);
        tick();
      });
      isMobile = mobileMQ.matches;
    }

    avifOK = await detectAvif();
    MANIFEST = await fetch("manifest/frames.json").then((r) => r.json()).catch(() => null);
    if (!MANIFEST) {
      console.warn("frames.json missing — film disabled, copy still readable");
      document.body.classList.add("no-film");
      return;
    }

    // canvas backing store
    const dpi = isMobile ? MANIFEST.mobile : MANIFEST.desktop;
    canvas.width = dpi.w;
    canvas.height = dpi.h;

    buildBranch("ocean");
    hudBranch("ocean");

    if (reduceMotion) { reducedMotionSetup(); return; }

    gsap.registerPlugin(ScrollTrigger);

    if (!isMobile) {
      lenis = new Lenis({
        duration: 0.85,
        lerp: 0.14,
        wheelMultiplier: 1.25,
        smoothWheel: true,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      document.documentElement.classList.add("lenis");
    }

    buildTriggers();
    draw();
    loadClip("opening");

    // doors
    qs("#door-ocean").addEventListener("click", () => setPath("ocean", "#sec-opening"));
    qs("#door-pond").addEventListener("click", () => setPath("pond", "#sec-opening"));

    // default path already built; wire switch link
    setPathSwitchOnly();
    watchViewport();
  }

  function setPathSwitchOnly() {
    const a = qs("#switch-path");
    if (a) a.addEventListener("click", () => {
      const next = activePath === "ocean" ? "pond" : "ocean";
      setPath(next, "#branch-root");
    });
  }

  boot();
})();
