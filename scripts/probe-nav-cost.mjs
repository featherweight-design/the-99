// What does one navigation cost, and what does it refetch?
//
// The report this answers: "it feels like we re-load data and shouldn't have to.
// Nothing has materially changed with the data, so it should be instantaneous."
// Measured, that is exactly right — every forward navigation costs one RSC fetch,
// including a third visit to a route whose payload has not changed, while
// browser back/forward costs nothing.
//
// PRODUCTION BUILD ONLY. `next dev` disables `<Link>` prefetch and compiles
// routes on demand, which fabricates the exact slowness under measurement:
//
//   DATABASE_URL=... pnpm build && pnpm start --port 3007
//   PROBE_BASE=http://localhost:3007 pnpm probe:nav-cost --width=1300
//
// It makes NO WRITES. It does need the fixture account — `E2E_AUDIT_USER_EMAIL`
// plus Clerk credentials, read through `scripts/lib/env.mjs` — and an account
// holding at least one deck, since `/decks/[id]` is one of the measured routes
// and the committed baseline pins which deck it measured. Point it at
// `local-dev`.
//
// Four mechanics here are load-bearing, and each one was paid for by a run that
// reported a flawless app while measuring nothing:
//
//   REQUESTS ARE RECORDED SYNCHRONOUSLY. An async recorder — one that awaits a
//   body or a size before filing its row — pushes after the settle loop has
//   given up, and every count reads 0.
//
//   A PREFETCH IS NOT A NAVIGATION FETCH. The walk runs with `<Link>` prefetch
//   enabled, so without the `Next-Router-Prefetch` split a speculative request
//   makes a 0-fetch budget pass or fail for the wrong reason.
//
//   BYTES COME FROM THE BROWSER'S RESOURCE TIMELINE. Playwright's `sizes()`,
//   `response.body()` and CDP's `loadingFinished` all report 0 for these
//   streamed RSC payloads — which reads as a free navigation.
//
//   THE TIMELINE BUFFER IS CLEARED PER STEP. Its default holds 250 entries;
//   this app overruns that, and an evicted entry reads as 0 KB.
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

/**
 * The routes this walk produces a revisit figure for.
 *
 * The BUDGETED set is derived from the baseline file rather than from this list
 * — keeping a second hard-coded copy means a route added to the baseline by a
 * later conversion is silently never enforced. `assertNoBudgetDrift` fails when
 * the two disagree in either direction.
 */
export const WALKED_ROUTES = ["/collection", "/discover", "/decks/[id]", "/commanders", "/", "/decks"];

/**
 * @param {string[]} walked routes the walk measured
 * @param {string[]} budgeted routes the baseline carries a budget for
 * @returns {{ok: boolean, reason?: string}}
 */
export function assertNoBudgetDrift(walked, budgeted) {
  const missing = budgeted.filter((r) => !walked.includes(r));
  const unbudgeted = walked.filter((r) => !budgeted.includes(r));
  if (missing.length === 0 && unbudgeted.length === 0) return { ok: true };
  return {
    ok: false,
    reason:
      (missing.length ? `the baseline budgets ${missing.join(", ")} but the walk never measures them; ` : "") +
      (unbudgeted.length ? `the walk measures ${unbudgeted.join(", ")} with no budget to enforce` : ""),
  };
}

/**
 * Classify one request by what it cost the reader.
 *
 * `rsc` is a navigation payload — the figure this probe is about. `prefetch` is
 * speculative and is reported in its own column, never folded into `rsc`.
 *
 * @param {{headers: () => Record<string,string>, resourceType: () => string}} r
 * @returns {"action"|"prefetch"|"rsc"|"document"|null}
 */
export function classify(r) {
  const h = r.headers();
  if (h["next-action"]) return "action";
  if (h["rsc"] === "1" && h["next-router-prefetch"] === "1") return "prefetch";
  if (h["rsc"] === "1") return "rsc";
  if (r.resourceType() === "document") return "document";
  return null;
}

/**
 * Judge one route's measurement against its committed budget.
 *
 * BASELINE MODE IS THE DEFAULT, and it is why `budget.rsc` is a number rather
 * than an assumed 0: today every revisit costs exactly 1 fetch, so a probe
 * asserting 0 against an unconverted app would fail the one PR defined as
 * changing no behavior. A route's zero-fetch assertion is switched on by the PR
 * that converts it, by setting that route's `rsc` to 0 in the baseline file.
 *
 * @param {{route: string, rsc: number, decodedKB: number, document: number}} measured
 * @param {{rsc: number, decodedKB: number|null}} budget
 * @returns {{ok: boolean, reason?: string}}
 */
export function compareToBudget(measured, budget) {
  // A DOCUMENT LOAD IS NOT AN INSTANT NAVIGATION. Every step here is a
  // client-side transition, so any document request means the router fell back
  // to a full page load — which reports `rsc: 0` and would otherwise sail
  // through a converted route's zero-fetch budget as though it were a success.
  if (measured.document > 0) {
    return {
      ok: false,
      reason: `${measured.route}: ${measured.document} document load(s) — the navigation was not a client transition`,
    };
  }
  if (measured.rsc !== budget.rsc) {
    return {
      ok: false,
      reason: `${measured.route}: ${measured.rsc} RSC fetch(es) on revisit, budget ${budget.rsc}`,
    };
  }
  // A measurement that came back empty reads as 0 KB, and 0 is under every
  // ceiling — so a ceiling test on its own passes an instrument that measured
  // nothing. A route with a recorded ceiling must report bytes.
  // Only when a navigation fetch was EXPECTED AND MADE. A converted route
  // reports `rsc: 0`, and therefore 0 bytes, while its payload ceiling stays
  // positive — so a guard keyed on the ceiling alone rejects every route this
  // work succeeds at.
  if (budget.rsc > 0 && measured.rsc > 0 && budget.decodedKB !== null && budget.decodedKB > 0 && measured.decodedKB === 0) {
    return {
      ok: false,
      reason: `${measured.route}: no bytes recorded against a ceiling of ${budget.decodedKB}KB — the measurement was lost`,
    };
  }
  // A 2% tolerance: the payload carries a per-request token and a timestamp or
  // two, so byte-identical runs are not guaranteed. Anything a change actually
  // moves is orders of magnitude above this.
  if (budget.decodedKB !== null && measured.decodedKB > budget.decodedKB * 1.02) {
    return {
      ok: false,
      reason: `${measured.route}: ${measured.decodedKB}KB over ceiling ${budget.decodedKB}KB`,
    };
  }
  return { ok: true };
}

/**
 * Reduce a walk's steps to one row per route: the LAST navigation into it,
 * which is a revisit rather than a first visit. A first visit legitimately
 * fetches; the claim under test is about the second and third.
 *
 * @param {Array<{route: string|null, revisit: boolean, rsc: number, decodedKB: number, responseMs: number, document: number, landed?: string}>} steps
 * @returns {Record<string, {rsc: number, decodedKB: number, responseMs: number, document: number}>}
 */
export function summarise(steps) {
  /** @type {Record<string, {rsc: number, decodedKB: number, responseMs: number, document: number}>} */
  const byRoute = {};
  for (const s of steps) {
    if (!s.route || !s.revisit) continue;
    byRoute[s.route] = {
      rsc: s.rsc,
      decodedKB: s.decodedKB,
      responseMs: s.responseMs,
      document: s.document,
    };
  }
  return byRoute;
}

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
const WIDTH = Number(args.get("width") ?? 1300);
const HEIGHT = WIDTH < 768 ? 844 : 900;

async function main() {
  // `requireEnv` returns only the names it was given, so destructuring the
  // password out of a call that does not ask for it yields undefined however
  // `.env` is set — and a non-fixture account would then fail inside Clerk with
  // a message that reads like a Clerk problem. Same shape as probe-chassis-colour.mjs.
  const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
  const FIXTURE = EMAIL.includes("+clerk_test");
  const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
    ? { E2E_AUDIT_USER_PASSWORD: null }
    : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
  const { clerkSetup, setupClerkTestingToken } = await import("@clerk/testing/playwright");
  const { chromium } = await import("playwright");

  await clerkSetup();
  const browser = await chromium.launch();
  const steps = [];
  let failures = 0;
  try {
    const baselinePathEarly =
      args.get("baseline") ??
      fileURLToPath(new URL("../docs/superpowers/benchmarks/nav-cost-baseline.json", import.meta.url));
    const baselineEarly =
      baselinePathEarly !== "none" && existsSync(baselinePathEarly)
        ? JSON.parse(readFileSync(baselinePathEarly, "utf8"))
        : null;
    const baselineDeck = baselineEarly?.deck ?? null;
    // Read before the walk so the run-level liveness check can ask what the
    // baseline still expects rather than assuming a fetch must happen.
    const budgetsForWidth = baselineEarly?.widths?.[String(WIDTH)] ?? null;

    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    const page = await context.newPage();

    const log = [];
    let stepId = -1;
    page.on("request", (r) => {
      let u;
      try { u = new URL(r.url()); } catch { return; }
      if (u.origin !== ORIGIN) return;
      const kind = classify(r);
      if (!kind) return;
      const rec = { stepId, kind, path: u.pathname + u.search, t0: Date.now(), done: false };
      r.__rec = rec;
      log.push(rec);
    });
    const finish = (r) => {
      if (!r.__rec || r.__rec.done || r.__rec.settling) return;
      // `settling`, not `done`: the settle loop waits on `done`, and marking it
      // before the response promise resolves let a step be evaluated while
      // `status` was still null — which the failure filter accepts.
      r.__rec.settling = true;
      r.__rec.ms = Date.now() - r.__rec.t0;
      // STATUS MATTERS. A 500 still has a body, still lands on the expected
      // pathname and can still come in under the ceiling, so a gate that reads
      // only bytes reports PASS for a broken route.
      // A NETWORK failure has no response at all, so a status-only check leaves
      // it null and lets it through. Record the failure itself.
      const failure = r.failure?.();
      if (failure) {
        // ERR_ABORTED is NORMAL here: Next cancels in-flight prefetches the
        // moment a navigation starts, so every walk produces several. Counting
        // them as failures fails a healthy app — a guard firing on correct
        // behaviour, which is worse than no guard.
        const text = failure.errorText ?? "request failed";
        // ERR_ABORTED IS NORMAL HERE, for navigation fetches as well as
        // prefetches, and this exemption is deliberately broad. Next cancels
        // in-flight prefetches on every navigation, AND reports the navigation's
        // own RSC request as aborted once the router has consumed its stream —
        // the payload still arrives in full, and the resource timeline records
        // every byte of it. Restricting the exemption to prefetches was tried
        // and fails a healthy run on `/collection` while that step reports its
        // complete 1,595.8 KB and lands correctly.
        //
        // What still catches a genuinely broken route: HTTP status (a 500 is a
        // response, not an abort), a missing or unavailable response, a
        // timeline that cannot be matched to the step's requests by path, and a
        // 0-byte RSC response.
        if (!text.includes("ERR_ABORTED")) r.__rec.failed = text;
        r.__rec.done = true;
        return;
      }
      const resp = r.response?.();
      if (resp && typeof resp.then === "function") {
        resp
          .then((x) => {
            // No response object is itself a failure: leaving `status` null lets
            // the filter below accept a request whose response never arrived.
            if (!x) r.__rec.failed = "no response";
            else r.__rec.status = x.status();
          })
          .catch((err) => {
            r.__rec.failed = `response unavailable: ${err?.message ?? err}`;
          })
          .finally(() => {
            r.__rec.done = true;
          });
      } else {
        r.__rec.done = true;
      }
    };
    page.on("requestfinished", finish);
    page.on("requestfailed", finish);

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
            await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
            attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
          }
          if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
          await window.Clerk.setActive({ session: attempt.createdSessionId });
          return null;
        } catch (error) {
          return error?.errors?.[0]?.longMessage ?? String(error);
        }
      },
      [EMAIL, PASSWORD],
    );
    if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);

    // Both chromes render `nav[aria-label="Primary"]` — the rail above `md:`,
    // the tab bar below it (src/components/shell/nav.tsx). The `visible` filter
    // picks whichever is drawn, so one walk serves both widths.
    const navLink = (href) =>
      page.locator(`nav[aria-label="Primary"] a[href="${href}"]`).filter({ visible: true });
    const link = (href) => ({
      async click() {
        const candidates = navLink(href);
        // Exactly one chrome draws at a time: the rail above `md:`, the tab bar
        // below. Two visible means the scope broke, and `.first()` would pick one
        // and report a green measurement of the wrong control.
        const count = await candidates.count();
        if (count !== 1) {
          throw new Error(`expected exactly 1 visible primary-nav link for ${href}, found ${count}`);
        }
        await candidates.first().click();
      },
    });

    async function step(label, act, { expect = null, route = null, revisit = false } = {}) {
      stepId += 1;
      const id = stepId;
      const mine = () => log.filter((r) => r.stepId === id);
      // NOT swallowed: this reset is what attributes bytes to this step, so a
      // failure here means the next reading is stale or truncated rather than
      // merely unrecorded.
      await page.evaluate(() => {
        performance.setResourceTimingBufferSize(3000);
        performance.clearResourceTimings();
      });
      const t0 = Date.now();
      await act();
      let last = -1;
      let lastChange = Date.now();
      while (Date.now() - t0 < 15_000) {
        const n = mine().length;
        if (n !== last) { last = n; lastChange = Date.now(); }
        else if (mine().every((r) => r.done) && Date.now() - lastChange > 800) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      const all = mine();
      const rsc = all.filter((r) => r.kind === "rsc");
      const paths = rsc.map((r) => r.path);
      const timings = paths.length
        ? await page.evaluate(
            (ps) =>
              performance
                .getEntriesByType("resource")
                .filter((e) => {
                  const u = new URL(e.name);
                  return ps.includes(u.pathname + u.search);
                })
                .map((e) => {
                  const u = new URL(e.name);
                  return {
                    path: u.pathname + u.search,
                    decoded: e.decodedBodySize,
                    ms: Math.round(e.duration),
                  };
                }),
            paths,
          )
        : [];
      // PER REQUEST, not "any at all". One evicted entry out of several leaves
      // `timings` non-empty while the row undercounts its payload, which then
      // passes a ceiling it should not.
      if (timings.some((t) => t.decoded === 0)) {
        throw new Error(
          `step "${label}" recorded an RSC response of 0 bytes — an entry measured nothing, and ` +
            `summing it with its siblings hides the undercount inside a passing total`,
        );
      }
      // BY PATH, not by count. Two entries for P and none for Q satisfies a
      // cardinality test while Q's bytes are missing entirely.
      // BY PATH SET, not by count. A resource-timing entry carries no headers,
      // so a speculative prefetch of the same URL is indistinguishable from the
      // navigation fetch — comparing counts fails a healthy run whenever both
      // land in one step. Each requested path must appear at least once, and the
      // largest entry per path is taken as the navigation payload.
      const wanted = [...new Set(paths)].sort();
      const got = [...new Set(timings.map((t) => t.path))].sort();
      if (wanted.length !== got.length || wanted.some((w, i) => w !== got[i])) {
        throw new Error(
          `step "${label}" requested ${JSON.stringify(wanted)} but the resource timeline returned ` +
            `${JSON.stringify(got)} — the payload cannot be attributed to the requests`,
        );
      }
      const landed = new URL(page.url());
      const row = {
        label,
        landed: landed.pathname + landed.search,
        route,
        revisit,
        rsc: rsc.length,
        prefetch: all.filter((r) => r.kind === "prefetch").length,
        action: all.filter((r) => r.kind === "action").length,
        document: all.filter((r) => r.kind === "document").length,
        decodedKB: +(
          wanted.reduce(
            (sum, path) =>
              sum + Math.max(...timings.filter((t) => t.path === path).map((t) => t.decoded)),
            0,
          ) / 1024
        ).toFixed(1),
        responseMs: timings.reduce((a, b) => Math.max(a, b.ms), 0),
      };
      steps.push(row);
      console.log(
        `${String(row.rsc).padStart(2)} rsc ${String(row.decodedKB).padStart(8)}KB ` +
          `${String(row.responseMs).padStart(4)}ms | ${String(row.prefetch).padStart(2)} pre | ` +
          `${row.document} doc | ${label}`,
      );
      const bad = all.filter((r) => r.failed || (typeof r.status === "number" && r.status >= 400));
      if (bad.length > 0) {
        throw new Error(
          `step "${label}" had ${bad.length} failed request(s): ` +
            bad.map((r) => `${r.failed ?? r.status} ${r.path}`).join(", "),
        );
      }
      // EVERY step is a client transition, first visit included. Rejecting a
      // document load only inside `compareToBudget` left first-visit steps
      // printing the fallback and exiting 0, since only revisit rows become
      // budget rows.
      if (row.document > 0) {
        throw new Error(
          `step "${label}" cost ${row.document} document load(s) — the router fell back to a full ` +
            `page load rather than a client transition`,
        );
      }
      // LIVENESS. A step that did not land where it meant to measured some other
      // navigation, and reporting its figures under this label is worse than not
      // measuring at all.
      if (expect && (landed.pathname !== expect || landed.origin !== ORIGIN)) {
        throw new Error(`step "${label}" expected ${ORIGIN}${expect}, landed ${landed.origin}${landed.pathname}`);
      }
      return row;
    }

    // WARM, EXACTLY TWICE, EVERY ROUTE — including the deck page and including
    // `/`. Counting matters: an earlier version loaded `/decks` once for deck
    // discovery, then twice more in the loop, and `/` a third time as a reset,
    // so three routes were warmed differently from the rest while the committed
    // conditions claimed two passes each. Discovery now reads the deck out of
    // the first pass's `/decks` load rather than adding one.
    //
    // `/` is last so the walk starts where its first step expects, with no
    // extra navigation.
    // The deck the COMMITTED BASELINE measured, so the default run compares like
    // with like. `/decks` is ordered by mutable data, so discovery alone lets the
    // gate read another deck's cards and suggestions as a regression.
    // Precedence: PROBE_DECK, then the baseline's deck, then discovery.
    const pinnedDeck =
      (process.env.PROBE_DECK && `/decks/${process.env.PROBE_DECK}`) || baselineDeck || null;
    let deckHref = pinnedDeck;

    /**
     * One warm-up load, verified. Playwright does not reject on 4xx/5xx and
     * follows redirects silently, so an unchecked `goto` lets a failed or
     * redirected warm-up count as a pass and leaves the measured walk running
     * against a cold or wrong route.
     */
    const warmGoto = async (path) => {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "load" });
      const status = resp?.status() ?? 0;
      if (status >= 400) throw new Error(`warm-up of ${path} returned HTTP ${status}`);
      const at = new URL(page.url());
      if (at.origin !== ORIGIN || at.pathname !== path.split("?")[0]) {
        throw new Error(`warm-up of ${path} landed at ${at.origin}${at.pathname}`);
      }
      await page.waitForTimeout(1200);
    };
    for (let pass = 0; pass < 2; pass += 1) {
      for (const r of ["/collection", "/commanders", "/discover", "/decks"]) {
        await warmGoto(r);
        if (r === "/decks" && !deckHref) {
          deckHref = await onPage(page, "a[href^='/decks/']").evaluateAll((els) => {
            const uuid = /^\/decks\/[0-9a-f]{8}-[0-9a-f]{4}/i;
            return els.map((e) => e.getAttribute("href")).find((h) => h && uuid.test(h)) ?? null;
          });
          if (!deckHref) {
            // FAILS rather than skipping: the deck page is the slowest route
            // measured, and a run that quietly omits it reports a healthier app
            // than exists.
            throw new Error("no deck page link on /decks — the walk lost its subject");
          }
        }
      }
      await warmGoto(deckHref);
      await warmGoto("/");
    }

    console.log(`\n=== route to route, nothing changed between visits (${WIDTH}x${HEIGHT}) ===`);
    await step("Home -> Collection (1st)", () => link("/collection").click(), { expect: "/collection" });
    await step("Collection -> Home", () => link("/").click(), { expect: "/", route: "/", revisit: true });
    await step("Home -> Collection (2nd, UNCHANGED)", () => link("/collection").click(), {
      expect: "/collection", route: "/collection", revisit: true,
    });
    await step("Collection -> Decks (1st)", () => link("/decks").click(), { expect: "/decks" });
    // ASSERTED, not merely reported. Both are expected to cost nothing — that is
    // the contrast the whole finding rests on — and an unasserted row lets a
    // change that makes history traversal refetch exit 0.
    const back = await step("browser back() -> Collection", () => page.goBack(), { expect: "/collection" });
    if (back.rsc !== 0 || back.document !== 0) {
      throw new Error(`browser back() cost ${back.rsc} RSC fetch(es) and ${back.document} document load(s), expected 0 and 0`);
    }
    const fwd = await step("browser forward() -> Decks", () => page.goForward(), { expect: "/decks" });
    if (fwd.rsc !== 0 || fwd.document !== 0) {
      throw new Error(`browser forward() cost ${fwd.rsc} RSC fetch(es) and ${fwd.document} document load(s), expected 0 and 0`);
    }
    await step("Decks -> Commanders (1st)", () => link("/commanders").click(), { expect: "/commanders" });
    await step("Commanders -> Discover", () => link("/discover").click(), {
      expect: "/discover", route: "/discover", revisit: true,
    });
    await step("Discover -> Commanders (2nd, UNCHANGED)", () => link("/commanders").click(), {
      expect: "/commanders", route: "/commanders", revisit: true,
    });
    await step("Commanders -> Decks (2nd, UNCHANGED)", () => link("/decks").click(), {
      expect: "/decks", route: "/decks", revisit: true,
    });

    console.log(`\n=== a deck, and back ===`);
    await step("Decks -> deck (1st)", () => onPage(page, `a[href="${deckHref}"]`).first().click(), {
      expect: deckHref,
    });
    await step("deck -> browser back() to Decks", () => page.goBack(), { expect: "/decks" });
    await step("Decks -> same deck (2nd, UNCHANGED)", () => onPage(page, `a[href="${deckHref}"]`).first().click(), {
      expect: deckHref, route: "/decks/[id]", revisit: true,
    });

    // LIVENESS, over the whole run. A walk that records no RSC request anywhere
    // is a broken probe, not a perfect app — two earlier drafts did exactly that.
    // LIVENESS, over the whole run — but keyed on what the BASELINE expects, not
    // on requests existing. Once PRs 3-6 convert every route, a healthy walk
    // legitimately makes no navigation fetch at all, and a check that demands one
    // would fail the exact outcome this work is for.
    // With no baseline to consult there is nothing to expect: `--baseline=none`
    // is how a NEW baseline is generated, and once every route is converted that
    // run legitimately makes no navigation fetch at all. Demanding one there
    // breaks the documented way to regenerate the file.
    const expectsFetches = budgetsForWidth
      ? Object.values(budgetsForWidth).some((b) => b.rsc > 0)
      : false;
    if (expectsFetches && steps.every((s) => s.rsc === 0 && s.prefetch === 0)) {
      throw new Error(
        "no RSC or prefetch request recorded in the whole run, while the baseline still expects " +
          "fetches — the probe is not measuring",
      );
    }

    const summary = summarise(steps);
    const missing = WALKED_ROUTES.filter((r) => !(r in summary));
    if (missing.length > 0) {
      throw new Error(`the walk produced no revisit figure for: ${missing.join(", ")}`);
    }

    // ON BY DEFAULT. As an opt-in flag this compared nothing on the documented
    // `pnpm probe:nav-cost` invocation, so a regression exited 0 — a permanent
    // probe that is only a gate when somebody remembers a flag is not a gate.
    // `--baseline=none` skips it, for the run that MAKES a new baseline.
    const baselinePath =
      args.get("baseline") ??
      fileURLToPath(new URL("../docs/superpowers/benchmarks/nav-cost-baseline.json", import.meta.url));
    if (baselinePath !== "none") {
      const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
      const budgets = baseline.widths?.[String(WIDTH)];
      if (!budgets) throw new Error(`baseline has no budgets for width ${WIDTH}`);
      // An EXPLICIT override is a deliberate choice to measure another deck, so
      // it skips that one route's budget rather than aborting a finished run —
      // advertising an override and then rejecting it made the flag unusable.
      // A deck that merely DRIFTED (no override, baseline disagrees with what
      // discovery found) is still a hard stop: those payloads are not comparable.
      const recordedDeck = baseline.deck ?? null;
      const overrode = Boolean(process.env.PROBE_DECK);
      if (recordedDeck && recordedDeck !== deckHref && !overrode) {
        throw new Error(
          `the baseline records ${recordedDeck} but this run measured ${deckHref} — ` +
            `/decks/[id] is one deck's cards and suggestions, so the payloads are not comparable`,
        );
      }
      const skipDeckBudget = overrode && recordedDeck !== deckHref;
      if (skipDeckBudget) {
        console.log(
          `note: PROBE_DECK measured ${deckHref}, baseline records ${recordedDeck} — ` +
            `skipping the /decks/[id] budget, every other route still gated`,
        );
      }
      console.log(`\n=== against the committed budget ===`);
      const drift = assertNoBudgetDrift(WALKED_ROUTES, Object.keys(budgets));
      if (!drift.ok) throw new Error(`budget drift: ${drift.reason}`);
      for (const route of Object.keys(budgets)) {
        if (route === "/decks/[id]" && skipDeckBudget) continue;
        const verdict = compareToBudget({ route, ...summary[route] }, budgets[route]);
        console.log(`${verdict.ok ? "PASS" : "FAIL"}  ${verdict.reason ?? route}`);
        if (!verdict.ok) failures += 1;
      }
    }

    const out = args.get("out");
    if (out && baselinePath === "none") {
      // A recorder that classified nothing writes an all-zero baseline, and every
      // later run then passes against it. Even a fully converted app still
      // PREFETCHES, so requiring one or the other still holds after PRs 3-6.
      if (!steps.some((st) => st.rsc > 0 || st.prefetch > 0)) {
        throw new Error(
          "refusing to write a baseline from a run that recorded no RSC and no prefetch requests — " +
            "the recorder measured nothing",
        );
      }
    }
    if (out) {
      // The deck is part of the conditions: /decks/[id]'s payload is that deck's
      // cards and suggestions, and the list is ordered by mutable data, so a
      // later run can measure a DIFFERENT deck and read the change as a
      // regression. Recorded here, and pinnable with PROBE_DECK.
      writeFileSync(
        out,
        JSON.stringify({ width: WIDTH, base: BASE, deck: deckHref, steps, summary }, null, 2),
      );
      console.log(`\nwrote ${out}`);
    }
  } finally {
    await browser.close();
  }
  if (failures > 0) {
    console.error(`\n${failures} route(s) over budget`);
    process.exit(1);
  }
}

// Guarded: the test imports `compareToBudget` and `classify` from this module,
// and an unguarded `main()` would launch a browser inside the unit run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
