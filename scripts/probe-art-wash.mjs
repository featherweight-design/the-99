// Gate for the art-wash readability amendment: the four surfaces that draw a
// wash — the deck tile, Home's ready-to-build hero, the commander rec and
// discovery rows, and Home's resume row.
//
// JSDOM applies no CSS and loads no images, so the unit tests can assert which
// URL a layer was handed but never that the frame is gone, that the band keeps
// its height when a commander has no crop, or that the two accessibility media
// queries do what they claim. That is what this probe is for, and it writes a
// screenshot per viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-art-wash.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          // Named here rather than left to Clerk: an undefined emailAddressId
          // fails inside prepareFirstFactor with an error that says nothing
          // about the account being unable to take a code.
          if (!factor?.emailAddressId) {
            const offered = (attempt.supportedFirstFactors ?? []).map((f) => f.strategy).join(", ");
            return `${email} offers no usable email_code first factor (offered: ${offered || "none"}). The probe user must be a +clerk_test address.`;
          }
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// Every wash on the page, with the URL each art layer resolved, the opacity the
// browser actually computed, and the height of the band the wash sits in. The
// URL is the whole readability claim: `art_crop` is frame-free, `normal` is not.
const READ_WASHES = `() => {
  const layers = [...document.querySelectorAll('.art-wash-art')];
  return layers.filter((l) => l.getClientRects().length).map((l) => {
    const s = getComputedStyle(l);
    const band = l.parentElement?.parentElement;
    const image = s.backgroundImage;
    return {
      url: /url\\(/.test(image) ? image.replace(/^.*?url\\(["']?/, '').replace(/["']?\\).*$/, '') : null,
      gradient: /gradient/.test(image) ? image.slice(0, 40) : null,
      opacity: Number(s.opacity),
      display: s.display,
      reducedVar: s.getPropertyValue('--art-wash-reduced-opacity').trim(),
      bandHeight: band ? Math.round(band.getBoundingClientRect().height) : null,
      scrims: l.parentElement ? l.parentElement.querySelectorAll('.art-wash-scrim').length : 0,
    };
  });
}`;

// The lift: every opacity a wash is allowed to compute. A value outside this set
// means one of the two files that carry these numbers moved without the other.
// 0.28 and 0.22 were the `left-portrait` ambient layer's, and that layer is gone
// — a band-wide second scaling of the crop behind the portrait, which read as a
// double image. Either value computing again is that layer returning.
const LIFTED_OPACITIES = [1, 0.8, 0.92, 0.95];

/** Every band on the page, with how many art layers inside it resolved a crop
    URL. A `left-portrait` band draws exactly one: the masked portrait. Two is
    the double image this probe now guards against, and it is invisible to the
    unit tests — jsdom loads no images, so both layers are equally blank there. */
const READ_ART_LAYERS_PER_BAND = `() => {
  const bands = new Map();
  for (const l of document.querySelectorAll('.art-wash-art')) {
    if (!l.getClientRects().length) continue;
    if (!/url\\(/.test(getComputedStyle(l).backgroundImage)) continue;
    const band = l.parentElement;
    bands.set(band, (bands.get(band) ?? 0) + 1);
  }
  return [...bands.values()];
}`;

// The 148 band's two scrims, as the browser computes them. JSDOM applies no CSS,
// so this is the only place the ruling is answerable: one vertical ramp at both
// widths, and a horizontal scrim that leaves the portrait alone until the
// fade-out starts.
const READ_148_SCRIMS = `() => {
  const band = document.querySelector('.discovery-band, .rec-band');
  if (!band) return null;
  return [...band.querySelectorAll('.art-wash-scrim')].map((s) => {
    const style = getComputedStyle(s);
    const image = style.backgroundImage;
    return {
      display: style.display,
      image,
      // Not \`/180deg/\`: 180deg is a gradient's default direction, so the browser
      // drops it from the computed value and that test never matches. A vertical
      // ramp is the gradient that names no angle at all; the horizontal scrim
      // beside it keeps its own 90deg.
      ramp: /^linear-gradient\\((?!\\s*[\\d.-]+deg)/.test(image),
      horizontal: /^linear-gradient\\(\\s*90deg/.test(image),
    };
  });
}`;

/** The first two colour stops of the horizontal scrim, which this round drove to
    zero alpha: the portrait carries no wash at all until the crop starts fading
    out into the row. A non-zero alpha here is the lift silently reverting.

    Matched on the `/ 0)` alpha rather than on `rgba(`: a `color-mix(in oklab, …)`
    computes to an `oklab()` colour, and the browser only falls back to `rgba()`
    for stops that survive in sRGB. */
const CLEAR_STOPS = /\/\s*0\)\s*\S+,\s*\S+\(\s*[^)]*\/\s*0\)/;

/** A cover scrim's stops, as `{ alpha, position }`, read off the computed value.
    An omitted `/ alpha` is alpha 1 — the browser drops it, exactly as it drops a
    gradient's default 180deg. */
const READ_COVER_STOPS = `(edge) => {
  // Laid-out bands only. The commander detail hero's band is wrapped in
  // \`sm:hidden\`, so at desktop width it is still in the DOM and still matches the
  // selector while drawing nothing — counting it would report a phone-only
  // treatment as shipping on both widths.
  return [...document.querySelectorAll('.art-wash-scrim-cover-' + edge)]
    .filter((s) => s.getClientRects().length)
    .map((s) => {
      const image = getComputedStyle(s).backgroundImage;
      const stops = image.match(/[a-z-]+\\([^()]*\\)\\s+[\\d.]+%/g) ?? [];
      return stops.map((stop) => {
        const alpha = stop.match(/\\/\\s*([\\d.]+)\\)/);
        return {
          alpha: alpha ? Number(alpha[1]) : 1,
          position: Number(stop.match(/([\\d.]+)%$/)[1]),
        };
      });
    });
}`;

/** Every band that has taken a stated height, with the ramp it draws. Selected by
    `data-art-wash-band` on the wash's own root rather than by a scrim class: the
    two strategies draw different scrims, so keying this to `-cover` would stop
    covering `left-portrait` the moment those rows migrate — a check that goes
    quiet is worse than one that fails. The attribute is absent on a legacy band,
    which is what makes the census a countdown rather than a guess.

    The ramp read is the LAST scrim in the root, which is the vertical one under
    both strategies: `cover` draws one, and `left-portrait` draws its horizontal
    scrim first and its ramp second. */
const READ_STATED_BANDS = `() => {
  return [...document.querySelectorAll('[data-art-wash-band]')]
    .filter((root) => root.getClientRects().length)
    .map((root) => {
      const scrims = [...root.querySelectorAll('.art-wash-scrim')];
      const s = scrims.at(-1);
      const image = s ? getComputedStyle(s).backgroundImage : '';
      const stops = (image.match(/[a-z-]+\([^()]*\)\s+[\d.]+%/g) ?? []).map((stop) => {
        const alpha = stop.match(/\/\s*([\d.]+)\)/);
        return { alpha: alpha ? Number(alpha[1]) : 1, position: Number(stop.match(/([\d.]+)%$/)[1]) };
      });
      return {
        declared: root.getAttribute('data-art-wash-band') + 'px',
        laid: Math.round(root.getBoundingClientRect().height),
        // A left-portrait band whose ink starts past the flat stop draws no ramp
        // at all and reports one scrim rather than two: a band with nothing to
        // check rather than a band that failed.
        //
        // Testing for 180deg would be worse than not testing: the browser omits
        // a gradient's default angle from the computed value, so every stated
        // cover band — which draws exactly one scrim, its ramp — would report
        // itself flat and skip the hold checks silently. The horizontal scrim is
        // the one that states an angle, so the ramp is anything that does not.
        ramped: scrims.length > 1 || !/^linear-gradient\(\s*90deg/.test(image),
        stops,
      };
    });
}`;

/** THE PLATE, per control. The target and the drawn box are two elements — a
    44px plate would be a panel and a 26px button would miss the touch floor — so
    both are measured, and the plate's own background is read resolved: an
    `oklab()` with an alpha is the translucent mix this round replaced. */
const READ_PLATES = `() => {
  return [...document.querySelectorAll('[aria-label="View card details"]')]
    .filter((b) => b.getClientRects().length)
    .map((b) => {
      const box = b.getBoundingClientRect();
      const plate = b.firstElementChild;
      const p = plate ? getComputedStyle(plate) : null;
      const pb = plate ? plate.getBoundingClientRect() : null;
      // The alpha that actually reaches the crop, not the one the plate declares.
      // Its own colour can be opaque while an ancestor's opacity composites it —
      // which is how a pending fetch put this icon back on unscrimmed art — so
      // every opacity from the plate up to the band is folded in.
      let composited = 1;
      const declared = p ? p.backgroundColor : '';
      const alpha = /(?:rgba|\/)/.test(declared) && /[\d.]+\s*\)$/.test(declared)
        ? Number(declared.match(/([\d.]+)\s*\)$/)[1])
        : 1;
      for (let el = plate; el && el !== document.body; el = el.parentElement) {
        composited *= Number(getComputedStyle(el).opacity || 1);
      }
      return {
        target: [Math.round(box.width), Math.round(box.height)],
        drawn: pb ? [Math.round(pb.width), Math.round(pb.height)] : null,
        fill: declared,
        alpha: alpha * composited,
        border: p ? p.borderTopWidth : '',
        text: (b.textContent ?? '').replace('⛶', '').trim(),
      };
    });
}`;

/** Does the reader's own tap reach the control, or does the band clip it? The
    plate is inset well inside every band, but its 44px target is not — so the
    point that matters is the target's own corner, and the answer is whatever
    `elementFromPoint` returns there. Counting plates proves they paint; this is
    the only check that proves one can be pressed. */
const READ_PLATE_HIT = `() => {
  return [...document.querySelectorAll('[aria-label="View card details"]')]
    .filter((b) => b.getClientRects().length)
    .map((b) => {
      const r = b.getBoundingClientRect();
      const probe = (x, y) => {
        const el = document.elementFromPoint(x, y);
        return el ? (el === b || b.contains(el) ? 'self' : 'blocked') : 'nothing';
      };
      return {
        centre: probe(r.left + r.width / 2, r.top + r.height / 2),
        // Two opposite corners, one pixel inside, which is where a clipped
        // overhang or a sibling drawn over the corner shows up.
        near: probe(r.left + 1, r.top + 1),
        far: probe(r.right - 1, r.bottom - 1),
      };
    });
}`;

// The scrims outlive the art under `forced-colors`, so they are what proves the
// band kept its height when the photograph left.
const READ_SCRIM_HEIGHTS = `[...document.querySelectorAll('.art-wash-scrim')].map((s) => Math.round(s.getBoundingClientRect().height))`;

const ROUTES = [
  ["home", "/"],
  ["decks", "/decks"],
  ["commanders", "/commanders"],
  // `/discover`, not `/commanders?lane=discover`. The two lanes became two
  // routes; that query parameter is not one the app reads, so the entry loaded
  // `/commanders` a second time and every discovery row went unchecked while the
  // report named them.
  ["discover", "/discover"],
];

/** The four bands this round settles. A stated band outside the set is either a
    fifth number nobody decided or an aspect ratio that survived the migration. */
const SETTLED_BANDS = [168, 208, 248, 288];

const VIEWPORTS = [
  ["mobile", 375, 812],
  ["desktop", 1440, 900],
];

/** Every commander thumb on the page, as drawn. Five renders each invented one of
    these, at five geometries and three ring alphas; the convergence is its own
    change, and this reads what is there so the before and after are the same
    measurement. The ring comes off the computed shadow rather than a class,
    because three of the five set it inline. */
const READ_THUMBS = `() => {
  return [...document.querySelectorAll('span[aria-hidden="true"], div')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      // A card-face thumb, not a pip or a spacer: the 63/88 frame is the shape
      // this looks for, at anything bigger than an icon and smaller than a page.
      const ratio = r.height ? r.width / r.height : 0;
      return r.width >= 24 && r.width <= 120 && ratio > 0.6 && ratio < 0.85;
    })
    .map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        box: [Math.round(r.width), Math.round(r.height)],
        radius: s.borderTopLeftRadius,
        shadow: s.boxShadow,
        position: s.backgroundPosition,
        hasArt: s.backgroundImage.includes('url('),
      };
    });
}`;

/** THE PLATE and the thumbs, on whatever surface is loaded. A routine rather than
    four inline blocks, because the controls this measures live on the commander
    and deck DETAIL pages and the band checks live on the lists — the first draft
    ran these inside the list loop alone, where `plates` is always empty and every
    assertion under it passes without executing. A check that cannot fail is worse
    than no check. */
/** THE PLATE and the thumbs, on whatever surface is loaded. A routine rather than
    an inline block, because the controls this measures live on the commander and
    deck DETAIL pages while the band checks live on the lists — and an earlier
    draft ran these inside the list loop alone, where the control list is always
    empty and every assertion under it passes without executing. A check that
    cannot fail is worse than no check. */
async function checkChrome(page, label, note) {
  const plates = await page.evaluate(`(${READ_PLATES})()`);
  if (plates.length) {
    note(`${label}: ${plates.length} card-details control(s) at ${[...new Set(plates.map((p) => p.drawn?.join("×")))].join(", ")}`);
  }
  for (const plate of plates) {
    if (plate.target[0] < 44 || plate.target[1] < 44) {
      note(`  FAIL control target ${plate.target.join("×")} under the 44px floor`);
    }
    if (!plate.drawn || plate.drawn[0] !== 26 || plate.drawn[1] !== 26) {
      note(`  FAIL drawn plate ${plate.drawn?.join("×") ?? "absent"}, expected 26×26`);
    }
    // Opaque is the whole argument for deleting the top scrim: a translucent plate
    // passes the brightest pixel of an unscrimmed crop through to the glyph. A
    // resolved colour carrying an alpha under 1 is that mix — including the case
    // where a parent's own opacity is what composites it.
    if (plate.alpha < 0.999) note(`  FAIL plate is translucent: ${plate.fill} at ${plate.alpha}`);
    if (Number.parseFloat(plate.border) < 1) note(`  FAIL plate draws no hairline: ${plate.border}`);
    if (plate.text) note(`  FAIL control still prints words: ${JSON.stringify(plate.text)}`);
  }

  const hits = await page.evaluate(`(${READ_PLATE_HIT})()`);
  for (const hit of hits) {
    // Every corner, not just the centre: the target is 9px further out than the
    // drawn box and every band it sits on is `overflow-hidden`, so an overhang is
    // clipped out of its own hit area without changing one pixel of what a
    // screenshot shows. Counting controls proves they paint; this is the only
    // check that proves one can be pressed.
    for (const [where, result] of Object.entries(hit)) {
      if (result !== "self") {
        note(`  FAIL card-details control unreachable at its ${where}: ${result}`);
      }
    }
  }

  // The thumbs, as a census rather than as assertions: the five renders that draw
  // one still disagree about every dimension of it, and asserting a settled box
  // before the change that settles it would make this probe fail against its own
  // build. The boxes are printed so the convergence has a before.
  const thumbs = await page.evaluate(`(${READ_THUMBS})()`);
  if (thumbs.length) {
    note(`${label}: ${thumbs.length} commander thumb(s) at ${[...new Set(thumbs.map((t) => t.box.join("×")))].join(", ")}`);
  }
}

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};

await clerkSetup();

const browser = await chromium.launch();
try {
  for (const [vpName, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);

    for (const [routeName, path] of ROUTES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      const washes = await page.evaluate(`(${READ_WASHES})()`);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-${routeName}.png`, fullPage: false });

      const framed = washes.filter((w) => w.url && !w.url.includes("art_crop"));
      const cropped = washes.filter((w) => w.url && w.url.includes("art_crop"));
      const gradients = washes.filter((w) => !w.url && w.gradient);
      note(
        `${vpName} ${routeName}: ${washes.length} art layers — ${cropped.length} art_crop, ` +
          `${framed.length} framed, ${gradients.length} identity gradient`,
      );
      // Every check below is a filter over `washes`, so an empty list passes them
      // all. A class rename or a route that stopped drawing a wash is the failure
      // this probe exists to catch, not the condition under which it goes quiet.
      if (!washes.length) note(`  FAIL no wash layers found on ${routeName}`);
      if (framed.length) note(`  FAIL framed art still on ${routeName}: ${framed[0].url}`);
      const bands = [...new Set(washes.map((w) => w.bandHeight))].filter((h) => h);
      note(`  band heights: ${bands.sort((a, b) => a - b).join(", ")}`);
      const offLift = washes.filter(
        (w) => !LIFTED_OPACITIES.some((o) => Math.abs(w.opacity - o) < 0.005),
      );
      if (offLift.length) {
        note(`  FAIL art opacity off the lifted set: ${[...new Set(offLift.map((w) => w.opacity))].join(", ")}`);
      }

      // One picture per band. Two art layers resolving a URL inside one band is
      // the crop drawn twice at two scalings.
      const perBand = await page.evaluate(`(${READ_ART_LAYERS_PER_BAND})()`);
      const doubled = perBand.filter((n) => n > 1);
      if (doubled.length) {
        note(`  FAIL ${doubled.length} band(s) draw the crop more than once: ${doubled.join(", ")}`);
      }

      for (const g of gradients) {
        if (g.opacity !== 1) note(`  FAIL identity gradient at opacity ${g.opacity}, expected 1`);
        if (g.reducedVar !== "1") note(`  FAIL gradient reduced var ${g.reducedVar}, expected 1`);
      }

      // This round's cover ruling: a top-labelled band holds one thin value from
      // the trough to the foot instead of climbing back to 50%. Every chip down
      // there — the deck tile's status pill, the ready-to-build fit chip — is
      // opaque on its own, so that climb was washing the crop for nothing. A
      // rising final stop is the lift reverting.
      const tops = await page.evaluate(`(${READ_COVER_STOPS})("top")`);
      for (const stops of tops) {
        const [last, prior] = [stops.at(-1), stops.at(-2)];
        if (!last || !prior) {
          note(`  FAIL top cover scrim computed ${stops.length} stops, expected 4`);
        } else if (last.alpha > prior.alpha + 0.001) {
          note(`  FAIL top cover scrim climbs at the foot: ${prior.alpha} to ${last.alpha}`);
        }
      }
      // The commander-image round's census. A top-labelled band is now a band
      // that has not migrated yet, so the count is progress rather than a
      // failure — until the last one goes, at which point the top scrim, its
      // `labelEdge` prop and its stylesheet override are all deletable and this
      // line becomes the check that they stayed deleted.
      note(`  top-labelled bands still drawing: ${tops.length}`);

      // A stated band owns its height and labels at its foot. The ramp is the
      // round's load-bearing change and it is checked as arithmetic, not as a
      // prop: the hold has to sit where the block's top edge is, and a px
      // `labelAt` pushed through a percentage signature lands it at less than
      // half the band instead.
      const stated = await page.evaluate(`(${READ_STATED_BANDS})()`);
      note(`  stated bands: ${stated.length}${stated.length ? ` at ${[...new Set(stated.map((b) => b.declared))].join(", ")}` : ""}`);
      for (const band of stated) {
        if (!SETTLED_BANDS.some((h) => `${h}px` === band.declared)) {
          note(`  FAIL band declares ${band.declared || "no height"}, outside the settled set`);
        }
        if (Math.abs(band.laid - Number.parseInt(band.declared, 10)) > 1) {
          note(`  FAIL band declares ${band.declared} and lays out at ${band.laid}px`);
        }
        if (!band.ramped) {
          // A flat band: its ink starts past the portrait's flat stop and stands
          // on the row's own ground, so there is no ramp to measure.
          note(`  ${band.declared} band is flat — no ramp to check`);
          continue;
        }
        if (band.stops.length !== 4) {
          note(`  FAIL stated band computed ${band.stops.length} stops, expected 4`);
          continue;
        }
        if (band.stops[0].alpha !== 0 || band.stops[1].alpha !== 0) {
          note(`  FAIL stated band veils its top: ${JSON.stringify(band.stops.slice(0, 2))}`);
        }
        if (band.stops[3].alpha !== band.stops[2].alpha) {
          note(`  FAIL stated band does not hold to its foot: ${JSON.stringify(band.stops.slice(2))}`);
        }
        // The hold's position is the block's top edge as a fraction of the band.
        // Below half is the signature of a px value read as a percentage — the one
        // failure that looks like success in a screenshot of a short band.
        if (band.stops[2].position < 50) {
          note(`  FAIL stated band holds at ${band.stops[2].position}% — a px labelAt read as a percentage`);
        }
      }

      await checkChrome(page, `${vpName} ${routeName}`, note);
    }

    // Ratification 2 — the 148 band's vertical damping, at this viewport. This
    // load also serves the accessibility checks below, which measure the same page.
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const scrims = await page.evaluate(`(${READ_148_SCRIMS})()`);
    if (!scrims?.length) {
      note(`  FAIL no scrim layers found on the 148 band`);
    } else {
      const painted = scrims.filter((s) => s.display !== "none");
      const ramps = painted.filter((s) => s.ramp);
      const horizontals = painted.filter((s) => s.horizontal);
      note(
        `${vpName} 148 band: ${ramps.length} vertical ramp, ${horizontals.length} horizontal scrim`,
      );
      // One ramp at both widths. The rows are `items-end` either way, so the
      // phone's label block sits inside the desktop's and a single hold covers
      // both — the breakpoint-swapped flat hold this replaced darkened the whole
      // band to protect its bottom third.
      if (ramps.length !== 1) note(`  FAIL expected exactly one vertical ramp to paint`);
      if (horizontals.length !== 1) note(`  FAIL expected exactly one horizontal scrim to paint`);
      else if (!CLEAR_STOPS.test(horizontals[0].image)) {
        note(`  FAIL horizontal scrim washes the portrait: ${horizontals[0].image.slice(0, 120)}`);
      }
    }

    // Ratification 3 — the bottom-labelled cover ramp, on the commander page the
    // phone draws it for. The band's top runs clear: the only control up there
    // plates itself to `OVER_ART_PLATE`, so a non-zero alpha in the first two
    // stops is the veil this round removed coming back. The link is read off the
    // list rather than written down, so no slug is hard-coded here.
    const slug = await page.evaluate(
      `document.querySelector('a[href^="/commanders/"]')?.getAttribute('href') ?? null`,
    );
    if (!slug) {
      note(`  FAIL no commander link on /commanders to follow`);
    } else {
      await page.goto(`${BASE}${slug}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-detail.png`, fullPage: false });
      const bottoms = await page.evaluate(`(${READ_COVER_STOPS})("bottom")`);
      // Desktop draws no bottom-labelled band at all — the treatment is the
      // phone's — so an empty list is the desktop answer, not a silent pass.
      note(`${vpName} ${slug}: ${bottoms.length} bottom-labelled cover bands`);
      if (vpName === "mobile" && bottoms.length !== 1) {
        note(`  FAIL expected exactly one bottom-labelled band on the phone`);
      }
      if (vpName === "desktop" && bottoms.length !== 0) {
        note(`  FAIL desktop drew a bottom-labelled band; the treatment is phone-only`);
      }
      await checkChrome(page, `${vpName} ${slug}`, note);

      for (const stops of bottoms) {
        const clear = stops.slice(0, 2).every((s) => s.alpha === 0);
        if (!clear) {
          note(`  FAIL bottom cover scrim veils its top: ${JSON.stringify(stops.slice(0, 2))}`);
        }
        if (stops.at(-1)?.alpha !== stops.at(-2)?.alpha) {
          note(`  FAIL bottom cover scrim does not hold to the foot: ${JSON.stringify(stops.slice(-2))}`);
        }
      }
    }

    // The deck header, which is the other surface drawing this control — and the
    // one whose `Card details` chip shipped visible and dead (#534), so its hit
    // test is the one with a history. The link is read off the list rather than
    // written down, so no deck id is hard-coded.
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const deckHref = await page.evaluate(
      `document.querySelector('a[href^="/decks/"]:not([href$="/import"])')?.getAttribute('href') ?? null`,
    );
    if (!deckHref) {
      note(`  FAIL no deck link on /decks to follow — the deck header's chrome goes unchecked`);
    } else {
      await page.goto(`${BASE}${deckHref}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-deck.png`, fullPage: false });
      const deckPlates = await page.evaluate(`(${READ_PLATES})()`);
      if (!deckPlates.length) {
        note(`  FAIL no card-details control on ${deckHref} — the deck header draws one at both widths`);
      }
      await checkChrome(page, `${vpName} ${deckHref}`, note);
      const deckBands = await page.evaluate(`(${READ_STATED_BANDS})()`);
      note(`${vpName} ${deckHref}: ${deckBands.length} stated band(s)`);
    }

    // The two accessibility mechanisms, on the surface that carries every case.
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const base = await page.evaluate(`(${READ_WASHES})()`);
    const baseScrims = await page.evaluate(READ_SCRIM_HEIGHTS);
    if (!base.length || !baseScrims.length) {
      note(`  FAIL no wash layers on /commanders — the accessibility checks measure nothing`);
    }

    // Playwright's `emulateMedia` has no `prefers-reduced-transparency` option and
    // ignores one silently, so the check has to go through CDP or it passes vacuously.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    if (!(await page.evaluate(`matchMedia('(prefers-reduced-transparency: reduce)').matches`))) {
      throw new Error("reduced-transparency emulation did not take — the check would be vacuous");
    }
    await page.waitForTimeout(300);
    const reduced = await page.evaluate(`(${READ_WASHES})()`);
    await page.screenshot({ path: `/tmp/art-wash-${vpName}-reduced-transparency.png` });
    // Every comparison below pairs by index, so a change in how many layers are
    // laid out has to fail here — otherwise the pairing silently slips and the
    // per-layer checks compare unrelated elements.
    if (reduced.length !== base.length) {
      note(`  FAIL layer count changed under the preference: ${base.length} → ${reduced.length}`);
    } else {
      const raised = reduced.filter((w, i) => w.opacity > base[i].opacity + 0.001);
      note(
        `${vpName} reduced-transparency: ${reduced.filter((w, i) => w.opacity < base[i].opacity).length} layers dimmed, ${raised.length} raised`,
      );
      if (raised.length) note(`  FAIL a layer got MORE opaque under the preference`);
      const shiftedR = reduced.filter((w, i) => w.bandHeight !== base[i].bandHeight);
      if (shiftedR.length) note(`  FAIL band height changed under reduced transparency`);
      else note(`  band heights unchanged`);
    }

    await cdp.send("Emulation.setEmulatedMedia", { features: [] });
    await page.emulateMedia({ forcedColors: "active" });
    await page.waitForTimeout(300);
    const forced = await page.evaluate(`(${READ_WASHES})()`);
    await page.screenshot({ path: `/tmp/art-wash-${vpName}-forced-colors.png` });
    // The art leaves, so the scrims are what still measures the band. Compare them
    // to the same list before the rule fired rather than eyeballing the numbers.
    const forcedScrims = await page.evaluate(READ_SCRIM_HEIGHTS);
    note(
      `${vpName} forced-colors: ${forced.length} art layers still laid out (expect 0), ` +
        `${forcedScrims.length} scrims at ${[...new Set(forcedScrims)].join(", ")}px`,
    );
    if (forced.length) note(`  FAIL art layer survived forced-colors`);
    if (forcedScrims.length !== baseScrims.length) {
      note(`  FAIL scrim count changed: ${baseScrims.length} → ${forcedScrims.length}`);
    } else if (forcedScrims.some((h, i) => h !== baseScrims[i])) {
      note(`  FAIL band height changed under forced colours`);
    } else {
      note(`  band heights unchanged`);
    }

    await page.emulateMedia({ forcedColors: "none" });
    await context.close();
  }
} finally {
  await browser.close();
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures. Screenshots in /tmp/art-wash-*.png`);
if (fails.length) process.exitCode = 1;
