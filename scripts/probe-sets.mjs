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

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SET = process.env.PROBE_SET ?? null;
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
    // missing-only from what it applies, and its control with it, so `m=1` draws no chip
    // there by design. Asserting three against the first set in the index would report a
    // failure for correct behaviour on a fixture that happens to be finished.
    const three = await rackAt("?c=W&r=rare&m=1");
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

    // The head's height at PHONE too, which is where it was actually moving: the
    // missing-only result line wraps in 358px, so toggling that filter grew row 3 and the
    // desktop-only check above never saw it.
    await page.setViewportSize({ width: 390, height: 844 });
    const phoneRest = await rackAt("");
    const phoneMissing2 = await rackAt("?m=1");
    const phoneThree = await rackAt("?c=W&r=rare&m=1");
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
      // `?m=1` on a COMPLETE set renders identically to rest — the page drops missing-only
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
          "every set in this collection is complete — `?m=1` is never applied, so the "
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
      const shown = (node) => node !== null && getComputedStyle(node).display !== "none";
      return {
        total: Math.round(el.getBoundingClientRect().height),
        title: h1 ? Math.round(h1.getBoundingClientRect().height) : null,
        // Found by its own marker, and reported as absent rather than as false: the first
        // version of this guard read `h1.parentElement.textContent`, which is the whole
        // identity block — ratio, provenance and note included — so it never ended in the
        // year and reported clean no matter where the code was put.
        shortCodePresent: shortCode !== null,
        codeInsideTitle: shortCode !== null && h1 !== null && h1.contains(shortCode),
        // The two lines moves 1 and 2 remove. Structural, and true on any fixture — which
        // an absolute height bound is not: a set with a short title or no cost strip is
        // already under 388px with none of this PR applied.
        longProvenanceShown: shown(document.querySelector("[data-set-provenance-long]")),
        noteShown: shown(document.querySelector("[data-set-ratio-note]")),
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
        "the phone's provenance is on the page and off the title line",
        phoneHead.shortCodePresent && !phoneHead.codeInsideTitle,
        !phoneHead.shortCodePresent
          ? "no [data-set-provenance-short] — the guard measured nothing"
          : phoneHead.codeInsideTitle
            ? `the set code is inside the h1, title ${phoneHead.title}px`
            : `title ${phoneHead.title}px, code on the ratio line`,
      );
      // Moves 1 and 2, asserted where they actually happen rather than through a height.
      failures += !report(
        "the long provenance is not on the phone",
        !phoneHead.longProvenanceShown,
        phoneHead.longProvenanceShown ? "still displayed at 390" : "display:none at 390",
      );
      failures += !report(
        "the scope note is not on the phone for an indexed set",
        !phoneHead.noteShown,
        phoneHead.noteShown ? "still displayed at 390" : "display:none at 390",
      );
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
      const trigger = await page.$('button[aria-expanded][aria-haspopup="dialog"]');
      if (!trigger) return null;
      await trigger.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });
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
