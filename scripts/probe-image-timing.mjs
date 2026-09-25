// How long from hover to a painted card preview, and where that time goes.
//
// Hugh's question (2026-09-25): "Card images take a second to load, both for the
// card hover preview and for card details. Could we use a CDN? Or batched
// requests?" This measures THE PREVIEW half, decomposed into our own delay, the
// image request (DNS, TLS, TTFB, bytes) and decode.
//
// THE CARD-DETAILS HALF IS NOT HERE. Its art is requested by `card-modal.tsx`,
// which another lane owns tonight, so the candidate that would change it is a
// write-up rather than a build — and measuring a surface nobody is changing
// would be a number with nothing to compare against. When that lane takes it,
// press-to-painted belongs in this file beside the preview.
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
    cdp.on("Network.requestWillBeSent", (e) => {
      const u = e.request?.url ?? "";
      if (!u.includes(IMAGE_HOST)) return;
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
