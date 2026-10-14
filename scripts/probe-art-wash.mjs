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

/** The band a wash sits in. NOT its parent, and not a fixed number of hops up:
    a surface that picks its band with a container query wraps each wash in a
    breakpoint div, so counting `parentElement.parentElement` lands on that
    wrapper — which is 0px tall, holds no label, and reported the deck bands as
    having no height at all.

    Height is the bound. An ancestor the same height as the wash IS the band
    however many wrappers deep it sits, and the first one that is taller is the
    surface around it, whose foot is not this band's foot. Shared as a string
    because every reader in this file travels to the browser as one. */
const BAND_OF = `
  const bandOf = (root) => {
    const rootHeight = root.getBoundingClientRect().height;
    let band = root.parentElement;
    while (
      band &&
      !band.querySelector('[data-wash-label]') &&
      band.parentElement &&
      Math.abs(band.parentElement.getBoundingClientRect().height - rootHeight) <= 1
    ) {
      band = band.parentElement;
    }
    return band;
  };
`;

// Every wash on the page, with the URL each art layer resolved, the opacity the
// browser actually computed, and the height of the band the wash sits in. The
// URL is the whole readability claim: `art_crop` is frame-free, `normal` is not.
const READ_WASHES = `() => {
  ${BAND_OF}
  const layers = [...document.querySelectorAll('.art-wash-art')];
  return layers.filter((l) => l.getClientRects().length).map((l) => {
    const s = getComputedStyle(l);
    // The art layer is positioned inside the wash root, so the root is the box
    // with the stated height and the climb starts there.
    const band = l.parentElement ? bandOf(l.parentElement) : null;
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
//
// 0.95 is the resume row's portrait, and the row is back: it is the lift that
// layer took when the ambient copy under it was deleted, so dropping the value
// while the row still draws it would fail every Home load.
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

/** Split a computed gradient into its TOP-LEVEL stops. Shared as a string
    because every reader in this file travels to the browser as one, and this is
    the third time the same parse has been got wrong: a `[^()]*` pattern cannot
    cross the nested `var(--bg)` inside each `color-mix(...)`, and splitting the
    whole value on commas at depth 0 never splits at all, because the gradient's
    own parentheses put its separators at depth 1. The wrapper comes off first,
    then commas at depth 0 are the stop boundaries. */
const PARSE_STOPS = `
  const parseStops = (image) => {
    const inner = image.replace(/^[^(]*\\(/, '').replace(/\\)\\s*$/, '');
    const parts = [];
    let depth = 0;
    let current = '';
    for (const ch of inner) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts
      .map((part) => {
        // Both units. A vertical ramp computes to percentages; the portrait's
        // horizontal scrim is emitted in px, so a percent-only pattern dropped
        // every one of its stops and reported an empty list as a failing band on
        // every viewport. The unit travels with the figure — the hold check
        // compares against a percentage and has to know which it was handed.
        const position = part.match(/([\\d.]+)(%|px)\\s*$/);
        if (!position) return null;
        // Both serialisations. A browser computes a color-mix to
        // oklab with a slash alpha, but falls back to
        // rgba for stops that survive in sRGB, where the alpha
        // is the fourth component and no slash appears. Reading only the slash
        // form returned alpha 1 for every rgba stop, which makes a clear stop
        // look opaque and fails a correct band for veiling its own top.
        const slashed = part.match(/\\/\\s*([\\d.]+)\\s*\\)/);
        const rgba = part.match(/rgba\\(\\s*[\\d.]+\\s*,\\s*[\\d.]+\\s*,\\s*[\\d.]+\\s*,\\s*([\\d.]+)\\s*\\)/);
        const alpha = slashed ?? rgba;
        return {
          alpha: alpha ? Number(alpha[1]) : 1,
          position: Number(position[1]),
          unit: position[2],
        };
      })
      .filter(Boolean);
  };
`;

// A row band's scrims, as the browser computes them. jsdom applies no CSS, so
// this is the only place the ruling is answerable: a horizontal scrim that leaves
// the portrait alone until its own fade-out starts. The vertical ramp is asserted
// per band by `checkBands`, with the surface named.
const READ_ROW_SCRIMS = `() => {
  ${PARSE_STOPS}
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
      stops: parseStops(image),
    };
  });
}`;


/** A cover scrim's stops, as `{ alpha, position }`, read off the computed value.
    An omitted `/ alpha` is alpha 1 — the browser drops it, exactly as it drops a
    gradient's default 180deg. */
const READ_COVER_STOPS = `() => {
  ${PARSE_STOPS}
  // Laid-out bands only. The commander detail hero's band is wrapped in
  // \`sm:hidden\`, so at desktop width it is still in the DOM and still matches the
  // selector while drawing nothing — counting it would report a phone-only
  // treatment as shipping on both widths.
  // One class, and no backticks in this comment: it lives inside a template
  // literal, where a bare one ends the string. A migrated band carries the base
  // cover class and names no edge, so a reader asking for the -bottom class
  // found nothing on the very surface a slice migrates — and then failed it for
  // drawing no cover band at all.
  return [...document.querySelectorAll('.art-wash-scrim-cover')]
    .filter((s) => s.getClientRects().length)
    .map((s) => {
      const image = getComputedStyle(s).backgroundImage;
      return parseStops(image);
    });
}`;




/** Every band that has taken a stated height, with the ramp it draws. Selected by
    `data-art-wash-band` on the wash's own root rather than by a scrim class: the
    two strategies draw different scrims, so keying this to `-cover` would stop
    covering `left-portrait` the moment those rows migrate — a check that goes
    quiet is worse than one that fails. Every surface is migrated now, so the
    attribute's ABSENCE is a failure rather than a countdown: a wash without it
    is a reverted render or a dropped marker, neither of which the type system
    can see from inside the app.

    The ramp read is the LAST scrim in the root, which is the vertical one under
    both strategies: `cover` draws one, and `left-portrait` draws its horizontal
    scrim first and its ramp second. */
const READ_STATED_BANDS = `() => {
  ${PARSE_STOPS}
  return [...document.querySelectorAll('[data-art-wash-band]')]
    .filter((root) => root.getClientRects().length)
    .map((root) => {
      const scrims = [...root.querySelectorAll('.art-wash-scrim')]
        .filter((s) => getComputedStyle(s).display !== 'none');
      const s = scrims.at(-1);
      // Counted, not just read: taking the last scrim alone passes a band that
      // has grown a SECOND vertical ramp under a valid last one, and two ramps
      // over one band is twice the darkening the round settled. (No backticks:
      // this comment travels to the browser inside a template literal.)
      // Same definition the row reader uses: the vertical ramp is the gradient
      // that names no angle at all, because the browser drops the default 180deg.
      const verticals = scrims.filter((s) =>
        /^linear-gradient\\((?!\\s*[\\d.-]+deg)/.test(getComputedStyle(s).backgroundImage),
      ).length;
      const image = s ? getComputedStyle(s).backgroundImage : '';
      const stops = parseStops(image);
      return {
        declared: root.getAttribute('data-art-wash-band') + 'px',
        labelAtPx: root.hasAttribute('data-art-wash-label-at')
          ? Number(root.getAttribute('data-art-wash-label-at'))
          : null,
        laid: Math.round(root.getBoundingClientRect().height),
        // Read off the primitive's own marker, never inferred from the scrims.
        // A band that draws no ramp BY INTENT and a band that lost its ramp are
        // both one 90deg scrim, so inferring would have classified the second as
        // the first and skipped every hold check on exactly the regression these
        // checks exist to catch.
        ramped: !root.hasAttribute('data-art-wash-flat'),
        verticals,
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
      const alpha = /(?:rgba|\\/)/.test(declared) && /[\\d.]+\\s*\\)$/.test(declared)
        ? Number(declared.match(/([\\d.]+)\\s*\\)$/)[1])
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
        // Which band this control sits on, so the one placement that keeps its
        // words can be told from every placement that must not. Read off the
        // nearest surface marker rather than a prop the browser cannot see.
        onDeckDesktop: Boolean(b.closest('[data-deck-spine-desktop]')),
      };
    });
}`;

/** Does the reader's own tap reach the control, or does something eat it? The
    plate is inset well inside every band, but its 44px target is not — so the
    points that matter are the target's own edges, and the answer is whatever
    `elementFromPoint` returns there.

    EDGE MIDPOINTS, not corners. A corner is the one point that a rounded
    ancestor legitimately clips: `commander-desktop` sits inside a
    `rounded-[14px] overflow-hidden` frame, so its bottom-left corner is outside
    the curve by construction and asserting it would fail a correct build. A
    midpoint is never inside a corner radius, and it is where a thumb actually
    lands — while a sibling drawn over the control blocks midpoints just as
    readily, which is the defect this exists to catch (#534, one control over).

    Counting plates proves they paint; this is the only check that proves one can
    be pressed. */
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
        top: probe(r.left + r.width / 2, r.top + 1),
        bottom: probe(r.left + r.width / 2, r.bottom - 1),
        left: probe(r.left + 1, r.top + r.height / 2),
        right: probe(r.right - 1, r.top + r.height / 2),
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

/** The bands this round settles, plus the 72 the resume row kept. A stated band outside the set is either a
    fifth number nobody decided or an aspect ratio that survived the migration. */
const SETTLED_BANDS = [72, 168, 208, 248, 288];

/** The two thumb boxes. A third is a render that kept its own geometry. */
const THUMB_BOXES = ["44×62", "64×89"];

/** One ring alpha, replacing `.35` on two thumbs and `.3` on the card faces. All
    three are inset shadows, so the alpha is the only thing that distinguishes the
    converged ring from the drift it replaced — and it is matched on its own,
    because `rgba(0, 0, 0, 0.4)` contains commas: a `inset[^,]*rgba(…)` pattern
    cannot cross them and failed every migrated thumb. The `inset` keyword is
    asserted separately beside it. */
/** No route-wide exemption, deliberately. The decks zero state's card fan was
    the reason one existed, and that fan paints `bg-[color:var(--surface-inset)]`
    — a background COLOUR — so the sweep's own filter, which requires an image or
    a gradient, never saw it. An exemption keyed to a route excused every unmarked
    card face on `/decks/<id>` as well, which is a real surface with real thumbs.
    Nothing is excused now, and nothing needs to be. */

const THUMB_RING_RE = /rgba\(0,\s*0,\s*0,\s*0\.4\)/;

/** A third width, and it exists for one surface: the desktop deck header draws a
    560px portrait above 1200px OF ROW and a 340px one below, and the row is the
    viewport minus the 62px rail. 1440 gives a ~1378px row and only ever exercises
    the wide geometry, so the fallback — the one surface in the round with two of
    them — went undrawn in every run. 1160 gives a ~1098px row. */
// The third entry carries a LAYOUT, not just a name. Every responsive assertion
// below branches on `phone`, because `vpName === "desktop"` skipped all of them
// at 1160 — a width that is a desktop layout in every sense the app cares about,
// so a regression specific to the narrow fallback would have passed unchecked.
const VIEWPORTS = [
  ["mobile", 375, 812, "phone"],
  ["narrow-desktop", 1160, 900, "desktop"],
  ["desktop", 1440, 900, "desktop"],
];

/** Which portrait the desktop deck header must draw at each width, and the inset
    its title column must take. Keyed to the viewport rather than derived, because
    the point is to check the switch rather than to restate it. */
const DECK_HEADER_GEOMETRY = {
  "narrow-desktop": { portrait: 340, inset: 364 },
  desktop: { portrait: 560, inset: 592 },
};

/** A stated band's LABEL BLOCK against the ramp its own `labelAtPx` produced.
    This is the check the round's own failure asks for: `labelAtPx` is the
    block's measured height, an intended number puts the hold where the block
    ENDS rather than where it starts, and its first line then prints on
    unscrimmed art.

    The block is found by `data-wash-label`, never by shape. A band's breakpoint
    wrapper is a positioned child that spans the whole band, so picking the
    lowest child measures the band and reports every block as starting at its top
    edge — a false pass and a false failure in one. The hook is on the ink the
    ramp exists for, which is also why a plated chip beside that ink is outside
    the measurement: a plate needs no ramp.

    Both directions are reported. A hold far above the block is a band veiling
    art it did not need to; a hold below the block is the defect. */
const READ_BLOCK_VS_HOLD = `() => {
  ${PARSE_STOPS}
  ${BAND_OF}
  return [...document.querySelectorAll('[data-art-wash-band]')]
    .filter((root) => root.getClientRects().length)
    .map((root) => {
      const band = bandOf(root);
      const bandBox = band.getBoundingClientRect();
      const labels = [...band.querySelectorAll('[data-wash-label]')]
        .filter((el) => el.getClientRects().length)
        .map((el) => el.getBoundingClientRect());
      const scrims = [...root.querySelectorAll('.art-wash-scrim')];
      const image = scrims.length ? getComputedStyle(scrims.at(-1)).backgroundImage : '';
      // The shared parser, which is the point of having one: this reader had its
      // own copy with single-escaped patterns, and a template literal eats a
      // single backslash — so the regex was malformed and the stop list empty.
      const stops = parseStops(image).map((stop) => stop.position);
      return {
        declared: Number(root.getAttribute('data-art-wash-band')),
        band: Math.round(bandBox.height),
        // The tallest laid-out block, since one wash can sit under two of them at
        // two breakpoints and the ramp has to clear the taller.
        blockFromFoot: labels.length
          ? Math.round(Math.max(...labels.map((r) => bandBox.bottom - r.top)))
          : null,
        holdPct: stops.length >= 3 ? stops[2] : null,
        // The vertical ramp is the gradient that states NO angle: a browser omits
        // the default 180deg, so testing for it would skip every ramp there is.
        vertical: !/^linear-gradient\\(\\s*90deg/.test(image),
      };
    });
}`;

/** Every commander thumb on the page, as drawn. Five renders each invented one of
    these, at five geometries and three ring alphas; the convergence is its own
    change, and this reads what is there so the before and after are the same
    measurement. The ring comes off the computed shadow rather than a class,
    because three of the five set it inline. */
const READ_THUMBS = `() => {
  // Selected by the primitive's own marker, never by shape. Matching on a 63/88
  // aspect also catches the decks zero state's decorative card fan, which then
  // fails assertions about a treatment it has nothing to do with — a false
  // failure teaches a reader to ignore the probe.
  return [...document.querySelectorAll('[data-commander-thumb]')]
    .filter((el) => el.getClientRects().length)
    .map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // The art and its crop sit on the thumb's own layer since the card-art fades (\`ArtLayer\`), not the host.
      const art = [el, ...el.querySelectorAll('*')].find((e) => getComputedStyle(e).backgroundImage.includes('url('));
      return {
        size: el.getAttribute('data-commander-thumb'),
        box: [Math.round(r.width), Math.round(r.height)],
        radius: s.borderTopLeftRadius,
        shadow: s.boxShadow,
        position: art ? getComputedStyle(art).backgroundPosition : s.backgroundPosition,
        hasArt: Boolean(art),
      };
    });
}`;

/** Anything shaped like a card face that carries NO marker. The marked census
    above cannot see a render that was never migrated — an unmarked 34×48 is
    simply absent from it, and the two-box assertions then pass over a surface
    that still draws its own geometry. This is the other half of that check, and
    it has to tolerate one real decorative case: the decks zero state draws a
    card fan at nearly this aspect, which is an illustration rather than a
    commander. */
const READ_UNMARKED_FACES = `() => {
  return [...document.querySelectorAll('div, span')]
    .filter((el) => {
      if (el.hasAttribute('data-commander-thumb')) return false;
      if (el.closest('[data-commander-thumb]')) return false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const ratio = r.width / r.height;
      // A card-face box: bigger than an icon, smaller than a page, at 63/88.
      // 24, not 28: the deck rail's own 26×36 render is the narrowest thing this
      // sweep exists to catch, and a 28px floor would have excluded exactly the
      // render whose migration it is checking.
      if (r.width < 24 || r.width > 120 || ratio < 0.6 || ratio > 0.85) return false;
      // Art or a gradient behind it, so a bare spacer with those proportions is
      // not reported as a render.
      const bg = getComputedStyle(el).backgroundImage;
      return bg.includes('url(') || bg.includes('gradient');
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return Math.round(r.width) + '×' + Math.round(r.height);
    });
}`;

/** The stated bands on whatever surface is loaded, and the one measurement the
    round's own failure asks for: the label block's real top edge against the
    ramp's hold. A routine rather than an inline block, for the same reason the
    chrome checks are one — the migrated 288px detail band is on the commander
    DETAIL page, which the list loop never visits, so measuring only there would
    have left the surface with the largest block in the round unchecked. */
async function checkBands(page, label, note) {
  // A stated band owns its height and labels at its foot. The ramp is the
  // round's load-bearing change and it is checked as arithmetic, not as a
  // prop: the hold has to sit where the block's top edge is, and a px
  // `labelAt` pushed through a percentage signature lands it at less than
  // half the band instead.
  const stated = await page.evaluate(`(${READ_STATED_BANDS})()`);
  note(`  stated bands: ${stated.length}${stated.length ? ` at ${[...new Set(stated.map((b) => b.declared))].join(", ")}` : ""}`);
  // Zero stated bands is a FAIL only where a wash is actually drawn. With
  // nothing in `stated` the unstated count is 0 too and every loop below is
  // skipped, so a page whose markers vanished while its art stayed would exit
  // green having checked no band at all — but a page legitimately drawing no
  // wash is not that page. The commander detail hero is `sm:hidden`, so the
  // desktop layout of that route has no band by design, and an unconditional
  // failure here would have failed a correct run at every desktop viewport.
  const washLayers = await page.evaluate(
    `[...document.querySelectorAll('.art-wash-art, .art-wash-scrim')]
      .filter((el) => el.getClientRects().length).length`,
  );
  if (!stated.length) {
    note(
      washLayers
        ? `  FAIL ${label}: ${washLayers} wash layer(s) drawn and no stated band — every band check below is vacuous`
        : `  ${label}: no wash on this page at this width`,
    );
  }
  // An empty census is not a pass, and zero is exactly what a reverted migration
  // or a vanished render produces. The check is the count of wash layers NOT
  // inside a stated band: no per-route table, and it cannot go quiet.
  // BANDS, not scrim layers: a `left-portrait` band draws a horizontal scrim and
  // a vertical ramp, so counting layers reported one unmigrated band as two.
  // Each scrim's own root is the band, so the distinct roots are the count.
  //
  // A FAILURE now, not the countdown it was while surfaces migrated one slice at
  // a time. The legacy props are deleted, so the type system forbids an unstated
  // band from inside the app — but a wash can still reach the page without one:
  // a reverted surface, a new render that never went through the system, or a
  // band whose marker was dropped while its wash stayed. The type check cannot
  // see any of those; this can.
  const unstated = await page.evaluate(
    `new Set(
      [...document.querySelectorAll('.art-wash-scrim')]
        .filter((s) => s.getClientRects().length)
        .filter((s) => !s.closest('[data-art-wash-band]'))
        .map((s) => s.parentElement),
    ).size`,
  );
  if (unstated) {
    // A FAIL, not a countdown. Every surface is migrated as of this slice, so an
    // unstated band is a reverted one or a new render that never went through the
    // system — and a line that only reports would have let either stand while the
    // probe stayed green.
    note(`  FAIL ${label}: ${unstated} band(s) draw a wash without stating a band`);
  }
  for (const band of stated) {
    if (!SETTLED_BANDS.some((h) => `${h}px` === band.declared)) {
      note(`  FAIL ${label}: band declares ${band.declared || "no height"}, outside the settled set`);
    }
    if (Math.abs(band.laid - Number.parseInt(band.declared, 10)) > 1) {
      note(`  FAIL ${label}: band declares ${band.declared} and lays out at ${band.laid}px`);
    }
    if (band.ramped && band.verticals !== 1) {
      note(
        `  FAIL ${label}: ${band.declared} band paints ${band.verticals} vertical ramps, expected exactly 1`,
      );
    }
    if (!band.ramped) {
      // A flat band: its ink starts past the portrait's flat stop and stands on
      // the row's own ground, so there is no ramp to measure — but it has to
      // draw NONE, not merely be excused from the check. The marker is a
      // declaration, and a band that declares itself flat while still painting a
      // ramp is darkening art nobody decided to darken.
      if (band.verticals !== 0) {
        note(
          `  FAIL ${label}: ${band.declared} band declares itself flat and paints ${band.verticals} vertical ramps`,
        );
      } else {
        note(`  ${label}: ${band.declared} band is flat — no ramp to check`);
      }
      continue;
    }
    if (band.stops.length !== 4) {
      note(`  FAIL ${label}: ${band.declared} band computed ${band.stops.length} stops, expected 4`);
      continue;
    }
    if (band.stops[0].alpha !== 0 || band.stops[1].alpha !== 0) {
      note(`  FAIL ${label}: ${band.declared} band veils its top: ${JSON.stringify(band.stops.slice(0, 2))}`);
    }
    if (band.stops[3].alpha !== band.stops[2].alpha) {
      note(`  FAIL ${label}: ${band.declared} band does not hold to its foot: ${JSON.stringify(band.stops.slice(2))}`);
    }
    // The hold compared to the exact figure its own `labelAtPx` implies, rather
    // than to a threshold. A generic "below half" test passes the very regression
    // it was written for: 57 or 83 read as a percentage on a 288 band lands at
    // 57% or 83%, both perfectly ordinary-looking numbers, and only
    // `(band − at) / band` tells them from the 80% and 71% expected.
    const at = band.labelAtPx;
    if (at === null) {
      note(`  FAIL ${label}: ${band.declared} band publishes no label-at figure to check its hold against`);
    } else {
      const height = Number.parseInt(band.declared, 10);
      const expected = Math.round(((height - at) / height) * 100);
      if (band.stops[2].unit !== "%") {
        // A px hold is not comparable to a percentage, and silently reading 46px
        // as 46% is this round's own bug moved into the probe.
        note(
          `  FAIL ${label}: ${band.declared} band holds at ${band.stops[2].position}${band.stops[2].unit}, expected a percentage`,
        );
      } else if (Math.abs(band.stops[2].position - expected) > 1) {
        note(`  FAIL ${label}: ${band.declared} band holds at ${band.stops[2].position}%, expected ${expected}% for a ${at}px block`);
      }
    }
  }

  // The block against the ramp, which is the one measurement the round's own
  // failure asks for: a `labelAtPx` derived from an intended block rather
  // than a measured one holds the scrim where the block ENDS, and its first
  // line then prints on unscrimmed art.
  for (const b of await page.evaluate(`(${READ_BLOCK_VS_HOLD})()`)) {
    // Only an intentionally flat band is skipped. A non-flat band missing its
    // label hook or its hold is the check's own machinery gone — removing the
    // marker would otherwise make this pass rather than report, which is the
    // failure mode every other check in this file was fixed for.
    if (!b.vertical) {
      note(`  ${label}: ${b.declared} band is flat — no ramp to compare a block against`);
      continue;
    }
    if (b.blockFromFoot === null) {
      note(`  FAIL ${label}: ${b.declared} band draws no [data-wash-label] — nothing to measure the ramp against`);
      continue;
    }
    if (b.holdPct === null) {
      note(`  FAIL ${label}: ${b.declared} band's ramp has no hold stop to compare`);
      continue;
    }
    const blockPct = 100 - (b.blockFromFoot / b.band) * 100;
    note(`  ${label}: ${b.declared} band's block starts ${b.blockFromFoot}px off the foot (${blockPct.toFixed(0)}%), hold at ${b.holdPct}%`);
    // One direction fails, and only one. `labelAtPx` is keyed to the WORST case
    // by design — the wrapped title, the taller of two breakpoint blocks — so on
    // the narrower width the hold legitimately sits above the block that is
    // drawn, and failing that would fail the build for doing what the round
    // decided. A hold BELOW the block is the defect: ink standing on a ramp that
    // has not finished climbing. Above it is reported, because a large gap is
    // how an over-generous figure shows up.
    const slack = 200 / b.band;
    if (b.holdPct > blockPct + slack) {
      note(`  FAIL ${label}: the ${b.declared} band's hold sits BELOW its block — ink on a rising ramp`);
    } else if (b.holdPct < blockPct - 10) {
      note(`  ${label}: the ${b.declared} band's hold sits ${(blockPct - b.holdPct).toFixed(0)} points above this block — keyed to a taller one`);
    }
  }

}

/** THE PLATE and the thumbs, on whatever surface is loaded. A routine rather than
    an inline block, because the controls this measures live on the commander and
    deck DETAIL pages while the band checks live on the lists — and an earlier
    draft ran these inside the list loop alone, where the control list is always
    empty and every assertion under it passes without executing. A check that
    cannot fail is worse than no check. */
/** Nothing may push the document wider than its own viewport. This is the one
    class of bug a property table cannot catch and jsdom cannot see: a
    `flex-nowrap` row without a zero minimum of its own takes its content's
    min-content width as a floor, so a long two-faced commander name drew the
    deck header outside the viewport on both sides.

    Its own routine, not part of `checkChrome`, because it has nothing to do with
    the card-details control and must run on pages that draw none — a crop-less
    commander still mounts the same spine and can carry the same long name.

    Measured against the scrolling element's own `clientWidth` rather than
    `window.innerWidth`: the two differ by the vertical scrollbar, which is
    exactly the width a marginal overflow hides behind. `probe-price-ui.mjs`
    already measures it this way, and any surplus at all is the failure — these
    are integer widths. */
async function checkNoOverflow(page, label, note) {
  const overflow = await page.evaluate(
    `(() => { const d = document.scrollingElement; return Math.round(d.scrollWidth - d.clientWidth); })()`,
  );
  if (overflow > 0) {
    note(`  FAIL ${label}: the document is ${overflow}px wider than its viewport — content is outside it`);
  }

  // The document measurement alone is not enough to guard the fix. The row that
  // overflowed sits inside a band with `overflow: hidden`, so the same revert
  // that once pushed content past the viewport would now be CLIPPED by the band
  // instead — invisible to `scrollWidth` on the document and just as broken on
  // screen. Each nowrap row is therefore measured against its own box: content
  // wider than the box it is laid out in is the defect, wherever the clipping
  // happens to land.
  const clipped = await page.evaluate(
    `[...document.querySelectorAll('[data-spine-meta]')]
      .filter((el) => el.getClientRects().length)
      .map((el) => ({ over: Math.round(el.scrollWidth - el.clientWidth), text: (el.textContent ?? '').trim().slice(0, 60) }))
      .filter((r) => r.over > 0)`,
  );
  for (const row of clipped) {
    note(`  FAIL ${label}: a meta row's content is ${row.over}px wider than its own box — "${row.text}"`);
  }
}

async function checkChrome(page, label, note) {
  const plates = await page.evaluate(`(${READ_PLATES})()`);
  if (plates.length) {
    note(`${label}: ${plates.length} card-details control(s) at ${[...new Set(plates.map((p) => p.drawn?.join("×")))].join(", ")}`);
  }
  for (const plate of plates) {
    if (plate.target[0] < 44 || plate.target[1] < 44) {
      note(`  FAIL control target ${plate.target.join("×")} under the 44px floor`);
    }
    // 26 TALL always; 26 wide unless the control carries its words. The desktop
    // deck header is the one placement that keeps them — it sits in a wide empty
    // corner with nothing to compete with — so its plate is a pill, and asserting
    // a square there would fail the label rather than the geometry.
    // Exactly 26×26 everywhere, and 26 TALL by any width at the one placement
    // that carries words. Allowing "at least 26 wide" everywhere would have let
    // an icon-only control regress to a 44px panel — which is the thing the
    // target/plate split exists to prevent — and the check would have passed it.
    const wide = plate.drawn && plate.drawn[0] > 26;
    if (!plate.drawn || plate.drawn[1] !== 26 || (wide && !plate.onDeckDesktop) || plate.drawn[0] < 26) {
      note(
        `  FAIL drawn plate ${plate.drawn?.join("×") ?? "absent"}, expected ${plate.onDeckDesktop ? "26 tall and at least 26 wide" : "26×26"}`,
      );
    }
    // Opaque is the whole argument for deleting the top scrim: a translucent plate
    // passes the brightest pixel of an unscrimmed crop through to the glyph. A
    // resolved colour carrying an alpha under 1 is that mix — including the case
    // where a parent's own opacity is what composites it.
    if (plate.alpha < 0.999) note(`  FAIL plate is translucent: ${plate.fill} at ${plate.alpha}`);
    if (Number.parseFloat(plate.border) < 1) note(`  FAIL plate draws no hairline: ${plate.border}`);
    // Words at ONE placement: the desktop deck header, where the control sits in
    // a wide empty corner with nothing to compete with. Everywhere else the words
    // were doing the job THE PLATE now does, and a phone's centred title had them
    // flanking it.
    if (plate.text && !plate.onDeckDesktop) {
      note(`  FAIL control still prints words: ${JSON.stringify(plate.text)}`);
    }
    if (!plate.text && plate.onDeckDesktop) {
      note(`  FAIL the desktop deck header's control lost its words`);
    }
  }

  const hits = await page.evaluate(`(${READ_PLATE_HIT})()`);
  for (const hit of hits) {
    // Every edge midpoint, not just the centre: the target is 9px further out
    // than the drawn box and every band it sits on is `overflow-hidden`, so an
    // overhang is clipped out of its own hit area without changing one pixel of
    // what a screenshot shows.
    for (const [where, result] of Object.entries(hit)) {
      if (result !== "self") {
        note(`  FAIL card-details control unreachable at its ${where}: ${result}`);
      }
    }
  }

  // The thumbs. The census becomes assertions now that the five renders share one
  // treatment: two boxes and one ring, or the convergence has not reached every
  // render.
  const thumbs = await page.evaluate(`(${READ_THUMBS})()`);
  if (thumbs.length) {
    note(`${label}: ${thumbs.length} commander thumb(s) at ${[...new Set(thumbs.map((t) => t.box.join("×")))].join(", ")}`);
  }
  // The unmarked half. A render that never migrated carries no marker, so the
  // census above is blind to it and its assertions pass over a surface still
  // drawing 34×48. Reported everywhere and failed everywhere except the decks
  // list, whose zero state draws a decorative card fan at nearly this aspect.
  const unmarked = await page.evaluate(`(${READ_UNMARKED_FACES})()`);
  if (unmarked.length) {
    note(`  FAIL ${label}: ${unmarked.length} unmarked card-face box(es) at ${[...new Set(unmarked)].join(", ")}`);
  }

  for (const t of thumbs) {
    const box = t.box.join("×");
    if (!THUMB_BOXES.includes(box)) note(`  FAIL thumb at ${box}, outside the two settled boxes`);
    if (t.radius !== "6px") note(`  FAIL thumb radius ${t.radius}, expected 6px`);
    // The alpha, not just the word `inset`: the whole point of the convergence is
    // that `.3` and `.35` became `.4`, and all three are inset shadows. The
    // browser resolves the alpha to `0.4`, so the string is the check.
    if (!t.shadow.includes("inset")) note(`  FAIL thumb ring is not inset: ${t.shadow}`);
    if (!THUMB_RING_RE.test(t.shadow)) note(`  FAIL thumb ring is not the one alpha: ${t.shadow}`);
    // `center top`, not `center`: a centred crop of a 63/88 frame at 44px wide is
    // mostly type box, and the face is at the top of the card.
    if (t.hasArt && !t.position.startsWith("50% 0")) {
      note(`  FAIL thumb crops from ${t.position}, expected center top`);
    }
  }
}

/** Every reader in this file travels to the browser as a template literal, so a
    regex written with single escapes loses them before the browser ever parses
    it: `\(` becomes `(` and `\s` becomes `s`, and the generated function throws
    a SyntaxError that surfaces as a mysteriously empty result. Parsing each one
    here turns that into a loud failure at startup rather than a silent gap in
    coverage — it is the same class of bug as a check that cannot fail. */
const READERS = {
  READ_WASHES,
  READ_ART_LAYERS_PER_BAND,
  READ_ROW_SCRIMS,
  READ_COVER_STOPS,
  READ_STATED_BANDS,
  READ_BLOCK_VS_HOLD,
  READ_THUMBS,
  READ_UNMARKED_FACES,
  READ_PLATES,
  READ_PLATE_HIT,
};
for (const [name, source] of Object.entries(READERS)) {
  try {
    new Function(`return (${source})`);
  } catch (error) {
    throw new Error(`${name} does not parse as a browser function: ${error.message}`);
  }
}

/** Every scrim's computed gradient, so the reduced-transparency comparison is
    about the gradient rather than about the opacity beside it. */
const READ_SCRIM_GRADIENTS = `[...document.querySelectorAll('.art-wash-scrim')].map((s) => getComputedStyle(s).backgroundImage)`;

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};

await clerkSetup();

const browser = await chromium.launch();
try {
  for (const [vpName, width, height, layout] of VIEWPORTS) {
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

      // Every cover band on the route, in one shape: whatever the label edge, a
      // ramp must not climb back at the foot. That climb washed the crop to
      // protect chips which are opaque on their own — the deck tile's status
      // pill, the ready-to-build fit chip — and a rising final stop is it
      // reverting.
      const covers = await page.evaluate(`(${READ_COVER_STOPS})()`);
      note(`  cover bands: ${covers.length}`);
      for (const stops of covers) {
        const [last, prior] = [stops.at(-1), stops.at(-2)];
        if (!last || !prior) {
          note(`  FAIL ${vpName} ${routeName}: cover scrim computed ${stops.length} stops, expected 4`);
        } else if (last.alpha > prior.alpha + 0.001) {
          note(`  FAIL ${vpName} ${routeName}: cover scrim climbs at the foot: ${prior.alpha} to ${last.alpha}`);
        }
      }
      // A countdown while the round is in flight: an edge class means a band that
      // has not migrated, and the last of them retires with the `labelEdge` prop
      // in the final slice — after which the class cannot be emitted at all.
      const edged = await page.evaluate(
        `document.querySelectorAll('.art-wash-scrim-cover-top, .art-wash-scrim-cover-bottom').length`,
      );
      // Also a FAIL now: the `labelEdge` prop retires in this slice, so the class
      // cannot be emitted at all and a band carrying it is the legacy arm back.
      if (edged) note(`  FAIL ${edged} band(s) still name a label edge`);

      await checkBands(page, `${vpName} ${routeName}`, note);

      await checkNoOverflow(page, `${vpName} ${routeName}`, note);
      await checkChrome(page, `${vpName} ${routeName}`, note);
    }

    // The row band, at this viewport. Both commander rows declare 208 now, so
    // the old check's "148 band" reporting named a geometry that no longer
    // exists — and its ramp/scrim counts are what `checkBands` already asserts
    // per band, with the surface named. What is NOT covered there is the
    // horizontal scrim leaving the portrait unwashed out to its clear stop, so
    // that is what stays. This load also serves the accessibility checks below.
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const scrims = await page.evaluate(`(${READ_ROW_SCRIMS})()`);
    if (!scrims?.length) {
      note(`  FAIL no scrim layers found on the row band`);
    } else {
      const painted = scrims.filter((s) => s.display !== "none");
      const horizontals = painted.filter((s) => s.horizontal);
      note(`${vpName} row band: ${horizontals.length} horizontal scrim`);
      if (horizontals.length !== 1) note(`  FAIL expected exactly one horizontal scrim to paint`);
      else {
        // The first two stops BY INDEX, not a pattern anywhere in the gradient:
        // an unanchored match is satisfied by any later pair of zero-alpha
        // stops, so a scrim that veils the portrait from 0 and clears further
        // along passed the very check written to catch it. This round drove
        // those two to zero — the portrait carries no wash at all until the crop
        // starts fading into the row — so a non-zero alpha in either is the lift
        // silently reverting.
        const first = horizontals[0].stops.slice(0, 2);
        if (first.length !== 2) {
          note(`  FAIL horizontal scrim computed ${horizontals[0].stops.length} stops, expected at least 2`);
        } else if (first.some((stop) => stop.alpha !== 0)) {
          note(`  FAIL horizontal scrim washes the portrait: ${JSON.stringify(first)}`);
        }
      }
    }

    // Ratification 3 — the bottom-labelled cover ramp, on the commander page the
    // phone draws it for. The band's top runs clear: the only control up there
    // plates itself opaquely, so a non-zero alpha in the first two
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
      const bottoms = await page.evaluate(`(${READ_COVER_STOPS})()`);
      // Desktop draws no bottom-labelled band at all — the treatment is the
      // phone's — so an empty list is the desktop answer, not a silent pass.
      note(`${vpName} ${slug}: ${bottoms.length} bottom-labelled cover bands`);
      if (layout === "phone" && bottoms.length !== 1) {
        note(`  FAIL expected exactly one bottom-labelled band on the phone`);
      }
      if (layout === "desktop" && bottoms.length !== 0) {
        note(`  FAIL desktop drew a bottom-labelled band; the treatment is phone-only`);
      }
      await checkNoOverflow(page, `${vpName} ${slug}`, note);
      await checkChrome(page, `${vpName} ${slug}`, note);
      // The 288 detail band, which no list route draws.
      await checkBands(page, `${vpName} ${slug}`, note);

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

    // The deck-creation surfaces, which is where four of the five thumbs live and
    // where none of the list routes reaches. Every one of them is a screen where a
    // player chooses or commits to a commander, which is the brief's own finding
    // about why they had never been through the wash system: the picker's
    // candidate rows and its selected summary on one door, the pre-filled flow's
    // thumb on the other.
    //
    // Each entry names what it MUST draw. A census that only rejects a box
    // outside the allow-list passes silently when a thumb is missing altogether,
    // which is the same vacuity as running the check on a route that draws none.
    // The pre-filled door is entered from a COMMANDER PAGE now. Home's hero used
    // to link straight to `/decks/new?commander=<oracleId>` and that CTA is cut —
    // nobody builds a deck without seeing the pool first — so the route in is
    // `Build this deck`, which points at `/decks?commander=<oracleId>` and is
    // redirected by that page to the pre-filled URL. Following the link the app
    // actually offers is also the more honest probe.
    // Back to the list first. The block above followed a commander link to its
    // detail page, and a detail page carries no `/commanders/<slug>` self-link —
    // so this query returned null there, skipped the whole census, and then
    // failed the run for finding no `Build this deck` link. The page it needs is
    // the one the link lives on.
    await page.goto(`${BASE}/commanders`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const commanderDetailHref = await page.evaluate(
      `document.querySelector('a[href^="/commanders/"]')?.getAttribute('href') ?? null`,
    );
    let commanderBuildHref = null;
    if (commanderDetailHref) {
      await page.goto(`${BASE}${commanderDetailHref}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      commanderBuildHref = await page.evaluate(
        `document.querySelector('a[href^="/decks?commander="]')?.getAttribute('href') ?? null`,
      );
    }
    // The pre-filled door's thumb is the PHONE's: desktop draws a 220px card face
    // instead, which is a different render of the same commander and not a thumb
    // at all. Requiring the thumb at both widths failed a correct build.
    const CREATE_SURFACES = [
      ["the picker's candidate rows", "/decks/new", ["44×62"]],
      ...(commanderBuildHref
        ? [["the pre-filled door", commanderBuildHref, layout === "phone" ? ["64×89"] : []]]
        : []),
    ];
    for (const [what, path, required] of CREATE_SURFACES) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-create-${required[0]}.png` });
      const drawn = await page.evaluate(`(${READ_THUMBS})()`);
      const boxes = new Set(drawn.map((t) => t.box.join("×")));
      note(`${vpName} ${what}: ${drawn.length} thumb(s) at ${[...boxes].join(", ") || "none"}`);
      if (!required.length) {
        note(`  (no thumb required at this width — the desktop door draws a card face)`);
      }
      for (const box of required) {
        if (!boxes.has(box)) note(`  FAIL ${what} draws no ${box} thumb`);
      }
      await checkNoOverflow(page, `${vpName} ${what}`, note);
      await checkChrome(page, `${vpName} ${what}`, note);
    }

    // The picker's OTHER two renders. Its candidate rows draw at rest; the
    // selected summary and the partner slot only exist after a pick, so a probe
    // that loads the route and stops sees one of three. It presses a candidate,
    // which is the only way to reach them.
    await page.goto(`${BASE}/decks/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const candidates = page.locator('li button[aria-pressed]');
    const candidateCount = await candidates.count();
    if (!candidateCount) {
      note(`  FAIL no candidate row on /decks/new — the picker's selected summary goes unchecked`);
    } else {
      // Walk candidates until one can PAIR, and then actually pair it. The
      // partner slot is the fifth thumb: its EMPTY state mounts once a
      // partner-capable commander is selected, and its FILLED state — the one
      // drawing `CommanderThumb` — only after a partner is chosen. Stopping at
      // the empty slot would have censused four of five renders while the code
      // claimed all five, and clicking only the first row usually reaches
      // neither.
      //
      // Every candidate, not a capped prefix: a pairable commander can sort
      // anywhere in the owned list, and a probe that gives up after twelve and
      // logs a note is a probe that passes while the render goes unverified.
      let pairing = false;
      for (let i = 0; i < candidateCount; i++) {
        await candidates.nth(i).click();
        await page.waitForTimeout(350);
        const addPartner = page.getByRole("button", { name: /^Add a partner for / });
        if (!(await addPartner.count())) continue;

        note(`${vpName} the picker: candidate ${i + 1} can pair`);
        // The empty slot, which keeps the dash and the thumb's own box so the row
        // does not move when a partner arrives.
        const emptyPlate = await page.evaluate(
          `document.querySelectorAll('[class*="border-dashed"][class*="w-[44px]"]').length`,
        );
        if (!emptyPlate) note(`  FAIL the empty partner slot draws no 44×62 dashed plate`);

        await addPartner.click();
        await page.waitForTimeout(400);
        const partnerCandidate = page.locator('li button[aria-pressed]').first();
        if (!(await partnerCandidate.count())) {
          note(`  FAIL pairing mode offered no partner to choose`);
          break;
        }
        await partnerCandidate.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `/tmp/art-wash-${vpName}-picker-paired.png` });
        const paired = await page.evaluate(`(${READ_THUMBS})()`);
        note(`${vpName} the picker, partner chosen: ${paired.length} thumb(s) at ${[...new Set(paired.map((t) => t.box.join("×")))].join(", ")}`);
        // Scoped to the slot's own group, not to the page's box set: the picker
        // still draws its candidate rows after pairing and those are 44×62 too,
        // so a set membership test stays true even if the filled slot stops
        // drawing its thumb entirely. The row thumbs are what would have made
        // this pass while measuring nothing.
        const slotThumb = await page.evaluate(
          `(() => {
            // Laid out only: both responsive copies of the slot are in the DOM,
            // and on desktop the hidden one comes FIRST — so taking the first
            // match measures a 0x0 element and reports a failure about the copy
            // that is correctly hidden.
            const el = [...document.querySelectorAll('[role="group"] [data-commander-thumb]')]
              .find((c) => c.getClientRects().length);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return [Math.round(r.width), Math.round(r.height)];
          })()`,
        );
        if (!slotThumb) {
          note(`  FAIL the filled partner slot draws no thumb of its own`);
        } else if (slotThumb.join("×") !== "44×62") {
          note(`  FAIL the filled partner slot's thumb is ${slotThumb.join("×")}, expected 44×62`);
        }
        await checkNoOverflow(page, `${vpName} the picker, paired`, note);
        await checkChrome(page, `${vpName} the picker, paired`, note);
        pairing = true;
        break;
      }
      if (!pairing) {
        note(`  FAIL none of the ${candidateCount} candidates can pair — the partner slot's two states go unverified`);
      }

      await page.waitForTimeout(300);
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-picker-selected.png` });
      const picked = await page.evaluate(`(${READ_THUMBS})()`);
      const boxes = new Set(picked.map((t) => t.box.join("×")));
      note(`${vpName} the picker, one commander picked: ${picked.length} thumb(s) at ${[...boxes].join(", ")}`);
      // The summary is the reason for the click — a 64×89 appearing is the proof
      // the click reached that state rather than pressing something inert — but
      // it is DESKTOP's: the summary lives in a `hidden md:block` sidebar and the
      // phone's dock is text-only, so requiring it at both widths would fail
      // every mobile run for drawing exactly what it should.
      if (layout === "desktop" && !boxes.has("64×89")) {
        note(`  FAIL the picker's selected summary draws no 64×89 thumb`);
      }
      if (layout === "phone" && boxes.has("64×89")) {
        note(`  FAIL a summary thumb drew on the phone, whose dock is text-only`);
      }
      await checkNoOverflow(page, `${vpName} the picker, picked`, note);
      await checkChrome(page, `${vpName} the picker, picked`, note);
    }
    if (!commanderBuildHref) {
      note(`  FAIL no Build this deck link (/decks?commander=) found — the pre-filled door goes unchecked`);
    }

    // The deck header, which is the other surface drawing this control — and the
    // one whose `Card details` chip shipped visible and dead (#534), so its hit
    // test is the one with a history. The link is read off the list rather than
    // written down, so no deck id is hard-coded.
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    // The tile's small-cell band, at the one width that lays it out. Neither
    // 375 nor 1440 does: the phone is one column and 1440 gives a 456px cell,
    // both above the ~330px floor, so the 248 arm is the only one measured at
    // either. Three columns with the grid's 72px of padding and gaps put a 900px
    // viewport at a 276px cell, which is the arm this tile added — and a
    // container query is invisible to jsdom, so this is the only check of it.
    await page.setViewportSize({ width: 900, height: 900 });
    await page.waitForTimeout(400);
    const smallCell = await page.evaluate(
      `(() => {
        const art = document.querySelector('[data-deck-art]');
        if (!art) return null;
        const shown = [...art.querySelectorAll('[data-art-wash-band]')]
          .filter((w) => w.getClientRects().length)
          .map((w) => w.getAttribute('data-art-wash-band'));
        return { cell: Math.round(art.getBoundingClientRect().width), band: Math.round(art.getBoundingClientRect().height), shown };
      })()`,
    );
    if (!smallCell) {
      note(`  FAIL no deck tile on /decks to measure the small-cell band on`);
    } else if (smallCell.cell >= 330) {
      note(
        `  ${vpName} small-cell check skipped: the 900px viewport gave a ${smallCell.cell}px cell, at or above the floor`,
      );
    } else if (smallCell.band !== 168 || smallCell.shown.join() !== "168") {
      note(
        `  FAIL a ${smallCell.cell}px cell drew a ${smallCell.band}px band with [${smallCell.shown}] laid out, expected 168 alone`,
      );
    } else {
      note(`  ${vpName} small cell: ${smallCell.cell}px column draws the 168 band`);
    }
    // At this width too, while it is the one laid out: the 900px arm is a real
    // layout the app ships and nothing else measures it.
    await checkNoOverflow(page, `${vpName} /decks at 900`, note);
    await page.setViewportSize({ width, height });
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Every deck link, not the first one. `/decks/new` is a link on this page too
    // and would take the probe to the creation picker; and a deck whose commander
    // has no crop draws no control AT ALL by ruling, so the first real deck can
    // legitimately have none. Walk them until one shows the control, which is
    // what `probe-commander-card-details.mjs` already does.
    const deckHrefs = await page.evaluate(
      `[...document.querySelectorAll('a[href^="/decks/"]')]
        .map((a) => a.getAttribute('href'))
        .filter((href) => /^\\/decks\\/[0-9a-f-]{36}$/.test(href))`,
    );
    let walkedADeck = false;
    // Kept for the reduced-transparency comparison below, which needs a real
    // deck page: the deck header mounts a cover wash on the phone and the
    // portrait wash on desktop, and a scrim regression there would otherwise sit
    // outside every route that check visits.
    let walkedDeckHref = null;
    // Every link, not the first five: a run whose earliest decks all have
    // crop-less commanders would have concluded that no deck page draws the
    // control, which is a false failure about the fixture rather than the build.
    // Every deck at the PHONE width, where the overflow happened and where a
    // long name has the least room; the first qualifying deck at every width, for
    // the chrome and geometry checks. Walking all of them at all three widths
    // loaded ninety deck pages and took the dev server down with it, which is a
    // measurement nobody gets. The cap is reported rather than silent.
    let walkedCount = 0;
    for (const deckHref of deckHrefs) {
      // Every deck at the PHONE width, where the overflow happened and a long
      // name has least room. At the other widths the walk stops once one deck has
      // taken the chrome and geometry checks: ninety deck pages took the dev
      // server down, which is a measurement nobody gets. What was skipped is
      // reported after the loop rather than left silent.
      if (layout !== "phone" && walkedADeck) break;
      walkedCount += 1;
      // `domcontentloaded` plus a settle rather than `networkidle`. Every deck is
      // walked now, and a deck page keeps fetching — prices, availability — well
      // past the point its layout has settled, so waiting for the network to go
      // quiet on thirty of them times out on a dev server without measuring
      // anything more. Width is a layout question, and the settle covers it.
      await page.goto(`${BASE}${deckHref}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      // EVERY deck, before the crop-less skip and regardless of whether the
      // geometry checks below have already run: a commander with no crop draws
      // no control by ruling but mounts the same spine, and the long two-faced
      // name that caused this bug belongs to one particular deck — which the
      // first-qualifying-deck break would walk straight past.
      await checkNoOverflow(page, `${vpName} ${deckHref}`, note);
      if (walkedADeck) continue;
      const deckPlates = await page.evaluate(`(${READ_PLATES})()`);
      if (!deckPlates.length) {
        note(`${vpName} ${deckHref}: no card-details control — this commander has no crop`);
        continue;
      }
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-deck.png`, fullPage: false });
      await checkChrome(page, `${vpName} ${deckHref}`, note);
      // The full band checks, not a count. The spines are migrated, so this is
      // the stated 288 header being checked here: its declared height against
      // the laid-out one, its ramp's stops, and the hold against the block its
      // own labelAtPx implies — the same checks every other migrated route gets,
      // with no per-route table to keep in step.
      await checkBands(page, `${vpName} ${deckHref}`, note);

      // The two geometries, each at the width that draws it. Both wash layers are
      // mounted and CSS picks one, so the check is which of them is laid out —
      // and a container query cannot be verified from a class name, which is all
      // a unit test can see.
      const expected = DECK_HEADER_GEOMETRY[vpName];
      if (expected) {
        const drawn = await page.evaluate(
          `(() => {
            const art = [...document.querySelectorAll('[data-art-wash-band] .art-wash-art')]
              .filter((el) => el.getClientRects().length);
            const column = document.querySelector('header [class*="pl-[364px]"]');
            return {
              widths: art.map((el) => Math.round(el.getBoundingClientRect().width)),
              inset: column ? Math.round(Number.parseFloat(getComputedStyle(column).paddingLeft)) : null,
            };
          })()`,
        );
        note(`${vpName} ${deckHref}: portrait ${drawn.widths.join(", ") || "none"} at a ${drawn.inset}px inset`);
        if (!drawn.widths.includes(expected.portrait)) {
          note(`  FAIL expected a ${expected.portrait}px portrait at this row width, got ${drawn.widths.join(", ") || "none"}`);
        }
        if (drawn.widths.length !== 1) {
          note(`  FAIL ${drawn.widths.length} portraits laid out; one geometry is drawn at a time`);
        }
        if (drawn.inset !== expected.inset) {
          note(`  FAIL title column inset ${drawn.inset}px, expected ${expected.inset} to clear this portrait's flat stop`);
        }
      }
      walkedADeck = true;
      walkedDeckHref = deckHref;
      // No `break`: the chrome and geometry checks want one deck, and the
      // overflow check wants all of them. The flag above is what stops the
      // former from repeating.
    }
    if (walkedCount < deckHrefs.length) {
      note(
        `  (${deckHrefs.length - walkedCount} deck(s) not walked at ${vpName} — every deck is walked at the phone width, the rest stop once one has taken the geometry checks)`,
      );
    }
    if (!walkedADeck) {
      note(`  FAIL no deck page drew a card-details control — the deck header's chrome goes unchecked`);
    }

    // The two accessibility mechanisms, on BOTH kinds of band. `/commanders`
    // draws the `left-portrait` rows and Home draws a `cover` hero — and the
    // override this round deletes was a cover-only rule, so sampling portraits
    // alone would have let exactly the regression B9 asks about through.
    // Every route that can mount a scrim, not one of each strategy. The rule
    // this round deletes was cover-only, and cover bands are mounted on six
    // routes — Home's hero and resume rows, both deck-tile arms on `/decks`, the
    // owned lane on `/discover`, the detail hero on a commander page, and the
    // deck header, whose phone band is `cover` and whose desktop row is the
    // portrait. Sampling two of them would have let a selector regression on any
    // of the others through, which is the whole question B9 asks.
    for (const [whatKind, path] of [
      ["portrait rows", "/commanders"],
      ["home's cover bands", "/"],
      ["deck tiles", "/decks"],
      ["the owned lane", "/discover"],
      // Phone only: the detail hero's band is `sm:hidden` and the desktop
      // layout draws a card face instead, so including it at desktop width
      // reported a route with no wash as a surface that lost one.
      ...(commanderDetailHref && layout === "phone"
        ? [["the detail hero", commanderDetailHref]]
        : []),
      ...(walkedDeckHref ? [["the deck header", walkedDeckHref]] : []),
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const base = await page.evaluate(`(${READ_WASHES})()`);
      const baseScrims = await page.evaluate(READ_SCRIM_HEIGHTS);
      const baseScrimImages = await page.evaluate(READ_SCRIM_GRADIENTS);
      if (!base.length || !baseScrims.length) {
        note(`  FAIL no wash layers on ${path} — the accessibility checks measure nothing`);
        continue;
      }

      // Playwright's `emulateMedia` has no `prefers-reduced-transparency` option
      // and ignores one silently, so the check has to go through CDP or it passes
      // vacuously.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
      });
      if (!(await page.evaluate(`matchMedia('(prefers-reduced-transparency: reduce)').matches`))) {
        throw new Error("reduced-transparency emulation did not take — the check would be vacuous");
      }
      await page.waitForTimeout(300);
      const reduced = await page.evaluate(`(${READ_WASHES})()`);
      // The whole label, slugged. Taking the first word wrote `the owned lane`
      // and `the detail hero` to the same file, so the later route overwrote the
      // earlier one and the run kept fewer screenshots than surfaces it checked.
      const slugKind = whatKind.replace(/[^a-z0-9]+/gi, "-");
      await page.screenshot({ path: `/tmp/art-wash-${vpName}-reduced-${slugKind}.png` });

      // B9 as a fact rather than a claim: no band's scrim is reachable from a
      // stylesheet any more, so the preference rides on the art layer's opacity
      // alone. A scrim whose computed gradient CHANGED is an override returning.
      const underPreference = await page.evaluate(READ_SCRIM_GRADIENTS);
      // Length first. `.some` over the new list cannot see a scrim that stopped
      // being laid out, and a disappearing scrim is a bigger change than a
      // re-weighted one.
      if (underPreference.length !== baseScrimImages.length) {
        note(`  FAIL ${whatKind} scrim count changed under reduced transparency: ${baseScrimImages.length} → ${underPreference.length}`);
      } else if (underPreference.some((image, i) => image !== baseScrimImages[i])) {
        note(`  FAIL a ${whatKind} scrim was re-weighted under reduced transparency — B9 is unspecced`);
      }

      // Every comparison pairs by index, so a change in how many layers are laid
      // out has to fail here — otherwise the pairing slips and the per-layer
      // checks compare unrelated elements.
      if (reduced.length !== base.length) {
        note(`  FAIL layer count changed under the preference: ${base.length} → ${reduced.length}`);
      } else {
        const raised = reduced.filter((w, i) => w.opacity > base[i].opacity + 0.001);
        note(
          `${vpName} ${whatKind} reduced-transparency: ${reduced.filter((w, i) => w.opacity < base[i].opacity).length} dimmed, ${raised.length} raised`,
        );
        if (raised.length) note(`  FAIL a layer got MORE opaque under the preference`);
        if (reduced.some((w, i) => w.bandHeight !== base[i].bandHeight)) {
          note(`  FAIL band height changed under reduced transparency`);
        }
      }

      await cdp.send("Emulation.setEmulatedMedia", { features: [] });
      await page.emulateMedia({ forcedColors: "active" });
      await page.waitForTimeout(300);
      const forced = await page.evaluate(`(${READ_WASHES})()`);
      const forcedScrims = await page.evaluate(READ_SCRIM_HEIGHTS);
      note(
        `${vpName} ${whatKind} forced-colors: ${forced.length} art layers still laid out (expect 0), ` +
          `${forcedScrims.length} scrims at ${[...new Set(forcedScrims)].join(", ")}px`,
      );
      if (forced.length) note(`  FAIL art layer survived forced-colors`);
      if (forcedScrims.length !== baseScrims.length) {
        note(`  FAIL scrim count changed: ${baseScrims.length} → ${forcedScrims.length}`);
      } else if (forcedScrims.some((h, i) => h !== baseScrims[i])) {
        note(`  FAIL band height changed under forced colours`);
      }
      await page.emulateMedia({ forcedColors: "none" });
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures. Screenshots in /tmp/art-wash-*.png`);
if (fails.length) process.exitCode = 1;
