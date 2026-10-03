// Gate for the deck details header — the two art-wash bands that replaced the
// old spine (`design/design_handoff_the99_deck_details_wash`).
//
// JSDOM applies no CSS and ignores media queries, so the unit tests render both
// breakpoint trees at once and can never assert which one a reader sees, that
// the band keeps its height across the four rename states, or that the bar takes
// its colour from the status rather than from the percentage. That is what this
// probe is for, and it writes a screenshot per viewport for the design review.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-deck-header.mjs
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

// A rename is a server action, so the title the header draws lags the keystroke
// by however long that round trip takes. Polling asks the question until the
// answer settles rather than guessing a single interval that is either flaky or
// slow; the timeout only bounds a genuine failure.
async function readHeaderUntilTitled(page, read, wanted, timeout = 8000) {
  const deadline = Date.now() + timeout;
  let seen;
  for (;;) {
    seen = await page.evaluate(read);
    if (seen.title === wanted || Date.now() > deadline) return seen;
    await page.waitForTimeout(200);
  }
}

// The one header the reader can actually see at this width. Both trees are in
// the DOM — that is the whole point of the responsive split — so everything here
// filters on `getClientRects()`, which is the only thing that knows about CSS.
const READ_HEADER = `() => {
  const visible = (el) => el && el.getClientRects().length > 0;
  const header = [...document.querySelectorAll('header')].find(
    (h) => visible(h) && h.querySelector('.art-wash-art, .art-wash-scrim'),
  );
  if (!header) return { found: false };
  const box = header.getBoundingClientRect();
  const art = [...header.querySelectorAll('.art-wash-art')].find(visible);
  const artStyle = art ? getComputedStyle(art) : null;
  const image = artStyle ? artStyle.backgroundImage : '';
  const h1 = header.querySelector('h1');
  const fill = header.querySelector("[data-testid='spine-bar-fill']");
  const pill = [...header.querySelectorAll('span,div')].find(
    (e) => visible(e) && /^(Draft|Building|Over|Unresolved|To buy|Complete)$/.test(e.textContent.trim()),
  );
  const detail = [...header.querySelectorAll('button,a')].find(
    (e) => visible(e) && /card details/i.test(e.getAttribute('aria-label') || ''),
  );
  const pencil = [...header.querySelectorAll('button')].find(
    (e) => visible(e) && /^Edit name and description of/.test(e.getAttribute('aria-label') || ''),
  );
  // R6 ruling 1 needs the plate's own colour and the page ground to compare it
  // to. The --bg token is resolved through a throwaway element rather than read off the
  // custom property, so both sides of the comparison are in the same colour
  // space whatever the token's authored form.
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:-9999px;background:var(--bg)';
  document.body.appendChild(probe);
  const pageGround = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return {
    found: true,
    renameLabel: pencil ? pencil.getAttribute('aria-label') : null,
    // The phone trigger lost its box but must keep its target, and a target is
    // the one thing a class-name assertion cannot prove. Measured, not read.
    renameBox: (() => {
      if (!pencil) return null;
      const r = pencil.getBoundingClientRect();
      const cs = getComputedStyle(pencil);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        background: cs.backgroundColor,
        borderWidth: cs.borderTopWidth,
      };
    })(),
    plateBackground: art?.parentElement
      ? getComputedStyle(art.parentElement).backgroundColor
      : null,
    // Only the cover band carries the loading plate. A left-portrait row plates
    // to the row's own ground on purpose, so the same reading means the opposite
    // thing there and the check below has to know which band it is looking at.
    isCover: Boolean(header.querySelector('.art-wash-scrim-cover')),
    pageGround,
    headerHeight: Math.round(box.height),
    bandHeight: art ? Math.round(art.getBoundingClientRect().height) : null,
    artUrl: /url\\(/.test(image) ? image.replace(/^.*?url\\(["']?/, '').replace(/["']?\\).*$/, '') : null,
    isGradientOnly: !/url\\(/.test(image) && /gradient/.test(image),
    scrims: header.querySelectorAll('.art-wash-scrim').length,
    // No backticks in this comment: it lives inside a template literal, and a
    // bare one would end that string and put the rest of this reader outside it.
    //
    // data-deck-title is the deck's name alone, which is what the heading holds
    // now: the rename control is its SIBLING, outside the title's text, so
    // neither the heading's text content nor its accessible name carries a
    // glyph. Reading the marker rather than the heading keeps that honest if a
    // future change puts anything beside the name again.
    title: h1 ? (h1.querySelector('[data-deck-title]') ?? h1).textContent.trim() : null,
    // The band reads from the left on the phone. Measured as geometry rather than
    // as a class: the title's left edge against the block's own, which is the
    // thing a centred block gets wrong and a property table cannot see.
    titleOffset: (() => {
      const block = header.querySelector('[data-wash-label]');
      if (!h1 || !block) return null;
      return Math.round(h1.getBoundingClientRect().left - block.getBoundingClientRect().left);
    })(),
    // The pencil against the title's LAST LINE, measured rather than declared.
    // jsdom lays nothing out, so a component test can only assert that the glyph
    // is an inline sibling of an inline box — it cannot tell whether that box
    // leaves room for the glyph or pushes it onto a line of its own. The title's
    // own line boxes come from a Range over its text, and the last rect is the
    // last line.
    pencilOnLastLine: (() => {
      const title = h1 ? h1.querySelector('[data-deck-title]') : null;
      const pencil = [...header.querySelectorAll('[aria-label^="Edit name and description of "]')].find(visible);
      const block = header.querySelector('[data-wash-label]');
      if (!title || !pencil || !block) return null;
      const range = document.createRange();
      range.selectNodeContents(title);
      // Filtered to the lines the heading actually SHOWS. While the title was
      // clamped, a Range reported rects for lines it had hidden, so the last rect
      // could be an invisible one and the glyph "correct" below the visible text.
      // Nothing is hidden now, so this filter should never drop a line — which is
      // why what it drops is reported either way rather than assumed to be zero.
      const frame = h1.getBoundingClientRect();
      const all = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      const lines = all.filter((r) => r.bottom <= frame.bottom + 1);
      if (!lines.length) return null;
      const last = lines[lines.length - 1];
      // The GLYPH's edges, not the target's. The button is a 14px box with 15px
      // of padding and an equal negative margin, so its border box starts 15px
      // before the glyph — enough to read as sitting before the title's text on a
      // short name and fail a correct build.
      const box = pencil.getBoundingClientRect();
      const glyph = { left: box.left + 15, right: box.right - 15 };
      const mid = box.top + box.height / 2;
      return {
        lines: lines.length,
        hidden: all.length - lines.length,
        // The glyph's vertical centre inside the last line's own band, with a
        // pixel of tolerance for the half-leading either side.
        onLastLine: mid >= last.top - 1 && mid <= last.bottom + 1,
        // And after that line's text rather than before it.
        after: Math.round(glyph.left - last.right),
        // The drawn 26px plate is centred in a 44px target, so 9px of that
        // target may overhang; the PLATE is what must stay inside the block.
        withinBlock: Math.round(block.getBoundingClientRect().right - glyph.right),
      };
    })(),
    titleShadow: h1 ? getComputedStyle(h1).textShadow : null,
    titleColor: h1 ? getComputedStyle(h1).color : null,
    barBackground: fill ? getComputedStyle(fill).backgroundColor : null,
    barWidthPct: fill && fill.parentElement
      ? Math.round((fill.getBoundingClientRect().width / fill.parentElement.getBoundingClientRect().width) * 100)
      : null,
    status: pill ? pill.textContent.trim() : null,
    // R6 ruling 3 — the inks that read the over-99 state out, so the walk can
    // check that one state is not painted in two alarm colours. Found by its own
    // marker: the figure used to sit in the row above the bar and was reachable
    // as the track's previous sibling, and now the two share a row — a positional
    // lookup returns null there, and this check would have filtered an empty list
    // and reported success with the invariant unmeasured.
    overInks: (() => {
      const row = header.querySelector('[data-spine-count]');
      // false, not null (and no backticks in this comment: it lives inside a
      // template literal). The caller treats null as "nothing to check" and
      // reports success, so a dropped marker would silently retire this
      // invariant instead of failing it.
      if (!row) return false;
      return [...row.children]
        .filter(visible)
        .map((s) => ({
          text: s.textContent.trim(),
          color: getComputedStyle(s).color,
          // Marked rather than matched. The denominator is the one ink in this
          // row that is not the state's own, and it is 98 on a pair deck — a
          // pattern written against the literal 99 reported a pair's faint
          // denominator as a stray alarm colour.
          denominator: s.hasAttribute('data-spine-denominator'),
        }));
    })(),
    // R7 ruling 3a — the trim line is the remedy, not the readout, so its bold
    // lead is emphasis at the paragraph's own colour rather than the status
    // token. Both are read so the walk compares them to each other.
    trimInk: (() => {
      const lead = [...header.querySelectorAll('p b')].find(visible);
      if (!lead || !lead.parentElement) return null;
      return {
        text: lead.textContent.trim(),
        lead: getComputedStyle(lead).color,
        body: getComputedStyle(lead.parentElement).color,
      };
    })(),
    hasCardDetails: Boolean(detail),
    // The meta row's ground is the claim §C8 makes: in the band at rest, below
    // the divider while editing. Its offset against the band's bottom edge says
    // which side of the divider it is on without reading class names.
    metaInBand: (() => {
      const band = art ? art.parentElement?.parentElement : null;
      // By marker, not by shape: this row is a div whose separator sits in a
      // child, so a search for a paragraph containing a middot found nothing and
      // both divider assertions failed on every deck rather than measuring the
      // move. A sentinel string where the marker is missing, so a dropped hook
      // fails the check instead of quietly retiring it. (No backticks in this
      // comment: it travels to the browser inside a template literal.)
      const meta = [...header.querySelectorAll('[data-spine-meta]')].find(visible);
      if (!band) return null;
      if (!meta) return 'no-marker';
      return meta.getBoundingClientRect().bottom <= band.getBoundingClientRect().bottom + 1;
    })(),
  };
}`;

const VIEWPORTS = [
  ["mobile", 390, 844],
  ["desktop", 1280, 800],
];

const findings = [];
const note = (line) => {
  findings.push(line);
  console.log(line);
};
const fail = (line) => note(`  FAIL ${line}`);

await clerkSetup();

const browser = await chromium.launch();
try {
  for (const [vpName, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);

    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const deckPaths = await page.evaluate(
      // A deck id, not the two routes that share the segment. `new` and
      // `import` are the whole set — every other child of /decks is a uuid.
      `[...new Set([...document.querySelectorAll('a[href^="/decks/"]')].map((a) => a.getAttribute('href')).filter((h) => /^\\/decks\\/[0-9a-f-]{36}$/.test(h)))]`,
    );
    if (!deckPaths.length) throw new Error("No decks on /decks — nothing to walk.");
    note(`${vpName}: ${deckPaths.length} decks to walk`);

    // Item 5 — every deck's bar, so the run covers 0, mid-build and over 99
    // whatever the fixture account happens to hold.
    const seenStatuses = new Map();
    for (const path of deckPaths) {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const h = await page.evaluate(`(${READ_HEADER})()`);
      if (!h.found) {
        fail(`no visible washed header on ${path}`);
        continue;
      }
      note(
        `${vpName} ${path}: "${h.title}" — ${h.status ?? "no pill"}, bar ${h.barWidthPct}% ${h.barBackground}, band ${h.bandHeight}px`,
      );
      if (h.status && !seenStatuses.has(h.status)) seenStatuses.set(h.status, { path, ...h });

      // Item 1 — art, not a flat gradient, and a title that is legible on it.
      // R6 ruling 1 rides along: the plate is a loading device, so it is drawn
      // only where there is a crop to load and an artless band takes `--bg`.
      if (h.artUrl) {
        if (!h.artUrl.includes("art_crop")) fail(`framed art in the band: ${h.artUrl}`);
        if (h.isCover && h.plateBackground === h.pageGround) {
          fail(`washed cover band is not plated: ${h.plateBackground}`);
        }
      } else if (h.isGradientOnly) {
        note(`  identity gradient (commander has no crop) — band still ${h.bandHeight}px`);
        if (h.hasCardDetails) fail(`Card details pill drawn with no crop to open`);
        if (h.isCover) {
          if (h.plateBackground !== h.pageGround) {
            fail(`artless band plated ${h.plateBackground}, not the page ground ${h.pageGround}`);
          } else {
            note(`  artless cover band grounds in --bg (${h.pageGround}), not the loading plate`);
          }
        }
      } else {
        fail(`band has neither art nor an identity gradient`);
      }

      // R6 ruling 4 — the header is reachable from list contexts, so the label
      // has to name the deck it is about to rename.
      if (h.renameLabel !== `Edit name and description of ${h.title}`) {
        fail(`rename trigger labelled "${h.renameLabel}", not "Edit name and description of ${h.title}"`);
      }
      if (!h.title) fail(`no title in the header`);
      // The phone trigger is always visible because there is no hover, so it
      // keeps its 44px target while giving up the box that used to draw it.
      if (vpName === "mobile") {
        const box = h.renameBox;
        if (!box) fail(`no rename trigger in the mobile header`);
        else if (box.w < 44 || box.h < 44) fail(`rename target is ${box.w}x${box.h}, under 44`);
        else if (box.borderWidth !== "0px" || !/rgba\(0, 0, 0, 0\)|transparent/.test(box.background)) {
          fail(`rename trigger still draws a box: ${box.borderWidth} border on ${box.background}`);
        } else note(`  rename trigger is a bare ${box.w}x${box.h} target`);
      }
      // Mobile sits on the wash and must carry the shared ink shadow; desktop's
      // strings are past the scrim's flat stop and must carry none.
      const hasShadow = h.titleShadow && h.titleShadow !== "none";
      if (vpName === "mobile" && !hasShadow) fail(`mobile title has no ink shadow`);
      if (vpName === "desktop" && hasShadow) fail(`desktop title carries a shadow on flat ground`);
      if (h.scrims < 1) fail(`no scrim between the art and the strings`);
    }

    note(`${vpName} statuses seen: ${[...seenStatuses.keys()].join(", ") || "none"}`);
    // The bar's colour is the status's token and nothing else, so two decks at
    // very different percentages under one status must paint the same colour.
    const byColour = new Map();
    for (const [status, h] of seenStatuses) byColour.set(h.barBackground, status);
    if (byColour.size !== seenStatuses.size) {
      fail(`two statuses share a bar colour: ${[...seenStatuses.keys()].join(", ")}`);
    }
    const over = [...seenStatuses.values()].find((h) => /Over/.test(h.status));
    if (over && over.barWidthPct !== 100) fail(`over-99 bar not clamped: ${over.barWidthPct}%`);
    if (!over) note(`  (no over-99 deck in this account — clamp unverified on the surface)`);
    if (over) {
      // R6 ruling 3. The denominator is the one ink in the row that is not the
      // state's own — it reads the same faint token at every status.
      if (over.overInks === false) {
        fail("the deck header draws no [data-spine-count] — the over-99 ink check measures nothing");
      }
      const strays = (over.overInks || []).filter(
        (i) => !i.denominator && i.color !== over.barBackground,
      );
      if (strays.length) {
        fail(
          `over-99 inks disagree with the ${over.barBackground} bar: ${strays
            .map((i) => `"${i.text}" ${i.color}`)
            .join(", ")}`,
        );
      } else {
        note(`  every ink in the over-99 readout reads the bar's ${over.barBackground}`);
      }
      // R7 ruling 3a. The lead is checked against its own paragraph rather than
      // against a token name, so it holds whatever var(--fg-body) resolves to.
      const trim = over.trimInk;
      if (!trim) {
        fail(`the over-99 trim line has no bold lead to check`);
      } else if (trim.lead === over.barBackground) {
        fail(`the trim lead "${trim.text}" took the bar's ${trim.lead}`);
      } else if (trim.lead !== trim.body) {
        fail(`the trim lead "${trim.text}" is ${trim.lead}, not its paragraph's ${trim.body}`);
      } else {
        note(`  the trim lead stays at the paragraph's ${trim.body}`);
      }
    }

    // Items 2/3/4 — the rename flow on the first deck, screenshotted per state.
    // A deck whose title actually WRAPS, not simply the first one. The glyph's
    // placement depends on the last line of a wrapped title, and the first deck's
    // name is one line — so this walk kept reporting "the wrapped case went
    // unchecked" on the very geometry three attempts got wrong. Each candidate is
    // loaded and measured; the first that wraps is the one walked, and if none of
    // them wrap that is said out loud rather than passing quietly.
    let walk = deckPaths[0];
    let wrapped = 0;
    for (const candidate of deckPaths) {
      await page.goto(`${BASE}${candidate}`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        () => [...document.querySelectorAll("[data-spine-meta]")].some((e) => e.getClientRects().length > 0),
        null,
        { timeout: 15_000 },
      );
      await page.waitForTimeout(600);
      const lines = await page.evaluate(
        `(() => {
          const vis = (e) => e.getClientRects().length > 0;
          const text = [...document.querySelectorAll('[data-deck-title]')].find(vis);
          if (!text) return 0;
          const range = document.createRange();
          range.selectNodeContents(text);
          return [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).length;
        })()`,
      );
      if (lines >= 2) {
        walk = candidate;
        wrapped = lines;
        break;
      }
    }
    if (wrapped) note(`${vpName}: walking ${walk} — its title wraps to ${wrapped} lines`);
    // A NOTE, not a failure: an account whose every deck name fits one line is a
    // data condition, not a defect, and failing the run for it would make the
    // probe's exit code a fact about the fixture. It is said loudly instead, so a
    // green run cannot be mistaken for having measured the wrapped case.
    else note(`  (no deck on this account has a title that wraps — the glyph's wrapped case went unmeasured)`);
    await page.goto(`${BASE}${walk}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const rest = await page.evaluate(`(${READ_HEADER})()`);
    await page.screenshot({ path: `/tmp/deck-header-${vpName}-rest.png` });
    const originalName = rest.title;

    // The prefix, not the whole label: R6 ruling 4 puts the deck's name in the
    // accessible name, and the walk below renames the deck twice, so a locator
    // anchored to the full string would stop resolving halfway through. A
    // pattern also says the prefix is the intent, rather than leaning on
    // Playwright's substring matching to make a whole-name query work.
    const pencil = page
      .getByRole("button", { name: /^Edit name and description of / })
      .locator("visible=true");

    // The pencil is a button inside a 14px holder beside the heading, with its
    // hit area made of padding and an equal negative margin, so its 44px box
    // overhangs the 14px the holder occupies in flow. Painting
    // is not the question — whether a tap LANDS on it is, and the band clips what
    // overhangs it. All four edge midpoints plus the centre: a clipped or
    // overlapped edge is the failure and the centre passes through either. The
    // TOP was missing, so an element overlapping the control from above — the
    // band's own art layer, a header that grew — would have passed.
    const reach = await page.evaluate(
      `(() => {
        const el = [...document.querySelectorAll('[aria-label^="Edit name and description of "]')]
          .find((b) => b.getClientRects().length);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const at = (x, y) => {
          const hit = document.elementFromPoint(x, y);
          return hit ? (hit === el || el.contains(hit) ? 'self' : hit.tagName.toLowerCase()) : 'nothing';
        };
        return {
          box: [Math.round(r.width), Math.round(r.height)],
          centre: at(r.left + r.width / 2, r.top + r.height / 2),
          top: at(r.left + r.width / 2, r.top + 2),
          left: at(r.left + 2, r.top + r.height / 2),
          right: at(r.right - 2, r.top + r.height / 2),
          bottom: at(r.left + r.width / 2, r.bottom - 2),
        };
      })()`,
    );
    if (!reach) {
      fail(`no rename control laid out to hit-test`);
    } else {
      note(`${vpName} rename target: ${reach.box.join("×")} — centre ${reach.centre}, top ${reach.top}, left ${reach.left}, right ${reach.right}, bottom ${reach.bottom}`);
      if (reach.box[0] < 44 || reach.box[1] < 44) {
        fail(`rename target measures ${reach.box.join("×")}, under the 44px floor`);
      }
      for (const [where, result] of Object.entries(reach)) {
        if (where !== "box" && result !== "self") {
          fail(`rename target unreachable at its ${where}: ${result}`);
        }
      }
    }

    await pencil.click();
    await page.waitForTimeout(300);
    const editing = await page.evaluate(`(${READ_HEADER})()`);
    await page.screenshot({ path: `/tmp/deck-header-${vpName}-editing.png` });
    const field = page.getByLabel("Deck name").locator("visible=true");
    if (!(await field.count())) fail(`no rename field after clicking the pencil`);

    if (vpName === "desktop") {
      // Item 3 — the actions slot is replaced, not joined, and the band holds.
      const exportVisible = await page
        .getByRole("button", { name: "Export" })
        .locator("visible=true")
        .count();
      if (exportVisible) fail(`Export still drawn while editing`);
      if (editing.headerHeight !== rest.headerHeight) {
        fail(`band height moved while editing: ${rest.headerHeight} → ${editing.headerHeight}`);
      } else {
        note(`  desktop band holds ${rest.headerHeight}px into editing`);
      }
    } else {
      // Item 4 — the meta row crosses the divider while the field takes the band.
      if (rest.metaInBand === 'no-marker' || editing.metaInBand === 'no-marker') {
        fail(`the deck header draws no [data-spine-meta] — the divider move is unmeasured`);
      }
      // Flush left, within a pixel: a centred block put the title tens of pixels
      // in from its own edge, which is what the drawings were compared against.
      if (rest.titleOffset === null) {
        fail(`no title or no [data-wash-label] to measure the title's offset against`);
      } else if (Math.abs(rest.titleOffset) > 1) {
        fail(`title sits ${rest.titleOffset}px from the block's left edge, expected flush`);
      }
      // The pencil, measured: on the title's last line, after its text, and with
      // its drawn plate inside the block. A wrapped name is the case that broke
      // it — the glyph followed the heading's full-width box instead of its
      // words — and a title long enough to fill the line is the case that pushes
      // the glyph to a line of its own.
      const pencil = rest.pencilOnLastLine;
      if (!pencil) {
        fail(`no title, pencil or [data-wash-label] to measure the pencil against`);
      } else {
        note(`  pencil: title wraps to ${pencil.lines} line(s), glyph ${pencil.after}px after the last`);
        if (!pencil.onLastLine) fail(`pencil is not on the title's last line`);
        if (pencil.after < 0) fail(`pencil sits ${-pencil.after}px BEFORE the end of the last line`);
        // BOUNDED, not merely positive. An atomic inline box takes the whole
        // available width when its text wraps, so the glyph can sit far to the
        // right of a short last line and still be "after" it — which is the
        // defect this check exists to catch, and a `>= 0` test passes it.
        if (pencil.after > 12) {
          fail(`pencil sits ${pencil.after}px after the last line's text, expected it to follow the words`);
        }
        if (pencil.hidden > 0) {
          fail(`${pencil.hidden} title line(s) are drawn outside the heading's own box`);
        }
        if (pencil.lines < 2) {
          note(`  (this deck's title is one line — the wrapped case went unchecked here)`);
        }
        if (pencil.withinBlock < 0) {
          fail(`pencil's plate overhangs the block by ${-pencil.withinBlock}px`);
        }
      }
      if (rest.metaInBand !== true) fail(`meta row not in the band at rest`);
      if (editing.metaInBand !== false) fail(`meta row did not move below the divider`);
      else note(`  mobile meta row moves below the divider while editing`);
    }

    // Item 2, the four exits. Escape reverts.
    await field.fill(`${originalName} ESC`);
    await field.press("Escape");
    await page.waitForTimeout(400);
    let now = await page.evaluate(`(${READ_HEADER})()`);
    if (now.title !== originalName) fail(`Escape did not revert: "${now.title}"`);
    else note(`  Escape reverts`);

    // Cancel does not save.
    await pencil.click();
    await page.waitForTimeout(200);
    await field.fill(`${originalName} CANCEL`);
    await page.getByRole("button", { name: "Cancel" }).locator("visible=true").click();
    await page.waitForTimeout(600);
    now = await page.evaluate(`(${READ_HEADER})()`);
    if (now.title !== originalName) fail(`Cancel saved the edit: "${now.title}"`);
    else note(`  Cancel does not save`);

    // R6 ruling 2 — an empty name is one of two exits, and leaving the field is
    // the revert. Checked before the saving exits so a bug here cannot leave the
    // deck unnamed for the rest of the walk.
    await pencil.click();
    await page.waitForTimeout(200);
    await field.fill("");
    await field.evaluate((el) => el.blur());
    await page.waitForTimeout(900);
    now = await page.evaluate(`(${READ_HEADER})()`);
    if (now.title !== originalName) fail(`blurring an empty name did not revert: "${now.title}"`);
    else if (await field.count()) fail(`the field stayed open on an empty blur`);
    else note(`  blurring an empty name reverts and closes the field`);

    // Enter saves, and clicking away saves — checked in that order so the second
    // has a name to put back.
    const renamed = `${originalName} ✎`;
    await pencil.click();
    await page.waitForTimeout(200);
    await field.fill(renamed);
    await field.press("Enter");
    now = await readHeaderUntilTitled(page, `(${READ_HEADER})()`, renamed);
    if (now.title !== renamed) fail(`Enter did not save: "${now.title}"`);
    else note(`  Enter saves`);

    await pencil.click();
    await page.waitForTimeout(200);
    await field.fill(originalName);
    // Blurred rather than clicked at a coordinate: below 768px the bottom of the
    // viewport is the app's nav, so a click there navigates away instead of
    // leaving the field. Blur is what the contract is actually about.
    await field.evaluate((el) => el.blur());
    now = await readHeaderUntilTitled(page, `(${READ_HEADER})()`, originalName);
    if (now.title !== originalName) fail(`blurring the field did not save: "${now.title}"`);
    else note(`  leaving the field saves, and the deck's name is back to "${originalName}"`);

    if (now.title !== originalName) {
      fail(`the walk left "${walk}" named "${now.title}" — restore it by hand`);
    }

    await context.close();
  }
} finally {
  await browser.close();
}

const fails = findings.filter((f) => f.includes("FAIL"));
console.log(`\n${fails.length} failures. Screenshots in /tmp/deck-header-*.png`);
if (fails.length) process.exitCode = 1;
