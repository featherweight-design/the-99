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
    const code = SET ?? await page.evaluate(() => {
      const link = document.querySelector('a[href^="/collection/sets/"]');
      return link ? link.getAttribute('href').split('/').pop() : null;
    });
    if (!code) throw new Error("No set to probe: the index listed none and PROBE_SET was unset.");

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
        const head = chipRow.closest("[class*='sticky']") ?? chipRow.parentElement;
        return {
          head: Math.round(head.getBoundingClientRect().height),
          chips: chipRow.querySelectorAll("span > button").length,
          pipOpacities: [...document.querySelectorAll('[role="switch"]')]
            .filter((el) => el.getClientRects().length > 0)
            .map((el) => getComputedStyle(el).opacity),
          inFlowPanel: (() => {
            const panel = document.querySelector('[role="dialog"]');
            return panel ? getComputedStyle(panel).position : null;
          })(),
        };
      });
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
      failures += !report(
        "the head's height does not move with the filter state",
        rest.head === one.head && one.head === three.head,
        `rest ${rest.head}px, one ${one.head}px, three ${three.head}px`,
      );
      failures += !report(
        "no unlit pip is dimmed — the shipped control's 1.38:1 is what this replaces",
        rest.pipOpacities.length >= 5 && rest.pipOpacities.every((o) => Number(o) === 1),
        `opacities ${rest.pipOpacities.join(", ") || "(none)"}`,
      );
      failures += !report(
        setIsComplete
          ? "two filters on draw two chips (complete set: missing-only is not applied)"
          : "three filters on draw three chips",
        three.chips >= (setIsComplete ? 2 : 3),
        `${three.chips} chip removals`,
      );
    }

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
        smallestTarget: Math.min(99, ...byName(/Showing (only|every)/)
          .map((b) => Math.round(b.getBoundingClientRect().height))),
      };
    });
    failures += !report(
      "the phone puts the rack behind Filters rather than mounting the desktop pips",
      phoneControls.filtersTrigger === 1 && phoneControls.barePips === 0,
      `Filters triggers ${phoneControls.filtersTrigger}, exposed pips ${phoneControls.barePips}`,
    );
    failures += !report(
      "the phone's visible filter control clears the 44px target",
      phoneControls.smallestTarget >= 44,
      `smallest ${phoneControls.smallestTarget}px`,
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
