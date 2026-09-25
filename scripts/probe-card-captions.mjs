// The card views draw nothing over the art, and their caption is one box.
//
// Three of this design's rulings are facts about laid-out geometry, and jsdom can see none
// of them:
//
//   - The art carries NO mark and no bottom wash (call D). A class-list assertion cannot
//     tell a deleted scrim from one whose class moved, and it cannot see an absolutely
//     positioned mark at all — the element is present in both builds.
//   - The slot's three occupants are ONE BOX. They are not the same box today: the chip
//     uses Tailwind `border`, which is 1px of real layout on every side, while the collapsed
//     buy tag uses an inset shadow and the proxy mark an outline, neither of which occupies
//     space. Normalising font size and padding leaves the chip 2px taller — and a class-list
//     check reads `border` and `outline` as equally present, so only a measured height can
//     tell them apart.
//   - The live tile and the undo receipt report the SAME caption height, which is what makes
//     a removed card leave a hole exactly its own size.
//
//   - The caption name's DESCENDERS fall inside the box that clips them. `truncate` makes
//     that span an `overflow: hidden` box, so at `line-height: 1` its content box was
//     exactly the font size and every tail was cut off flat at the baseline. The two
//     utilities that fix it leave the markup working when either is removed, and the
//     measurement uses the metrics of the face the browser ACTUALLY used — read once
//     normally and once with every webfont aborted, since a fallback descent is what the
//     span's padding exists to absorb.
//
// It also reads each grid's column count and tile width. The two routes' achievable tiles
// DIFFER and the probe asserts each one by name rather than a shared tolerance: `/collection`
// has 1170px of track at 1300px and lands on 178.3px, the deck pane has 1186px (its ancestor
// pays `md:px-[26px]`) and lands on 181px. No floor produces 178 there, and a shared ±2 would
// pass or fail on whether a scrollbar happens to render.
//
// PREREQUISITE: the account needs at least one card in a MARKED state — claimed,
// over-committed, unowned or proxied. The slot draws nothing for a free, owned,
// un-proxied card, so a collection in which everything is free renders no slot box
// anywhere and the one-box check has nothing to compare. It fails rather than
// passing quietly in that case, and says which it was.
//
// Run by hand, and not part of `pnpm test`:
//   node scripts/probe-card-captions.mjs
//   PROBE_BASE=http://localhost:3600 PROBE_DECK=<uuid> node scripts/probe-card-captions.mjs
import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { deck: DECK_VIEW } = { deck: { card: "Card view" } };
const viewToggleCopy = { deck: DECK_VIEW };

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  // The draft block stages its own `deck_cards` row. Point this at `local-dev`
  // or a scratch branch, NEVER production.
  "DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
/** The gate's threshold, read from the file the app pins it in. */
const ABOUT_VERSION_FILE = new URL("../src/lib/copy/about.version.json", import.meta.url);
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
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
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

  // CLEAR THE ABOUT GATE before any route is asked for. Since #658 `proxy.ts`
  // redirects a reader who has not seen the current `ABOUT_VERSION` to
  // `/about?next=…` — so a probe that navigated straight to `/decks` scraped the
  // about page and reported "the account owns none", a routing problem wearing a
  // fixture problem's clothes.
  //
  // Seeded rather than clicked through: the flag lives in `user_prefs` and the
  // probe account has no row at all, so visiting the page does not write one.
  // Left set afterwards on purpose — "this account has seen the about page" is
  // true once this ran, and clearing it would re-break every other probe on this
  // account.
  //
  // `greatest(...)`, which is what `lib/about/read.ts` itself writes. A bare
  // assignment LOWERS the stored value when this checkout is pinned behind the
  // database's — putting the About page back in front of a real reader on their
  // next navigation, which is a probe editing a person's state rather than its
  // own fixture.
  const [{ version }] = [JSON.parse(readFileSync(ABOUT_VERSION_FILE, "utf8"))];
  await neon(DATABASE_URL)`
    insert into user_prefs (user_id, about_version_seen)
    values (${await page.evaluate(() => window.Clerk.user.id)}, ${version})
    on conflict (user_id) do update
      set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, await page.evaluate(() => window.Clerk.user.id));
}

/**
 * How a clipped-name failure reads. Capped at three names and a count: every tile on the
 * page shares one rule, so a regression cuts all 113 of them and an uncapped list buries
 * the rest of the run's output under one finding.
 */
function nameDetail(names, cut) {
  if (names.length === 0) return "no drawn name carries a descender — this run proves nothing";
  const slack = Math.min(...names.map((n) => Math.min(n.above, n.below)));
  if (cut.length === 0) return `${names.length} names, least slack ${slack}px`;
  const shown = cut.slice(0, 3).map((n) => `${n.text} ${n.above}/${n.below}`).join(", ");
  return `${names.length} names, least slack ${slack}px, ${cut.length} CUT: ${shown}`
    + (cut.length > 3 ? ", …" : "");
}

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

/**
 * What the art region is carrying.
 *
 * The art is found by its aspect ratio rather than by a class: 63/88 is the card, and every
 * candidate this could match — a plate, an illustration, a no-art sunken box — is drawn at
 * it. A positioned descendant is a mark left on the art; a `box-shadow` naming a blur radius
 * is the bottom wash, which the 1px inner edge (`inset 0 0 0 1px`) never does.
 */
const ART = (page) =>
  [...document.querySelectorAll(`${page} *`)]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 60) return false;
      return Math.abs(r.height / r.width - 88 / 63) < 0.03;
    })
    .map((el) => {
      const marks = [...el.querySelectorAll("*")].filter((d) => {
        const s = getComputedStyle(d);
        if (s.position !== "absolute") return false;
        // The no-art plate's cost pips are the one thing this design leaves
        // positioned over the art's box, and they are not a mark on an
        // illustration: that plate prints no cost, so the pips are the only one
        // anyone can see. Without this a deck holding a single artless card
        // fails the check for drawing exactly what it was told to draw.
        if (d.closest("[data-testid='tile-cost-pips']")) return false;
        const r = d.getBoundingClientRect();
        // An `sr-only` span is absolutely positioned and 1px square. It is not a mark; it is
        // the cost this design deliberately kept speaking.
        return r.width > 4 && r.height > 4;
      }).length;
      const shadow = getComputedStyle(el).boxShadow;
      // The wash is the shadow with a BLUR. The 1px inner edge this design keeps
      // is `0 0 0 1px`, which has none, so blur is what tells them apart.
      //
      // Parsed, never matched with one regex. A computed `box-shadow` puts the
      // COLOUR first — `rgba(0, 0, 0, 0.6) 0px -40px 40px -30px inset` — and the
      // first version of this check assumed the authored order, so its pattern
      // never fired: it reported "0 carrying a wash" over a tile whose wash had
      // been put back. Split on commas that are not inside `rgba(...)`, then read
      // each shadow's third length.
      const wash = shadow
        .split(/,(?![^(]*\))/)
        .some((part) => {
          const lengths = part.match(/-?\d+(\.\d+)?px/g) ?? [];
          return lengths.length >= 3 && parseFloat(lengths[2]) > 0;
        });
      return { marks, wash, shadow };
    });

/**
 * The draft's treatment on the tiles: the accent edge, and the figure standing
 * in the count's position.
 *
 * A PAINTED STRIP's geometry, not a style holder. Two earlier versions asked
 * which element carried an inline `boxShadow`, and neither could see the defect
 * that mattered: an inset shadow on the shell paints below the opaque art, so
 * the rule was invisible across the picture while sitting on exactly the element
 * the check wanted. What it reads now is the strip's height against its tile's.
 */
const DRAFT = ({ page }) => {
  // Found by its painted background at the accent colour, in a box no wider than
  // 4px — the rule, whatever element happens to draw it.
  const bg = (el) => getComputedStyle(el).backgroundColor;
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  const probe = document.createElement("span");
  probe.style.color = accent;
  document.body.appendChild(probe);
  const accentRgb = getComputedStyle(probe).color;
  probe.remove();
  // WIDTH AND SIDE, not just "narrow". `width <= 4` alone accepts a ZERO-width
  // strip, which paints nothing and is the cheapest way to pass this check
  // while shipping the defect it exists for.
  const edged = [...document.querySelectorAll(`${page} span`)].filter((el) => {
    if (bg(el) !== accentRgb) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1.5 && r.width <= 4;
  });
  return {
    edges: edged.length,
    accentRgb,
    // The strip has to REACH THE ART, which is the whole point of erratum 10 and
    // the thing the previous check could not see. Its height against its tile's.
    // Against the TILE, found by walking out to the rounded plate rather than
    // trusting the immediate parent — and on the LEFT edge, since a rule pinned
    // right covers just as much height while marking the wrong side.
    coversArt: edged.filter((el) => {
      let shell = el.parentElement;
      while (shell && !/rounded-\[(9|10)px\]/.test(shell.className ?? "")) {
        shell = shell.parentElement;
      }
      if (!shell) return false;
      const r = el.getBoundingClientRect();
      const s = shell.getBoundingClientRect();
      if (s.height <= 0) return false;
      return r.height / s.height > 0.9 && Math.abs(r.left - s.left) <= 2;
    }).length,
    // SCOPED TO A CAPTION. Unscoped, this read the deck header's own `+1`
    // pending-count chip and passed with the tile's figure deleted outright —
    // the check existed and measured nothing. The caption is the only place the
    // tile's figure can legitimately be.
    figures: [...document.querySelectorAll(
      `${page} [class*="min-h-[56px]"][class*="min-h-[50px]"] span`,
    )]
      .filter((el) => /^(\+\d+|\d+ → \d+)$/.test((el.textContent ?? "").trim()))
      .map((el) => el.textContent.trim()),
  };
};

/** Every caption's height, and every slot box's height, on the page. */
const CAPTIONS = (page) => {
  // BOTH halves of the pair. The caption's phone figure was 52 until the chip
  // padding grew it to 56 (erratum 12), and `decklist-row`'s meta shell is
  // `min-h-[52px] md:min-h-[34px]` — so matching one figure alone measured the
  // LIST's rows and reported a tidy single height of 34 for them.
  const caps = [...document.querySelectorAll(
    `${page} [class*="min-h-[56px]"][class*="min-h-[50px]"]`,
  )];
  const heights = [...new Set(caps.map((c) => Math.round(c.getBoundingClientRect().height)))];
  // The slot's occupants: the one box, whoever is in it. Found by the geometry they share —
  // a 4px radius on a mono box inside a caption — rather than by three component classes,
  // because the point of the check is that the three agree.
  const boxes = caps.flatMap((c) =>
    [...c.querySelectorAll("span")].filter((s) => {
      const st = getComputedStyle(s);
      if (st.borderRadius !== "4px") return false;
      return st.fontFamily.toLowerCase().includes("mono");
    }),
  );
  const boxHeights = [...new Set(boxes.map((b) => Math.round(b.getBoundingClientRect().height * 2) / 2))];
  // WHICH occupant, not just how many. The three are one box by rule, and a run
  // whose every box is a chip has not tested that — it has measured one
  // component against itself. The kinds are named so the report says which.
  const kinds = [...new Set(boxes.map((b) => {
    const t = (b.textContent ?? "").trim();
    if (t.startsWith("P")) return "P";
    if (t.includes("$")) return "$";
    return "chip";
  }))];
  return { captions: caps.length, heights, boxes: boxes.length, boxHeights, kinds };
};

/**
 * Where each caption name's INK falls against the box that clips it.
 *
 * The name span carries `truncate`, which is `overflow: hidden`, so that span is the clip
 * box — and at `line-height: 1` its content box is exactly the font size, which cut every
 * descender off flat at the baseline (the `g` in `Along the Crooked Way`). A class-list
 * assertion cannot see this and neither can jsdom, which lays out no text: the fix is two
 * utilities whose removal leaves the markup working and the glyphs cut.
 *
 * So this measures the ink rather than the rule. The font's own metrics come from the
 * canvas, for the FACE THE BROWSER ACTUALLY USED — which is the half a declared
 * line-height cannot answer, since a fallback face, or Plex Sans before `display: swap`
 * resolves, may have a taller descent than the face the value was chosen against. The
 * baseline sits half the leading below the padding box's top edge, so the two slacks are
 * what is left above the ink and below it; either going negative is a clipped glyph.
 *
 * Only names with a real descender are read: a span of `Aang` clears any box, and a run
 * that measured those alone would report slack it had not tested.
 */
const NAMES = (page) => {
  const caps = [...document.querySelectorAll(
    `${page} [class*="min-h-[56px]"][class*="min-h-[50px]"]`,
  )];
  const spans = caps.flatMap((c) =>
    [...c.querySelectorAll("span")].filter((s) => {
      const st = getComputedStyle(s);
      return st.textOverflow === "ellipsis" && parseFloat(st.fontSize) >= 12;
    }),
  );
  const ctx = document.createElement("canvas").getContext("2d");
  const read = [];
  for (const s of spans) {
    const text = (s.textContent ?? "").trim();
    if (!/[gjpqy,;]/.test(text)) continue;
    const st = getComputedStyle(s);
    ctx.font = st.font && st.font !== "" ? st.font
      : `${st.fontStyle} ${st.fontWeight} ${st.fontSize}/${st.lineHeight} ${st.fontFamily}`;
    const m = ctx.measureText(text);
    const lineHeight = parseFloat(st.lineHeight);
    const padTop = parseFloat(st.paddingTop);
    // The face's own box, not this string's ink: half-leading is distributed against the
    // font's ascent and descent, whatever the glyphs happen to reach.
    const baseline = padTop
      + (lineHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2
      + m.fontBoundingBoxAscent;
    read.push({
      text,
      fontSize: parseFloat(st.fontSize),
      lineHeight,
      // The padding box — what `overflow: hidden` clips against.
      clip: s.clientHeight,
      // What the span costs the layout: its border box PLUS its margins, which are
      // negative here and hand the padding straight back. It should come out at the line
      // height exactly — that is what makes the slack free.
      own: Math.round(s.getBoundingClientRect().height + parseFloat(st.marginTop)
        + parseFloat(st.marginBottom)),
      // And the line the caption's height sum is built on, read off the row the span sits
      // in rather than off the span: 20px on a phone, 17px on desktop.
      line: s.parentElement === null
        ? null
        : Math.round(s.parentElement.getBoundingClientRect().height),
      above: Math.round((baseline - m.actualBoundingBoxAscent) * 10) / 10,
      below: Math.round((s.clientHeight - (baseline + m.actualBoundingBoxDescent)) * 10) / 10,
    });
  }
  return read;
};

/**
 * The grid's column count and track width, read off `grid-template-columns`.
 *
 * Computed, not declared: `auto-fill` resolves to an explicit track list, so this reports
 * what the browser actually laid out. Counting tile ELEMENTS instead needs a selector for
 * "a tile", and the first attempt — `button` inside `main` — matched every control on the
 * page and reported five columns of 22px.
 */
const GRID = ({ page }) => {
  const grids = [...document.querySelectorAll(`${page} *`)].filter((el) => {
    const s = getComputedStyle(el);
    if (!s.display.includes("grid")) return false;
    return el.querySelector('[class*="min-h-[56px]"][class*="min-h-[50px]"]') !== null;
  });
  if (!grids.length) return null;
  const tracks = getComputedStyle(grids[0]).gridTemplateColumns.split(" ").filter(Boolean);
  return {
    columns: tracks.length,
    tile: Math.round(parseFloat(tracks[0]) * 10) / 10,
  };
};

async function run() {
  await clerkSetup();
  const sql = neon(DATABASE_URL);
  const browser = await chromium.launch();
  let failures = 0;
  let checks = 0;
  /** Populated BEFORE the insert it covers, so a throw cannot strand the row. */
  let staged = null;

  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      await signIn(page);

      const deck = process.env.PROBE_DECK
        ? `/decks/${process.env.PROBE_DECK}`
        : await (async () => {
          await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
          await page.waitForTimeout(2_500);
          return page.evaluate(() => [...document.querySelectorAll('a[href^="/decks/"]')]
            .map((a) => a.getAttribute("href"))
            .find((h) => h && !/\/(import|new)$/.test(h)) ?? null);
        })();
      // NOT a `continue`. The draft block below builds its own deck and needs
      // nothing from this discovery, so skipping the whole width on an account
      // with no decks made the fixture unreachable in exactly the case it exists
      // to cover. The route checks are the ones that need a reader's deck, and
      // they are the ones that stand down.
      if (deck === null) {
        checks += 1;
        failures += !report(`${width}px · a deck to read`, false, "the account owns none");
      }

      for (const [label, route, toggle] of deck === null ? [] : [
        ["/collection", "/collection?view=grid", null],
        // PRESSED, never a URL parameter. The deck's view is client state with
        // no `?view=`, so a run that navigated to `?view=card` measured the LIST
        // and said so in the language of the card view.
        ["deck card view", deck, viewToggleCopy.deck.card],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);
        if (toggle) {
          const control = onPageRole(page, "button", toggle);
          if ((await control.count()) === 0) {
            checks += 1;
            failures += !report(`${width}px · ${label} · reach the view`, false, `no "${toggle}" control`);
            continue;
          }
          await control.first().click();
          await page.waitForTimeout(1_500);
        }

        const arts = await page.evaluate(ART, PAGE);
        checks += 2;
        // A run that photographed an empty route would otherwise sweep clean.
        failures += !report(
          `${width}px · ${label} · found art`,
          arts.length > 0,
          `${arts.length} card-shaped regions`,
        );
        const dirty = arts.filter((a) => a.marks > 0);
        const washed = arts.filter((a) => a.wash);
        failures += !report(
          `${width}px · ${label} · the art keeps nothing`,
          arts.length > 0 && dirty.length === 0 && washed.length === 0,
          `${dirty.length} carrying a mark, ${washed.length} carrying a wash`,
        );

        const caps = await page.evaluate(CAPTIONS, PAGE);
        checks += 2;
        failures += !report(
          `${width}px · ${label} · one caption height`,
          caps.captions > 0 && caps.heights.length === 1,
          `${caps.captions} captions, heights ${caps.heights.join(" / ") || "none"}`,
        );
        // Zero boxes is a FAILURE, and it names a missing PREREQUISITE rather than a
        // defect. The slot draws nothing for a free, owned, un-proxied card, so a
        // collection in which every card is free legitimately renders no box at all —
        // and a run over one has measured nothing, which must not read as a sweep.
        // See the header: the account needs at least one card in a marked state.
        //
        // It reports the KINDS it saw, and that line is the point. On a fixture whose cards
        // are all owned and none printed, every box is a chip and this check compares one
        // component against itself — it passed a mutation that put the chip's border back,
        // which is the exact defect it was written for. The invariant that the three agree
        // is pinned in `card-tile-caption.test.tsx`, which forces all three; here the kinds
        // line says how much of it this run actually exercised.
        failures += !report(
          `${width}px · ${label} · one slot box`,
          caps.boxes > 0 && caps.boxHeights.length === 1,
          caps.boxes === 0
            ? "no card in a marked state — seed one, this run proves nothing"
            : `${caps.boxes} boxes, heights ${caps.boxHeights.join(" / ")}, kinds ${caps.kinds.join("+")}`,
        );

        // The name's descenders, against the box that clips them. Zero names with a
        // descender is a FAILURE and says so: it means the run read a page whose every
        // visible name happened to be ascender-only, which measures nothing here.
        const names = await page.evaluate(NAMES, PAGE);
        checks += 2;
        const cut = names.filter((n) => n.above < 0 || n.below < 0);
        failures += !report(
          `${width}px · ${label} · descenders inside the clip box`,
          names.length > 0 && cut.length === 0,
          nameDetail(names, cut),
        );
        // And the slack is not paid for out of the layout. The row the name sits in is
        // still 20px on a phone and 17px on desktop, and the span costs that row exactly
        // its own line height — so the padding that buys the ink its room is handed back
        // by the margin rather than growing the caption. Both halves, because either one
        // alone passes a build that moved the figure: a span that kept its padding reads
        // the right row height on a phone, where the row has 4px of slack anyway.
        const wantLine = width === 1300 ? 17 : 20;
        failures += !report(
          `${width}px · ${label} · the name row still measures ${wantLine}px, free`,
          names.length > 0
            && names.every((n) => n.line === wantLine && n.own === n.lineHeight),
          `rows ${[...new Set(names.map((n) => n.line))].join(" / ") || "none"}`
            + `, span cost ${[...new Set(names.map((n) => `${n.own}/${n.lineHeight}`))].join(" ") || "none"}`
            + `, clip boxes ${[...new Set(names.map((n) => n.clip))].join(" / ") || "none"}`,
        );

        // BOTH widths. This was gated to 1300 alone, which left the phone's
        // explicit 2-up — the one thing the desktop floor cannot express, since
        // at 390px a 178px floor plus a gap exceeds the track and auto-fill
        // would collapse to one column — asserted by nothing. A regression there
        // passed every check on the surface it was most likely to break.
        const grid = await page.evaluate(GRID, { page: PAGE });
        const want = width === 1300 ? (label === "/collection" ? 178.3 : 181) : null;
        const wantColumns = width === 1300 ? 6 : 2;
        checks += 1;
        failures += !report(
          `${width}px · ${label} · ${wantColumns} tracks${want ? ` at ${want}px` : ""}`,
          grid !== null
            && grid.columns === wantColumns
            && (want === null ? grid.tile > 120 : Math.abs(grid.tile - want) <= 2),
          grid === null ? "no tiles" : `${grid.columns} columns, tile ${grid.tile}px`,
        );
      }
      // The draft. Staged once, read at both widths, and torn down in the
      // `finally` — a deck with a committed version is what makes a draft
      // possible at all, since a brew has nothing to diff against.
      if (staged === null) {
        // THE PROBE'S OWN DECK, not the reader's.
        //
        // This staged into a deck the account already owned, and two review
        // rounds found the two halves of why that cannot be made safe: without
        // a receipt the teardown deletes a concurrent writer's identical row,
        // and with one a lost reply strands this run's. Both hazards exist only
        // because the row sat in somebody's real deck among rows the probe did
        // not put there. They are not a guard to be tuned; they are the wrong
        // fixture.
        //
        // A deck created here holds nothing but what this run wrote, so the
        // teardown deletes THE DECK and every hazard goes with it — versions,
        // version cards and deck cards all cascade. This is what
        // `probe:versions` and `probe:review` already do.
        const owner = await page.evaluate(() => window.Clerk.user.id);
        // A commander the APP would accept: `createDeck` re-validates with
        // `isCommanderCandidate`, so `commander_legal` alone selects artifacts
        // and instants and builds a deck no route could have made. Legendary
        // creature, and colourless so the body can be anything.
        const [lead] = await sql`
          select oracle_id from cards
           where commander_legal
             and type_line ilike '%Legendary%Creature%'
             and color_identity = '{}'
           limit 1`;
        // And a body INSIDE that identity, for the same reason:
        // `validateCardForDeck` rejects an off-identity card, so a fixture
        // holding one is a state the UI cannot produce. A colourless commander
        // admits only colourless cards, which is what makes the pair simple.
        const body = await sql`
          select oracle_id from cards
           where commander_legal and image_uri is not null
             and color_identity = '{}'
             and oracle_id is distinct from ${lead?.oracle_id ?? null}
           limit 12`;
        if (!lead || body.length < 2) {
          checks += 1;
          failures += !report(
            `${width}px · draft · a catalog to build a fixture from`,
            false,
            "no commander-legal cards with art",
          );
        } else {
          // The handle is recorded BEFORE the insert it covers, so a throw
          // part-way through cannot leave a deck nobody knows to delete.
          const deckId = crypto.randomUUID();
          const versionId = crypto.randomUUID();
          staged = { deckId, versionId };
          await sql`
            insert into decks (id, user_id, name, commander_oracle_id)
            values (${deckId}, ${owner}, ${`probe card captions ${Date.now()}`},
                    ${lead.oracle_id})`;
          // Every card but the last goes into the version AND the draft, so the
          // deck is clean; the last one is added to the draft alone, which is
          // the single pending add the tile is read for.
          const held = body.slice(0, -1);
          const add = body[body.length - 1];
          for (const c of held) {
            await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto)
                      values (${deckId}, ${c.oracle_id}, 1, false)`;
          }
          await sql`
            insert into deck_versions (id, deck_id, number, commander_oracle_id)
            values (${versionId}, ${deckId}, 1, ${lead.oracle_id})`;
          await sql`
            insert into deck_version_cards (version_id, oracle_id, quantity, since)
            select ${versionId}, dc.oracle_id, dc.quantity, now()
              from deck_cards dc where dc.deck_id = ${deckId}`;
          await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto)
                    values (${deckId}, ${add.oracle_id}, 1, false)`;
        }
      }
      if (staged) {
        await page.goto(`${BASE}/decks/${staged.deckId}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(2_000);
        const toggle = onPageRole(page, "button", viewToggleCopy.deck.card);
        if ((await toggle.count()) > 0) {
          await toggle.first().click();
          await page.waitForTimeout(1_500);
        }
        const draft = await page.evaluate(DRAFT, { page: PAGE });
        checks += 2;
        // Exactly one tile is touched, so exactly one edge — and it is on the
        // caption. Zero would mean the card view still photographs a dirty draft
        // as a clean one, which is the state this whole call exists to end.
        failures += !report(
          // A 2px rule ON THE LEFT, tall enough to cross the art. Which element
          // holds the style is NOT the assertion, and is what both previous
          // versions asked while passing a build painted under the picture.
          `${width}px · draft · one accent rule, covering the tile`,
          draft.edges === 1 && draft.coversArt === 1,
          `${draft.edges} rules, ${draft.coversArt} reaching the art`,
        );
        // NO `+1`. A single-copy add prints no figure at all now — the edge says
        // the draft touched it and the count says nothing it could not assume.
        failures += !report(
          `${width}px · draft · a single-copy add prints no figure`,
          draft.figures.length === 0,
          `figures ${draft.figures.join(" / ") || "none"}`,
        );
      }
      // The same reading with every webfont ABORTED, which is the case the name span's
      // padding exists for. The line-height was chosen against Plex Sans, and on desktop
      // 17px of line for a 13px face leaves about a tenth of a pixel over that face's own
      // ink — so a fallback with a deeper descent, or Plex Sans itself in the window before
      // `display: swap` resolves, clips the very glyph the fix restores. Nothing about the
      // markup differs, so only measured ink can tell the two runs apart. Its own context,
      // because the route has to be aborted before the document loads.
      const bare = await browser.newContext({ viewport: { width, height: 900 } });
      try {
        const barePage = await bare.newPage();
        await barePage.route(/\.(woff2?|ttf|otf)(\?.*)?$/, (r) => r.abort());
        await signIn(barePage);
        await barePage.goto(`${BASE}/collection?view=grid`, { waitUntil: "networkidle" });
        await barePage.waitForTimeout(1_500);
        const bareNames = await barePage.evaluate(NAMES, PAGE);
        const bareCut = bareNames.filter((n) => n.above < 0 || n.below < 0);
        checks += 1;
        failures += !report(
          `${width}px · /collection · descenders survive the fallback face`,
          bareNames.length > 0 && bareCut.length === 0,
          nameDetail(bareNames, bareCut),
        );
      } finally {
        await bare.close();
      }
      await context.close();
    }
  } finally {
    // NESTED, so a rejected cleanup cannot leave Playwright running. The delete
    // stays fatal — a fixture deck left behind is worth a loud failure — but the
    // browser closes either way rather than the process hanging on it.
    try {
      if (staged) {
      // ONE DELETE, of a deck this run created. Versions, version cards and
      // deck cards all cascade, so there is no ordering to get right and no
      // row belonging to anyone else within reach.
        await neon(DATABASE_URL)`delete from decks where id = ${staged.deckId}`;
        console.log("  ..   removed the fixture deck");
      }
    } finally {
      await browser.close();
    }
  }

  console.log(`\n${checks - failures}/${checks} checks passed.`);
  if (failures) process.exitCode = 1;
}

run();
