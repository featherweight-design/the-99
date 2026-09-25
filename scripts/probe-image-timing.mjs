// How long from hover to a painted card preview, and where that time goes.
//
// Hugh's question (2026-09-25): "Card images take a second to load, both for the
// card hover preview and for card details. Could we use a CDN? Or batched
// requests?" This measures THE PREVIEW half, decomposed into our own delay, the
// image request (DNS, TLS, TTFB, bytes) and decode.
//
// THE CARD-DETAILS HALF is `--modal`: press to art requested, against the details
// action the modal waits on. The swap-tools lane took it (it owns `card-modal.tsx`).
//
// PRODUCTION BUILD ONLY, same as probe:nav-cost — `next dev` compiles on demand
// and would price our own work wrong. Point it at `local-dev`.
//
// WHAT IT CANNOT MEASURE, stated up front:
//
//   The hover preview is DESKTOP ONLY by design — `hover-preview.tsx` returns
//   early unless `(hover: hover)` matches, because a touch device fires
//   mouseenter on tap. So a 390 run has nothing to time and says so; it does not
//   fall back to another surface. A run that reported a preview figure at 390
//   would be measuring something no phone reader can reach.
//
//   "Painted" for the preview is OBSERVED, by screenshotting the box and finding
//   the frame where its pixels stop being uniform. The browser exposes no paint
//   event for a CSS background image. Each screenshot costs 70-100ms, so every
//   painted figure carries `paintObservationGapMs` — the gap between the last
//   blank frame and the first painted one — rather than a flattering mean.
import { writeFileSync } from "node:fs";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

const IMAGE_HOST = "cards.scryfall.io";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);
const WIDTH = Number(args.get("width") ?? 1300);
/**
 * `--first-image`: measure the FIRST card image of a cold page load instead of a
 * hover, and report its connection phases.
 *
 * This is the preconnect's proof and nothing else's. A hover cannot show it: by
 * the time a reader hovers, the page has already opened the connection for the
 * commander art, so a hover measurement reports a reused socket either way and
 * would price a preconnect at zero. The question is only answerable on the first
 * image of a fresh context.
 */
const FIRST_IMAGE = args.get("first-image") === "true";
/**
 * `--modal`: THE CARD-DETAILS HALF. Press a decklist row's name and time the modal's art against the
 * details action that has to answer before the modal knows which printing to draw.
 *
 * The press is by KEYBOARD, focus then Enter, at both widths. A mouse click moves the pointer onto
 * the row first, which starts the hover preview's own image request, and the modal then reads a
 * cache the preview filled: that measures the preview, not the press. A phone reader has no hover
 * at all, so the keyboard press is also the phone's path.
 *
 * What it reports per press, in this script's clock, from the Enter:
 *   `actionEndMs` when the details action's response finished (the POST carrying `next-action`),
 *   `artRequestedMs` when the modal's art was first asked for, and `artFinishedMs` when its bytes
 *   were in. THE CLAIM a press-time preload makes is `artRequestedMs < actionEndMs`: serially, the
 *   art cannot be asked for until the action has answered.
 */
const MODAL = args.get("modal") === "true";
const HEIGHT = WIDTH < 768 ? 844 : 900;

/**
 * The phases of one image request, from CDP rather than from the page.
 *
 * THE PAGE CANNOT SEE THIS. `cards.scryfall.io` sends no `Timing-Allow-Origin`,
 * so its `PerformanceResourceTiming` entries arrive with every phase and every
 * size zeroed — `startTime`, `duration` and `responseEnd` are all a page gets.
 * Measured from the page alone, a 60KB image over a cold TLS connection is
 * indistinguishable from a free one, which is the decomposition this probe
 * exists to produce. CDP's Network domain is not bound by that rule.
 *
 * A consequence worth its own line in the plan: we cannot measure image latency
 * from a real reader's browser either, for the same reason. Only a same-origin
 * proxy would make these numbers visible in production.
 *
 * `timing` is CDP's `Network.ResourceTiming`, whose fields are millisecond
 * offsets from `requestTime` (seconds), and -1 where a phase did not happen —
 * a reused connection reports dnsStart -1, which is the distinction the
 * preconnect candidate lives or dies on.
 *
 * @param {{timing: Record<string, number>, encodedDataLength: number, fromCache: boolean, status: number}} r
 */
export function phasesOf(r) {
  const t = r.timing ?? {};
  const span = (a, b) => (t[a] >= 0 && t[b] >= 0 ? +(t[b] - t[a]).toFixed(1) : null);
  return {
    dnsMs: span("dnsStart", "dnsEnd"),
    connectMs: span("connectStart", "connectEnd"),
    tlsMs: span("sslStart", "sslEnd"),
    // Headers back, measured from the bytes leaving — queueing and connection
    // setup are reported separately above rather than folded in here.
    ttfbMs: span("sendStart", "receiveHeadersEnd"),
    encodedBytes: r.encodedDataLength ?? 0,
    fromCache: Boolean(r.fromCache),
    status: r.status ?? null,
    reusedConnection: (t.dnsStart ?? -1) < 0 && (t.sslStart ?? -1) < 0,
  };
}

/** The Scryfall size segment a URL asks for — `normal`, `small`, `large`, `art_crop`. */
export function scryfallSize(url) {
  const m = /cards\.scryfall\.io\/([a-z_]+)\//.exec(url);
  return m ? m[1] : null;
}

/**
 * When the box first carried a card rather than a flat colour, or null when no
 * such transition happened.
 *
 * Byte length is the signal — a painted card's PNG is far larger than a flat
 * box's — so the probe never decodes an image itself.
 *
 * TWO REJECTED VERSIONS, because each could only ever agree the build was fine:
 *
 *   Against a "blank" reference frame screenshotted once the box attached: with
 *   the fetch moved into the open delay the box paints on its first frame, so
 *   the reference WAS a painted card, nothing exceeded it, and it reported no
 *   paint at all on the build where painting got faster.
 *
 *   Against `max * 0.6` of the run's own samples: the maximum sample always
 *   satisfies that, so the function could not return null. Nine identical blank
 *   frames — a 404, a wrong URL, an image that never loaded — would report the
 *   box painting on its first frame.
 *
 * So the transition is demonstrated before it is located: the spread has to be
 * wide enough that something changed, and only then is the first frame past the
 * midpoint the answer.
 *
 * @param {{t: number, bytes: number}[]} samples
 * @returns {{paintedAtMs: number|null, gapMs: number|null, reason?: string}}
 */
export function firstPaintedSample(samples) {
  if (samples.length === 0) return { paintedAtMs: null, gapMs: null, reason: "no samples" };
  const bytes = samples.map((s) => s.bytes);
  const max = Math.max(...bytes);
  const min = Math.min(...bytes);
  if (max < min * 1.4) {
    return { paintedAtMs: null, gapMs: null, reason: `no transition: bytes ${min}..${max}` };
  }
  const threshold = min + (max - min) * 0.6;
  const index = samples.findIndex((s) => s.bytes >= threshold);
  if (index < 0) return { paintedAtMs: null, gapMs: null, reason: "threshold never crossed" };
  return {
    paintedAtMs: samples[index].t,
    // The bound on the figure: the gap between the last frame still blank and
    // the first that was not. An earlier version differenced the final two
    // samples, which sit after the transition and bound nothing about it.
    gapMs: index > 0 ? samples[index].t - samples[index - 1].t : null,
  };
}

async function main() {
  const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
  const FIXTURE = EMAIL.includes("+clerk_test");
  const { E2E_AUDIT_USER_PASSWORD: PASSWORD } = FIXTURE
    ? { E2E_AUDIT_USER_PASSWORD: null }
    : requireEnv(["E2E_AUDIT_USER_PASSWORD"]);
  const { clerkSetup, setupClerkTestingToken } = await import("@clerk/testing/playwright");
  const { chromium } = await import("playwright");

  await clerkSetup();
  const browser = await chromium.launch();
  const report = { width: WIDTH, base: BASE, takenAt: new Date().toISOString(), rows: [] };
  try {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    /** Every image response CDP saw, by URL — the only place the phases exist. */
    const imageResponses = new Map();
    /**
     * When each image was ASKED FOR, in this script's own clock.
     *
     * The point of the preload is that the request leaves before the box mounts,
     * and a paint figure alone cannot show that: a faster paint could equally be
     * a warmer cache or a quieter network. A request timestamp earlier than the
     * mount timestamp is the claim itself.
     */
    let imageRequestedAt = new Map();
    /** Image requests finishing, by URL, for the modal mode's `artFinishedMs`. */
    let imageFinishedAt = new Map();
    const imageUrlById = new Map();
    /** Server-action POSTs, by requestId: `{ start, end }` in this script's clock. */
    let actions = new Map();
    cdp.on("Network.requestWillBeSent", (e) => {
      const u = e.request?.url ?? "";
      const headers = e.request?.headers ?? {};
      if (e.request?.method === "POST" && Object.keys(headers).some((h) => h.toLowerCase() === "next-action")) {
        actions.set(e.requestId, { start: Date.now(), end: null });
      }
      if (!u.includes(IMAGE_HOST)) return;
      imageUrlById.set(e.requestId, u);
      if (!imageRequestedAt.has(u)) imageRequestedAt.set(u, Date.now());
    });
    cdp.on("Network.responseReceived", (e) => {
      if (!e.response?.url?.includes(IMAGE_HOST)) return;
      imageResponses.set(e.response.url, {
        timing: e.response.timing,
        encodedDataLength: 0,
        fromCache: e.response.fromDiskCache || e.response.fromServiceWorker,
        status: e.response.status,
        requestId: e.requestId,
      });
    });
    // encodedDataLength is only final at loadingFinished.
    cdp.on("Network.loadingFinished", (e) => {
      for (const rec of imageResponses.values()) {
        if (rec.requestId === e.requestId) rec.encodedDataLength = e.encodedDataLength;
      }
      const a = actions.get(e.requestId);
      if (a && a.end === null) a.end = Date.now();
      const u = imageUrlById.get(e.requestId);
      if (u && !imageFinishedAt.has(u)) imageFinishedAt.set(u, Date.now());
    });

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
            const f = attempt.supportedFirstFactors?.find((x) => x.strategy === "email_code");
            await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
            attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
          }
          if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
          await window.Clerk.setActive({ session: attempt.createdSessionId });
          return null;
        } catch (e) {
          return e?.errors?.[0]?.longMessage ?? String(e);
        }
      },
      [EMAIL, PASSWORD],
    );
    if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);

    const deck = process.env.PROBE_DECK ? `/decks/${process.env.PROBE_DECK}` : null;
    if (!deck) throw new Error("PROBE_DECK is required — name the deck whose rows to hover");

    // Warm the route so route compilation and the payload are not priced as
    // image time.
    for (let i = 0; i < 2; i += 1) {
      await page.goto(`${BASE}${deck}`, { waitUntil: "load" });
      await page.waitForTimeout(1500);
    }

    if (MODAL) {
      await onPage(page, "[data-decklist-row]").first().waitFor({ state: "attached", timeout: 30_000 });
      const runs = [];
      const presses = Number(args.get("presses") ?? 5);
      for (const mode of ["cold", "warm"]) {
        for (let i = 0; i < presses; i += 1) {
          // Cold: a card the page has never opened, with the browser cache empty, so neither the
          // provider's card cache nor the image cache can answer. Each press takes a different row.
          if (mode === "cold") await cdp.send("Network.clearBrowserCache");
          await page.goto(`${BASE}${deck}`, { waitUntil: "load" });
          await onPage(page, "[data-decklist-row]").first().waitFor({ state: "attached", timeout: 30_000 });
          await page.waitForTimeout(800);
          imageRequestedAt = new Map();
          imageFinishedAt = new Map();
          actions = new Map();
          const rowIndex = mode === "cold" ? 3 + i : 3;
          const trigger = onPage(page, "[data-decklist-row]").nth(rowIndex).locator("button").first();
          await trigger.scrollIntoViewIfNeeded();
          await trigger.focus();
          // Warm: the same card opened once before, in this page, so the second press is what a
          // reader re-opening a card pays.
          if (mode === "warm") {
            await page.keyboard.press("Enter");
            await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 15_000 });
            await page.keyboard.press("Escape");
            await page.waitForTimeout(400);
            imageRequestedAt = new Map();
            imageFinishedAt = new Map();
            actions = new Map();
            await trigger.focus();
          }
          const t0 = Date.now();
          await page.keyboard.press("Enter");
          // The modal's art: the first element inside the dialog painting an image-host background.
          const art = await page.waitForFunction((host) => {
            for (const d of document.querySelectorAll('[role="dialog"]')) {
              for (const el of d.querySelectorAll("*")) {
                const bg = getComputedStyle(el).backgroundImage;
                if (bg.includes(host)) return /url\(["']?(.*?)["']?\)/.exec(bg)[1];
              }
            }
            return null;
          }, IMAGE_HOST, { timeout: 20_000 }).then((h) => h.jsonValue());
          await page.waitForTimeout(1500);
          const act = [...actions.values()].find((a) => a.start >= t0) ?? null;
          const rel = (abs) => (abs == null ? null : abs - t0);
          const run = {
            mode,
            row: rowIndex,
            art,
            actionEndMs: rel(act?.end),
            artRequestedMs: rel(imageRequestedAt.get(art)),
            artFinishedMs: rel(imageFinishedAt.get(art)),
            // No request at all means a cache answered, which is a fact about the cache, not the press.
            artFromCache: !imageRequestedAt.has(art),
          };
          run.artBeforeActionEnd = run.artRequestedMs != null && run.actionEndMs != null ? run.artRequestedMs < run.actionEndMs : null;
          runs.push(run);
          console.log(
            `${mode.padEnd(5)} row ${rowIndex}: action ${run.actionEndMs ?? "none"}ms, art asked ${run.artRequestedMs ?? "cache"}ms, ` +
              `art in ${run.artFinishedMs ?? "?"}ms${run.artBeforeActionEnd ? " (asked BEFORE the action answered)" : ""}`,
          );
          await page.keyboard.press("Escape");
          // Whether the row already carries the URL the modal draws: the hover preview paints the row's
          // own `imageUri`, so after the measurement (never before it) the row is hovered and the two
          // are compared. A press-time preload is only worth building if they match. Desktop only.
          if (WIDTH >= 768) {
            await page.waitForTimeout(300);
            await onPage(page, "[data-decklist-row]").nth(rowIndex).hover();
            const box = page.locator('[data-testid="hover-preview"]');
            const preview = await box.waitFor({ state: "attached", timeout: 3000 })
              .then(() => box.evaluate((el) => /url\(["']?(.*?)["']?\)/.exec(getComputedStyle(el).backgroundImage)?.[1] ?? null))
              .catch(() => null);
            run.rowPreviewUrl = preview;
            run.rowUrlMatchesModal = preview === art;
            await page.mouse.move(0, 0);
          }
        }
      }
      const cold = runs.filter((r) => r.mode === "cold" && r.artFinishedMs != null);
      // A true median: an even count averages the middle two, since a press whose action end went
      // uncaptured leaves that column one short.
      const median = (xs) => {
        const s = [...xs].sort((a, b) => a - b);
        if (!s.length) return null;
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      };
      const summary = {
        coldPresses: cold.length,
        medianActionEndMs: median(cold.map((r) => r.actionEndMs).filter((x) => x != null)),
        medianArtRequestedMs: median(cold.map((r) => r.artRequestedMs)),
        medianArtFinishedMs: median(cold.map((r) => r.artFinishedMs)),
        artAskedBeforeActionEnd: cold.filter((r) => r.artBeforeActionEnd).length,
        rowUrlMatchesModal: runs.filter((r) => r.rowUrlMatchesModal !== undefined).map((r) => r.rowUrlMatchesModal),
      };
      console.log(`cold median: action ${summary.medianActionEndMs}ms, art asked ${summary.medianArtRequestedMs}ms, art in ${summary.medianArtFinishedMs}ms; asked before the action answered on ${summary.artAskedBeforeActionEnd} of ${cold.length}`);
      // A run with no cold press that fetched its art has measured nothing.
      if (cold.length === 0) {
        console.error("FAIL  no cold press requested its art; the run measured nothing");
        process.exitCode = 1;
      }
      report.rows.push({ surface: "card modal art, pressed from a decklist row", mode: "modal", runs, summary });
      const outModal = args.get("out");
      if (outModal) writeFileSync(outModal, JSON.stringify(report, null, 2));
      return;
    }

    if (FIRST_IMAGE) {
      // THE PRECONNECT'S PROOF, and it took three corrections before it could
      // tell a warmed socket from a warm one. What each guards against:
      //
      //   SOCKET-COLD, not merely cache-cold. An earlier version signed in on `/`
      //   inside the same context and then navigated to the deck page. `/` draws
      //   commander art, so a `cards.scryfall.io` socket could already be open
      //   before the page under test loaded, and every variant would report a
      //   reused connection. Sign-in happens once, its cookies are carried by
      //   `storageState`, and each run gets a context that has never spoken to
      //   the image host.
      //
      //   THE REQUEST THAT OPENED THE SOCKET, not the first response. The page
      //   fires several image requests at once over HTTP/2; a sibling that joins
      //   an already-opening connection reports dnsStart and sslStart as -1, so
      //   keying on the first RESPONSE prints "dns reused | tls reused" — exactly
      //   what a working preconnect produces — on a build that has none. Requests
      //   are ordered by `requestWillBeSent` and correlated by `requestId`.
      //
      //   REAL BYTES. `encodedDataLength` is only final at `loadingFinished`;
      //   passing 0 made every row claim a 0-byte fetch and made a disk-cache hit
      //   indistinguishable from a fresh one.
      const authed = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
      const authPage = await authed.newPage();
      await setupClerkTestingToken({ page: authPage });
      await authPage.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await authPage.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
      const authFailure = await authPage.evaluate(
        async ([email, password]) => {
          try {
            const signIn = window.Clerk.client.signIn;
            let attempt = email.includes("+clerk_test")
              ? await signIn.create({ identifier: email })
              : await signIn.create({ identifier: email, password });
            if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
              const f = attempt.supportedFirstFactors?.find((x) => x.strategy === "email_code");
              await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
              attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
            }
            if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
            await window.Clerk.setActive({ session: attempt.createdSessionId });
            return null;
          } catch (e) {
            return e?.errors?.[0]?.longMessage ?? String(e);
          }
        },
        [EMAIL, PASSWORD],
      );
      if (authFailure) throw new Error(`Clerk sign-in failed: ${authFailure}`);
      const state = await authed.storageState();
      await authed.close();

      const runs = [];
      for (let run = 1; run <= 3; run += 1) {
        const cold = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, storageState: state });
        const cp = await cold.newPage();
        const ccdp = await cold.newCDPSession(cp);
        await ccdp.send("Network.enable");
        /** Image requests in the order the browser issued them. */
        const order = [];
        const byId = new Map();
        ccdp.on("Network.requestWillBeSent", (e) => {
          if (!e.request?.url?.includes(IMAGE_HOST)) return;
          order.push(e.requestId);
          byId.set(e.requestId, { url: e.request.url.slice(-42) });
        });
        ccdp.on("Network.responseReceived", (e) => {
          const rec = byId.get(e.requestId);
          if (!rec) return;
          rec.timing = e.response.timing;
          rec.status = e.response.status;
          // BOTH flags, matching the hover handler at line 186. A service
          // worker can satisfy an image with a 200 and real bytes and NO
          // handshake, which passes the byte and status assertions below while
          // measuring no connection at all. There is no service worker in this
          // app today — which is exactly why the inconsistency would have sat
          // here unnoticed until one arrived. The PWA work already scoped for
          // this repo would add one.
          rec.fromCache = Boolean(e.response.fromDiskCache || e.response.fromServiceWorker);
        });
        ccdp.on("Network.loadingFinished", (e) => {
          const rec = byId.get(e.requestId);
          if (rec) rec.encodedDataLength = e.encodedDataLength;
        });

        // STRAIGHT to the page under test. No `/` visit, so nothing has opened a
        // connection to the image host before the navigation being measured.
        await cp.goto(`${BASE}${deck}`, { waitUntil: "load" });
        await cp.waitForTimeout(4000);

        if (order.length === 0) {
          throw new Error(`run ${run} recorded no card image on a page that draws art — nothing measured`);
        }
        const firstId = order[0];
        const rec = byId.get(firstId);
        if (!rec?.timing) {
          throw new Error(`run ${run} saw the first image request but no response timing for it`);
        }
        const phases = phasesOf({
          timing: rec.timing,
          encodedDataLength: rec.encodedDataLength ?? 0,
          fromCache: rec.fromCache ?? false,
          status: rec.status,
        });
        // A SOCKET-COLD SAMPLE HAS TO BE A REAL FETCH, and these three clauses
        // say so rather than recording it and hoping. Each degenerate case — a
        // cache hit, an error response, a zero-byte body — produces
        // `dns reused | tls reused`, the exact output a working preconnect gives.
        // Accepting one would let this mode agree with the change on a build that
        // has none, which is the failure it was rebuilt to avoid.
        if (phases.fromCache) {
          throw new Error(
            `run ${run} was served the first image from cache, so it measures no handshake — the context was not cold`,
          );
        }
        if (phases.status !== 200) {
          throw new Error(`run ${run} first image returned HTTP ${phases.status}, not a fetch worth timing`);
        }
        // A FLOOR, not merely non-zero. Round 1 of review caught that a 0-byte
        // body was accepted; round 3 caught that the fix was the instance rather
        // than the class — the host filter admits any 200 from
        // cards.scryfall.io, so a truncated body, an error page served as 200, or
        // a stray non-card asset would still pass. A `normal` card JPEG measures
        // 90-96KB, so anything under 40KB is not the thing this claims to time.
        if (phases.encodedBytes < 40_000) {
          throw new Error(
            `run ${run} recorded ${phases.encodedBytes} bytes for the first image — a card image at ` +
              `\`normal\` size is ~90KB, so this is a truncated body or not a card image at all`,
          );
        }
        runs.push({ url: rec.url, imageRequestsOnPage: order.length, ...phases });
        console.log(
          `run ${run}: dns ${phases.dnsMs ?? "reused"} | tls ${phases.tlsMs ?? "reused"} | ` +
            `connect ${phases.connectMs ?? "reused"} | ttfb ${phases.ttfbMs}ms | ` +
            `${Math.round((phases.encodedBytes || 0) / 1024)}KB | ${order.length} image request(s) on the page`,
        );
        await cold.close();
      }
      report.rows.push({ surface: "first card image of a socket-cold page load", mode: "first-image", runs });
      const outFirst = args.get("out");
      if (outFirst) {
        writeFileSync(outFirst, JSON.stringify(report, null, 2));
        console.log(`wrote ${outFirst}`);
      }
      return;
    }

    if (WIDTH >= 768) {
      // `data-decklist-row` is on the row shell deliberately, "so a probe can
      // address a decklist row without matching a composed class list"
      // (decklist-row.tsx) — and it is the element carrying the preview handlers.
      const rows = onPage(page, "[data-decklist-row]");
      // WAIT for a row, never a fixed sleep. A 1500ms pause was enough until the
      // bundle grew, and then the probe reported "no rows" on a page that renders
      // them perfectly — a timing flake dressed as a missing surface.
      await rows.first().waitFor({ state: "attached", timeout: 30_000 });
      const count = await rows.count();
      if (count === 0) {
        throw new Error(
          "no [data-decklist-row] on this page — the deck may be on another tab, or the list did not render",
        );
      }
      console.log(`decklist rows visible: ${count}`);

      for (const mode of ["cold", "warm"]) {
        if (mode === "cold") await cdp.send("Network.clearBrowserCache");
        // PER MODE, BOTH MAPS. Scoping the timestamps and leaving the responses
        // shared was the same bug half-fixed: a warm hover usually fires no
        // `responseReceived` at all, so the lookup fell through to the COLD run's
        // record and the warm row reported phases from a request it never made.
        // Cleared together, a cached image reports nothing, which is the truth.
        imageRequestedAt = new Map();
        imageResponses.clear();
        await page.goto(`${BASE}${deck}`, { waitUntil: "load" });
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
          performance.setResourceTimingBufferSize(3000);
          performance.clearResourceTimings();
        });

        const row = rows.nth(Math.min(2, count - 1));
        await row.waitFor({ state: "attached", timeout: 30_000 });
        await row.scrollIntoViewIfNeeded();
        const t0 = Date.now();
        await row.hover();

        const box = page.locator('[data-testid="hover-preview"]');
        await box.waitFor({ state: "attached", timeout: 5000 });
        const boxMountedAtAbs = Date.now();
        const boxAt = boxMountedAtAbs - t0;

        // Filmstrip the box, then find where its pixels start carrying a card
        // rather than a flat colour.
        //
        // Sample a fixed window rather than stopping at a threshold: the stop
        // condition needs the run's spread, which is only known once sampling
        // ends. A blank frame is NOT measured as a reference — see
        // `firstPaintedSample` for why two earlier versions of that could not
        // report a failed observation.
        const samples = [];
        const firstBytes = (await box.screenshot()).length;
        samples.push({ t: Date.now() - t0, bytes: firstBytes });
        for (let i = 0; i < 8; i += 1) {
          const shot = await box.screenshot();
          samples.push({ t: Date.now() - t0, bytes: shot.length });
        }
        const paint = firstPaintedSample(samples);
        const paintedAt = paint.paintedAtMs;

        const url = await box.evaluate((el) => {
          const bg = getComputedStyle(el).backgroundImage;
          const m = /url\(["']?(.*?)["']?\)/.exec(bg);
          return m ? m[1] : null;
        });
        // From CDP, by URL. The page's own entry for this image is zeroed by the
        // missing Timing-Allow-Origin, so reading it would report a free fetch.
        const timing = url ? (imageResponses.get(url) ?? { missing: true, seen: [...imageResponses.keys()].length }) : null;
        // What the page CAN see, kept for the wall-clock span only.
        const pageDuration = url
          ? await page.evaluate((u) => {
              const id = u.split("/").pop().split("?")[0];
              const e = performance.getEntriesByType("resource").find((r) => r.name.includes(id));
              return e ? { startTime: +e.startTime.toFixed(0), durationMs: +e.duration.toFixed(1) } : null;
            }, url)
          : null;

        // Decode, isolated: the bytes are cached by now, so what remains is the
        // decode of exactly this image at exactly this size.
        const decodeMs = url
          ? await page.evaluate(async (u) => {
              const img = new Image();
              img.src = u;
              const t = performance.now();
              try { await img.decode(); } catch { return null; }
              return +(performance.now() - t).toFixed(1);
            }, url)
          : null;

        // THE CLAIM, as a signed number: positive means the bytes were asked for
        // this many ms BEFORE the box mounted, which is only possible if the
        // request no longer waits on the open delay.
        const requestedAbs = url ? imageRequestedAt.get(url) : null;
        const fetchStartedBeforeBoxMs = requestedAbs ? boxMountedAtAbs - requestedAbs : null;

        report.rows.push({
          surface: "decklist hover preview",
          mode,
          openDelayMs: boxAt,
          fetchStartedBeforeBoxMs,
          observedPaintedMs: paintedAt,
          paintObservationGapMs: paint.gapMs,
          paintUnobserved: paint.reason,
          imageUrl: url,
          scryfallSize: scryfallSize(url ?? ""),
          phases: timing && !timing.missing ? phasesOf(timing) : null,
          pageVisibleTiming: pageDuration,
          timingLookup: timing?.missing ? timing : undefined,
          decodeMs,
          filmstrip: samples,
          firstFrameBytes: firstBytes,
          note:
            mode === "cold"
              ? "browser cache cleared; the first hover of a session"
              : "image already in cache; what a second hover of the same card costs",
        });
        console.log(
          `${mode.padEnd(5)} preview: box at ${boxAt}ms, painted at ${paintedAt ?? "?"}ms, ` +
            `fetch started ${fetchStartedBeforeBoxMs ?? "?"}ms before the box, ` +
            `fetch ${pageDuration ? pageDuration.durationMs : "?"}ms, ` +
            `${timing && !timing.missing ? Math.round(phasesOf(timing).encodedBytes / 1024) : "?"}KB, ` +
            `decode ${decodeMs ?? "?"}ms` +
            (timing?.missing ? ` | CDP saw ${timing.seen} image response(s), none for this URL` : ""),
        );
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);
      }
    } else {
      console.log("preview: skipped at this width — the hover preview is desktop only by design");
      report.rows.push({
        surface: "decklist hover preview",
        mode: "n/a",
        skipped: "desktop only — hover-preview.tsx requires (hover: hover); no phone reader reaches it",
      });
    }

    const out = args.get("out");
    if (out) {
      writeFileSync(out, JSON.stringify(report, null, 2));
      console.log(`wrote ${out}`);
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
