# SKYLARK EXIM — Two Origins. One Standard.

Cinematic scroll site for a Visakhapatnam seafood exporter shipping shrimp and
sea fish to Europe, Japan, the Gulf and North America.

The concept is a **fork**: the visitor chooses one of two origins at the top —
**THE OCEAN** (wild catch) or **THE POND** (farmed shrimp). Both paths run the
same processing spine, and both land on the same globe. Scrolling down *is*
moving forward along the cold chain: +28 °C at the waterline to −20 °C in the
reefer, tracked live by the HUD on the right edge.

## The film

Twelve 8-second clips generated with **Seedance 2.0** (Higgsfield), chained into
one unbroken camera move: each clip's final frame is the next clip's
`start_image`. Two anchor rules hold the fork together:

- **ANCHOR 1** — the final frame of the opening (the surface-break settle).
  Both branch openings start from it, so the paths begin identically.
- **ANCHOR 2** — a generated still of the plant intake door. It is the forced
  `end_image` of both branch finals and the `start_image` of the trunk, so both
  paths physically converge on the same frame.

The trunk ends on a generated globe still (Bay of Bengal centred, gold trade
routes) locked as T4's `end_image`.

Every prompt, job id, anchor media id, re-roll note, and the credit ledger for
the 720p draft pass and the 1080p master pass lives in
[`manifest/chain.json`](manifest/chain.json).

## The site

- Canvas-2D frame scrubbing — no `<video>` element. Lenis (duration 0.85,
  lerp 0.14, wheelMultiplier 1.25) + GSAP ScrollTrigger (scrub 0.4).
- Each clip owns the canvas while its scroll band crosses viewport centre;
  because chained clips share boundary frames, handoffs are invisible. The last
  band ends at absolute page bottom so the globe is always reachable.
- 65 frames/clip at 1600×900 — AVIF (SVT-AV1, CRF 42, all ≤55 KB) with WebP
  fallback; 49-frame mobile set at 1000×563; 320px proxy strips load first so
  scrubbing works instantly, then full-res streams in batches of 40 via
  `createImageBitmap`. Trunk frames are stored once and shared by both paths.
- Fixed cold-chain HUD: temperature, zone (ORIGIN → EXPORT), step 01→09, a
  batch id that locks at the lab, RESIDUE: CLEARED stamping in at T2, and
  branch-specific fields (vessel/landed/off-water vs pond-id/feed-log/harvest).
  DOM writes are coalesced to 100 ms, last write wins.
- Reduced motion: static keyframes, same copy. `prefers-reduced-motion` only.
- Palette from the footage: blue-black, clinical white, ice grey — gold is
  reserved for the trade routes and the CTA. Type is Space Grotesk,
  self-hosted.

## Run it

```bash
python3 -m http.server 8741
```

then open <http://localhost:8741>. (It must be served over HTTP — the frame
loader uses `fetch`.)

## Rebuild frames

```bash
./scripts/encode_frames.sh assets/video/1080 assets/frames   # FORCE=1 to redo
python3 scripts/make_product_sheet.py                        # product sheet PDF
```

## Layout

```
assets/video/{720,1080}/   source clips, draft + master pass
assets/frames/{d,m}/       desktop / mobile scrub frames (+ p/ proxy strips)
assets/stills/             hero · anchor2 · globe
assets/anchors/            chained boundary frames, both passes
manifest/chain.json        the whole generation record
```
