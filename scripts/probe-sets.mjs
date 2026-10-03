// Gate for the set-collection grid's visual rulings.
//
// JSDOM applies no CSS, so the unit tests can assert which style object a cell was handed
// but never what the browser computed from it. Three of this feature's rulings are only
// answerable in a real engine:
//
//   1. The dim. `opacity: .28` and `saturate(.55)` on the art, and NOT on the type.
//   2. The dashed edge resolves to the theme's --fg-locked and not --border-dashed —
//      the token swap that took the edge from 1.46:1 to 3.16:1 against the plate.
//   3. Owned and missing cells occupy IDENTICAL boxes, so no filter flip reflows the grid.
//   4. The one grid declaration: the track it produces, the height derived from it at 63/88,
//      the column count at both widths, and a last column flush to the grid's right edge.
//      Every one of those is a number only a layout engine can report.
//
// Every check prints what it measured. A check that cannot say what it saw is not a check.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node scripts/probe-sets.mjs
//   PROBE_SET=dsk node scripts/probe-sets.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage, openSheet } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SET = process.env.PROBE_SET ?? null;
/**
 * Long enough for the head's collapse/restore transition to finish. The hook animates the
 * step between the two heights over 180ms; everything measured about either FORM has to be
 * read after that, and the one check that is about the motion itself samples inside it.
 */
const HEAD_SETTLE_MS = 320;
/**
 * A scroll offset past the collapse point on any fixture.
 *
 * It used to be 400, and 400 is now on the wrong side of the threshold: the head reopens
 * where the reserve would start showing — the grid's top less the collapsed bar, which is
 * ~325px on a phone here — and collapses a band past that. So the head is still open at 400
 * by design, and a check that scrolled there measured an open head and called it a missing
 * collapse.
 */
const PAST_COLLAPSE = 900;
/**
 * The same offset, clamped to what the fixture can actually reach.
 *
 * A browser clamps `scrollTo` to the document's maximum, so on a short set — or a `PROBE_SET`
 * pointed at one — the page stops above the threshold, the head is still open, and every
 * check below reports a collapse that never failed. The clamp is reported rather than
 * silently applied: a fixture that cannot be scrolled past the threshold has not tested it.
 */
async function reachable(page, wanted) {
  return page.evaluate((target) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return { target: Math.min(target, Math.max(0, max)), max: Math.round(max) };
  }, wanted);
}
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

// Anchored to structure, never to a class name a refactor renames: a cell is the button
// whose accessible name says whether the card is in your collection.
const READ_CELLS = () => {
  const buttons = [...document.querySelectorAll('button[aria-label]')]
    // NOT anchored to the end: a missing cell appends its price after the clause, so
    // an end-anchored test silently drops every priced missing cell and leaves a sample
    // of owned ones that reports green.
    .filter((b) => /in your collection/.test(b.getAttribute('aria-label')));
  // Sampled ACROSS the grid, not off the front: a reader who owns the early collector
  // numbers would otherwise give a sample of 40 owned cells and the dim would go
  // unmeasured while every check reported green.
  // Presence is counted over EVERY cell; only the measurements are sampled. Deciding
  // "there is no missing cell" from 40 of 400 fails a set with one missing card at an
  // index the stride skipped.
  const isOwned = (b) => !/not in your collection/.test(b.getAttribute('aria-label'));
  const totals = {
    cells: buttons.length,
    owned: buttons.filter(isOwned).length,
    missing: buttons.filter((b) => !isOwned(b)).length,
  };
  // Sampled across the grid rather than off the front, so a reader who owns the early
  // collector numbers does not give 40 owned cells and an unmeasured dim. One guaranteed
  // representative of each state rides along, so the measurements always have a subject.
  const step = Math.max(1, Math.floor(buttons.length / 40));
  const spread = buttons.filter((_, i) => i % step === 0).slice(0, 40);
  const sample = [...new Set([
    ...spread,
    buttons.find(isOwned),
    buttons.find((b) => !isOwned(b)),
  ].filter(Boolean))];
  const read = sample.map((b) => {
    const owned = !/not in your collection/.test(b.getAttribute('aria-label'));
    const plate = b.firstElementChild;
    const art = b.querySelector('img');
    const plateStyle = getComputedStyle(plate);
    const box = plate.getBoundingClientRect();
    // Structural: the name is the cell's only truncating span. Guessing by content failed
    // twice — first by skipping names that start with a digit ("2-Headed Giant"), then by
    // splitting the accessible label on a comma, which breaks every "Tezzeret, Agent of
    // Bolas". Both times the probe then measured the price tag and reported a failure
    // about a cell that was drawn correctly.
    const name = [...b.children].find(
      (c) => c.tagName === 'SPAN' && c !== plate && c.className.includes('truncate'),
    );
    return {
      owned,
      artOpacity: art ? Number(getComputedStyle(art).opacity) : null,
      artFilter: art ? getComputedStyle(art).filter : null,
      borderStyle: plateStyle.borderTopStyle,
      borderColor: plateStyle.borderTopColor,
      nameColor: name ? getComputedStyle(name).color : null,
      width: Math.round(box.width),
      height: Math.round(box.height),
      controls: b.querySelectorAll('button, input, a, select').length,
    };
  });
  return { totals, cells: read };
};

// The two tokens the edge could resolve to, read off the live theme so the comparison is
// against what this palette actually computes rather than a hex copied into the script.
const READ_TOKENS = () => {
  const root = getComputedStyle(document.documentElement);
  const probe = document.createElement('span');
  document.body.appendChild(probe);
  const resolve = (token) => {
    probe.style.color = 'var(' + token + ')';
    return getComputedStyle(probe).color;
  };
  const theme = document.documentElement.dataset.theme
    || root.getPropertyValue('--theme').trim() || '(default)';
  const fgLocked = resolve('--fg-locked');
  const borderDashed = resolve('--border-dashed');
  probe.remove();
  return { theme: theme, fgLocked: fgLocked, borderDashed: borderDashed };
};

const READ_SECTIONS = () => {
  const heads = [...document.querySelectorAll('h2')];
  return heads.map((h) => ({ text: h.textContent.trim() }));
};

// Anchored to the cell's own accessible name: `button[aria-label]` also matches the
// account menu, which is present on every page and would let the wait pass on a 404.
async function waitForCells(page) {
  await page.waitForFunction(
    () => [...document.querySelectorAll("button[aria-label]")]
      // NOT end-anchored, for the same reason READ_CELLS is not: a missing cell's name
      // ends with its price, so an anchored predicate never matches on a 0%-owned set and
      // the probe times out instead of reporting its own diagnostic.
      .some((b) => /in your collection/.test(b.getAttribute("aria-label"))),
    null,
    { timeout: 20_000 },
  );
}

function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  return ok;
}

async function run() {
  // Must run before setupClerkTestingToken: it resolves the Frontend API URL the bot
  // -protection bypass needs, and without it the sign-in fails with an error that names
  // the bypass rather than the missing setup.
  await clerkSetup();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let failures = 0;

  try {
    await signIn(page);

    // Pick a set from the reader's own index rather than hardcoding one, so the probe
    // works against any fixture.
    await page.goto(`${BASE}/collection/sets`, { waitUntil: "networkidle" });
    // Prefer an INCOMPLETE set: a complete one drops missing-only from what it applies, so
    // the phone fixed-row check below cannot see the wrapping missing-only line and would
    // skip. Picking the first link regardless is how that check went untested.
    const code = SET ?? await page.evaluate(() => {
      const rows = [...document.querySelectorAll('a[href^="/collection/sets/"]')];
      // Read the RATIO out of the row's accessible name — `setsIndexCopy.row.ratioAria`
      // renders "you have 62 of 276 in the base run", and `zeroAria` renders "none of 276".
      // Neither ever says "complete", so a word match was true for every row and picked the
      // first one regardless — the bug this selection was added to fix.
      const incomplete = rows.find((a) => {
        const label = a.getAttribute("aria-label") ?? "";
        if (/you have none of \d+/.test(label)) return true;
        const m = label.match(/you have (\d+) of (\d+) in the base run/);
        return m !== null && Number(m[1]) < Number(m[2]);
      });
      // The fallback must still be INDEXED: an unindexed row's label carries no ratio at
      // all, and that page draws no cells — `waitForCells` would time out on a fixture the
      // probe chose for itself while a usable set sat further down the list.
      const indexed = rows.find((a) =>
        /you have (none of \d+|\d+ of \d+) in the base run/.test(a.getAttribute("aria-label") ?? ""));
      // No `?? rows[0]`: an unindexed page draws no cells, so falling back to one makes
      // `waitForCells` time out instead of saying the index had no usable fixture.
      const link = incomplete ?? indexed ?? null;
      return link ? link.getAttribute("href").split("/").pop() : null;
    });
    if (!code) {
      throw new Error(
        "No set to probe: the index listed no INDEXED set (a row whose accessible name "
        + "carries a base-run ratio), and PROBE_SET was unset. An unindexed page draws no "
        + "cells, so probing one would time out rather than report this.",
      );
    }

    // The index row, while we are on it (addendum R2 §30). The extras figure ranks UNDER
    // the base ratio rather than trailing a code and a year, and takes --fg-muted — which
    // is a resolved colour question no JSDOM test can answer.
    const indexRow = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const value = (name) => root.getPropertyValue(name).trim();
      const probe = (raw) => {
        const el = document.createElement("span");
        el.style.color = raw;
        document.body.appendChild(el);
        const resolved = getComputedStyle(el).color;
        el.remove();
        return resolved;
      };
      const extras = [...document.querySelectorAll("a[href^='/collection/sets/'] span")]
        .find((el) => /^\d+ \/ \d+ extras$/.test(el.textContent.trim()));
      if (!extras) return null;
      // The innermost match: the ratio's wrapper also contains the extras line, so its own
      // bottom edge sits BELOW the figure this check is measuring against it.
      const ratio = [...extras.closest("a").querySelectorAll("span")]
        .filter((el) => el.childElementCount === 0)
        .find((el) => /^\d+ \/ \d+ · \d+%$/.test(el.textContent.trim()));
      return {
        text: extras.textContent.trim(),
        colour: getComputedStyle(extras).color,
        muted: probe(value("--fg-muted")),
        locked: probe(value("--fg-locked")),
        size: parseFloat(getComputedStyle(extras).fontSize),
        ratioSize: ratio ? parseFloat(getComputedStyle(ratio).fontSize) : null,
        below: ratio
          ? Math.round(extras.getBoundingClientRect().top - ratio.getBoundingClientRect().bottom)
          : null,
        label: extras.closest("a").getAttribute("aria-label") ?? "",
      };
    });
    if (indexRow === null) {
      console.log("\n  (no indexed row with extras on this fixture — §30 checks skipped)\n");
    } else {
      failures += !report(
        "the extras figure resolves to --fg-muted, not --fg-locked",
        indexRow.colour === indexRow.muted && indexRow.colour !== indexRow.locked,
        `${indexRow.colour} (muted ${indexRow.muted}, locked ${indexRow.locked})`,
      );
      // The drawn gap, not merely "somewhere below": `mt-[2px]`. Any non-negative offset
      // would have passed layout drift and a collapsed 0px gap alike.
      failures += !report(
        "it sits 2px under the base ratio",
        indexRow.below === 2,
        `${indexRow.below}px below the ratio`,
      );
      // The drawn step, not merely "smaller": 10px under 11px. A 9px line under an 11px
      // ratio is also smaller, and is not the ruling.
      failures += !report(
        "it is one type step down: 10px under 11px",
        indexRow.size === 10 && indexRow.ratioSize === 11,
        `${indexRow.size}px under ${indexRow.ratioSize}px`,
      );
      // The FIGURE, not the word. A label reading `Set extras` would pass a `.includes`
      // check while omitting exactly what the clause exists to announce.
      const spoken = indexRow.text.replace(" / ", " of ");
      failures += !report(
        "the row's accessible name carries the figure, not just the word",
        indexRow.label.includes(`, and ${spoken}`),
        `label ${JSON.stringify(indexRow.label)}, wanted ", and ${spoken}"`,
      );
    }

    console.log(`\nProbing /collection/sets/${code} at 1280x900\n`);

    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);

    const tokens = await page.evaluate(READ_TOKENS);
    console.log(`  theme ${tokens.theme} · --fg-locked ${tokens.fgLocked} · --border-dashed ${tokens.borderDashed}`);

    const { totals, cells } = await page.evaluate(READ_CELLS);
    const missing = cells.filter((c) => !c.owned);
    const owned = cells.filter((c) => c.owned);
    console.log(`  grid holds ${totals.cells} cells: ${totals.owned} owned, `
      + `${totals.missing} missing · measured ${cells.length}\n`);

    // A probe that reads nothing and reports every check green is worse than no probe:
    // it is a pass that measured nothing. Zero cells is a failure, not a skip.
    failures += !report(
      "the page rendered cells to measure",
      totals.cells > 0,
      `${totals.cells} cells on the page`,
    );

    if (missing.length === 0) {
      failures += !report(
        "there is a missing cell to measure the dim on",
        false,
        `the grid holds ${totals.missing} missing cells — probe a set you do not hold outright`,
      );
    } else {
      const m = missing[0];
      failures += !report(
        "missing art is dimmed",
        m.artOpacity === 0.28,
        `opacity ${m.artOpacity} (want 0.28)`,
      );
      failures += !report(
        "missing art is desaturated",
        /saturate\(0?\.55\)/.test(m.artFilter ?? ""),
        `filter ${m.artFilter}`,
      );
      failures += !report(
        "missing edge is dashed",
        m.borderStyle === "dashed",
        `border-style ${m.borderStyle}`,
      );
      failures += !report(
        "dashed edge takes --fg-locked, not --border-dashed",
        m.borderColor === tokens.fgLocked && m.borderColor !== tokens.borderDashed,
        `computed ${m.borderColor}`,
      );
      failures += !report(
        "the name is NOT dimmed — the dim is on the art only",
        m.nameColor !== null && m.nameColor !== tokens.fgLocked,
        `name colour ${m.nameColor}`,
      );
    }

    // Layout is layout: the track, the derived height and the flush edge are true of any
    // cell, so they measure the first one on the page. Gating them behind "there is a
    // missing cell to compare against" let a complete set skip every geometry check while
    // reporting green — the same class of silence the dim checks below are gated for, but
    // there the gate is the point, because a complete set has no missing cell to dim.
    const any = cells[0];
    if (any) {
      failures += !report(
        "the desktop cell lands in the track the one declaration produces",
        any.width >= 124 && any.width <= 160,
        `${any.width}x${any.height}`,
      );
      failures += !report(
        "the cell's height is its width at 63/88 rather than a literal",
        Math.abs(any.height - (any.width * 88) / 63) <= 1.5,
        `${any.width}x${any.height}, expected height ${Math.round((any.width * 88) / 63)}`,
      );
    }

    if (owned.length === 0) {
      failures += !report(
        "there is an owned cell to compare geometry against",
        false,
        `the grid holds ${totals.owned} owned cells — probe a set you hold some of`,
      );
    } else if (missing.length > 0) {
      const o = owned[0];
      const m = missing[0];
      failures += !report(
        "owned art is at full strength",
        o.artOpacity === 1,
        `opacity ${o.artOpacity}`,
      );
      failures += !report(
        "owned and missing cells occupy identical boxes",
        o.width === m.width && o.height === m.height,
        `owned ${o.width}x${o.height} vs missing ${m.width}x${m.height}`,
      );
      // Against the contract, not only against each other: two cells that agree on the
      // wrong size passed the check above while the density was silently broken. The cell
      // no longer declares a size, so the contract is the track it sits in. §27's own
      // 124-129px is derived from a 1100px content box; this shell is `max-w-[1180px]` less
      // `px-[34px]` either side, so the real content is 1112px and seven tracks measure
      // ~150px — the band below is the measured one, and it is what the route produces.
    }

    // The flush edge IS the ruling — a fixed-width row strands its remainder beside a grid
    // whose left edge is aligned to the head, the section heading and the result line.
    const READ_EDGE = () => {
      const grid = document.querySelector("[data-set-grid]");
      if (!grid) return null;
      const cells = [...grid.children].filter((c) => c.getClientRects().length > 0);
      if (cells.length === 0) return null;
      const box = grid.getBoundingClientRect();
      const top = Math.round(cells[0].getBoundingClientRect().top);
      const row = cells.filter((c) => Math.round(c.getBoundingClientRect().top) === top);
      // The TRACKS, not the cells. `auto-fill` keeps empty tracks by design — that is the
      // keyword's whole point here — so a set with fewer cells than tracks has a first row
      // that stops early, and measuring the last CELL would report stranded space for a
      // perfectly correct grid.
      const style = getComputedStyle(grid);
      const tracks = style.gridTemplateColumns.split(" ").filter(Boolean);
      // Read, not hard-coded. The gap is a design value that may legitimately change while
      // the flush-edge contract holds, and a probe that carried its own copy would report a
      // false failure the day it did.
      const gap = parseFloat(style.columnGap) || 0;
      return {
        columns: tracks.length,
        filled: row.length,
        // Content box: `box.right` includes any right padding the grid carries.
        stranded: Math.round(
          box.right - (row[row.length - 1].getBoundingClientRect().right
            + tracks.slice(row.length).reduce((sum, t) => sum + parseFloat(t) + gap, 0)),
        ),
        template: getComputedStyle(grid).gridTemplateColumns,
      };
    };
    const edge = await page.evaluate(READ_EDGE);
    failures += !report(
      "the grid's last track reaches its own right edge",
      edge !== null && Math.abs(edge.stranded) <= 1,
      edge === null
        ? "no grid found"
        : `${edge.stranded}px stranded past ${edge.columns} tracks (${edge.filled} filled)`,
    );
    failures += !report(
      "seven tracks at 1180",
      edge !== null && edge.columns === 7,
      edge === null ? "no grid found" : `${edge.columns} tracks, template ${edge.template}`,
    );

    failures += !report(
      "no control sits inside any cell",
      cells.every((c) => c.controls === 0),
      `max nested controls ${Math.max(0, ...cells.map((c) => c.controls))}`,
    );

    const sections = await page.evaluate(READ_SECTIONS);
    const heads = sections.map((s) => s.text);
    failures += !report(
      "the base run is a titled section",
      heads.some((h) => /^Base run/.test(h)),
      `section heads: ${heads.join(" | ") || "(none)"}`,
    );

    const head = await page.evaluate(() => document.body.innerText.slice(0, 400));
    failures += !report(
      "no 0 / 0 anywhere on the page",
      !/\b0 \/ 0\b/.test(head),
      `head text begins: ${JSON.stringify(head.split("\n").slice(0, 3).join(" / "))}`,
    );

    // 390px: the same rulings have to hold on a phone, and since R2 the caption is one
    // format at every width rather than dropping its rarity word.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle" });
    await waitForCells(page);
    const phone = (await page.evaluate(READ_CELLS)).cells;
    const phoneAny = phone[0];
    if (phoneAny) {
      // Addendum R2 §27: at 390px there is nothing between three tracks at 112.67 and two
      // at 174 — an `fr` track takes the whole remainder — so the choice was a column count
      // and the answer is two.
      failures += !report(
        "the phone cell is 174px, which is two columns of the one declaration",
        Math.abs(phoneAny.width - 174) <= 1,
        `${phoneAny.width}x${phoneAny.height}`,
      );
      const phoneEdge = await page.evaluate(READ_EDGE);
      failures += !report(
        "two tracks at 390, measured off the track list",
        phoneEdge !== null && phoneEdge.columns === 2,
        phoneEdge === null ? "no grid found" : `${phoneEdge.columns} tracks, ${phoneEdge.template}`,
      );
      failures += !report(
        "and the last one still reaches the grid's right edge",
        phoneEdge !== null && Math.abs(phoneEdge.stranded) <= 1,
        phoneEdge === null ? "no grid found" : `${phoneEdge.stranded}px stranded`,
      );
      failures += !report(
        "and its height is that width at 63/88, not a literal",
        Math.abs(phoneAny.height - (phoneAny.width * 88) / 63) <= 1.5,
        `${phoneAny.width}x${phoneAny.height}, `
          + `expected height ${Math.round((phoneAny.width * 88) / 63)}`,
      );
    }

    const phoneMissing = phone.find((c) => !c.owned);
    if (phoneMissing) {
      failures += !report(
        "the dim survives at 390px",
        phoneMissing.artOpacity === 0.28 && phoneMissing.borderStyle === "dashed",
        `opacity ${phoneMissing.artOpacity}, border ${phoneMissing.borderStyle}`,
      );
    }

    // Counted from the rendered rows rather than from the arithmetic, which is how the old
    // fixed cell was caught silently producing two columns where three were designed.
    const columns = await page.evaluate(() => {
      const cells = [...document.querySelectorAll("button[aria-label]")]
        .filter((b) => /in your collection/.test(b.getAttribute("aria-label")));
      if (cells.length === 0) return 0;
      const firstTop = Math.round(cells[0].getBoundingClientRect().top);
      return cells.filter((c) => Math.round(c.getBoundingClientRect().top) === firstTop).length;
    });
    failures += !report(
      "two columns at 390px",
      columns === 2,
      `${columns} cells on the first row`,
    );

    // The caption stops varying by width: a 174px cell holds three things.
    const phoneRarity = await page.evaluate(() => {
      const grid = document.querySelector("[data-set-grid]");
      if (!grid) return null;
      return [...grid.querySelectorAll("span")]
        .filter((el) => /^· /.test(el.textContent || ""))
        .filter((el) => el.getClientRects().length > 0).length;
    });
    failures += !report(
      "rarity is captioned at 390px too",
      (phoneRarity ?? 0) > 0,
      `${phoneRarity} visible rarity captions`,
    );

    // The rack (addendum R2 §28). Its height must not depend on the filter state — it lives
    // inside a sticky head — and an unlit pip must carry no opacity. Both are resolved-style
    // questions; neither is answerable in JSDOM.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    const rackAt = async (query) => {
      await page.goto(`${BASE}/collection/sets/${code}${query}`, { waitUntil: "networkidle" });
      // The RACK, not the cells: a filtered state can legitimately render the zero page,
      // which has no card buttons at all, and waiting for cells there would time out and
      // report a layout failure for a correct empty result.
      await page.waitForSelector("[data-set-chips]", { timeout: 20_000 });
      return page.evaluate(() => {
        const chipRow = document.querySelector("[data-set-chips]");
        if (!chipRow) return null;
        // The RACK's rows, not the whole sticky head. `CostStrip` is still inside that head
        // and adds a pricing or staleness line as the filtered set changes — real,
        // deferred to the phone-head PR where the strip becomes a fixed row, and until then
        // measuring the head here would fail this check for valid data. The rack's own
        // three rows are what §28 promises are fixed, and they are what this measures.
        const controls = chipRow.previousElementSibling;
        const result = document.querySelector("[data-set-result]");
        // All THREE, or nothing. Summing whatever happened to be present let the check
        // report equal heights while measuring two rows — the invariant is "three rows,
        // always all three", so a missing row is the failure, not a smaller sum.
        const rows = [controls, chipRow, result];
        const rackHeight = rows.every(Boolean)
          ? rows.reduce((sum, el) => sum + el.getBoundingClientRect().height, 0)
          : null;
        return {
          rowsFound: rows.filter(Boolean).length,
          rack: rackHeight === null ? null : Math.round(rackHeight),
          chips: chipRow.querySelectorAll("span > button").length,
          // AVAILABLE pips only. `ColourPips` dims an `aria-disabled` hue to .42 by its own
          // contract, so including them made this check report the dimming defect it was
          // written to catch on a set that simply lacks a colour.
          pipOpacities: [...document.querySelectorAll('[role="switch"]')]
            .filter((el) => el.getClientRects().length > 0)
            .filter((el) => el.getAttribute("aria-disabled") !== "true")
            .map((el) => getComputedStyle(el).opacity),
        };
      });
    };
    // 900px too: this page switches form at `md` (768) while the chassis frame switches at
    // 1000, so the band between them shows the wide inline controls. Whether that wraps is
    // the only question that matters, and it is measurable.
    //
    // NOT RE-MEASURED since H10 put the `Any` / `Exactly` modifier inside the colour box and
    // H13 made the rarity trigger count (`Rarity 0` rather than `Rarity · all`). The row is
    // wider by the modifier and narrower by the trigger, and no figure for either was taken
    // when this changed: the next run of this check is the first measurement of it.
    const narrowDesktop = await (async () => {
      await page.setViewportSize({ width: 900, height: 900 });
      await page.goto(`${BASE}/collection/sets/${code}?c=W&r=rare`, { waitUntil: "networkidle" });
      await page.waitForSelector("[data-set-chips]", { timeout: 20_000 });
      return page.evaluate(() => {
        const row = document.querySelector("[data-chassis-row], [class*='flex-nowrap']");
        if (!row) return null;
        const kids = [...row.children].filter((c) => c.getClientRects().length > 0);
        const tallest = Math.max(...kids.map((c) => c.getBoundingClientRect().height));
        return {
          wrapped: row.getBoundingClientRect().height > tallest + 2,
          rowHeight: Math.round(row.getBoundingClientRect().height),
          tallest: Math.round(tallest),
        };
      });
    })();
    failures += !report(
      "the control row does not wrap at 900, between this page's md and the chassis's 1000",
      narrowDesktop !== null && !narrowDesktop.wrapped,
      narrowDesktop === null
        ? "no control row found"
        : `row ${narrowDesktop.rowHeight}px against a tallest child of ${narrowDesktop.tallest}px`,
    );

    await page.setViewportSize({ width: 1280, height: 900 });
    // `null === null` is the trap round 36's own fix walked into: `rackAt` returns a null
    // rack when a row is missing, so comparing three states could pass by all three being
    // absent. Every comparison goes through here, which requires the measurements to exist
    // before it will call them equal.
    const rackHeightsAgree = (label, states) => {
      const missing = states.filter((st) => st === null || st.rack === null);
      if (missing.length > 0) {
        return report(label, false,
          `${missing.length} of ${states.length} states could not be measured — a rack row `
          + "was absent, which is the finding rather than a matching height");
      }
      const heights = states.map((st) => st.rack);
      return report(label, new Set(heights).size === 1, heights.map((h) => `${h}px`).join(", "));
    };

    const rest = await rackAt("");
    const one = await rackAt("?c=W");
    // Three ACTIVE dimensions, which a complete set cannot have: at 100% the page drops
    // missing-only from what it applies, and its control with it, so `own=missing` draws no chip
    // there by design. Asserting three against the first set in the index would report a
    // failure for correct behaviour on a fixture that happens to be finished.
    // `own=missing`, the key the page writes since H10 took `m` for the colour modifier;
    // a legacy `m=1` still parses, but a probe asks for what the page itself would write.
    const three = await rackAt("?c=W&r=rare&own=missing");
    // Read off a STRUCTURE the page maintains, not off copy: the first attempt grepped for
    // sentences this page has never rendered, so it always answered false and the check it
    // guards would have failed on the fixture it exists to allow. At 100% the page removes
    // the missing-only control, because the base run has nothing left to hide — the absence
    // of that control IS completeness, and it is the same fact `effective` is derived from.
    const setIsComplete = await page.evaluate(
      () => document.querySelectorAll('button[aria-label^="Showing "]').length === 0,
    );
    if (rest === null) {
      failures += !report("the chip row is on the page", false, "no [data-set-chips]");
    } else {
      failures += !rackHeightsAgree(
        "the rack's three rows do not move with the filter state",
        [rest, one, three],
      );
      failures += !report(
        "no unlit pip is dimmed — the shipped control's 1.38:1 is what this replaces",
        rest.pipOpacities.length > 0 && rest.pipOpacities.every((o) => Number(o) === 1),
        rest.pipOpacities.length === 0
          ? "every hue is unavailable on this set — no available pip to measure"
          : `${rest.pipOpacities.length} available: ${rest.pipOpacities.join(", ")}`,
      );
      failures += !report(
        setIsComplete
          ? "two filters on draw two chips (complete set: missing-only is not applied)"
          : "three filters on draw three chips",
        three.chips === (setIsComplete ? 2 : 3),
        `${three.chips} chip removals`,
      );
    }

    // The FULLEST chip line the page can draw, at every desktop width the line has to hold
    // without wrapping: two colours (one chip), the Exactly modifier, all four rarities and
    // missing-only, seven chips on an incomplete set. The line scrolls and never wraps, so the
    // rack's three rows must read the same with seven chips as with none, at 768 (this page's
    // md), 820, 900 (between md and the chassis's 1000) and 1280. Three chips never overflowed
    // the strip, so the earlier checks could not see a wrap or a scrollbar adding height.
    const SEVEN = "?c=W,U&m=exact&r=common,uncommon,rare,mythic&own=missing";
    for (const width of [768, 820, 900, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const none = await rackAt("");
      const full = await rackAt(SEVEN);
      const want = setIsComplete ? 6 : 7;
      failures += !report(
        `${width}: the fullest filter state draws ${want} chips`,
        full !== null && full.chips === want,
        full === null ? "no rack" : `${full.chips} chip removals`,
      );
      failures += !rackHeightsAgree(`${width}: the rack's rows hold with ${want} chips`, [none, full]);
    }

    // The head's height at PHONE too, which is where it was actually moving: the
    // missing-only result line wraps in 358px, so toggling that filter grew row 3 and the
    // desktop-only check above never saw it.
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneRest = await rackAt("");
    const phoneMissing2 = await rackAt("?own=missing");
    const phoneThree = await rackAt("?c=W&r=rare&own=missing");
    if (phoneRest === null) {
      // Not a skip. The desktop path treats a missing rack as a failure and this silently
      // returned a green run without measuring the phone invariant at all — the seventh
      // instance of this class on this PR, in the code written last round to close it.
      failures += !report(
        "the phone rack is present to measure",
        false,
        "no [data-set-chips] at 390px, so the phone fixed-height invariant went unmeasured",
      );
    } else {
      // `?own=missing` on a COMPLETE set renders identically to rest — the page drops missing-only
      // from what it applies — so on such a fixture this cannot see the wrapping
      // missing-only line it is named for. SKIPPED rather than passed: a check that cannot
      // fail on the fixture it ran against has measured nothing, and reporting it green
      // is the failure mode this whole file exists to avoid.
      if (setIsComplete) {
        // A PREREQUISITE the probe could not meet, not a passing check. It selects an
        // incomplete set when one exists, so reaching here means the fixture has none —
        // which the run has to say, or the phone height invariant silently goes untested.
        failures += !report(
          "an incomplete set was available to test the phone missing-only wrap",
          false,
          "every set in this collection is complete — `?own=missing` is never applied, so the "
            + "wrapping result line cannot be measured. Probe a collection with one.",
        );
      } else {
        failures += !rackHeightsAgree(
          "the phone rack's three rows do not move either",
          [phoneRest, phoneMissing2, phoneThree],
        );
      }
    }

    // R3 finding 6, PR 5a. The four content moves are asked to buy a specific number of
    // pixels, so the head's rest height is REPORTED rather than merely bounded — a check
    // that only says "under 388" cannot tell a 4px saving from a 40px one, and the plan's
    // own arithmetic was 22px stale for exactly that reason.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    const phoneHead = await page.evaluate(() => {
      const el = document.querySelector("[data-set-head]");
      if (!el) return null;
      const px = (sel) => {
        const node = document.querySelector(sel);
        return node ? Math.round(node.getBoundingClientRect().height) : null;
      };
      const h1 = el.querySelector("h1");
      const shortCode = document.querySelector("[data-set-provenance-short]");
      // PRESENCE and DISPLAY reported separately, because collapsing them is how a guard
      // reads clean on a node that is not there: `display` of a missing element is not
      // "none", it is nothing, and a negated check turns that into a pass. Each marker
      // therefore answers two questions, and the assertions below ask both.
      const marker = (sel) => {
        const node = document.querySelector(sel);
        return { present: node !== null, display: node && getComputedStyle(node).display };
      };
      return {
        total: Math.round(el.getBoundingClientRect().height),
        title: h1 ? Math.round(h1.getBoundingClientRect().height) : null,
        // Found by its own marker, and reported as absent rather than as false: the first
        // version of this guard read `h1.parentElement.textContent`, which is the whole
        // identity block — ratio, provenance and note included — so it never ended in the
        // year and reported clean no matter where the code was put.
        shortCode: {
          present: shortCode !== null,
          display: shortCode && getComputedStyle(shortCode).display,
          insideTitle: shortCode !== null && h1 !== null && h1.contains(shortCode),
        },
        // The two lines moves 1 and 2 remove. Structural, and true on any fixture — which
        // an absolute height bound is not: a set with a short title or no cost strip is
        // already under 388px with none of this PR applied.
        longProvenance: marker("[data-set-provenance-long]"),
        note: marker("[data-set-ratio-note]"),
        chips: px("[data-set-chips]"),
        result: px("[data-set-result]"),
      };
    });
    if (phoneHead === null) {
      failures += !report("the phone head can be measured", false, "no [data-set-head]");
    } else {
      // REPORTED, not asserted. The probe picks whatever incomplete indexed set the
      // fixture offers, and a set with a short title or no priced cost strip is already
      // under 388px with none of this PR applied — so a `< 388` predicate passes on a
      // reverted build and proves nothing. What the moves actually did is structural, and
      // that is what the three checks below assert. The number is here to be read.
      report(
        "the phone head at rest measures",
        true,
        `${phoneHead.total}px — 388px was the shipped height when these moves were written`
        + ` · chips ${phoneHead.chips}px, result ${phoneHead.result}px`,
      );
      // The chip line is what makes the expanded head's height a constant, and #549 spent
      // four rounds getting it to 44. A content move above it must not have cost that.
      failures += !report(
        "the chip line still holds its 44px band",
        phoneHead.chips === 44,
        `${phoneHead.chips}px`,
      );
      // The trap this PR fell into once: the provenance was placed on the title line, the
      // title wrapped, and the head got 15px BIGGER while every unit test passed. Nothing
      // in JSDOM can see a wrap, so the guard has to live here — and it fails on an ABSENT
      // marker as loudly as on a misplaced one, because a guard that cannot find the thing
      // it guards is not passing.
      failures += !report(
        "the phone's provenance is on the page, shown, and off the title line",
        phoneHead.shortCode.present
          && phoneHead.shortCode.display !== "none"
          && !phoneHead.shortCode.insideTitle,
        !phoneHead.shortCode.present
          ? "no [data-set-provenance-short] — the guard measured nothing"
          : phoneHead.shortCode.display === "none"
            ? "the short provenance is present but display:none at 390"
            : phoneHead.shortCode.insideTitle
              ? `the set code is inside the h1, title ${phoneHead.title}px`
              : `title ${phoneHead.title}px, code on the ratio line, display ${phoneHead.shortCode.display}`,
      );
      // Moves 1 and 2, asserted where they actually happen rather than through a height.
      // Both halves stated: a node that has been DELETED is not the same result as one
      // correctly hidden, and only one of the two is what this PR did.
      for (const [label, m] of [
        ["the long provenance", phoneHead.longProvenance],
        ["the scope note", phoneHead.note],
      ]) {
        failures += !report(
          `${label} is present and not shown on the phone`,
          m.present && m.display === "none",
          !m.present
            ? "the marker is missing entirely — the node was removed, not hidden"
            : `display ${m.display} at 390`,
        );
      }
    }

    // R3 finding 6, the collapse. Everything here is a browser question: JSDOM has no
    // scroll, no sticky, and no layout, so the unit tests can prove which threshold fires
    // and this has to prove what the page does when it does.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    const tracksNow = () => page.evaluate(() => {
      const grid = document.querySelector("[data-set-grid]");
      return grid === null
        ? null
        : getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    });
    const headNow = () => page.evaluate(() => {
      const el = document.querySelector("[data-set-head]");
      if (el === null) return null;
      return {
        height: Math.round(el.getBoundingClientRect().height),
        shy: el.hasAttribute("data-set-head-collapsed"),
        bar: (() => {
          const b = document.querySelector("[data-set-head-bar]");
          return b === null ? null : Math.round(b.getBoundingClientRect().height);
        })(),
        // The reserve. `offsetParent` is the wrapper the sticky head floats inside, and its
        // height is what the DOCUMENT is holding — the number that must not change.
        // WHERE IT IS, not only how tall. The first version of this block measured height
        // and the collapsed attribute and reported clean while the head was scrolled out of
        // the viewport entirely — the reserve had been a WRAPPER, which is a containing
        // block, and a sticky element cannot outlive one.
        top: Math.round(el.getBoundingClientRect().top),
        // What the document is holding: the head's own box plus the spacer beside it.
        reserved: (() => {
          const spacer = document.querySelector("[data-set-head-reserve]");
          return Math.round(
            el.getBoundingClientRect().height
            + (spacer === null ? 0 : spacer.getBoundingClientRect().height),
          );
        })(),
      };
    });
    const scrollTo = async (y) => {
      await page.evaluate((to) => window.scrollTo(0, to), y);
      // Two frames: the listener is passive and the class change lands on the next paint.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      // And then the height transition between the two forms, which every check below wants
      // the END of. Sampling two frames in reads a head part-way between its two heights,
      // which is neither form and fails checks that are about the forms.
      await page.waitForTimeout(HEAD_SETTLE_MS);
    };
    // The FIRST crossing, sampled on the exact frame the collapse lands.
    //
    // The reserve used to be state-held, which arrives a commit late: the head had already
    // shrunk while the spacer was still 0, and the document jumped once — on the only
    // crossing anyone notices. A fixed two-frame sample cannot see that, and the first
    // version of this check passed with the spacer DELETED ENTIRELY, because by the frame
    // it looked at, the collapse had not applied yet.
    //
    // So it watches frame by frame and reports the shift measured on the first frame where
    // the head is actually marked collapsed — and says so when it never sees one, rather
    // than returning a 0 that reads like a pass.
    const firstCrossingShift = async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      return page.evaluate(() => new Promise((resolve) => {
        const grid = document.querySelector("[data-set-grid]");
        const head = document.querySelector("[data-set-head]");
        if (grid === null || head === null) return resolve({ shift: null, saw: false });
        // Where the grid sits in the DOCUMENT, which is what a reserve protects. Its
        // VIEWPORT position necessarily changes — that is the scroll itself.
        const docTop = () => Math.round(grid.getBoundingClientRect().top + window.scrollY);
        const before = docTop();
        window.scrollTo(0, 900);
        let frames = 0;
        const tick = () => {
          if (head.hasAttribute("data-set-head-collapsed")) {
            return resolve({ shift: Math.abs(docTop() - before), saw: true, frames });
          }
          if (++frames > 30) return resolve({ shift: null, saw: false, frames });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }));
    };
    const restState = await headNow();
    const tracksAtRest = await tracksNow();
    const depth = await reachable(page, PAST_COLLAPSE);
    if (depth.target < PAST_COLLAPSE) {
      failures += !report(
        "the fixture is tall enough to scroll past the collapse",
        false,
        `this set scrolls ${depth.max}px and the threshold is past ${PAST_COLLAPSE}px —`
        + " every collapse check below is measuring an open head. Pick a longer set with"
        + " PROBE_SET.",
      );
    }
    await scrollTo(depth.target);
    const shyState = await headNow();
    const tracksScrolled = await tracksNow();

    if (restState === null || shyState === null || tracksAtRest === null || tracksScrolled === null) {
      failures += !report(
        "the collapse can be measured", false,
        "the head or the grid was not on the page — nothing below this was measured",
      );
    } else {
      failures += !report(
        "the head collapses past the threshold",
        !restState.shy && shyState.shy,
        `at rest shy=${restState.shy} ${restState.height}px, at ${PAST_COLLAPSE} shy=`
        + `${shyState.shy} ${shyState.height}px`,
      );
      failures += !report(
        "and is actually shorter, not merely marked",
        shyState.height < restState.height,
        `${restState.height}px to ${shyState.height}px`,
      );
      // §31 rules the collapsed bar at 52px of content. With the container's own 10/12
      // padding and its border that is 75px, and the number is asserted rather than merely
      // reported: "shorter" was true at 140px too, which is the same block with members
      // hidden rather than the one-row bar the ruling draws.
      // The point of the whole feature. Asserted at BOTH positions, because a head that
      // sticks at rest and leaves once scrolled is the exact bug this PR shipped and the one
      // its first probe could not see.
      failures += !report(
        "the head is still at the top of the viewport after scrolling",
        Math.abs(shyState.top) <= 1,
        `top ${shyState.top}px at ${PAST_COLLAPSE} — ${restState.top}px unscrolled, which is the app`
        + " chrome above it and not this head's doing",
      );
      // The OPEN head leaves with the cards. Pinned open it sat over the grid for the
      // whole band below the threshold — a phone read a screen of cards under a header
      // that never moved, and then it snapped. Measured while the head is still open and
      // BELOW its own threshold, which is the only band where the two behaviours differ:
      // above it nothing has scrolled, past it the bar is what is pinned. A single
      // assertion on `top` cannot say it alone, so the head's open state is asserted too —
      // a build that collapsed at 120px would read a top of 0 here and pass.
      await scrollTo(150);
      const partway = await headNow();
      failures += !report(
        "the open head scrolls away with the cards rather than staying pinned",
        partway !== null && !partway.shy && partway.top <= restState.top - 140,
        partway === null
          ? "the head was not on the page — the check measured nothing"
          : `top ${partway.top}px at y=150 against ${restState.top}px at rest, shy=${partway.shy}`,
      );
      await scrollTo(depth.target);

      failures += !report(
        "the collapsed bar is the one-row form, not the full block with members hidden",
        shyState.bar === 52 && shyState.height <= 80,
        `bar ${shyState.bar}px, head ${shyState.height}px`,
      );
      // R3 names this test itself: the bar overlays, so the grid's own layout is the same
      // at every scroll position.
      failures += !report(
        `the grid's track count is identical at scroll 0 and scroll ${PAST_COLLAPSE}`,
        tracksAtRest === tracksScrolled,
        `${tracksAtRest} tracks then ${tracksScrolled}`,
      );
      // And the reserve, which is the difference between overlaying and not jumping.
      failures += !report(
        "the document holds the head's rest height while it is collapsed",
        restState.reserved !== null
          && shyState.reserved !== null
          && Math.abs(restState.reserved - shyState.reserved) <= 1,
        `reserved ${restState.reserved}px at rest, ${shyState.reserved}px collapsed`,
      );
      // Deep, because the bug this replaces only appeared once the scroll passed the
      // height of the box the head had been wrapped in. A single mid-page sample would
      // have missed it once scrolled too if the reserve had been a little taller.
      await scrollTo(2000);
      const deep = await headNow();
      failures += !report(
        "and stays there far down the grid",
        deep !== null && Math.abs(deep.top) <= 1 && deep.shy,
        deep === null ? "the head could not be measured" : `top ${deep.top}px, shy=${deep.shy}`,
      );

      // The bar's own controls, measured while it is DRAWN. The page's other 44px check
      // runs at rest, where the bar does not exist — so the one path to the filters while
      // the head is collapsed was the only phone action never measured, and it shipped at
      // 36px.
      await scrollTo(depth.target);
      const barTargets = await page.evaluate(() => {
        const bar = document.querySelector("[data-set-head-bar]");
        if (bar === null) return null;
        const buttons = [...bar.querySelectorAll("button")];
        if (buttons.length === 0) return { count: 0, smallest: null };
        return {
          count: buttons.length,
          smallest: Math.round(Math.min(...buttons.map((b) => b.getBoundingClientRect().height))),
        };
      });
      failures += !report(
        "every control on the collapsed bar clears the 44px target",
        barTargets !== null && barTargets.count > 0
          && barTargets.smallest !== null && barTargets.smallest >= 44,
        barTargets === null
          ? "the bar was not drawn — the check measured nothing"
          : barTargets.count === 0
            ? "the bar drew no controls — the check measured nothing"
            : `${barTargets.count} measured, smallest ${barTargets.smallest}px`,
      );

      // RESTORATION, attempted. The initial scroll read is in a passive effect, because the
      // layout effect the shape asks for is a hard lint error here, so a first paint at
      // scrollY > 120 shows the open head for one frame. What that costs the GRID should be
      // nothing — the head shrinks by its own difference and the spacer grows by the same
      // amount in the same commit — but this probe cannot demonstrate it either way:
      // NEITHER a reload NOR a history back restores a scrolled position in this engine, so
      // the page always comes up at the top and the case is never entered.
      //
      // Reported rather than asserted, and reported as NOT REPRODUCED rather than as a
      // pass. A check that cannot reach its case must say so; a green line here would be a
      // claim of coverage that does not exist.
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.goto(`${BASE}/collection/sets`, { waitUntil: "networkidle" });
      await page.goBack({ waitUntil: "networkidle" });
      await waitForCells(page);
      const restoredY = await page.evaluate(() => Math.round(window.scrollY));
      if (restoredY > 120) {
        failures += !report(
          "a first paint at a restored scroll position keeps the grid still",
          true,
          `entered at y=${restoredY}`,
        );
      } else {
        // NOT a `report(..., true, ...)`. That printed `ok` and let the probe exit
        // successfully while saying "NOT REPRODUCED" in its own detail — a green line for a
        // case never entered, which is the exact thing this run keeps shipping. Its own
        // marker, outside the pass/fail tally, so it can neither claim coverage nor fail a
        // build over an engine behaviour.
        console.log(
          `  n/a  a first paint at a restored scroll position — NOT REPRODUCED: came up at`
          + ` y=${restoredY}. Neither reload nor history back restores a scrolled position`
          + " here, so the one-frame open head on restoration stays unmeasured.",
        );
      }

      // The breakpoint round trip. A reader who collapses on the phone, widens to desktop
      // and comes back is still `collapsed`, so the recorder refuses on the first mobile
      // render — and the DESKTOP height stayed reserved under a phone head. Only a real
      // engine can catch it: JSDOM reports every height as 0, so the unit test written for
      // this passed with the fix removed.
      await scrollTo(depth.target);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const afterTrip = await page.evaluate(() => {
        const head = document.querySelector("[data-set-head]");
        const spacer = document.querySelector("[data-set-head-reserve]");
        if (head === null || spacer === null) return null;
        return {
          head: Math.round(head.getBoundingClientRect().height),
          spacer: Math.round(spacer.getBoundingClientRect().height),
          shy: head.hasAttribute("data-set-head-collapsed"),
        };
      });
      // The document must still hold the PHONE's own rest height, measured at the top of
      // this block. A loose bound is not a check here: the desktop figure happened to land
      // within 3px of the right one on this fixture, so anything short of the exact sum
      // passes on the bug.
      //
      // WHAT THIS CANNOT SEE, stated rather than implied: removing the breakpoint reopen in
      // `use-head-collapse.ts` leaves this check green. The round trip ends back at the
      // phone, where a head that never re-measured still holds the right figures — and the
      // case the reopen protects is a crossing that STAYS at the new width, where the two
      // rest heights on this fixture are 302 and ~300 and no assertion can separate them.
      // The reopen is defensive and, on the sets available here, unproven by any check in
      // this repository. A fixture whose title wraps at one width and not the other would
      // give it one.
      failures += !report(
        "a trip to desktop and back reserves the phone's own rest height",
        afterTrip !== null
          && Math.abs(afterTrip.head + afterTrip.spacer - restState.height) <= 1,
        afterTrip === null
          ? "the head or spacer was not on the page — the check measured nothing"
          : `head ${afterTrip.head} + spacer ${afterTrip.spacer} = `
            + `${afterTrip.head + afterTrip.spacer}px against a phone rest of`
            + ` ${restState.height}px, shy=${afterTrip.shy}`,
      );

      const crossing = await firstCrossingShift();
      failures += !report(
        "the grid does not move in the document on the first crossing",
        crossing.saw && crossing.shift !== null && crossing.shift <= 1,
        !crossing.saw
          ? "the head never reported itself collapsed — the check measured nothing"
          : `${crossing.shift}px on the frame it collapsed, ${crossing.frames} frames in`,
      );

      // The band the reserve leaves. While the bar is drawn the document still holds the
      // open head's height, so anywhere above `grid top − bar` the strip between the bar's
      // bottom edge and the grid is empty — and the head used to stay collapsed down to
      // y=40, which put up to a bar's worth of nothing under it on the way back up before
      // it snapped open. The thresholds are measured from those two figures now, so the
      // settled band is zero at every offset.
      let worstBand = { y: null, band: -1, shy: null };
      for (let y = 600; y >= 0; y -= 25) {
        await scrollTo(y);
        const band = await page.evaluate(() => {
          const head = document.querySelector("[data-set-head]");
          const spacer = document.querySelector("[data-set-head-reserve]");
          if (head === null || spacer === null) return null;
          return {
            band: Math.round(Math.max(
              0,
              spacer.getBoundingClientRect().bottom - head.getBoundingClientRect().bottom,
            )),
            shy: head.hasAttribute("data-set-head-collapsed"),
          };
        });
        if (band !== null && band.band > worstBand.band) worstBand = { y, ...band };
      }
      failures += !report(
        "no empty band under the collapsed bar anywhere on the way back up",
        worstBand.band >= 0 && worstBand.band <= 1,
        worstBand.band < 0
          ? "the head or the spacer was not on the page — the check measured nothing"
          : `worst ${worstBand.band}px at y=${worstBand.y}, shy=${worstBand.shy}`,
      );

      // The RESTORE is animated and the COLLAPSE snaps (H14). A swap of two `display` states
      // is instant by construction, which is what read as the head snapping open; the
      // heights below are sampled every frame across the change, so a head that jumps
      // reports two of them and one that moves reports a run. The collapse is the other
      // way round on purpose: the head turns sticky in the commit that draws the bar, so a
      // step from the open height pinned a full-height head over the grid and shrank it
      // there — Hugh's "the collapse jumps to full height first", read as 302, 81, 79 … 75
      // with `top 0` on every frame. It now reports exactly two heights, open then bar.
      const heightsAcross = async (from, to) => {
        await scrollTo(from);
        return page.evaluate((target) => new Promise((resolve) => {
          const head = document.querySelector("[data-set-head]");
          if (head === null) return resolve(null);
          // The height BEFORE the scroll is recorded first, so the count does not depend on
          // whether React commits before or after the first frame: a snap is exactly
          // [open, bar] either way.
          const seen = [Math.round(head.getBoundingClientRect().height)];
          window.scrollTo(0, target);
          const t0 = performance.now();
          const tick = () => {
            const h = Math.round(head.getBoundingClientRect().height);
            if (seen[seen.length - 1] !== h) seen.push(h);
            if (performance.now() - t0 > 500) return resolve(seen);
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }), to);
      };
      const collapsing = await heightsAcross(0, 900);
      const restoring = await heightsAcross(900, 0);
      failures += !report(
        "the head snaps to the bar and animates back open",
        Array.isArray(collapsing) && collapsing.length === 2
          && Array.isArray(restoring) && restoring.length >= 4,
        collapsing === null || restoring === null
          ? "the head was not on the page — the check measured nothing"
          : `${collapsing.length} heights collapsing (${collapsing[0]}→`
            + `${collapsing[collapsing.length - 1]}px), ${restoring.length} restoring`
            + ` (${restoring[0]}→${restoring[restoring.length - 1]}px)`,
      );

      // The crossing must not move the reader. Scroll anchoring ignores sticky boxes, so
      // without the head's container opting out it sees the reserve grow by the head's own
      // shrink, compensates for a change that never happened, and an 80px step lands 293px
      // down — most of a phone screen, at the exact moment the reader is reading. Stepped
      // like a wheel rather than jumped, because that is the gesture it ruined.
      await scrollTo(0);
      const steps = await page.evaluate(() => new Promise((resolve) => {
        const head = document.querySelector("[data-set-head]");
        if (head === null) return resolve(null);
        const seen = [];
        let last = 0;
        let n = 0;
        const step = () => {
          window.scrollBy(0, 80);
          setTimeout(() => {
            const y = Math.round(window.scrollY);
            seen.push({ moved: y - last, shy: head.hasAttribute("data-set-head-collapsed") });
            last = y;
            if (++n >= 10) return resolve(seen);
            step();
          }, 180);
        };
        step();
      }));
      const collapsingStep = steps === null
        ? null
        : steps.find((row, i) => i > 0 && row.shy && !steps[i - 1].shy);
      failures += !report(
        "an 80px step across the collapse moves the reader 80px",
        steps !== null && collapsingStep !== undefined && collapsingStep !== null
          && Math.abs(collapsingStep.moved - 80) <= 8,
        steps === null
          ? "the head was not on the page — the check measured nothing"
          : collapsingStep === undefined || collapsingStep === null
            ? "no step crossed the threshold — the check measured nothing"
            : `${collapsingStep.moved}px on the step that collapsed it`,
      );

      // A REVERSAL mid-step. The reader collapses the head and changes their mind inside the
      // 180ms, which cancels a run and starts its opposite — and the second run has to begin
      // from the two heights on screen rather than from the steady-state pair the cancel
      // leaves behind, or `head + spacer` is discontinuous on its first frame and the
      // document jumps by the difference.
      await scrollTo(0);
      const reversal = await page.evaluate(() => new Promise((resolve) => {
        const grid = document.querySelector("[data-set-grid]");
        const head = document.querySelector("[data-set-head]");
        if (grid === null || head === null) return resolve(null);
        const docTop = () => Math.round(grid.getBoundingClientRect().top + window.scrollY);
        const before = docTop();
        let worst = 0;
        const watch = () => {
          worst = Math.max(worst, Math.abs(docTop() - before));
        };
        window.scrollTo(0, 900);
        // Inside the step, not after it: 60ms of a 180ms transition.
        setTimeout(() => {
          window.scrollTo(0, 0);
          let frames = 0;
          const tick = () => {
            watch();
            if (++frames > 40) {
              return resolve({ shift: worst, shy: head.hasAttribute("data-set-head-collapsed") });
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, 60);
      }));
      // A pixel, not a bound with a story. It was 6px while the animation pinned its inline
      // height to the START — `fill: "none"` then dropped each box back there for the frame
      // between the step finishing and the handler clearing it — and the fix for that is
      // what brought this to 1. Without the in-flight pair being carried at all it reads
      // clean here and snaps the head through its whole 213px instead, which is why this
      // check is paired with the animation one above rather than standing alone.
      failures += !report(
        "reversing mid-step does not move the grid in the document",
        reversal !== null && reversal.shift <= 2,
        reversal === null
          ? "the head or the grid was not on the page — the check measured nothing"
          : `${reversal.shift}px at its worst across the reversal, ending shy=${reversal.shy}`,
      );

      await scrollTo(20);
      const restored = await headNow();
      failures += !report(
        "and it comes back",
        restored !== null && !restored.shy,
        restored === null ? "the head could not be measured" : `shy=${restored.shy} ${restored.height}px`,
      );
    }
    await scrollTo(0);

    // Addendum 2: the desktop head takes the collapse too, and every ruling in that round
    // is a fact about laid-out geometry. JSDOM computes no styles, so the unit tests can
    // say which threshold fires and that the field's node is the same one either side —
    // they cannot say the collapsed head is ONE row, that it is 56px, or that the prefix
    // did not win the shrink and leave the set's name at zero.
    //
    // 768 is in the list for the last of those. It is the narrowest width at which the rack
    // is inline (`useIsDesktop` is `min-width: 768px`), and the prefix is a member the
    // handoff's row arithmetic never carried — so it is the width where an added item
    // either fits or wraps the row the whole ruling depends on.
    for (const width of [1440, 1180, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
      await waitForCells(page);
      await scrollTo(0);

      const restHead = await headNow();
      const tracksOpen = await tracksNow();
      // NO BAND WITH NOTHING IN IT. The open head leaves at the grid's own top and the bar
      // has to take over there — with a constant band on top of the reopen point, the
      // desktop collapse sat 63px below that, so on every collapse after the first of a
      // visit the reader crossed a strip with no head at all and then the bar snapped in.
      // Swept rather than sampled: 8px steps across the whole crossing, asserting that at
      // every offset either the open head is still on screen or the bar is.
      //
      // WHAT THIS CANNOT FAIL ON, stated because it looks like it should: restoring the
      // additive band leaves it green. The sweep re-enters from y=0, so the collapse it
      // watches is the FIRST of that visit — and the first has no bar to measure, so it runs
      // on the grid's own top under either rule. The arithmetic that differs governs the
      // second collapse onward, which is pinned in the unit suite instead ("collapses where
      // the open head leaves…", whose last case is exactly that). What this earns is the
      // PIN: a head sticky while open is on screen at every offset for the wrong reason, and
      // the sibling check above separates those two.
      await scrollTo(0);
      const covered = await page.evaluate(async () => {
        const head = document.querySelector("[data-set-head]");
        const grid = document.querySelector("[data-set-grid]");
        if (head === null || grid === null) return null;
        const top = Math.round(grid.getBoundingClientRect().top + window.scrollY);
        const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        let worst = null;
        for (let y = Math.max(0, top - 160); y <= top + 200; y += 8) {
          window.scrollTo(0, y);
          await frame();
          const r = head.getBoundingClientRect();
          // On screen at all: any part of the head's box inside the viewport.
          const onScreen = r.bottom > 0 && r.top < window.innerHeight;
          if (!onScreen && worst === null) worst = { y, top: Math.round(r.top) };
        }
        return { gridTop: top, worst };
      });
      failures += !report(
        `the bar takes over where the open head leaves at ${width}`,
        covered !== null && covered.worst === null,
        covered === null
          ? "the head or the grid was not on the page — the check measured nothing"
          : covered.worst === null
            ? `covered at every offset between them (grid top ${covered.gridTop})`
            : `no head on screen at y=${covered.worst.y}, its top ${covered.worst.top}px`
              + ` (grid top ${covered.gridTop})`,
      );

      await scrollTo(900);
      const shyHead = await headNow();
      const tracksShy = await tracksNow();

      failures += !report(
        `the desktop head collapses at ${width}`,
        shyHead !== null && shyHead.shy,
        shyHead === null
          ? "the head was not on the page — the check measured nothing"
          : `shy=${shyHead.shy} at ${shyHead.height}px, rest ${restHead?.height}px`,
      );

      // 56px = `pt-[10px]` + a 34px row + `pb-[12px]`. Asserted by VALUE rather than as
      // "shorter than the rest", because a head that hid the wrong members would also be
      // shorter — 78px with the result line kept, which the round rejects as "not a
      // collapse".
      failures += !report(
        `the collapsed desktop head is 56px at ${width}`,
        shyHead !== null && Math.abs(shyHead.height - 56) <= 3,
        shyHead === null ? "no head" : `${shyHead.height}px`,
      );

      // The phone's bar must not be the thing that is drawn here. It carries a `Filters`
      // sheet trigger that has no desktop counterpart and a button standing in for a field
      // that never moved.
      failures += !report(
        `no phone bar is drawn at ${width}`,
        shyHead !== null && shyHead.bar === null,
        `bar=${shyHead === null ? "no head" : shyHead.bar}`,
      );

      // ONE row, which is the whole of call 1: the prefix is IN the rack's own row rather
      // than above it. What that can and cannot fail on is worth being honest about — the
      // row is `flex-nowrap items-center`, so two items inside it share a vertical centre by
      // construction and the midpoint clause alone would pass on any build that draws both.
      // It earns its place against a prefix taken OUT of the row (absolutely positioned, or
      // rendered as the head's own block above it), which is the shape the phone bar has and
      // the one a careless port would reach for. The ORDER clause beside it is what says the
      // prefix leads: a build that drew it after the controls would satisfy every other
      // reading here. The two-rows-instead-of-one case is caught by the height check above,
      // which is why this one does not try to.
      const row = await page.evaluate(() => {
        const prefix = document.querySelector("[data-set-head-prefix]");
        const field = document.querySelector("[data-set-search-slot]");
        const name = prefix === null ? null : prefix.querySelector("h1");
        if (prefix === null || field === null || name === null) return null;
        const p = prefix.getBoundingClientRect();
        const f = field.getBoundingClientRect();
        return {
          prefixMid: Math.round(p.top + p.height / 2),
          fieldMid: Math.round(f.top + f.height / 2),
          // Both edges, so the reading is "the prefix leads the row" rather than "two boxes
          // exist somewhere".
          prefixRight: Math.round(p.right),
          fieldLeft: Math.round(f.left),
          sameParent: prefix.parentElement === field.parentElement,
          nameWidth: Math.round(name.getBoundingClientRect().width),
          fieldWidth: Math.round(f.width),
          // What the row's width went to, so a failing reading names the member that took it.
          members: [...prefix.parentElement.children]
            .filter((c) => c.getClientRects().length > 0)
            .map((c) => `${(c.getAttribute("aria-label") ?? c.textContent ?? "").trim().slice(0, 14)}:${Math.round(c.getBoundingClientRect().width)}`)
            .join(" "),
        };
      });
      failures += !report(
        `the prefix leads the rack's own row at ${width}`,
        row !== null && row.sameParent && Math.abs(row.prefixMid - row.fieldMid) <= 2
          && row.prefixRight <= row.fieldLeft,
        row === null
          ? "the prefix or the field was not on the page — the check measured nothing"
          : `same row=${row.sameParent}, prefix mid ${row.prefixMid} right ${row.prefixRight},`
            + ` field mid ${row.fieldMid} left ${row.fieldLeft}`,
      );

      // The prefix is the shrinking member, so the failure mode is a set name at zero —
      // which every other check here passes over, since a row of the right height with the
      // right members is exactly what it would still be.
      failures += !report(
        `the set name survives the shrink at ${width}`,
        row !== null && row.nameWidth >= 40 && row.fieldWidth >= 132,
        row === null ? "no prefix" : `name ${row.nameWidth}px, field ${row.fieldWidth}px; row ${row.members}`,
      );

      // §29: two controls with one accessible name is the defect a redrawn bar would
      // reintroduce. Counted in the document, at the offset where a twin would be mounted.
      const fields = await onPage(page, '[data-set-search-slot] input').count();
      failures += !report(
        `exactly one search field at ${width} while collapsed`,
        fields === 1,
        `${fields} fields`,
      );

      // The grid must not reflow at any scroll position — the bar overlays. A track count
      // that moved would mean the reserve is not holding the head's own height.
      failures += !report(
        `the grid keeps its track count across the collapse at ${width}`,
        tracksOpen !== null && tracksOpen === tracksShy,
        `${tracksOpen} tracks open, ${tracksShy} collapsed`,
      );

      // The OPEN head leaves with the cards here too. This is the phone's own #623 defect
      // arriving at a second width: `md:sticky` pinned ~300px of header over the grid for
      // the whole band below the threshold, so the reader scrolled most of a screen of
      // cards under a header that never moved and then it snapped. Measured while the head
      // is still open and BELOW its threshold, which is the only band where the two
      // behaviours differ — above it nothing has scrolled, past it the bar is what is
      // pinned. The open state is asserted alongside the offset, because a build that
      // collapsed early would read a top of 0 here and pass.
      await scrollTo(0);
      const restTop = await headNow();
      await scrollTo(150);
      const partwayDesktop = await headNow();
      failures += !report(
        `the open head scrolls away rather than staying pinned at ${width}`,
        restTop !== null && partwayDesktop !== null && !partwayDesktop.shy
          && partwayDesktop.top <= restTop.top - 140,
        restTop === null || partwayDesktop === null
          ? "the head was not on the page — the check measured nothing"
          : `top ${partwayDesktop.top}px at y=150 against ${restTop.top}px at rest,`
            + ` shy=${partwayDesktop.shy}`,
      );
      await scrollTo(900);
    }

    // The crossing, and the step that settles it, in a REAL engine. Neither width's head may
    // animate across a breakpoint change — the two are different designs rather than two
    // heights of one — and the settle is the half no unit test here can reach: React
    // schedules the passive effect that re-decides for the new width, jsdom happens to run
    // it in the order that works, and the ordering is the whole question. `getAnimations()`
    // is the only witness.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    await scrollTo(900);
    const shyBefore = await headNow();
    await page.evaluate(() => {
      const head = document.querySelector("[data-set-head]");
      if (head !== null) head.getAnimations().forEach((a) => a.cancel());
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    // Two frames for the crossing's own commit, then the settle's.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const crossingAnims = await page.evaluate(() => {
      const head = document.querySelector("[data-set-head]");
      if (head === null) return null;
      const runs = head.getAnimations();
      return runs.length === 0 ? 0 : runs.map((a) => `${a.playState}:${
        (a.effect && a.effect.getKeyframes && a.effect.getKeyframes().map((k) => k.height).join(">")) || "?"
      }`).join(", ");
    });
    failures += !report(
      "a breakpoint crossing and its settle draw no animation on the head",
      shyBefore !== null && shyBefore.shy && crossingAnims === 0,
      shyBefore === null || !shyBefore.shy
        ? "the head was not collapsed before the crossing — the check measured nothing"
        : `${crossingAnims} animation(s) on the head after the crossing`,
    );

    // Addendum 2 §3 asks for a gate holding the head open while the rarity panel is open.
    // There is none, and this is why: the desktop popover dismisses itself on scroll, so
    // the panel is already closed by the time the head decides anything. The gate was
    // built, run here, and reported FAIL with `shy=true` — not because the head misbehaved
    // but because there was no open panel left for it to be held by. What is asserted now
    // is the property the gate was standing in for: no scroll can move the anchor out from
    // under a panel that is still open.
    await page.setViewportSize({ width: 1180, height: 900 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    await scrollTo(0);
    const rarityTrigger = onPage(page, '[data-set-rarity] button').first();
    if (await rarityTrigger.count() === 0) {
      failures += !report("the rarity trigger is on the page", false, "no trigger found");
    } else {
      await rarityTrigger.click();
      await page.waitForTimeout(200);
      const openBefore = await onPage(page, '[role="dialog"]').count();
      await scrollTo(900);
      const openAfter = await onPage(page, '[role="dialog"]').count();
      const underPanel = await headNow();
      failures += !report(
        "the rarity panel dismisses itself on the scroll that collapses the head",
        openBefore === 1 && openAfter === 0 && underPanel !== null && underPanel.shy,
        `panel ${openBefore} before, ${openAfter} after, shy=${underPanel?.shy}`,
      );
    }

    // The sheet's stacking context. `position: sticky` with a `z-index` creates one, so
    // while the sheet was a descendant of the head its `z-50` was confined to the head's
    // `z-[2]` and the shell's `fixed z-40` tab bar painted over its footer. A z-index is a
    // number in a class list and proves nothing; the only test is asking the engine what is
    // actually on top at a point inside the sheet.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    // Scoped to the page: the shell's account menu is also a
    // `button[aria-haspopup="dialog"]` at this width and comes first in
    // document order, so an unscoped query measured it instead — which is what
    // this check reported as a painted-over footer. `openSheet` also waits for
    // `anim-sheet-up` to finish, because a sheet measured mid-transform reads
    // as overflowing the fold.
    const sheet = await openSheet(page);
    if (sheet === null) {
      failures += !report("the filter sheet can be opened", false, "no trigger on the page");
    } else {
      // Evaluated ON the sheet locator rather than re-finding a dialog in the
      // document: an unscoped `querySelector` here would pick the shell's
      // account sheet again and hand back its geometry, which is the exact
      // substitution `openSheet` was added to stop.
      const hit = await sheet.evaluate((d) => {
        const r = d.getBoundingClientRect();
        // 20px above the sheet's bottom edge, which is where the tab bar overlaps.
        // CLAMPED into the viewport. The panel overflows the fold here, so a point 20px
        // above its own bottom edge is off-screen and Chromium returns null — which the
        // first version of this reported as an `ok` with `hit: nothing`, a measurement that
        // never happened dressed as a pass.
        const x = Math.round(r.left + r.width / 2);
        const yWanted = Math.round(r.bottom - 20);
        const y = Math.min(yWanted, window.innerHeight - 2);
        const inSheet = y >= r.top && y <= r.bottom;
        const el = inSheet ? document.elementFromPoint(x, y) : null;
        return {
          sampled: inSheet,
          clamped: y !== yWanted,
          inside: el !== null && d.contains(el),
          at: `${x},${y}`,
          rect: `${Math.round(r.top)}-${Math.round(r.bottom)}`,
          vh: window.innerHeight,
          hit: el === null ? "nothing" : `${el.tagName}.${String(el.className).slice(0, 32)}`,
          insideHead: document.querySelector("[data-set-head]")?.contains(d) ?? false,
        };
      });
      if (hit === null) {
        failures += !report("the sheet's footer can be hit-tested", false, "no geometry");
      } else {
        // REPORTED, not asserted. The sheet is a descendant of a `sticky z-[2]` head, which
        // is a stacking context, so its `z-50` cannot beat the shell's `fixed z-40` tab bar
        // — true on `main` today and not introduced here. The line is in the probe so the
        // fact is measured rather than remembered, and so the follow-up that portals the
        // sheet has a check waiting for it.
        if (!hit.sampled) {
          console.log(
            "  n/a  what is on top at the sheet's footer — NOT SAMPLED: no point inside"
            + ` both the sheet (${hit.rect}) and the viewport (${hit.vh}px).`,
          );
        } else {
          report(
            "what is on top at the sheet's footer",
            true,
            (hit.inside
              ? `the sheet at ${hit.at}`
              : `${hit.hit} at ${hit.at} — known, pre-existing: the sheet is inside a sticky`
                + " stacking context")
            + (hit.clamped ? ", sampled at the fold because the panel overflows it" : ""),
          );
        }
        // Reported, not asserted — but the baseline it used to carry is gone. The
        // `658-1154 against 844` this printed was the ACCOUNT MENU, measured mid-animation
        // by the selector this change fixes, and PR #572 withdrew it from the tracker and
        // the readiness doc. Measured properly the sheet sits inside the fold. The figure
        // stays reported rather than asserted because nobody has run this since the
        // instrument was corrected; the first run that does should turn it into an
        // assertion, with `hit.clamped` as the failure.
        report(
          "the sheet panel against the fold",
          true,
          `${hit.rect} against ${hit.vh}px${hit.clamped ? " — CLAMPED, so it overflows" : ""}`,
        );
      }
      await page.keyboard.press("Escape");
    }

    // The search field (§29). It is the only child of the control row that shrinks, and the
    // row must not wrap at either width — a control landing on its own line inside a sticky
    // head is the defect the three-row rule exists to prevent, arriving by another route.
    const rowAt = async (width, query = "") => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE}/collection/sets/${code}${query}`, { waitUntil: "networkidle" });
      // The ROW, not the cells — the same correction `rackAt` already carries, missed here.
      // `?c=W&r=rare` can legitimately match nothing in a valid set, and this probe measures
      // the control row, which is on the page either way. Waiting for a cell would fail a
      // layout check on a fixture that simply has no white rares.
      await page.waitForSelector("[data-set-search-slot]", { timeout: 20_000 });
      return page.evaluate(() => {
        const field = document.querySelector('input[aria-label^="Search cards in"]');
        if (!field) return null;
        // The WRAPPER carries the 132px floor, not the input: `SearchField` spends width on
        // its leading glyph, its padding and the 22px trailing clear, so the input sits well
        // under the wrapper and measuring it would report a breach that is not one — or miss
        // a real one, depending on which way the slack ran.
        const slot = field.closest("[data-set-search-slot]");
        const row = field.closest("[class*='flex-nowrap']");
        if (!row) return null;
        const kids = [...row.children].filter((c) => c.getClientRects().length > 0);
        // A wrap is the ROW growing past its tallest child. Comparing each child's `top`
        // would report three lines for one: `items-center` centres children of different
        // heights, so their top edges legitimately differ on a single line.
        const tallest = Math.max(...kids.map((c) => c.getBoundingClientRect().height));
        const rowHeight = row.getBoundingClientRect().height;
        return {
          wrapped: rowHeight > tallest + 2,
          rowHeight: Math.round(rowHeight),
          tallest: Math.round(tallest),
          fieldWidth: Math.round((slot ?? field).getBoundingClientRect().width),
          inputWidth: Math.round(field.getBoundingClientRect().width),
          fontSize: parseFloat(getComputedStyle(field).fontSize),
          // The field's OWN box, not the row's. The row measures 44 because
          // `MissingOnlyToggle` is 44; that says nothing about whether this control is a
          // 44px target, and for eighteen rounds it was 38.
          // `SearchField` renders container > (glyph, input, trailing), so the parent IS
          // the padded box. Guarded: if that ever stops being true the parent becomes the
          // row or the slot and the number would silently be someone else's.
          fieldHeight:
            field.parentElement && field.parentElement !== row && field.parentElement !== slot
              ? Math.round(field.parentElement.getBoundingClientRect().height)
              : null,
          fields: document.querySelectorAll('input[aria-label^="Search cards in"]').length,
        };
      });
    };
    // Counted with the phone sheet OPEN, which is the only state that can prove it: a
    // duplicate field mounted in the sheet is absent from the document while the sheet is
    // closed, so counting there proves nothing about the invariant it is named for.
    const fieldsWithSheetOpen = async () => {
      // Same scoping as above: unscoped, this opened the account menu and
      // counted the fields behind it.
      if ((await openSheet(page)) === null) return null;
      return page.evaluate(
        () => document.querySelectorAll('input[aria-label^="Search cards in"]').length,
      );
    };
    // Both widths, and at 390 with a filter on as well: the `Filters` badge takes width from
    // the only child that may shrink, which is exactly when a floor earns its keep.
    for (const [width, floor, query] of [[1280, 132, ""], [390, 132, ""], [390, 132, "?c=W&r=rare"]]) {
      const row = await rowAt(width, query);
      if (row === null) {
        failures += !report(`the search field is on the page at ${width}`, false, "not found");
        continue;
      }
      failures += !report(
        `the control row does not wrap at ${width}${query}`,
        !row.wrapped,
        `row ${row.rowHeight}px against a tallest child of ${row.tallest}px`,
      );
      failures += !report(
        `the field's slot clears its ${floor}px minimum at ${width}${query}`,
        row.fieldWidth >= floor,
        `slot ${row.fieldWidth}px, input ${row.inputWidth}px`,
      );
      failures += !report(
        `exactly one field carries that accessible name at ${width}${query}`,
        row.fields === 1,
        `${row.fields} fields`,
      );
      // iOS Safari zooms the page when a text input under 16px takes focus, which would
      // throw away the 390px arithmetic this row is built on.
      failures += !report(
        `the field clears the 16px iOS zoom floor at ${width}${query}`,
        width >= 768 || row.fontSize >= 16,
        `${row.fontSize}px`,
      );
      // 44px is the phone target, and the field has to reach it on its own box. Desktop is
      // deliberately compact and exempt.
      failures += !report(
        `the field is a 44px target at ${width}${query}`,
        width >= 768 || (row.fieldHeight !== null && row.fieldHeight >= 44),
        row.fieldHeight === null
          ? "could not identify the field's padded box — the check measured nothing"
          : `field ${row.fieldHeight}px, row ${row.rowHeight}px`,
      );
    }

    // And with the sheet open, where a duplicate would actually be in the document.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    const openSheetFields = await fieldsWithSheetOpen();
    failures += !report(
      "still exactly one field with the phone sheet open",
      openSheetFields === 1,
      openSheetFields === null ? "no Filters trigger found" : `${openSheetFields} fields`,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/collection/sets/${code}`, { waitUntil: "networkidle" });
    await waitForCells(page);
    const phoneControls = await page.evaluate(() => {
      const visible = (el) => el.getClientRects().length > 0;
      const byName = (re) => [...document.querySelectorAll("button")]
        .filter((b) => re.test(b.getAttribute("aria-label") || b.textContent || ""))
        .filter(visible);
      const pips = [...document.querySelectorAll('[role="switch"]')].filter(visible);
      return {
        filtersTrigger: byName(/^Filters$/).length,
        barePips: pips.length,
        // The Filters trigger counts too: on a complete set the missing-only button is
        // intentionally absent, and `Math.min(99, ...[])` then returned the sentinel and
        // passed the 44px check having measured nothing at all.
        targets: [...byName(/Showing (only|every)/), ...byName(/^Filters/)]
          .map((b) => Math.round(b.getBoundingClientRect().height)),
      };
    });
    failures += !report(
      "the phone puts the rack behind Filters rather than mounting the desktop pips",
      phoneControls.filtersTrigger === 1 && phoneControls.barePips === 0,
      `Filters triggers ${phoneControls.filtersTrigger}, exposed pips ${phoneControls.barePips}`,
    );
    failures += !report(
      "the phone's visible filter controls clear the 44px target",
      phoneControls.targets.length > 0 && Math.min(...phoneControls.targets) >= 44,
      phoneControls.targets.length === 0
        ? "no phone filter control found to measure — the check would have passed empty"
        : `${phoneControls.targets.length} measured, smallest ${Math.min(...phoneControls.targets)}px`,
    );

    console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  } finally {
    await browser.close();
  }
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
