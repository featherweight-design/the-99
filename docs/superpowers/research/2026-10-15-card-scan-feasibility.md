# Card scanning: feasibility spike (2026-10-15)

Engineering-only spike. No design, nothing shipped. Every number below comes from a run made for
this report on 2026-10-14/15. Anything not measured is labeled **estimate**. Scripts are in
`scripts/research/card-scan/`. Weights, images, embeddings and results are in the scratch
directory and are not committed (see Reproduce).

## In plain words

- **The free MIT models work on clean, flat shots of the exact printing they have seen.** In that
  case the pipeline found the right card every time on a perfect crop (100% of 2,592), and 90.8%
  end to end. The loss is the detector's card-present gate, not the match.
- **One reference image per card does not work.** The embedder (dhvazquez, MIT) tells *printings*
  apart: it was trained with one class per printing. Scanning a different printing from the one
  we indexed gives the right card only **32.6%** of the time on a clean perfect crop, and
  **10.4%** end to end in the realistic mix. With different art it is 3.2%.
- **Indexing every printing helps a lot only if the player's own printing is in the index.** With
  every paper printing indexed (103,823 images) and the scanned printing held out, which is the
  honest test, it reaches **28.2%** on a perfect crop and **21.7%** end to end in the realistic
  mix. With the scanned printing present it reaches 69.8% and 52.4%.
- **Blur and low light break the embedder.** At blur severity 2, matching falls to 37.6% even with
  the scanned printing indexed. At low light severity 2 it falls to 41.1%. Perspective, glare,
  sleeve sheen, low contrast and foil cost almost nothing when the printing is indexed.
- **DINOv2-small, the Apache-2.0 fallback, generalizes across printings and blur better, and fails
  on foil.** Held-out printing, clean shot: 72.5% against 54.2%. Blur severity 2, own printing
  present: 90.0% against 38.0%. Foil severity 2: 50.7% against 99.8%.
- **Frame agreement buys precision, not recall.** Voting 2-of-3 or 3-of-5 frames turns wrong
  answers into "no answer". It barely raises the right-answer rate, because a blurred frame is
  wrong the same way each time.
- **Bar used: oracle top-1 of at least 90% end to end on the realistic mix, cross-printing.**
  Nothing reaches it. With the scanned printing indexed, the best is dhvazquez at 52.4% (n=5,184
  scenes). Held out, dhvazquez reaches 21.7% on the same 5,184. On the 400-query DINOv2 subset
  (render 0 only), DINOv2 reaches 28.0% held out, against dhvazquez's 22.8% on those same 400.
  **Step 2 is not promising on synthetic data.** Step 3, the lab page, is built anyway: per
  Hugh's correction it is now the way we collect real photos.
- **Recommendation: collect real photos with the lab page next, with "Keep this frame" ticked, and
  measure DINOv2 against them offline at the same time.** Do not go to Design yet. Details in
  Recommendation.

## Context (Hugh's input, 2026-10-14)

1. **Correction to the fallback.** If the synthetic results are weak, the fallback is real photos
   taken with *our* app through the step-3 lab page, not ManaBox. If step 2 is borderline, build
   step 3 anyway so we can gather photos. The options are: proceed to Design, try the fallback
   embedder, or collect real photos with the lab page.
2. **ManaBox is the reference flow for Design later.** It is recorded here and not built:
   - Opening the scanner downloads a bundle, presumably the model and the index.
   - It has two modes. **Lightning scan** takes the first treatment automatically. **Normal**
     matches the card, then the player picks the set.
   - The player takes several photos in a row, reviews them together (adjusting treatment, set
     and quantity), then adds them all to a binder or the collection.
3. **Known failure modes to measure:**
   - (a) **The detector loses the card** under sleeves or lighting, so the frame is not seen as a
     card at all. This is measured as corner-detection recall, on its own (Detector stage), under
     sleeve sheen, glare and low contrast. The low-contrast augmentation puts a dark-bordered card
     on a dark table, or a light card on a light table.
   - (b) **Foils are detected but misidentified.** That is the embedder. It is measured with a foil
     augmentation: a rainbow sheen plus moving specular streaks.
   - (c) **The same card scanned twice is not treated as a new card**, so the player taps to
     rescan. That is a dedupe rule, an open design and engineering question: a time gap, or a tap
     to confirm. It is **not measured** here.
4. **Report the detector stage and the matcher stage separately, plus an end-to-end table.** Done
   below.

The orchestrator added four requirements, also folded in:

- **The headline multi-printing figure is leak-free.** `all_heldout` masks the scanned printing's
  Scryfall id out of the every-printing index, per scene (`run_queries.py`, `views()` passes the
  scene's own rows as `exclude` to `ranked()`). The own-printing-present figure (`all`) sits
  beside it, labeled.
- **DINOv2-small is run on the same splits** (single, multi held out, every printing held out,
  and own printing present).
- **Index sizes, and a phone-or-server recommendation for matching.**
- **Frame agreement for blur and low light** (2-of-3 and 3-of-5, each frame independently
  augmented at the same severity).

Scope ruling (Hugh): identify the CARD (its oracle id), not the printing. The player picks the set
afterwards, as in ManaBox.

## Headline numbers

Realistic mix: a plausible bad-but-normal phone shot. Mild perspective, one sleeve sheen or glare
spot, a thumb 40% of the time, low light (mostly mild, 30% at severity 2), mild blur, and JPEG
quality 60-85. Two renders per query, cross-printing (the scanned printing differs from the
indexed reference wherever one exists), dhvazquez fp32 embedder, HanClinto detector, card-present
gate at the 99th percentile of empty-scene sharpness. 124 of those 600 empty scenes held a
blurred whole card; without them the end-to-end figures below lie between 21.2 and 27.4 held out
and between 51.1 and 68.0 present, most likely within a point of the figures shown (see Detector
stage).

| index | images | top-1, perfect crop | top-5, perfect crop | end-to-end top-1 | end-to-end top-5 |
|---|---|---|---|---|---|
| single: one reference per oracle | 34,383 | 12.5 | 17.3 | 10.4 | 14.5 |
| multi: one printing per illustration, scanned printings held out | 49,492 | 22.8 | 29.5 | 16.7 | 21.9 |
| **every printing, scanned printing held out (main figure)** | 103,823 less the scanned printing's rows | **28.2** | 36.0 | **21.7** | 27.8 |
| every printing, held out, top-10 vote by oracle | same | 23.6 | 36.0 | 18.9 | 28.0 |
| every printing, scanned printing PRESENT | 103,823 | 69.8 | 75.6 | 52.4 | 55.7 |
| every printing, present, top-10 vote | same | 61.7 | 75.6 | 46.8 | 55.7 |

n = 5,184 scenes (2,592 query printings × 2 renders). Same shot with no damage ("clean", n=2,592):
single 32.6 / 30.7, every-printing held out 52.9 / 48.6, own printing present 100.0 / 90.8
(perfect crop / end to end). Same-printing control (scanning the indexed reference itself,
realistic): 72.6 perfect crop, 68.1 end to end.

Voting by oracle over the top 10 neighbors never helped. It lost 3 to 8 points on top-1 against
taking the nearest image's oracle.

**int8 costs accuracy.** In the realistic mix, with every printing present, the int8 embedder got
42.2% on a perfect crop against fp32's 69.8%. Held out, it got 17.3% against 28.2%. int8 is also
*slower* in onnxruntime-web's WASM (see Latency), so a browser should ship fp32.

## Detector stage

HanClinto `ccgdetector-fastweb-single` 1.39 on cross-printing scenes. Two definitions of
"detected":

- **Corners found**: the predicted quad has IoU of at least 0.90 with the true card.
- **Card present**: corners found, AND the detector's `sharpness` output clears a gate.

`sharpness` separates poorly. The 600 empty scenes include busy playmats of blurred card art, and
their 99th percentile (0.0607) sits close to the card scenes' median (0.0644).

**124 of the 600 "empty" scenes hold a whole card.** The busy-playmat background is a gallery
image, frame and text included, stretched to the frame and blurred (sigma 3 to 8). The seed picks
the background, so the count is exact. Every gated figure in this report used all 600. The run
did not record which empty scene drew which background, and results came back out of order, so
the gate without them cannot be computed exactly from the cached results (the detector was not
re-run). What can be measured, both renders, n=5,184, as in the Headline table:

| empty scenes behind the p99 gate | gate | of the 600 passing | realistic: card present | e2e, held out | e2e, own present |
|---|---|---|---|---|---|
| all 600 (shipped) | 0.0607 | 1.0 | 67.1 | 21.7 | 52.4 |
| 476 card-free, if the 124 scored lowest (strictest case) | 0.0610 | 0.8 | 65.1 | 21.2 | 51.1 |
| 476 card-free, if the 124 scored highest (loosest case) | 0.0213 | 21.5 | 95.9 | 27.4 | 68.0 |
| 476 card-free, if results came back in planned order (**estimate**) | 0.0604 | 1.2 | 68.7 | 22.1 | 53.4 |

The perfect-crop figures (28.2 held out, 69.8 present) do not use the gate. Under the order
estimate the blurred-card scenes score like the rest (median sharpness 0.0127 against 0.0132), so
the likely effect is under a point, upward; the hard range is the two middle rows. No case comes
near the 90% bar. `run_queries.py` now draws empty scenes with no card: a rerun keeps the 476
card-free backgrounds exactly and redraws the other 124.

| augmentation | sev | corners found (IoU ≥ 0.9) | card present, gate p99 | mean IoU | dhvazquez pose model, gate p99 (n=150) |
|---|---|---|---|---|---|
| clean | - | 98.5 | 90.8 | 0.977 | 61.3 |
| realistic | - | 96.1 | 67.5 | 0.967 | 29.3 |
| perspective | 1 / 2 / 3 | 98.7 / 97.9 / 95.1 | 88.7 / 89.1 / 81.1 | 0.980 / 0.976 / 0.963 | 59.3 / 40.7 / 25.3 |
| blur | 1 / 2 / 3 | 98.9 / 97.3 / 93.7 | 89.1 / 70.6 / 38.9 | 0.978 / 0.967 / 0.956 | 50.0 / 4.0 / 0.0 |
| low light | 1 / 2 / 3 | 99.6 / 96.9 / 63.0 | 92.3 / 78.1 / 10.3 | 0.982 / 0.971 / 0.819 | 56.7 / 42.7 / 17.3 |
| glare | 1 / 2 / 3 | 98.4 / 98.6 / 98.4 | 90.7 / 89.7 / 82.4 | 0.979 / 0.979 / 0.975 | 71.3 / 67.3 / 62.7 |
| sleeve sheen | 1 / 2 / 3 | 98.9 / 98.1 / 98.4 | 90.4 / 90.0 / 89.1 | 0.981 / 0.978 / 0.977 | 55.3 / 57.3 / 53.3 |
| occlusion (thumb) | 1 / 2 / 3 | 98.7 / 96.6 / 94.7 | 78.7 / 63.9 / 35.4 | 0.976 / 0.968 / 0.959 | 61.3 / 62.0 / 42.7 |
| low contrast | 1 / 2 / 3 | 98.9 / 98.9 / 99.1 | 93.7 / 94.0 / 92.9 | 0.982 / 0.981 / 0.979 | 63.3 / 66.7 / 69.3 |
| foil | 1 / 2 / 3 | 97.4 / 98.3 / 98.3 | 88.6 / 83.6 / 76.1 | 0.975 / 0.977 / 0.973 | 66.7 / 59.3 / 70.0 |

n = 700 per severity cell, 2,592 for clean and realistic. 3 of the 46,712 scenes (two at low
light 3, one at blur 3) had a self-intersecting predicted quad that the run's convex IoU
(`cv2.intersectConvexConvex`) mis-measured as above 1; they count as misses. Every figure here
comes from that run. Since then, `bench_lib.quad_iou` rasterizes both quads after ordering their
corners geometrically, so a crossed quad is measured as its uncrossed form.

- **The corners are found almost always.** Sleeve sheen, glare and low contrast barely touch the
  detector; low contrast scored highest of all. The exceptions are **full-art cards** (corners
  found on 80.3% of clean shots, against 99-100% for every bordered frame) and **low light
  severity 3** (63.0%).
- **What loses the card is the gate.** Failure mode (a), "the frame isn't seen as a card", is
  real, and the cause is the sharpness gate under low light, blur and thumbs, plus borderless and
  full-art frames. Realistic mix, gate p99: borderless 42.9%, full art 26.9%, flavor-name (Secret
  Lair) 46.9%, M15 82.8%. Corners found on the same scenes: 92.9 / 78.9 / 91.4 / 99.0.
- **Gate trade-off** (cross-printing, end to end with every printing present):

| gate | empty scenes passing | clean: card present | realistic: card present | realistic: e2e, own present | realistic: e2e, held out |
|---|---|---|---|---|---|
| none (corners only) | 100 | 98.5 | 96.1 | 66.9 | 27.0 |
| p90 (≥ 0.0510) | 10.0 | 96.5 | 90.7 | 64.7 | 26.3 |
| p95 (≥ 0.0561) | 5.0 | 95.0 | 84.5 | 61.9 | 25.2 |
| p99 (≥ 0.0607), used in every other table | 1.0 | 90.8 | 67.5 | 52.0 | 21.8 |

The realistic rows here are render 0 only, n=2,592. A real app should gate on frame agreement
and match score rather than sharpness alone. The lab page uses p90.

- **dhvazquez's pose model is far weaker on our scenes**: mean IoU 0.886 on a first check of 240
  scenes, and recall well under HanClinto's in every cell. It is also 7x slower (131 ms against
  17.6 ms). HanClinto's detector is the one to use.

## Matcher stage

Top-1, dhvazquez fp32, cross-printing. "Crop" is the perfect crop (true corners). "On detected"
is the detector's own warp, counted over card-present frames.

| augmentation | sev | single crop | multi crop | every printing held out: crop | held out: top-5 crop | held out: on detected | own printing present: crop | present: on detected |
|---|---|---|---|---|---|---|---|---|
| clean | - | 32.6 | 46.5 | 52.9 | 63.6 | 53.6 | 100.0 | 100.0 |
| realistic | - | 11.8 | 22.5 | 27.9 | 35.5 | 32.3 | 68.6 | 77.1 |
| perspective | 3 | 32.0 | 46.3 | 52.7 | 64.6 | 54.0 | 100.0 | 100.0 |
| blur | 1 / 2 / 3 | 23.1 / 6.6 / 0.4 | 36.9 / 7.9 / 0.6 | 44.9 / 11.9 / 1.4 | 55.4 / 22.0 / 2.3 | 46.8 / 13.2 / 1.1 | 100.0 / 37.6 / 3.1 | 100.0 / 35.6 / 2.6 |
| low light | 1 / 2 / 3 | 23.6 / 5.6 / 0.0 | 36.7 / 10.3 / 0.0 | 46.0 / 12.0 / 0.0 | 56.4 / 19.9 / 0.0 | 45.5 / 11.3 / 0.0 | 99.9 / 41.1 / 0.0 | 99.8 / 40.8 / 0.0 |
| glare | 3 | 30.3 | 44.3 | 50.1 | 61.7 | 51.3 | 100.0 | 100.0 |
| sleeve sheen | 3 | 25.0 | 39.9 | 48.1 | 57.6 | 48.4 | 100.0 | 100.0 |
| occlusion | 3 | 22.6 | 33.6 | 41.7 | 50.4 | 42.7 | 100.0 | 100.0 |
| low contrast | 3 | 32.1 | 46.9 | 52.9 | 64.3 | 53.8 | 100.0 | 100.0 |
| foil | 1 / 2 / 3 | 31.0 / 28.7 / 22.7 | 46.1 / 42.0 / 35.9 | 52.3 / 48.7 / 42.3 | 63.1 / 58.1 / 53.3 | 52.4 / 45.5 / 44.8 | 100.0 / 99.9 / 99.6 | 100.0 / 99.8 / 99.6 |

The realistic row counts render 0 only (n=2,592). The Headline table counts both renders
(n=5,184), which is why it reads 28.2 and 69.8 on a perfect crop where this table reads 27.9 and
68.6.

Every severity of every augmentation is in the appendix. Foil (failure mode b) is matched
correctly when the printing is indexed, and costs about 10 points held out.

## End to end (detector × matcher)

| augmentation | sev | card present | single e2e | held out: on detected | held out: product | held out: measured e2e | own present: e2e |
|---|---|---|---|---|---|---|---|
| clean | - | 90.8 | 30.7 | 53.6 | 48.6 | 48.6 | 90.8 |
| realistic | - | 67.5 | 10.2 | 32.3 | 21.8 | 21.8 | 52.0 |
| blur | 2 | 70.6 | 5.6 | 13.2 | 9.3 | 9.3 | 25.1 |
| low light | 2 | 78.1 | 5.0 | 11.3 | 8.9 | 8.9 | 31.9 |
| glare | 3 | 82.4 | 26.3 | 51.3 | 42.3 | 42.3 | 82.4 |
| sleeve sheen | 3 | 89.1 | 25.3 | 48.4 | 43.1 | 43.1 | 89.1 |
| occlusion | 2 | 63.9 | 19.0 | 49.2 | 31.4 | 31.4 | 63.9 |
| low contrast | 3 | 92.9 | 30.9 | 53.8 | 50.0 | 50.0 | 92.9 |
| foil | 3 | 76.1 | 18.9 | 44.8 | 34.1 | 34.1 | 75.9 |

The realistic row counts render 0 only (n=2,592). The Headline table counts both renders
(n=5,184), which is why it reads 52.4 and 21.7 where this table reads 52.0 and 21.8.

The product equals the measured figure by construction: the matcher's rate is counted over
the detected frames, and an undetected frame is a miss. Both are printed as a check on the
arithmetic.

## DINOv2-small, the fallback, on the same splits

n=400 cross-printing queries. Each cell is perfect crop / end to end. Severity 2 for the
augmentations. DINOv2 runs at 224x168, CLS token, fp32.

| augmentation | dhv single | DINOv2 single | dhv multi | DINOv2 multi | dhv every, held out | DINOv2 every, held out | dhv every, present | DINOv2 every, present |
|---|---|---|---|---|---|---|---|---|
| clean | 34.2 / 30.5 | 47.2 / 45.0 | 49.2 / 42.2 | 71.5 / 63.5 | 54.2 / 48.5 | **72.5 / 64.2** | 100.0 / 89.8 | 100.0 / 89.2 |
| realistic | 12.0 / 9.2 | 25.2 / 18.8 | 24.0 / 16.5 | 40.2 / 26.8 | 31.8 / 22.8 | **44.0 / 28.0** | **71.8 / 50.0** | 65.2 / 39.8 |
| blur | 7.0 / 5.5 | 37.8 / 26.2 | 8.0 / 6.0 | 56.8 / 36.2 | 11.5 / 9.5 | **58.5 / 39.5** | 38.0 / 25.8 | **90.0 / 54.8** |
| low light | 5.8 / 5.8 | 15.2 / 8.8 | 10.0 / 7.2 | 25.2 / 13.0 | 12.2 / 8.8 | 29.2 / 16.2 | 43.2 / 32.2 | 51.2 / 26.5 |
| occlusion | 30.2 / 19.8 | 40.8 / 28.2 | 43.0 / 25.8 | 63.5 / 41.5 | 48.8 / 31.2 | 64.5 / 41.8 | 100.0 / 62.5 | 95.0 / 57.8 |
| foil | 30.8 / 25.5 | 17.5 / 13.0 | 43.8 / 36.0 | 27.5 / 19.5 | 49.8 / 38.8 | 27.5 / 21.8 | **99.8 / 83.0** | 50.7 / 35.5 |

Perspective, glare, sleeve sheen and low contrast at severity 2 (appendix):

- **Below clean:** never more than 3.7 points, for either model, on a perfect crop or end to end.
  The largest drop is DINOv2 held out under sleeve sheen, 68.8 against 72.5.
- **Above clean:** low contrast reads up to 4.6 points higher end to end. Examples: dhvazquez,
  own printing present, 94.2 against 89.8; DINOv2 93.8 against 89.2. The card-present gate
  passes more low-contrast frames (94.0% against 90.8%).

- **DINOv2 is a better *card* matcher and a worse *printing* matcher.** It finds the right card
  from a printing it never indexed far more often (72.5 against 54.2 clean), and it survives blur
  (90.0 against 38.0, own printing present).
- **Foil breaks it**: the rainbow sheen moves a general-purpose embedding a long way.
- **The two fail differently, so combining them is worth testing on real photos.** That test
  has not been run.
- Its cost: 101.8 ms per crop on CPU against 43.1 ms, and 285 ms in WASM against 88 ms. The
  model is 88.5 MB fp32 or 24.4 MB int8; the int8 accuracy was not measured (onnxruntime 1.19
  in the Python venv cannot run its ConvInteger node).

## Frame agreement (blur and low light)

300 cross-printing queries, 5 independent frames each, every frame augmented at the same severity
with its own seed. Detector path, with the p99 gate. A frame votes when it passes the card-present
gate, the only signal a real scanner has; ground-truth corners are not consulted, so a frame whose
quad is badly placed still votes. A frame below the gate casts no vote. Top-1 on the
every-printing index; "single frame" is frame 0 by the same rule. At most 0.1% of frames in any
row pass the gate with a badly placed quad (IoU under 0.9), so this moves one row by a third of a
point.

| augmentation | sev | index | single frame right | 2-of-3: right / no answer / wrong | 3-of-5: right / no answer / wrong |
|---|---|---|---|---|---|
| blur | 1 | own present | 87.0 | 90.0 / 10.0 / 0.0 | 89.7 / 10.3 / 0.0 |
| blur | 2 | own present | 27.0 | 26.3 / 57.7 / 16.0 | 26.3 / 65.0 / 8.7 |
| blur | 3 | own present | 1.7 | 1.0 / 85.0 / 14.0 | 0.3 / 92.0 / 7.7 |
| low light | 1 | own present | 90.7 | 92.7 / 7.0 / 0.3 | 93.3 / 6.3 / 0.3 |
| low light | 2 | own present | 33.3 | 34.3 / 31.7 / 34.0 | 34.3 / 34.0 / 31.7 |
| low light | 3 | own present | 0.0 | 0.0 / 94.7 / 5.3 | 0.0 / 94.7 / 5.3 |
| realistic | - | own present | 50.3 | 51.0 / 48.0 / 1.0 | 55.7 / 44.0 / 0.3 |
| blur | 1 | held out | 42.7 | 42.7 / 29.0 / 28.3 | 42.7 / 33.3 / 24.0 |
| blur | 2 | held out | 9.7 | 8.0 / 65.0 / 27.0 | 7.7 / 79.3 / 13.0 |
| low light | 1 | held out | 40.3 | 41.3 / 16.7 / 42.0 | 40.7 / 20.0 / 39.3 |
| low light | 2 | held out | 9.0 | 8.7 / 39.0 / 52.3 | 8.0 / 45.0 / 47.0 |
| realistic | - | held out | 22.3 | 22.0 / 72.0 / 6.0 | 21.0 / 73.7 / 5.3 |

- **Agreement is a precision tool.** With the printing indexed, 3-of-5 on the realistic mix
  answers 55.7% right and 0.3% wrong, against a single frame's 50.3% right and about half wrong
  or undetected.
- **It does not rescue blur or low light.** At severity 2 the frames are wrong *consistently*:
  under low light severity 2, 31.7% of queries reach a 3-of-5 consensus on the wrong card. Low light is
  the worse of the two, because noise and a color cast pull every frame toward the same
  neighbor.
- **The capture-side remedy for blur and low light is better frames, not more votes.** That
  means a steadiness check, torch where available, and asking the player to hold still.
- Not simulated: real consecutive frames are correlated (same blur, same light), so real
  agreement will behave closer to "no new information" than these independent frames do.

## Strata (realistic mix, cross-printing, end to end top-1)

| query printing | n | card present | single | every printing held out | own present |
|---|---|---|---|---|---|
| M15 frame | 1,022 | 82.8 | 23.0 | 29.9 | 61.0 |
| modern (2003) | 554 | 86.8 | 14.6 | 34.7 | 69.7 |
| old border | 540 | 75.0 | 5.0 | 28.3 | 57.2 |
| retro-frame reprint | 474 | 83.5 | 5.7 | 18.4 | 63.5 |
| extended art | 552 | 71.6 | 20.8 | 23.2 | 58.0 |
| showcase | 624 | 61.2 | 5.9 | 20.4 | 49.8 |
| borderless | 620 | 42.9 | 2.3 | 13.1 | 34.4 |
| flavor name (Secret Lair, Universes Beyond renames) | 452 | 46.9 | 0.2 | 7.1 | 38.1 |
| full art | 346 | 26.9 | 0.6 | 5.8 | 22.8 |
| double-faced (front) | 458 | 73.6 | 18.8 | 20.5 | 59.4 |
| split / adventure | 446 | 62.8 | 24.4 | 20.0 | 46.9 |
| same art as the reference | 2,284 | 79.9 | 20.7 | 26.0 | 60.8 |
| different art from the reference | 2,898 | 56.9 | 2.3 | 18.4 | 45.7 |
| art unknown (no illustration id) | 2 | 50.0 | 0.0 | 0.0 | 50.0 |
| released after the embedder was trained (2026-05-21) | 510 | 37.6 | 5.5 | 8.4 | 27.1 |
| printing among the embedder's training classes | 1,036 | 72.4 | 8.5 | 21.7 | 55.4 |
| printing not among them | 4,148 | 65.7 | 10.9 | 21.7 | 51.6 |

Only 20,703 of our 102,571 paper printings are among the 82,110 printings the embedder was
trained on. The rest of its classes are other languages. Being a training class made no difference
held out (21.7 both).

## Failure modes, with examples

From the realistic mix, cross-printing. All of the examples are real rows of the run.

1. **The index has a different printing from the one scanned (the main failure).** With one
   reference per oracle, 2,804 of 4,537 wrong answers are scans whose art differs from the
   reference's. Examples: Eldrazi Monument [SLD 603, borderless] → Grim Lavamancer; Meteor
   Crater [EOS 26, borderless] → Mortus Strider; Quest for Renewal [SLD 2405] → Haughty Djinn.
   The fix is to index every printing; this is the ManaBox-style bundle.
2. **The frame looks like another card's frame.** Scans fall to basic lands:
   - two old-border cards: Armageddon [PTC] → Forest, Mana Short [LEB] → Mountain;
   - an M15-frame card: Dawn of Hope [LTC] → Swamp;
   - a borderless one: Restless Cottage [WOE] → Forest. A cycle in the same treatment confuses its
   members: Talisman of Dominance [SLD] → Talisman of Resilience, Furycalm Snarl → Frostboil
   Snarl, Zopandrel → Tekuthal (ONE showcase Dominus). 239 of 3,723 held-out errors are the same
   artist with different art.
3. **A different oracle with the same art did not occur.** No wrong answer in 5,184 went to an
   oracle sharing the true card's illustration. An earlier version of this report counted one, The
   Colossal Dreadmaw [UNK RG06b] → Dockbreacher: both are playtest printings with no illustration
   id in Scryfall's data, and the report treated the two missing ids as equal. 549 of the
   catalog's 102,571 printings have no illustration id and 550 no artist. An unknown now matches
   nothing and claims nothing: two missing ids are neither the same art nor different art. Its two
   frames (one query, two renders) now read as art unknown, in the strata and in the failure modes,
   so single-gallery "art differs" moves 2,806 → 2,804 and "other" 1,714 → 1,716; the held-out
   "other" counts (3,484 and 2,258) do not move. The strata moved by those two frames:
   different art from the reference 2,900 → 2,898 (held out 18.3 → 18.4), query art not in the
   multi gallery 1,702 → 1,700. The query
   itself stays in the `different_art` sampling stratum it was drawn from, since the run's sample
   is fixed; `plan_sets.py` no longer puts a printing with an unknown id in that stratum. The
   multi gallery the run used also grouped every printing with no illustration id under one key,
   so 14 printings of 5 oracles (none of them queried) were left out of it as if they repeated an
   indexed illustration; `plan_sets.py` now keeps each such printing as its own group. Only
   distractors are missing (14, beside the gallery's 49,492), and the multi figures are from the
   run as made.
   The Universes Beyond and Secret Lair renames are the SAME oracle with a `flavor_name`, so for
   card-level identification they are not confusions at all. They fail on art instead: flavor-name
   printings scored 0.2% single and 7.1% held out.
4. **Blur and low light**, independently of everything above (see the matcher table). This is the
   embedder's weakness, not the detector's.
5. **The card-present gate** on borderless, full-art and thumb-covered cards (see Detector stage).
6. **Same-name twins** (an Alchemy or playtest oracle beside the paper one) did not occur. Digital-
   only oracles are not in the index.

**Confidence can gate auto-accept, once the printing is indexed.** Own printing present, detected
frames, realistic: accepting only when the top-1 beats the runner-up by 0.05 or more accepts
72.8% of frames, 97.9% of them right, with 1.6% of all frames confidently wrong. Held out, the
same rule accepts 27.0% of frames at 79.7% right. Margin, not raw cosine, is the useful signal:
right answers have a median margin of 0.197 against 0.014 for wrong ones.

## Method

- **Catalog**: staging, read-only (a `default_transaction_read_only` session on branch
  `br-polished-pond-a6e63y0b`; SELECTs on `cards` and `printings` only), joined to Scryfall's
  `default_cards` bulk (fetched once, `default-cards-20261014210635.jsonl.gz`) for frame, border,
  frame effects, promo, release date, illustration id and artist.
  - **33,891 oracles.** Layouts excluded: planar, scheme, vanguard, front_card, token,
    double-faced token, art series, emblem. Oracles with no paper printing in the bulk (1,030)
    are dropped too.
  - **102,571 paper printings**, oversized excluded.
- **Reference per oracle (single gallery)**: `cards.scryfall_id` / `cards.image_uri`. That is the
  printing our catalog's oracle row came from, Scryfall's `oracle_cards` choice ("the most
  up-to-date recognizable version"). When it was not a paper printing in today's bulk (1,062
  oracles), the newest non-promo paper printing was used instead. A double-faced card also
  indexes its reference's back face. Total: 34,383 images.
- **Galleries**: single (34,383); multi (49,492: one printing per (oracle, illustration), the
  reference for its own art, else the newest non-promo, with the query printings held out); every
  printing (103,823 with DFC backs). Held-out figures mask the scene's own Scryfall id per scene.
- **Top-k by oracle**: the run ranked the 60 nearest printing rows and deduplicated them by
  oracle, so a card whose printings fill those 60 rows could return fewer than 5 oracles,
  understating top-5 and leaving no runner-up for the margin. Counted in `results.jsonl`: of
  46,712 card scenes, 2 dhvazquez fp32 lists (both same-printing controls, outside every
  margin and top-5 cross-printing figure), 4 int8 lists and 8 DINOv2 lists came back short, and
  in every short fp32 and int8 list the right oracle was already present and ranked first (the DINOv2 figures are top-1
  only, which a short list cannot change), so no figure in this report moves. No fp32 list lacks a runner-up. `run_queries.py` now widens the
  pool until it holds 5 distinct oracles among unmasked rows. The top-10 vote rows count 10
  printing rows by design and can name fewer than 5 oracles.
- **Images**: the catalog's stored `normal` URIs (cards.scryfall.io, 488x680), each fetched
  once (103,361 files, 11.0 GB, 0 failures). The fetch used 8 workers with keep-alive, a 0.1 s
  pause per worker and a research User-Agent, and ran at about 42/s.
- **Queries**: 2,812 oracles, stratified. 220 per stratum for treatment (old border, 2003, M15,
  retro reprint, borderless, extended art, showcase, flavor name), layout (DFC,
  split/adventure), different-art printings, and single-printing cards. Two strata ran short:
  full art (170) and basic land (2). Strata are filled in name order, each oracle used once, and
  the strata filled earlier had already taken the rest of their oracles. Tokens are excluded.
  The query printing is a random OTHER paper printing where one exists (2,592), plus the
  reference itself as a control.
- **Scenes** (`bench_lib.render`): a 720x960 phone frame on a plain, wood, playmat or busy
  (blurred card art) background.
  - The card is composited with a rounded-corner mask and a contact shadow, at 62-80% of frame
    height, with small tilt and rotation, then augmented and JPEG-encoded.
  - Augmentations at severity 1/2/3:
    - perspective: tilt 6/11/17%, rotation 8/15/22°;
    - motion blur 5/11/19 px plus defocus σ 1/2/3.5;
    - low light: gain 0.55/0.38/0.25, noise σ 7/13/20, a warm cast, chroma noise;
    - glare: 1/2/3 saturated specular spots;
    - sleeve sheen: a broad highlight band at 15/25/38% plus desaturation;
    - occlusion: a skin-toned thumb from an edge, covering 5/12/20% of the card;
    - low contrast: the table 40/20/7 levels from the card's own border color;
    - foil: a rainbow sheen at 15/28/42% plus 1/2/3 specular streaks;
    - realistic: the mix described under Headline numbers.
- **Sets**:
  - A: all queries; clean, plus realistic twice; cross and same.
  - B: 700 queries; every augmentation at severity 1-3.
  - C: B's same-printing control at severity 2.
  - D: 400 queries for DINOv2.
  - F: 300 queries × 5 frames for agreement.
  - P: 150 queries for the pose model.
  - N: 600 empty scenes for the gate (124 of them on a blurred whole card; see Detector stage).
  - Total: 46,712 card scenes plus 600 empty ones, in 31 minutes on 12 processes.
- **Pipeline**: detector → OpenCV perspective warp of its four corners to 448x320 (the embedder's
  input; ImageNet mean/std) → L2-normalized embedding → brute-force cosine over the gallery,
  aggregated to the best image per oracle. A perfect crop warps the true corners instead.
- **HanClinto input contract**: not stated on the model card. A centered letterbox to 384
  measured slightly ahead of a stretch on 240 scenes (mean IoU 0.984 against 0.979, IoU ≥ 0.9
  on 100% against 99.2%), so the benchmark and the lab use the letterbox.

### Limits

- **Synthetic.** 2D composites, not photographs. No real sensor, motion, focus breathing,
  curved sleeves, or holo patterns.
- **The embedder may know these images.** It trained on 3D renders of Scryfall art, so the
  "own printing present" figures may be optimistic for real photos. The held-out figures are
  the safer read.
- **Not tested**: back faces of DFCs as queries, non-English printings, and rotations past 22°
  (an upside-down card).
- **Contended machine.** Other sessions kept the load average between 20 and 110 throughout.
  Accuracy does not depend on it; latency does, and is reported as the median and minimum of
  isolated runs.

## Licenses (read 2026-10-14)

| model | where | license | evidence | version | file and size |
|---|---|---|---|---|---|
| dhvazquez embedder (EfficientNet-Lite0 + SubCenterArcFace, 256-d) | [HF](https://huggingface.co/dhvazquez/mtg_card_identification_embeddings) | MIT | README front matter `license: mit`; no LICENSE file in the HF repo. The [training repo](https://github.com/diegovazquez/mtg_train_card_identification_embeddings) has no LICENSE (GitHub: none) | commit `653d88d94b2b`, run `20260521-044732` | `onnx/mtg_embed_fp32.onnx` 14,756,557 B (every weight inline; the 14.8 MB `.onnx.data` sidecar is unused); `mtg_embed_fp16.onnx` 7,390,423 B; `mtg_embed_int8.onnx` 3,846,842 B |
| dhvazquez pose (DETRPose-S, 4 keypoints) | [HF](https://huggingface.co/dhvazquez/mtg_card_pose_estimation) | MIT | README `license: mit`. The [training repo](https://github.com/diegovazquez/mtg_train_card_pose_estimation) LICENSE: "MIT License, Copyright (c) 2026 Diego Vazquez ... This MIT License covers the SOURCE CODE in this repository only ... It does NOT cover: The DETRPose fork ... Apache License 2.0 ... The training dataset ... derivative of Wizards of the Coast card art, used under the Wizards Fan Content Policy ... Non-commercial only." | commit `ef6d7912e7e2` | `exports/mtg_4kp_s_r4b.onnx` 14,850,609 B + `.data` 14,745,600 B; `_fp16` 7,495,617 B |
| HanClinto ccgdetector-fastweb-single 1.39 ("corndog") | [HF](https://huggingface.co/HanClinto/ccgdetector-fastweb-single) | MIT | HF metadata and README `license: mit`; no LICENSE file in the repo. ONNX metadata: `base_model mit-han-lab/efficientvit-b0` (that repo is Apache-2.0 on GitHub). Training data not stated. | commit `66ffd4976ec5` | `fastweb-single-1.39.onnx` 3,185,226 B |
| DINOv2-small | [facebook/dinov2-small](https://huggingface.co/facebook/dinov2-small), ONNX from [onnx-community](https://huggingface.co/onnx-community/dinov2-small) | Apache-2.0 | facebook repo `license: apache-2.0`; [facebookresearch/dinov2](https://github.com/facebookresearch/dinov2) Apache-2.0. The onnx-community export carries no tag of its own | commit `8b1f705a3a7f` | `onnx/model.onnx` 88,532,934 B; `model_int8.onnx` 24,446,700 B |
| onnxruntime-web | npm / jsDelivr | MIT | microsoft/onnxruntime: MIT | 1.27.0 | `ort.wasm.min.mjs` 50 KB, `ort-wasm-simd-threaded.wasm` 13.5 MB (3.4 MB gz) |

sha256 of each file is pinned in `fetch_weights.py`.

- **Not used**: Milo, Cornelius, CollectorVision (AGPL-3.0), Apple MobileViT and MobileCLIP.
  The HanClinto detector belongs to the CollectorVision family, but the weights are published
  MIT. None of CollectorVision's AGPL code was read or used: the letterbox contract was measured.
- **Caveats carried from the model research**: both dhvazquez models rest on HF metadata MIT
  alone, and the embedder's code repo is unlicensed. Its training data (and the pose model's) is
  declared Fan Content Policy, non-commercial. The 99 is free, which fits. Whether embeddings of
  card art are derivative is unresolved, and no lawyer has been asked.
- **One weights oddity**: Python onnxruntime 1.19.2 (the newest for the system Python 3.9)
  rejects the HanClinto file for a duplicate node name. `fix_detector.py` writes a copy with the
  names made unique. onnxruntime-web 1.27 loads the original as published, checked under Node.

## Sizes

| artifact | rows | dim | int8 index (rows × dim + a float32 scale per row) | gzip |
|---|---|---|---|---|
| single, dhvazquez | 34,383 | 256 | 8.94 MB, plus 2.25 MB JSON of ids and names | - |
| multi, dhvazquez | 49,492 | 256 | 12.87 MB (arithmetic, not exported) | - |
| every printing, dhvazquez | 103,823 | 256 | **26.99 MB, plus 2.65 MB JSON** | 25.3 MB + 1.36 MB |
| every printing, DINOv2 | 103,823 | 384 | 40.28 MB (arithmetic, not exported) | - |

int8 quantization of the *index* (per-row scale) is harmless: every row's cosine to its float
row is at least 0.99993. The int8 *model* is what costs accuracy.

Browser download for the lab, everything gzipped:

| item | size, gzipped |
|---|---|
| WASM runtime | 3.4 MB |
| detector | 2.9 MB |
| embedder fp32 | 13.7 MB |
| every-printing index | 26.7 MB |
| **first open, total** | **≈ 47 MB** |

## Latency

Single thread on an Apple M4 Pro, load average about 23 during these runs. Median / minimum of
15-40 runs per stage.

| stage | Python onnxruntime 1.19 CPU, `latency.py` (ms) | onnxruntime-web 1.27 WASM under Node, the lab's browser path, `wasm_bench.mjs` (ms) |
|---|---|---|
| HanClinto detector, 384 | 17.6 / 16.8 | 28.7 / 25.8 |
| dhvazquez pose model, 640 | 131.0 / 127.3 | - |
| warp to 448x320 | 0.3 / 0.1 (OpenCV) | 3.5 / 3.1 (the lab's JS) |
| dhvazquez embedder fp32 | 44.9 / 43.1 | **88.6 / 87.6** |
| dhvazquez embedder fp16 | 45.8 / 44.4 | 196.7 / 143.2 (measured under load ~43) |
| dhvazquez embedder int8 | 21.4 / 19.0 | 150.7 / 145.7 |
| DINOv2-small fp32, 224x168 | 106.5 / 101.8 | 290.6 / 285.4 |
| DINOv2-small int8 | not runnable on 1.19 | 244.1 / 234.5 |
| kNN, 103,823 × 256 | 2.13 / 1.59 (numpy fp32; measured 2026-10-15 at load ~17, see below) | 45.0 / 39.2 (the lab's JS, int8) |
| kNN, 34,383 × 256 | 0.70 / 0.24 | 38.1 / 23.9 (measured under load ~43) |

The every-printing numpy row was missing from `latency.py` in the first run, and the figure first
printed here (1.34 / 1.09 ms) had no measurement behind it. `latency.py` now times 103,823 × 256
(and × 384); its kNN loop, run alone on 2026-10-15 at load ~17, read 2.13 / 1.59 ms, against
0.94 / 0.32 ms for 34,383 × 256 in the same run. Inside the benchmark run itself, the
every-printing kNN took a median of 1.5 ms (`t_knn_all`, appendix).

- **On this laptop, in the lab's own code path, one frame costs about 166 ms** (detector + warp +
  fp32 embedder + kNN over every printing), or about 6 frames a second.
- **Estimate (not measured):** a mid-range phone's single WASM thread is commonly 2-4x slower
  than this core, which puts a frame at about 0.35-0.7 s, or 1.5-3 frames a second, and the
  every-printing JS kNN at about 80-180 ms. WebGPU could cut the model time. The lab page
  measures this on a real phone and records it with every tap.
- The embedder parity check passed. On the 5 scenes `parity_scenes.py` writes, the lab's JS warp
  and onnxruntime-web reproduce Python's corners exactly (0.00 px) and its sharpness to 4 places,
  and the fp32 embedding, the one the lab ships, at cosine 0.9966-0.9988 (0.9966, 0.9986, 0.9976,
  0.9972, 0.9988; measured 2026-10-15). The int8 embedder matches its own Python run at
  0.9951-0.9986 on the same scenes.

## Matching on the phone or on our server

| | match on the phone | embed on the phone, match on our server |
|---|---|---|
| first-open download | ≈ 47 MB (runtime, both models, a 26.7 MB index) | ≈ 20 MB (runtime and both models) |
| per scan, network | none | ~1 KB up (a 256-float embedding), a few hundred bytes down; a round trip on slow 4G is about 600 ms, the spike's slow profile |
| match time | 39-45 ms JS on this laptop; estimate 80-180 ms on a phone | 1.5-2.1 ms numpy on this laptop; the round trip dominates |
| privacy | nothing leaves the device | only the embedding leaves; no pixels |
| update cost | every new set means re-downloading the index (26.7 MB), or building a delta format | the server appends the new printings' rows after the daily catalog refresh; phones download nothing |
| offline | works | needs a connection, though captures can queue (the scanning plan's §7) |

**Recommendation: embed on the phone, match on our server.** The privacy is the same in practice,
the phone's download falls by 26.7 MB, and the index moves with the catalog for free. Keep an
offline index as a later option behind the same code path, since `match.ts` already runs it.
The lab page matches on the phone only because a staging lab with no server index is simpler.

## Step 3: the lab page (built, staging only)

- **Route**: `/lab/scan`, behind the plumbing switch `SCAN_LAB_ENABLED` and read from the
  reader's resolved env (`scanLabEnabled(await requestSwitchEnv(userId))`). With the switch off
  the route is a 404. It is never linked.
- **Pipeline**: the live camera feeds HanClinto's detector, the JS warp, the dhvazquez fp32
  embedder and a JS kNN over the every-printing index. The page shows the guess, the runners-up,
  its score and margin, whether 3 frames agree, and per-stage timings.
- **Taps**: ✓/✗ posts to `/api/scan-lab/result`, which stores the guess, right or wrong, score,
  margin, latency and agreement in `scan_lab_results`. A frame (the warped 320x448 card, JPEG,
  capped at 400 KB) is stored only when "Keep this frame" is ticked. The table is purged with the
  account.
- **Files** (in the separate lab PR, branch `feat/scan-lab`, not in this one):
  - `src/lib/scan-lab/*` (pure geometry, matching and result parsing, all unit tested);
  - `src/components/scan-lab/scan-lab.tsx`;
  - migration `0129_scan_lab` (the new table, plus the switch added to `flag_overrides`' check);
  - registry, flags and admin copy entries.
  - The Permissions-Policy is unchanged; it already leaves the camera to this origin.
- **To use it on staging**:
  - Set `SCAN_LAB_ENABLED=true` on the staging project.
  - Host `scan-index.json` and `scan-index.bin` (from `export_index.py all fp32`, in
    `$CARD_SCAN_DIR/out/lab-index/`) at a URL that allows CORS. Set `SCAN_LAB_INDEX_BASE` to it.
  - Migration 0129 must have reached staging's database.
  - The runtime loads from jsDelivr and both models from Hugging Face at pinned commits (both
    send CORS headers; checked for the detector).
  - The CSP is report-only, so nothing is blocked, but expect `[csp]` lines for those hosts.
- **Gate**: the lab uses the p90 sharpness gate (0.051) plus 3-frame agreement.
- **Not done**: no browser run on a phone, no design. The page was built and type-checked, its
  pure modules are unit tested, and its model path was run end to end under Node.

## Recommendation

**Collect real photos with the lab page.** Do not go to Design yet, and do not drop the fallback.

1. **Next: a real-photo pass on staging.** About 200 of Hugh's own cards through `/lab/scan`,
   across the strata above (sleeved and bare, foil, borderless, old border, dim light), with
   "Keep this frame" ticked on every tap. The taps measure the shipped path. The kept frames let
   us re-score DINOv2, a DINOv2 + dhvazquez combination, and other indexes offline, without
   asking Hugh to shoot again.
2. **Index every printing, whichever embedder wins.** One reference per oracle is ruled out
   (10.4% end to end). Matching stays card-level: vote to the oracle, and the player picks the
   set, ManaBox's normal mode.
3. **Test the fallback on the same frames.** DINOv2-small held its own across printings and blur
   and failed on foil. That suggests a two-embedder agreement rule may beat either alone. It is
   untested, and the kept frames are what test it.
4. **Capture side**: gate on steadiness and frame agreement rather than the detector's sharpness
   alone. Ask for light: blur and low light are the two failures no index fixes.
5. **Go to Design when** real photos reach the bar: 90% oracle top-1 end to end, with
   confident-wrong at 1% or less under the auto-accept rule. Design would then build the
   ManaBox-style flow recorded in Context. The open dedupe question (c) goes with it.

## Reproduce

- **Data and weights**: everything heavy lives in `CARD_SCAN_DIR`, outside the repository. This
  run's is
  `/private/tmp/claude-501/-Users-huey-Projects-the-99/27459524-1582-4162-90da-02387da8d496/scratchpad/card-scan`
  (weights/, bulk/, img/ 11 GB, out/, venv-arm/).
- **Environment**: the venv must be arm64 on Apple silicon (`arch -arm64`), or everything runs
  under Rosetta at about 3x the cost.
- **Inputs fetched by hand, before the scripts run** (no script fetches them):
  - `$CARD_SCAN_DIR/bulk/default_cards.jsonl.gz`, which `build_catalog.py` opens. It is
    Scryfall's `default_cards` bulk file in its gzipped JSON-lines form, one card object per line
    (the reader also skips a bare `[` or `]` line and a trailing comma, so the gzipped JSON-array
    form works too). This run's copy was fetched once on 2026-10-14 from
    `https://data.scryfall.io/default-cards/default-cards-20261014210635.jsonl.gz` (the URL is
    kept beside it in `bulk/SOURCE_URL`): 79,718,635 bytes, 118,740 lines, sha256
    `98cd569c3ee869c83eaec7da8fc7f8e03da1e8260560c05fb62ac514c8ae4f21`. Scryfall replaces the file
    daily and serves the newest from `https://api.scryfall.com/bulk-data/default-cards`
    (`download_uri`), so a later fetch will not reproduce these counts exactly.
  - `$CARD_SCAN_DIR/meta/dhv_class_map.json`, which `report.py` reads for the
    `query_printing_trained` stratum. It is the embedder's own `class_map.json`, from the same
    pinned commit as its weights:
    `https://huggingface.co/dhvazquez/mtg_card_identification_embeddings/resolve/653d88d94b2beb31a7894561e7c6b26f589a3861/20260521-044732/class_map.json`
    (8,609,185 bytes, sha256 `555abd796c9df2dab3edf678f9e089fcd88db6fa33b30afafb08f4488891d190`).
    Without it the report prints that stratum as unknown rather than guessing.
- **Run, in order**:
  1. `fetch_weights.py`, then `fix_detector.py`
  2. `build_catalog.py`, which needs `THE_99_NEON_STAGING_DIRECT` and reads only
  3. `plan_sets.py 220`
  4. `download.py`
  5. `embed_gallery.py 12 dhv` and `embed_gallery.py 12 dino`
  6. `run_queries.py 12`
  7. `report.py`, which printed the appendix
  8. `latency.py`
  9. `export_index.py all fp32`, for the lab
  10. `parity_scenes.py`, which writes the parity set into `$CARD_SCAN_DIR/parity/`: five pinned
      printings rendered with fixed seeds, as raw RGBA frames and detector squares, and
      `expected.json` with Python's corners, sharpness and both embeddings of the detected warp
      (`emb` int8, `emb32` fp32). Then `wasm_bench.mjs` for the browser-path parity and WASM
      latency. It runs the lab's own `src/lib/scan-lab` code, refuses a parity set with no `emb32`,
      and needs onnxruntime-web 1.27.0 installed outside the repository (see its header).

## Appendix: every table the run printed

The output of `report.py` over `results.jsonl` (46,712 card scenes, 600 empty), unedited. The
realistic rows of its Detector, Matcher and End-to-end tables count render 0 only (n=2,592). The
Headline table counts both renders (n=5,184).

### Gate

scenes 46712, empty scenes 600. HanClinto sharpness on empty scenes: p50 0.0130, p99 0.0607, max 0.0648; on card scenes p1 0.0191, p50 0.0644. dhvazquez pose score on empty scenes p99 0.392.

### Card-present gate sensitivity (cross-printing; end-to-end top-1 with the gate at each percentile of empty-scene sharpness)

| gate | sharpness >= | empty scenes passing | clean: detected | clean: all_heldout e2e | clean: all e2e | realistic: detected | realistic: all_heldout e2e | realistic: all e2e |
|---|---|---|---|---|---|---|---|---|
| none (corners only) | - | 100.0 | 98.5 | 52.3 | 98.5 | 96.1 | 27.0 | 66.9 |
| p90 | 0.0510 | 10.0 | 96.5 | 51.6 | 96.5 | 90.7 | 26.3 | 64.7 |
| p95 | 0.0561 | 5.0 | 95.0 | 50.9 | 95.0 | 84.5 | 25.2 | 61.9 |
| p99 (used below) | 0.0607 | 1.0 | 90.8 | 48.6 | 90.8 | 67.5 | 21.8 | 52.0 |

### Headline (set A, realistic mix, 2 renders per query)

| query | n | gallery | detected | top-1 perfect crop | top-5 perfect crop | top-1 on detected | end-to-end top-1 | end-to-end top-5 |
|---|---|---|---|---|---|---|---|---|
| cross-printing (a different printing from the reference) | 5184 | single | 67.1 | 12.5 | 17.3 | 15.5 | 10.4 | 14.5 |
| cross-printing (a different printing from the reference) | 5184 | multi | 67.1 | 22.8 | 29.5 | 24.9 | 16.7 | 21.9 |
| cross-printing (a different printing from the reference) | 5184 | all_heldout | 67.1 | 28.2 | 36.0 | 32.4 | 21.7 | 27.8 |
| cross-printing (a different printing from the reference) | 5184 | all_heldout_vote | 67.1 | 23.6 | 36.0 | 28.2 | 18.9 | 28.0 |
| cross-printing (a different printing from the reference) | 5184 | all | 67.1 | 69.8 | 75.6 | 78.1 | 52.4 | 55.7 |
| cross-printing (a different printing from the reference) | 5184 | all_vote | 67.1 | 61.7 | 75.6 | 69.8 | 46.8 | 55.7 |
| same printing as the reference (control) | 5184 | single | 89.4 | 72.6 | 78.0 | 76.2 | 68.1 | 73.3 |
| same printing as the reference (control) | 5184 | all_heldout | 89.4 | 31.4 | 41.6 | 33.3 | 29.7 | 39.1 |
| same printing as the reference (control) | 5184 | all | 89.4 | 70.8 | 76.6 | 75.1 | 67.2 | 72.0 |
| only one printing exists | 440 | single | 88.4 | 72.0 | 78.6 | 75.8 | 67.0 | 73.0 |
| only one printing exists | 440 | all_heldout | 88.4 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| only one printing exists | 440 | all | 88.4 | 69.5 | 74.5 | 73.5 | 65.0 | 70.2 |
| cross-printing, CLEAN shot | 2592 | single | 90.8 | 32.6 | 40.3 | 33.8 | 30.7 | 38.8 |
| cross-printing, CLEAN shot | 2592 | all_heldout | 90.8 | 52.9 | 63.6 | 53.6 | 48.6 | 58.0 |
| cross-printing, CLEAN shot | 2592 | all | 90.8 | 100.0 | 100.0 | 100.0 | 90.8 | 90.8 |

### int8 embedder against fp32 (cross-printing, realistic)

| gallery | fp32 top-1 crop | int8 top-1 crop | fp32 end-to-end | int8 end-to-end |
|---|---|---|---|---|
| single | 12.5 | 9.1 | 10.4 | 8.1 |
| multi | 22.8 | 13.8 | 16.7 | 10.7 |
| all_heldout | 28.2 | 17.3 | 21.7 | 13.7 |
| all | 69.8 | 42.2 | 52.4 | 32.1 |

### Detector stage (cross-printing queries; set B, plus clean and realistic from A)

| augmentation | severity | n | HanClinto recall (IoU>=0.9 + gate) | IoU>=0.9 alone | mean IoU | dhvazquez pose recall (n) |
|---|---|---|---|---|---|---|
| clean | - | 2592 | 90.8 | 98.5 | 0.977 | 61.3 (150) |
| realistic | - | 2592 | 67.5 | 96.1 | 0.967 | 29.3 (150) |
| perspective | 1 | 700 | 88.7 | 98.7 | 0.980 | 59.3 (150) |
| perspective | 2 | 700 | 89.1 | 97.9 | 0.976 | 40.7 (150) |
| perspective | 3 | 700 | 81.1 | 95.1 | 0.963 | 25.3 (150) |
| blur | 1 | 700 | 89.1 | 98.9 | 0.978 | 50.0 (150) |
| blur | 2 | 700 | 70.6 | 97.3 | 0.967 | 4.0 (150) |
| blur | 3 | 700 | 38.9 | 93.7 | 0.956 | 0.0 (150) |
| low_light | 1 | 700 | 92.3 | 99.6 | 0.982 | 56.7 (150) |
| low_light | 2 | 700 | 78.1 | 96.9 | 0.971 | 42.7 (150) |
| low_light | 3 | 700 | 10.3 | 63.0 | 0.819 | 17.3 (150) |
| glare | 1 | 700 | 90.7 | 98.4 | 0.979 | 71.3 (150) |
| glare | 2 | 700 | 89.7 | 98.6 | 0.979 | 67.3 (150) |
| glare | 3 | 700 | 82.4 | 98.4 | 0.975 | 62.7 (150) |
| sleeve | 1 | 700 | 90.4 | 98.9 | 0.981 | 55.3 (150) |
| sleeve | 2 | 700 | 90.0 | 98.1 | 0.978 | 57.3 (150) |
| sleeve | 3 | 700 | 89.1 | 98.4 | 0.977 | 53.3 (150) |
| occlusion | 1 | 700 | 78.7 | 98.7 | 0.976 | 61.3 (150) |
| occlusion | 2 | 700 | 63.9 | 96.6 | 0.968 | 62.0 (150) |
| occlusion | 3 | 700 | 35.4 | 94.7 | 0.959 | 42.7 (150) |
| low_contrast | 1 | 700 | 93.7 | 98.9 | 0.982 | 63.3 (150) |
| low_contrast | 2 | 700 | 94.0 | 98.9 | 0.981 | 66.7 (150) |
| low_contrast | 3 | 700 | 92.9 | 99.1 | 0.979 | 69.3 (150) |
| foil | 1 | 700 | 88.6 | 97.4 | 0.975 | 66.7 (150) |
| foil | 2 | 700 | 83.6 | 98.3 | 0.977 | 59.3 (150) |
| foil | 3 | 700 | 76.1 | 98.3 | 0.973 | 70.0 (150) |

### Matcher stage (cross-printing queries, dhvazquez fp32)

| augmentation | severity | single crop | single on detected | multi crop | all_heldout crop | all_heldout top-5 crop | all_heldout on detected | all (own present) crop | all on detected |
|---|---|---|---|---|---|---|---|---|---|
| clean | - | 32.6 | 33.8 | 46.5 | 52.9 | 63.6 | 53.6 | 100.0 | 100.0 |
| realistic | - | 11.8 | 15.1 | 22.5 | 27.9 | 35.5 | 32.3 | 68.6 | 77.1 |
| perspective | 1 | 31.9 | 34.1 | 46.7 | 52.7 | 64.7 | 55.1 | 100.0 | 100.0 |
| perspective | 2 | 31.9 | 34.6 | 46.0 | 53.0 | 64.1 | 55.6 | 100.0 | 100.0 |
| perspective | 3 | 32.0 | 33.6 | 46.3 | 52.7 | 64.6 | 54.0 | 100.0 | 100.0 |
| blur | 1 | 23.1 | 25.2 | 36.9 | 44.9 | 55.4 | 46.8 | 100.0 | 100.0 |
| blur | 2 | 6.6 | 7.9 | 7.9 | 11.9 | 22.0 | 13.2 | 37.6 | 35.6 |
| blur | 3 | 0.4 | 0.4 | 0.6 | 1.4 | 2.3 | 1.1 | 3.1 | 2.6 |
| low_light | 1 | 23.6 | 26.0 | 36.7 | 46.0 | 56.4 | 45.5 | 99.9 | 99.8 |
| low_light | 2 | 5.6 | 6.4 | 10.3 | 12.0 | 19.9 | 11.3 | 41.1 | 40.8 |
| low_light | 3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| glare | 1 | 32.4 | 33.7 | 46.9 | 53.1 | 64.3 | 54.2 | 100.0 | 100.0 |
| glare | 2 | 31.1 | 32.6 | 45.3 | 51.6 | 63.0 | 52.1 | 100.0 | 100.0 |
| glare | 3 | 30.3 | 31.9 | 44.3 | 50.1 | 61.7 | 51.3 | 100.0 | 100.0 |
| sleeve | 1 | 32.3 | 35.2 | 46.9 | 53.9 | 64.7 | 56.1 | 100.0 | 100.0 |
| sleeve | 2 | 30.4 | 32.5 | 44.3 | 52.1 | 62.7 | 52.7 | 100.0 | 100.0 |
| sleeve | 3 | 25.0 | 28.4 | 39.9 | 48.1 | 57.6 | 48.4 | 100.0 | 100.0 |
| occlusion | 1 | 30.3 | 33.4 | 44.6 | 51.4 | 60.7 | 52.1 | 100.0 | 100.0 |
| occlusion | 2 | 28.6 | 29.8 | 40.7 | 47.1 | 55.9 | 49.2 | 100.0 | 100.0 |
| occlusion | 3 | 22.6 | 22.6 | 33.6 | 41.7 | 50.4 | 42.7 | 100.0 | 100.0 |
| low_contrast | 1 | 32.3 | 31.9 | 46.6 | 53.4 | 64.6 | 53.4 | 100.0 | 100.0 |
| low_contrast | 2 | 32.4 | 33.1 | 46.9 | 52.9 | 64.4 | 54.1 | 100.0 | 100.0 |
| low_contrast | 3 | 32.1 | 33.2 | 46.9 | 52.9 | 64.3 | 53.8 | 100.0 | 100.0 |
| foil | 1 | 31.0 | 31.0 | 46.1 | 52.3 | 63.1 | 52.4 | 100.0 | 100.0 |
| foil | 2 | 28.7 | 29.2 | 42.0 | 48.7 | 58.1 | 45.5 | 99.9 | 99.8 |
| foil | 3 | 22.7 | 24.8 | 35.9 | 42.3 | 53.3 | 44.8 | 99.6 | 99.6 |

### End-to-end (cross-printing queries): detected x matched

| augmentation | severity | detected | single e2e | all_heldout: on detected | all_heldout: product | all_heldout: measured e2e | all_heldout e2e top-5 | all (own present) e2e |
|---|---|---|---|---|---|---|---|---|
| clean | - | 90.8 | 30.7 | 53.6 | 48.6 | 48.6 | 58.0 | 90.8 |
| realistic | - | 67.5 | 10.2 | 32.3 | 21.8 | 21.8 | 27.7 | 52.0 |
| perspective | 1 | 88.7 | 30.3 | 55.1 | 48.9 | 48.9 | 59.1 | 88.7 |
| perspective | 2 | 89.1 | 30.9 | 55.6 | 49.6 | 49.6 | 58.3 | 89.1 |
| perspective | 3 | 81.1 | 27.3 | 54.0 | 43.9 | 43.9 | 53.3 | 81.1 |
| blur | 1 | 89.1 | 22.4 | 46.8 | 41.7 | 41.7 | 52.1 | 89.1 |
| blur | 2 | 70.6 | 5.6 | 13.2 | 9.3 | 9.3 | 16.4 | 25.1 |
| blur | 3 | 38.9 | 0.1 | 1.1 | 0.4 | 0.4 | 1.0 | 1.0 |
| low_light | 1 | 92.3 | 24.0 | 45.5 | 42.0 | 42.0 | 52.9 | 92.1 |
| low_light | 2 | 78.1 | 5.0 | 11.3 | 8.9 | 8.9 | 14.3 | 31.9 |
| low_light | 3 | 10.3 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| glare | 1 | 90.7 | 30.6 | 54.2 | 49.1 | 49.1 | 58.7 | 90.7 |
| glare | 2 | 89.7 | 29.3 | 52.1 | 46.7 | 46.7 | 58.0 | 89.7 |
| glare | 3 | 82.4 | 26.3 | 51.3 | 42.3 | 42.3 | 52.4 | 82.4 |
| sleeve | 1 | 90.4 | 31.9 | 56.1 | 50.7 | 50.7 | 60.0 | 90.4 |
| sleeve | 2 | 90.0 | 29.3 | 52.7 | 47.4 | 47.4 | 57.9 | 90.0 |
| sleeve | 3 | 89.1 | 25.3 | 48.4 | 43.1 | 43.1 | 52.6 | 89.1 |
| occlusion | 1 | 78.7 | 26.3 | 52.1 | 41.0 | 41.0 | 49.6 | 78.7 |
| occlusion | 2 | 63.9 | 19.0 | 49.2 | 31.4 | 31.4 | 37.1 | 63.9 |
| occlusion | 3 | 35.4 | 8.0 | 42.7 | 15.1 | 15.1 | 19.6 | 35.4 |
| low_contrast | 1 | 93.7 | 29.9 | 53.4 | 50.0 | 50.0 | 59.7 | 93.7 |
| low_contrast | 2 | 94.0 | 31.1 | 54.1 | 50.9 | 50.9 | 61.0 | 94.0 |
| low_contrast | 3 | 92.9 | 30.9 | 53.8 | 50.0 | 50.0 | 60.7 | 92.9 |
| foil | 1 | 88.6 | 27.4 | 52.4 | 46.4 | 46.4 | 57.3 | 88.6 |
| foil | 2 | 83.6 | 24.4 | 45.5 | 38.0 | 38.0 | 48.6 | 83.4 |
| foil | 3 | 76.1 | 18.9 | 44.8 | 34.1 | 34.1 | 42.9 | 75.9 |

### Same-printing control (set C, severity 2)

| augmentation | n | single crop | single e2e | all_heldout crop | all (own present) crop | all e2e |
|---|---|---|---|---|---|---|
| perspective | 700 | 100.0 | 97.9 | 68.6 | 100.0 | 97.9 |
| blur | 700 | 34.1 | 31.6 | 9.3 | 29.3 | 28.0 |
| low_light | 700 | 51.3 | 46.1 | 9.6 | 42.0 | 37.6 |
| glare | 700 | 100.0 | 98.4 | 64.3 | 100.0 | 98.4 |
| sleeve | 700 | 100.0 | 98.9 | 63.9 | 100.0 | 98.9 |
| occlusion | 700 | 100.0 | 81.6 | 57.4 | 100.0 | 81.6 |
| low_contrast | 700 | 100.0 | 98.9 | 69.4 | 100.0 | 98.9 |
| foil | 700 | 100.0 | 97.7 | 62.0 | 100.0 | 97.7 |

### DINOv2-small against the dhvazquez embedder (set D, cross-printing, perfect crop / end-to-end top-1)

| augmentation | n | dhv single | DINOv2 single | dhv multi | DINOv2 multi | dhv all_heldout | DINOv2 all_heldout | dhv all | DINOv2 all |
|---|---|---|---|---|---|---|---|---|---|
| clean | 400 | 34.2 / 30.5 | 47.2 / 45.0 | 49.2 / 42.2 | 71.5 / 63.5 | 54.2 / 48.5 | 72.5 / 64.2 | 100.0 / 89.8 | 100.0 / 89.2 |
| realistic | 400 | 12.0 / 9.2 | 25.2 / 18.8 | 24.0 / 16.5 | 40.2 / 26.8 | 31.8 / 22.8 | 44.0 / 28.0 | 71.8 / 50.0 | 65.2 / 39.8 |
| perspective (sev 2) | 400 | 33.8 / 32.0 | 47.5 / 44.8 | 48.8 / 44.0 | 71.2 / 64.8 | 53.0 / 49.5 | 72.0 / 64.5 | 100.0 / 88.0 | 100.0 / 88.0 |
| blur (sev 2) | 400 | 7.0 / 5.5 | 37.8 / 26.2 | 8.0 / 6.0 | 56.8 / 36.2 | 11.5 / 9.5 | 58.5 / 39.5 | 38.0 / 25.8 | 90.0 / 54.8 |
| low_light (sev 2) | 400 | 5.8 / 5.8 | 15.2 / 8.8 | 10.0 / 7.2 | 25.2 / 13.0 | 12.2 / 8.8 | 29.2 / 16.2 | 43.2 / 32.2 | 51.2 / 26.5 |
| glare (sev 2) | 400 | 33.2 / 30.8 | 46.5 / 45.0 | 47.2 / 43.2 | 69.5 / 63.5 | 51.5 / 47.2 | 70.5 / 64.0 | 100.0 / 89.8 | 100.0 / 89.0 |
| sleeve (sev 2) | 400 | 31.8 / 30.2 | 45.0 / 42.2 | 45.8 / 41.8 | 68.8 / 60.2 | 52.5 / 48.0 | 68.8 / 62.3 | 100.0 / 88.8 | 100.0 / 86.5 |
| occlusion (sev 2) | 400 | 30.2 / 19.8 | 40.8 / 28.2 | 43.0 / 25.8 | 63.5 / 41.5 | 48.8 / 31.2 | 64.5 / 41.8 | 100.0 / 62.5 | 95.0 / 57.8 |
| low_contrast (sev 2) | 400 | 34.2 / 32.2 | 47.8 / 44.0 | 49.2 / 45.8 | 71.5 / 65.5 | 53.0 / 51.5 | 72.5 / 66.2 | 100.0 / 94.2 | 100.0 / 93.8 |
| foil (sev 2) | 400 | 30.8 / 25.5 | 17.5 / 13.0 | 43.8 / 36.0 | 27.5 / 19.5 | 49.8 / 38.8 | 27.5 / 21.8 | 99.8 / 83.0 | 50.7 / 35.5 |

### Frame agreement (set F: 5 independent frames per query, detector path, cross-printing)

A frame votes for its top-1 oracle when it passes the card-present gate (sharpness >= p99 of empty scenes), the only signal a real scanner has; ground-truth IoU is NOT used, so a frame whose quad is badly placed still votes, possibly wrong. A frame below the gate casts no vote. k-of-n: the first n frames, answered when one oracle has at least k votes. 'one frame' is frame 0 by the same rule. 'bad quad' is the share of all frames that pass the gate with IoU < 0.9 (diagnostic only).

| augmentation | severity | gallery | n | one frame right | 2-of-3 right | 2-of-3 no consensus | 2-of-3 wrong | 3-of-5 right | 3-of-5 no consensus | 3-of-5 wrong | bad quad |
|---|---|---|---|---|---|---|---|---|---|---|---|
| blur | 1 | all_heldout | 300 | 42.7 | 42.7 | 29.0 | 28.3 | 42.7 | 33.3 | 24.0 | 0.0 |
| blur | 1 | all | 300 | 87.0 | 90.0 | 10.0 | 0.0 | 89.7 | 10.3 | 0.0 | 0.0 |
| blur | 1 | single | 300 | 21.0 | 21.3 | 34.7 | 44.0 | 22.0 | 43.7 | 34.3 | 0.0 |
| blur | 2 | all_heldout | 300 | 9.7 | 8.0 | 65.0 | 27.0 | 7.7 | 79.3 | 13.0 | 0.0 |
| blur | 2 | all | 300 | 27.0 | 26.3 | 57.7 | 16.0 | 26.3 | 65.0 | 8.7 | 0.0 |
| blur | 2 | single | 300 | 5.7 | 5.0 | 67.0 | 28.0 | 5.0 | 80.0 | 15.0 | 0.0 |
| blur | 3 | all_heldout | 300 | 0.7 | 0.7 | 85.0 | 14.3 | 0.3 | 92.0 | 7.7 | 0.0 |
| blur | 3 | all | 300 | 1.7 | 1.0 | 85.0 | 14.0 | 0.3 | 92.0 | 7.7 | 0.0 |
| blur | 3 | single | 300 | 0.3 | 0.0 | 88.3 | 11.7 | 0.0 | 94.7 | 5.3 | 0.0 |
| low_light | 1 | all_heldout | 300 | 40.3 | 41.3 | 16.7 | 42.0 | 40.7 | 20.0 | 39.3 | 0.0 |
| low_light | 1 | all | 300 | 90.7 | 92.7 | 7.0 | 0.3 | 93.3 | 6.3 | 0.3 | 0.0 |
| low_light | 1 | single | 300 | 24.7 | 24.3 | 20.3 | 55.3 | 24.3 | 26.0 | 49.7 | 0.0 |
| low_light | 2 | all_heldout | 300 | 9.0 | 8.7 | 39.0 | 52.3 | 8.0 | 45.0 | 47.0 | 0.1 |
| low_light | 2 | all | 300 | 33.3 | 34.3 | 31.7 | 34.0 | 34.3 | 34.0 | 31.7 | 0.1 |
| low_light | 2 | single | 300 | 5.7 | 4.7 | 44.7 | 50.7 | 4.3 | 52.3 | 43.3 | 0.1 |
| low_light | 3 | all_heldout | 300 | 0.0 | 0.0 | 94.7 | 5.3 | 0.0 | 94.7 | 5.3 | 0.1 |
| low_light | 3 | all | 300 | 0.0 | 0.0 | 94.7 | 5.3 | 0.0 | 94.7 | 5.3 | 0.1 |
| low_light | 3 | single | 300 | 0.0 | 0.0 | 96.3 | 3.7 | 0.0 | 96.7 | 3.3 | 0.1 |
| realistic | - | all_heldout | 300 | 22.3 | 22.0 | 72.0 | 6.0 | 21.0 | 73.7 | 5.3 | 0.0 |
| realistic | - | all | 300 | 50.3 | 51.0 | 48.0 | 1.0 | 55.7 | 44.0 | 0.3 | 0.0 |
| realistic | - | single | 300 | 8.7 | 9.0 | 82.0 | 9.0 | 8.7 | 87.0 | 4.3 | 0.0 |

Embedder class map: 82110 printings; catalog paper printings among them: 20703 of 102571.

### Strata (realistic mix, cross-printing, set A)

| treatment | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| borderless | 620 | 42.9 | 3.9 | 2.3 | 23.7 | 13.1 | 34.4 |
| extended_art | 552 | 71.6 | 25.5 | 20.8 | 30.4 | 23.2 | 58.0 |
| flavor_name | 452 | 46.9 | 0.4 | 0.2 | 11.7 | 7.1 | 38.1 |
| full_art | 346 | 26.9 | 2.6 | 0.6 | 26.3 | 5.8 | 22.8 |
| m15 | 1022 | 82.8 | 26.7 | 23.0 | 32.9 | 29.9 | 61.0 |
| modern_2003 | 554 | 86.8 | 17.5 | 14.6 | 37.9 | 34.7 | 69.7 |
| old_border | 540 | 75.0 | 5.7 | 5.0 | 31.9 | 28.3 | 57.2 |
| retro_frame_reprint | 474 | 83.5 | 6.8 | 5.7 | 21.9 | 18.4 | 63.5 |
| showcase | 624 | 61.2 | 6.1 | 5.9 | 28.8 | 20.4 | 49.8 |

| layout_group | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| basic_land | 14 | 71.4 | 14.3 | 7.1 | 78.6 | 57.1 | 64.3 |
| dfc | 458 | 73.6 | 22.5 | 18.8 | 24.5 | 20.5 | 59.4 |
| single_face | 4266 | 66.8 | 9.2 | 8.0 | 28.2 | 21.9 | 52.1 |
| split_adventure | 446 | 62.8 | 33.2 | 24.4 | 30.0 | 20.0 | 46.9 |

| era | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| 2003-2014 | 568 | 83.8 | 13.4 | 11.1 | 34.0 | 31.7 | 66.5 |
| 2015-2019 | 350 | 79.1 | 23.7 | 20.9 | 34.6 | 31.1 | 62.9 |
| 2020+ | 3740 | 62.2 | 12.2 | 10.1 | 26.2 | 18.4 | 48.5 |
| pre2003 | 526 | 75.3 | 5.9 | 5.1 | 31.7 | 28.3 | 57.2 |

| same_art_as_ref | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| False | 2898 | 56.9 | 3.2 | 2.3 | 26.6 | 18.4 | 45.7 |
| True | 2284 | 79.9 | 24.2 | 20.7 | 30.3 | 26.0 | 60.8 |
| unknown | 2 | 50.0 | 0.0 | 0.0 | 0.0 | 0.0 | 50.0 |

| query_art_in_multi | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| False | 1700 | 49.3 | 4.0 | 2.8 | 9.6 | 4.8 | 39.4 |
| True | 3482 | 75.7 | 16.6 | 14.1 | 37.2 | 30.0 | 58.7 |
| unknown | 2 | 50.0 | 0.0 | 0.0 | 0.0 | 0.0 | 50.0 |

| stratum | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| different_art | 440 | 69.5 | 4.1 | 3.2 | 37.7 | 30.5 | 54.3 |
| l:basic_land | 4 | 75.0 | 50.0 | 25.0 | 50.0 | 25.0 | 50.0 |
| l:dfc | 440 | 74.1 | 23.0 | 19.3 | 24.3 | 20.7 | 59.5 |
| l:split_adventure | 440 | 62.7 | 32.7 | 24.1 | 29.5 | 19.5 | 46.6 |
| t:borderless | 440 | 42.7 | 3.4 | 2.7 | 20.0 | 11.1 | 34.1 |
| t:extended_art | 440 | 73.2 | 24.5 | 20.0 | 31.8 | 24.1 | 58.0 |
| t:flavor_name | 440 | 47.5 | 0.5 | 0.2 | 11.8 | 7.0 | 38.4 |
| t:full_art | 340 | 27.1 | 2.1 | 0.6 | 26.5 | 5.9 | 22.9 |
| t:m15 | 440 | 88.0 | 23.4 | 21.6 | 34.5 | 33.9 | 65.5 |
| t:modern_2003 | 440 | 90.9 | 16.1 | 14.5 | 35.9 | 35.0 | 72.3 |
| t:old_border | 440 | 76.4 | 6.1 | 6.1 | 30.9 | 28.4 | 58.4 |
| t:retro_frame_reprint | 440 | 83.4 | 6.8 | 5.9 | 21.8 | 18.4 | 63.9 |
| t:showcase | 440 | 60.0 | 4.3 | 4.1 | 32.7 | 22.5 | 47.7 |

| query_printing_trained | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| False | 4148 | 65.7 | 12.7 | 10.9 | 28.4 | 21.7 | 51.6 |
| True | 1036 | 72.4 | 11.6 | 8.5 | 27.2 | 21.7 | 55.4 |

| query_released_after_2026_05_21 | n | detected | single crop | single e2e | all_heldout crop | all_heldout e2e | all (own present) e2e |
|---|---|---|---|---|---|---|---|
| False | 4674 | 70.3 | 13.0 | 10.9 | 28.4 | 23.2 | 55.1 |
| True | 510 | 37.6 | 7.8 | 5.5 | 26.3 | 8.4 | 27.1 |

### Confidence: realistic, cross-printing, SINGLE gallery, perfect crop (n=5184)

- right top-1 (647): cosine p10/p50/p90 0.304/0.383/0.509; margin over runner-up p10/p50/p90 0.011/0.071/0.194
- wrong top-1 (4537): cosine p10/p50/p90 0.270/0.306/0.357; margin over runner-up p10/p50/p90 0.002/0.014/0.044
- auto-accept when margin >= 0.02: accepts 41.4% of frames, 25.3% of those right (confident-wrong 30.9% of all frames)
- auto-accept when margin >= 0.05: accepts 14.3% of frames, 56.4% of those right (confident-wrong 6.2% of all frames)
- auto-accept when margin >= 0.1: accepts 5.2% of frames, 88.1% of those right (confident-wrong 0.6% of all frames)

### Failure modes: realistic, cross-printing, SINGLE gallery, perfect crop

- **query art differs from the indexed reference's art**: 2804 of 4537
  - Eldrazi Monument [sld 603, borderless] -> Grim Lavamancer (truth rank >5)
  - Eldrazi Monument [sld 603, borderless] -> Corpse Dance (truth rank >5)
  - Zurgo and Ojutai [mom 319, showcase] -> Gerrard's Hourglass Pendant (truth rank 5)
  - Meteor Crater [eos 26, borderless] -> Mortus Strider (truth rank >5)
  - Meteor Crater [eos 26, borderless] -> Spirit of Malevolence (truth rank >5)
  - Quest for Renewal [sld 2405, borderless] -> Haughty Djinn (truth rank >5)
  - Quest for Renewal [sld 2405, borderless] -> Arguel's Blood Fast // Temple of Aclazotz (truth rank >5)
  - Furycalm Snarl [moc 404, m15] -> Seraph of the Masses (truth rank >5)
- **other**: 1716 of 4537
  - The Colossal Dreadmaw [unk RG06b, m15] -> Dockbreacher (truth rank >5)
  - The Colossal Dreadmaw [unk RG06b, m15] -> Abomination of Gudul (truth rank >5)
  - Wastes [tsr 410, retro_frame_reprint] -> Thermokarst (truth rank >5)
  - Wastes [tsr 410, retro_frame_reprint] -> Howling Gale (truth rank >5)
  - Plargg, Dean of Chaos // Augusta, Dean of Order [stx 328, extended_art] -> Trivia Contest (truth rank 3)
  - Plargg, Dean of Chaos // Augusta, Dean of Order [stx 328, extended_art] -> Wei Night Raiders (truth rank >5)
  - Brisela, Voice of Nightmares [v17 5b, m15] -> Tasigur's Cruelty (truth rank >5)
  - Duskwatch Recruiter // Krallenhorde Howler [soi 203, m15] -> Sawtooth Ogre (truth rank >5)
- **same artist, different art**: 17 of 4537
  - Garruk Relentless // Garruk, the Veil-Cursed [plst ISD-181, modern_2003] -> Cataclysm (truth rank >5)
  - Kazandu Mammoth // Kazandu Valley [pznr 189s, m15] -> Chaos Dragon (truth rank >5)
  - Thassa's Intervention [thb 307, extended_art] -> Chaos Warp (truth rank >5)
  - Heliod's Punishment [plst THB-21, m15] -> Forbidding Watchtower (truth rank >5)
  - Butcher of Malakir [mic 107, m15] -> Hellkite Igniter (truth rank 4)
  - Flinthoof Boar [m13 171, modern_2003] -> Abomination of Gudul (truth rank >5)
  - Feebleness [tsp 110, modern_2003] -> Promise of Power (truth rank >5)
  - Master Transmuter [con 31, modern_2003] -> Vectis Agents (truth rank 2)

### Confidence: realistic, cross-printing, ALL-printings gallery, own printing held out, perfect crop (n=5184)

- right top-1 (1461): cosine p10/p50/p90 0.343/0.439/0.604; margin over runner-up p10/p50/p90 0.014/0.088/0.246
- wrong top-1 (3723): cosine p10/p50/p90 0.308/0.356/0.427; margin over runner-up p10/p50/p90 0.002/0.015/0.048
- auto-accept when margin >= 0.02: accepts 51.3% of frames, 47.3% of those right (confident-wrong 27.0% of all frames)
- auto-accept when margin >= 0.05: accepts 25.7% of frames, 75.4% of those right (confident-wrong 6.3% of all frames)
- auto-accept when margin >= 0.1: accepts 13.5% of frames, 96.0% of those right (confident-wrong 0.5% of all frames)

### Failure modes: realistic, cross-printing, ALL-printings gallery, own printing held out, perfect crop

- **other**: 3484 of 3723
  - Eldrazi Monument [sld 603, borderless] -> Serum Visions (truth rank >5)
  - Zurgo and Ojutai [mom 319, showcase] -> Dragonlord Ojutai (truth rank >5)
  - Zurgo and Ojutai [mom 319, showcase] -> Sarkhan, Soul Aflame (truth rank 3)
  - Meteor Crater [eos 26, borderless] -> Petrified Field (truth rank 2)
  - Meteor Crater [eos 26, borderless] -> Child of Alara (truth rank >5)
  - Quest for Renewal [sld 2405, borderless] -> Captain America, Super-Soldier (truth rank >5)
  - Quest for Renewal [sld 2405, borderless] -> Balefire Liege (truth rank >5)
  - Yarus, Roar of the Old Gods [mkm 375, showcase] -> Anzrag, the Quake-Mole (truth rank 2)
- **same artist, different art**: 239 of 3723
  - Eldrazi Monument [sld 603, borderless] -> Panharmonicon (truth rank >5)
  - Furycalm Snarl [moc 404, m15] -> Frostboil Snarl (truth rank >5)
  - Furycalm Snarl [moc 404, m15] -> Frostboil Snarl (truth rank >5)
  - Abstruse Appropriation [mh3 342, borderless] -> Prismatic Ending (truth rank >5)
  - Howling Mine [cei 248, old_border] -> Forest (truth rank >5)
  - Muxus, Goblin Grandee [sld 2833, flavor_name] -> Island (truth rank >5)
  - Krark, the Thumbless [sld 1543, borderless] -> Yargle, Glutton of Urborg (truth rank >5)
  - Armageddon [ptc bl5, old_border] -> Forest (truth rank >5)

### Confidence: realistic, cross-printing, own printing held out, detected frames (n=3476)

- right top-1 (1126): cosine p10/p50/p90 0.345/0.436/0.589; margin over runner-up p10/p50/p90 0.015/0.085/0.240
- wrong top-1 (2350): cosine p10/p50/p90 0.307/0.352/0.424; margin over runner-up p10/p50/p90 0.002/0.014/0.046
- auto-accept when margin >= 0.02: accepts 52.8% of frames, 53.1% of those right (confident-wrong 24.8% of all frames)
- auto-accept when margin >= 0.05: accepts 27.0% of frames, 79.7% of those right (confident-wrong 5.5% of all frames)
- auto-accept when margin >= 0.1: accepts 14.7% of frames, 97.7% of those right (confident-wrong 0.3% of all frames)

### Failure modes: realistic, cross-printing, own printing held out, detected frames

- **other**: 2258 of 2350
  - Zurgo and Ojutai [mom 319, showcase] -> Dragonlord Ojutai (truth rank >5)
  - Zurgo and Ojutai [mom 319, showcase] -> Sarkhan, Soul Aflame (truth rank 4)
  - Quest for Renewal [sld 2405, borderless] -> Balefire Liege (truth rank >5)
  - Furycalm Snarl [moc 404, m15] -> Hedron Detonator (truth rank >5)
  - Celestial Colonnade [pwwk 133, modern_2003] -> Chain Reaction (truth rank >5)
  - Cubwarden [iko 279, showcase] -> Lurrus of the Dream-Den (truth rank >5)
  - Abstruse Appropriation [mh3 342, borderless] -> Florian, Voldaren Scion (truth rank >5)
  - Two-Headed Sliver [sld 646, extended_art] -> Pithing Needle (truth rank >5)
- **same artist, different art**: 92 of 2350
  - Eldrazi Monument [sld 603, borderless] -> Panharmonicon (truth rank >5)
  - Furycalm Snarl [moc 404, m15] -> Frostboil Snarl (truth rank >5)
  - Armageddon [ptc bl5, old_border] -> Forest (truth rank >5)
  - Foreboding Ruins [ltc 310, m15] -> Dark Ritual (truth rank >5)
  - Sol'kanar the Swamp King [tsb 100, old_border] -> Toxic Deluge (truth rank >5)
  - Zopandrel, Hunger Dominus [one 315, showcase] -> Tekuthal, Inquiry Dominus (truth rank >5)
  - Talisman of Dominance [sld 1053, retro_frame_reprint] -> Talisman of Resilience (truth rank >5)
  - Talisman of Dominance [sld 1053, retro_frame_reprint] -> Talisman of Resilience (truth rank >5)

### Confidence: realistic, cross-printing, own printing PRESENT, detected frames (n=3476)

- right top-1 (2714): cosine p10/p50/p90 0.396/0.550/0.699; margin over runner-up p10/p50/p90 0.056/0.197/0.332
- wrong top-1 (762): cosine p10/p50/p90 0.316/0.358/0.413; margin over runner-up p10/p50/p90 0.002/0.014/0.044
- auto-accept when margin >= 0.02: accepts 83.7% of frames, 90.6% of those right (confident-wrong 7.9% of all frames)
- auto-accept when margin >= 0.05: accepts 72.8% of frames, 97.9% of those right (confident-wrong 1.6% of all frames)
- auto-accept when margin >= 0.1: accepts 62.6% of frames, 99.8% of those right (confident-wrong 0.1% of all frames)

### Failure modes: realistic, cross-printing, own printing PRESENT, detected frames

- **other**: 737 of 762
  - Quest for Renewal [sld 2405, borderless] -> Balefire Liege (truth rank >5)
  - Celestial Colonnade [pwwk 133, modern_2003] -> Chain Reaction (truth rank 2)
  - Two-Headed Sliver [sld 646, extended_art] -> Lance (truth rank >5)
  - Mana Short [leb 66, old_border] -> Mountain (truth rank >5)
  - Druid of Purification [drc 49, m15] -> Soul Swindler (truth rank 4)
  - Cancel [xln 47, m15] -> Sunblade Samurai (truth rank 3)
  - Raging Goblin [por 145, old_border] -> Phyrexian Colossus (truth rank >5)
  - Dawn of Hope [ltc 164, m15] -> Swamp (truth rank >5)
- **same artist, different art**: 25 of 762
  - Armageddon [ptc bl5, old_border] -> Forest (truth rank >5)
  - Foreboding Ruins [ltc 310, m15] -> Dark Ritual (truth rank >5)
  - Sol'kanar the Swamp King [tsb 100, old_border] -> Toxic Deluge (truth rank >5)
  - Insult // Injury [plst AKH-213, m15] -> Plains (truth rank >5)
  - Pyretic Ritual [sld 1064, borderless] -> Island (truth rank 3)
  - Deflecting Swat [cmm 698, borderless] -> Sunweb (truth rank 2)
  - Restless Cottage [woe 304, borderless] -> Forest (truth rank >5)
  - Brokkos, Apex of Forever [iko 378, flavor_name] -> Lightning Greaves (truth rank 2)

- in-run t_render: median 100.8 ms, p10 53.5 ms
- in-run t_det: median 31.9 ms, p10 21.5 ms
- in-run t_emb: median 81.7 ms, p10 62.1 ms
- in-run t_knn_all: median 1.5 ms, p10 1.1 ms
