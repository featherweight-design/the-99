// probe:help-me-choose-screens — the Help me choose results at 1300x900 and 390x844, reading
// what jsdom cannot lay out.
//
//   1. The first page draws at most twelve candidates (best fits included), and draws some: a run over an empty page
//      measures nothing and FAILS.
//   2. Every row's trial settles: each ownership line leaves `pending` for `ready` or
//      `failed` within a minute. A row left pending is a batch that never answered.
//   3. No `·` is the first or the last box on its line (the commander row's rule, read by
//      geometry). Each segment leads with its own separator inside a clipped gutter, so the one
//      that would start a line is clipped away. It was once left at a line's end, then at a line's
//      head in every best-fit tile.
//   4. No row overflows its own box or the page.
//   5. Nothing moves (the STATES invariant): no running animation once the page settles.
//   6. Find commanders, Change answers and Start over, each pressed.
//
// Needs a server with HELP_ME_CHOOSE_ENABLED=true. It makes no writes. Point it at local-dev.
//
//   E2E_AUDIT_USER_EMAIL=... PROBE_BASE=http://localhost:3210 node scripts/probe-help-me-choose-screens.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";

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
}

// Counted here rather than at each call site, for `probe-commander-availability`'s
// reason: a check that forgot to count printed ` FAIL ` and then `All checks
// passed.` over the top, with the exit code agreeing with the wrong half.
let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

// The longest commander-legal, non-basic single-faced name on the catalog when this was written.
const LONG_CARD = "Okina, Temple to the Grandfathers";

const ROUTES = [
  ["theme", "/decks/new/choose?w=dinosaurs+that+stomp%2C+lots+of+little+tokens+under+%24200&v=submit"],
  ["owned", "/decks/new/choose?c=g&v=results"],
];

const READ = (scope) => {
  const root = document.querySelector(scope) ?? document.body;
  const rows = [...root.querySelectorAll("[data-testid='result-row']")];
  const lines = [...root.querySelectorAll("[data-testid='ownership-line']")];
  const main = root.getBoundingClientRect();
  // A separator is either wholly inside the line's box, with a segment before it on its own line,
  // or wholly in the clipped gutter left of it. Never the first box drawn on a line, never partly
  // cut, and never the last (each one leads an unbreakable segment, checked by what follows it).
  const dangling = [];
  let seps = 0;
  for (const line of lines) {
    // Hit-testing needs the line on screen. A clipped separator is not hit, so the browser, not the
    // geometry, says whether it is painted: a gutter left unclipped still paints, outside the box.
    line.scrollIntoView({ block: "center" });
    const box = line.getBoundingClientRect();
    const segs = [...line.querySelectorAll("[data-sep]")].map((el) => ({ el, sep: el.getBoundingClientRect(), seg: el.parentElement.getBoundingClientRect() }));
    for (const { el, sep, seg } of segs) {
      seps += 1;
      // Every layer at the point, not the top one: the row's own link is stretched over it.
      const painted = document.elementsFromPoint(sep.left + sep.width / 2, sep.top + sep.height / 2).includes(el);
      if (!painted) {
        // Clipped away, which is right only for the segment that starts its line.
        if (sep.right > box.left + 0.5) dangling.push(`hidden inside the line at x ${sep.left.toFixed(0)}`);
        continue;
      }
      if (sep.left < box.left - 0.5) { dangling.push(`painted outside the line at x ${sep.left.toFixed(0)}`); continue; }
      const before = segs.some((o) => Math.abs(o.seg.top - sep.top) < 6 && o.seg.right <= sep.left + 1 && o.seg.right > box.left + 1);
      if (!before) dangling.push(`first on its line at x ${sep.left.toFixed(0)}`);
      // Its content may be a bare text node, so the segment's own box says whether anything follows.
      if (seg.right <= sep.right + 1 || seg.bottom - seg.top > (sep.bottom - sep.top) * 1.8) dangling.push("last on its line");
    }
  }
  const overflow = rows
    .map((r) => { const b = r.getBoundingClientRect(); return { over: r.scrollWidth - r.clientWidth, right: b.right - main.right }; })
    .filter((o) => o.over > 1 || o.right > 1);
  return {
    rows: rows.length,
    states: lines.map((l) => l.dataset.trial),
    dangling,
    seps,
    overflow,
    animations: document.getAnimations().filter((a) => a.playState === "running").length,
  };
};

async function run() {
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      await signIn(page);
      for (const [name, url] of ROUTES) {
        await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
        await page.locator(`${PAGE} [data-testid='result-row']`).first().waitFor({ state: "attached", timeout: 90_000 });
        const settled = await page
          .waitForFunction(
            (scope) => [...(document.querySelector(scope) ?? document).querySelectorAll("[data-testid='ownership-line']")]
              .every((l) => l.dataset.trial !== "pending"),
            PAGE,
            { timeout: 60_000, polling: 500 },
          )
          .then(() => true, () => false);
        await page.waitForTimeout(500);
        const r = await page.evaluate(READ, PAGE);
        const at = `${name} @ ${width}`;
        // The best fits are rows of the same page: twelve candidates in all, counted by ownership line.
        report(`${at}: the first page draws 1 to 12 candidates`, r.states.length > 0 && r.states.length <= 12, `${r.states.length} candidates, ${r.rows} under the best fits`);
        const tally = r.states.reduce((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {});
        report(`${at}: every trial settles`, settled && !r.states.includes("pending"), JSON.stringify(tally));
        report(`${at}: no separator starts or ends a line`, r.seps > 0 && r.dangling.length === 0, r.dangling.length ? r.dangling.slice(0, 3).join("; ") : `${r.seps} separators on ${r.states.length} lines`);
        report(`${at}: no row overflows`, r.overflow.length === 0, r.overflow.length ? JSON.stringify(r.overflow.slice(0, 3)) : "none");
        report(`${at}: nothing moves`, r.animations === 0, `${r.animations} running animation(s)`);
      }
      // 6. The three presses, as a player makes them (plan, PR 5 gates): Find commanders lands on
      //    the results with the words resolved, Change answers returns the form holding them, and
      //    Start over returns it blank. Pressed, never reached by address.
      {
        const at = `presses @ ${width}`;
        const findButton = () => page.locator(`${PAGE} button:visible`, { hasText: "Find commanders" }).first();
        // Idle first: typed before hydration, the box shows the words and the form's state holds
        // none, so the press submits a blank form. That is the probe racing React, not the app.
        await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
        await page.locator(`${PAGE} textarea`).fill("dinosaurs that stomp");
        await findButton().click();
        await page.locator(`${PAGE} [data-testid='order-line']`).waitFor({ timeout: 90_000 });
        const landed = new URL(page.url());
        report(`${at}: Find commanders lands on the results with the words resolved`,
          landed.searchParams.get("v") === "results" && (landed.searchParams.get("t") ?? "").includes("dinosaurs"),
          landed.search);
        await page.locator(`${PAGE} a:visible`, { hasText: "Change answers" }).first().click();
        await page.locator(`${PAGE} textarea`).waitFor({ timeout: 60_000 });
        const kept = await page.locator(`${PAGE} textarea`).inputValue();
        report(`${at}: Change answers returns the form holding the words`, kept === "dinosaurs that stomp", JSON.stringify(kept));
        await findButton().click();
        await page.locator(`${PAGE} [data-testid='order-line']`).waitFor({ timeout: 90_000 });
        await page.locator(`${PAGE} a:visible`, { hasText: "Start over" }).first().click();
        await page.waitForURL((u) => u.pathname === "/decks/new/choose" && u.search === "", { timeout: 60_000 });
        await page.locator(`${PAGE} textarea`).waitFor({ timeout: 60_000 });
        const blank = await page.locator(`${PAGE} textarea`).inputValue();
        report(`${at}: Start over returns the form blank`, blank === "", JSON.stringify(blank));
      }
      // 7. An answer chip is one line, whatever it names: a long card name truncates inside the chip
      //    rather than wrapping out of its fixed height or past the bar's edge.
      {
        // On the phone this reads at 320, the narrowest phone in use: at 390 no card on the catalog is
        // long enough to wrap a chip, and a check that cannot fail measures nothing.
        const chipWidth = width === 390 ? 320 : width;
        if (chipWidth !== width) await page.setViewportSize({ width: chipWidth, height: 844 });
        const at = `chips @ ${chipWidth}`;
        await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
        await page.locator(`${PAGE} textarea`).fill(`build around ${LONG_CARD} with dinosaurs and landfall`);
        await page.locator(`${PAGE} button:visible`, { hasText: "Find commanders" }).first().click();
        // The chips, not the order line: a card and two themes may leave none fitting, which has none.
        await page.locator(`${PAGE} [data-testid='answer-chip']`).first().waitFor({ timeout: 90_000 });
        const chips = await page.evaluate((scope) => {
          const root = document.querySelector(scope) ?? document.body;
          const bar = root.querySelector("[data-testid='answer-chip']")?.closest("section") ?? root;
          const edge = bar.getBoundingClientRect().right;
          return [...root.querySelectorAll("[data-testid='answer-chip']")].map((c) => {
            const b = c.getBoundingClientRect();
            return { text: c.textContent, h: Math.round(b.height), wraps: c.scrollHeight > c.clientHeight + 1, past: b.right - edge };
          });
        }, PAGE);
        const card = chips.find((c) => c.text.includes(LONG_CARD.slice(0, 12)));
        const bad = chips.filter((c) => c.h > 33 || c.wraps || c.past > 1);
        report(`${at}: every answer chip holds one line inside the bar, the long card's included`,
          card !== undefined && bad.length === 0,
          card ? (bad.length ? JSON.stringify(bad) : `${chips.length} chips, the card's ${card.h}px`) : "no card chip drawn");

        if (chipWidth !== width) await page.setViewportSize({ width, height: 844 });
      }
      // 8. The row's box (close-out gap 9): a 40x56 thumb at radius 5, identity pips 4px apart,
      //    and Show more across the whole row on a phone. Resolved styles, which a class cannot prove.
      {
        const at = `row box @ ${width}`;
        // The owned order: a full first page of twelve, so Show more is drawn.
        await page.goto(`${BASE}${ROUTES[1][1]}`, { waitUntil: "domcontentloaded" });
        await page.locator(`${PAGE} [data-testid='result-row']`).first().waitFor({ state: "attached", timeout: 90_000 });
        const box = await page.evaluate((scope) => {
          const root = document.querySelector(scope);
          const row = root.querySelector("[data-testid='result-row']");
          const thumb = row.querySelector("[data-commander-thumb]").getBoundingClientRect();
          const radius = getComputedStyle(row.querySelector("[data-commander-thumb]")).borderTopLeftRadius;
          // The drawn pips, whichever width's copy is showing, with at least two colors to space.
          const pips = [...root.querySelectorAll("[data-testid='result-row'] span[aria-hidden='true'].flex")]
            .filter((el) => el.offsetParent !== null && el.children.length > 1)
            .map((el) => getComputedStyle(el).columnGap);
          const more = [...root.querySelectorAll("button")].find((b) => /^Show \d+ more$/.test(b.textContent.trim()));
          const moreBox = more?.getBoundingClientRect();
          const moreRow = more?.parentElement.getBoundingClientRect();
          return {
            thumb: `${Math.round(thumb.width)}x${Math.round(thumb.height)}`,
            radius,
            pips: [...new Set(pips)],
            more: more ? { w: Math.round(moreBox.width), row: Math.round(moreRow.width) } : null,
          };
        }, PAGE);
        report(`${at}: the thumb is 40x56 at radius 5`, box.thumb === "40x56" && box.radius === "5px", JSON.stringify(box));
        report(`${at}: identity pips sit 4px apart`, box.pips.length === 1 && box.pips[0] === "4px", JSON.stringify(box.pips));
        report(`${at}: ${width === 390 ? "Show more takes the whole row" : "Show more keeps its own width"}`,
          box.more !== null && (width === 390 ? Math.abs(box.more.w - box.more.row) <= 1 : box.more.w < box.more.row / 2),
          JSON.stringify(box.more));
      }
      // 9. Nothing fits, and the way out is dropping five colors (close-out gap 1): the option's
      //    label gives way, never its count, and nothing leaves the option's box.
      // Read at 390 and again at 320, the narrowest phone in use, where the label is longest against its row.
      for (const dropWidth of width === 390 ? [390, 320] : []) {
        await page.setViewportSize({ width: dropWidth, height: 844 });
        const at = `five-color drop @ ${dropWidth}`;
        await page.goto(`${BASE}/decks/new/choose?c=w,u,b,r,g&m=exact&t=dinosaurs&k=1&v=results`, { waitUntil: "domcontentloaded" });
        await page.locator(`${PAGE} [data-testid='narrow-none'], ${PAGE} [data-testid='narrow-few']`).first().waitFor({ timeout: 90_000 });
        const opts = await page.evaluate((scope) => [...document.querySelectorAll(`${scope} [data-testid='narrow-option']`)].map((o) => {
          const [label, count] = [o.querySelector("span > span"), o.querySelector("span.font-mono")];
          const b = o.getBoundingClientRect();
          const c = count.getBoundingClientRect();
          // A label that does not fit must be cut by an ellipsis inside its own box; one that runs on
          // past it paints under the count, and its box alone would still read as inside.
          const over = label.scrollWidth > label.clientWidth + 0.5;
          return {
            label: label.textContent,
            count: count.textContent,
            over,
            countWhole: count.scrollWidth <= count.clientWidth + 0.5 && c.right <= b.right + 0.5,
            labelInside: label.getBoundingClientRect().right <= c.left + 0.5
              && (!over || (getComputedStyle(label).textOverflow === "ellipsis" && getComputedStyle(label).overflowX === "hidden")),
          };
        }), PAGE);
        const five = opts.find((o) => /White.*Green|Green.*White/.test(o.label));
        report(`${at}: the label gives way and the count stays whole`,
          five !== undefined && opts.every((o) => o.countWhole && o.labelInside),
          five ? JSON.stringify(opts) : `no five-color option among ${JSON.stringify(opts.map((o) => o.label))}`);
      }
      // 10. The searching screen (close-out gap 4). The route's loading screen draws only on a
      //     client navigation INTO the route from another one, which is the hand-off's way back:
      //     a document load flushes the page's own bar and skeleton at once, and the form's press
      //     stays inside the route. So it is read on *Back to results*: the route's own 5c (the
      //     results header and Finding commanders… over still rows) paints before the page, and
      //     never the shell's deckNew screen or an order sub named from a slug. Read by a
      //     MutationObserver, since the screen lasts only as long as the page's reads.
      {
        const at = `searching @ ${width}`;
        const watch = await context.newPage();
        await watch.addInitScript(() => {
          const seen = { loading: null, bar: null, deckNew: false, sub: false };
          window.__seen = seen;
          new MutationObserver(() => {
            const main = document.querySelector("main");
            if (!main) return;
            const loading = main.querySelector("[data-testid='choose-loading']");
            if (seen.loading === null && loading) seen.loading = performance.now();
            if (seen.bar === null && main.querySelector("#read-as-label")) seen.bar = performance.now();
            if (loading?.textContent.includes("Ordered by")) seen.sub = true;
            if (main.textContent.includes("Clearing a space")) seen.deckNew = true;
          }).observe(document, { childList: true, subtree: true, characterData: true });
        });
        // The hand-off is opened by ADDRESS, in a page that has never held the results: the
        // client router keeps a page it has shown, and pressing back into one it holds draws no
        // loading screen at all, which would measure the cache rather than the screen.
        const scout = await context.newPage();
        await scout.goto(`${BASE}/decks/new/choose?c=g&t=dinosaurs&v=results`, { waitUntil: "domcontentloaded" });
        const handOff = await scout.locator(`${PAGE} [data-testid='row-hand-off']`).first().getAttribute("href");
        await scout.close();
        await watch.goto(`${BASE}${handOff}`, { waitUntil: "domcontentloaded" });
        await watch.locator(`${PAGE} [data-testid='hand-off-answers']`).waitFor({ timeout: 60_000 });
        await watch.evaluate(() => Object.assign(window.__seen, { loading: null, bar: null, deckNew: false, sub: false }));
        await watch.locator(`${PAGE} a:visible`, { hasText: "Back to results" }).first().click();
        await watch.locator(`${PAGE} #read-as-label`).waitFor({ timeout: 90_000 });
        const seen = await watch.evaluate(() => window.__seen);
        report(`${at}: Back to results paints the route's 5c before the page, with no deckNew copy and no order sub`,
          seen.loading !== null && seen.bar !== null && seen.loading <= seen.bar && !seen.deckNew && !seen.sub,
          JSON.stringify(seen));
        await watch.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
