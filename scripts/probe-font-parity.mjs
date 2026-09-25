// Do the self-hosted fonts render exactly what Google's did?
//
// Three readings per route per width, because a screenshot alone cannot answer
// the question:
//
//   COMPUTED FAMILY — what the browser actually resolved for the display face
//   and the body text. A wrong `variable` name leaves the CSS custom property
//   unset and the text falls back to a system face, which a diff would catch,
//   but the family string names WHICH face and is the precise reading.
//
//   FONT REQUEST COUNT — the trap a screenshot cannot see. Six of the eight
//   families carry `preload: false` on purpose: Next emits all eight @font-face
//   blocks unconditionally and the browser fetches only the family it actually
//   renders. Setting `preload: true` (or omitting it on a display face) makes
//   every page drag down all eight. The page looks IDENTICAL either way. Only
//   the count moves.
//
//   TEXT METRICS — the width and height of a fixed string rendered in every
//   family at every declared weight. This is what proves the same glyphs draw: a
//   different file, a missing weight, or a silent fallback to a system face all
//   move the measured width, and none need a screenshot.
//
//   A SCREENSHOT HASH WAS TRIED FIRST AND REJECTED. It is not stable on ONE
//   build: two runs against the same server disagreed on 3 of 4 rows, because
//   these pages carry dates, deck data and ordering that move between loads. A
//   hash that differs from itself cannot tell a font change from a Tuesday, and
//   comparing it across builds produced four confident DIFFERS that meant
//   nothing.
//
// Run it against the BEFORE build and the AFTER build and compare the JSON.
import { writeFileSync } from "node:fs";
import { requireEnv } from "./lib/env.mjs";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

/** Routes chosen for face coverage: one draws the display face large, one is body-heavy. */
const ROUTES = ["/", "/decks"];
const WIDTHS = [1300, 390];

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
  const report = { base: BASE, takenAt: new Date().toISOString(), rows: [] };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    const page = await ctx.newPage();
    await setupClerkTestingToken({ page });
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
    const failure = await page.evaluate(
      async ([email, password]) => {
        try {
          const signIn = window.Clerk.client.signIn;
          let a = email.includes("+clerk_test")
            ? await signIn.create({ identifier: email })
            : await signIn.create({ identifier: email, password });
          if (a.status === "needs_first_factor" || a.status === "needs_client_trust") {
            const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
            await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
            a = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
          }
          if (a.status !== "complete") return `sign-in status: ${a.status}`;
          await window.Clerk.setActive({ session: a.createdSessionId });
          return null;
        } catch (e) {
          return e?.errors?.[0]?.longMessage ?? String(e);
        }
      },
      [EMAIL, PASSWORD],
    );
    if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
    const state = await ctx.storageState();
    await ctx.close();

    for (const width of WIDTHS) {
      for (const route of ROUTES) {
        // A FRESH CONTEXT PER READING, so the font request count is the count
        // this page load caused. Reusing one context means every route after the
        // first reports zero fonts fetched and the trap this probe exists for
        // becomes invisible.
        const fresh = await browser.newContext({
          viewport: { width, height: width < 768 ? 844 : 900 },
          storageState: state,
        });
        const p = await fresh.newPage();
        const fontRequests = [];
        p.on("request", (r) => {
          if (r.resourceType() === "font") fontRequests.push(new URL(r.url()).pathname.split("/").pop());
        });
        await p.goto(`${BASE}${route}`, { waitUntil: "load" });
        await p.waitForTimeout(2500);

        const families = await p.evaluate(() => {
          const body = document.body;
          const heading = document.querySelector("main h1, main h2, h1, h2");
          const mono = document.querySelector("[class*='font-mono'], code, pre");
          const read = (el) => (el ? getComputedStyle(el).fontFamily : null);
          return {
            body: read(body),
            heading: read(heading),
            mono: read(mono),
            displayVar: getComputedStyle(document.documentElement).getPropertyValue("--font-display-face").trim(),
          };
        });
        // THE COUNT IS TAKEN BEFORE THE METRICS PROBE RUNS. Measuring every face
        // forces every file to load, so a count read afterwards reports 14-15 on
        // any build and can never show the preload regression this exists for.
        const fontRequestsOnLoad = [...fontRequests];

        const metrics = await p.evaluate(async () => {
          const FACES = [
            ["--font-cinzel", [600, 700, 800, 900]],
            ["--font-chakra-petch", [500, 600, 700]],
            ["--font-trirong", [600, 700]],
            ["--font-syncopate", [400, 700]],
            ["--font-cormorant-garamond", [600, 700]],
            ["--font-metamorphous", [400]],
            ["--font-plex-sans", [400, 500, 600]],
            // The italic axis, measured because dropping it was invisible to
            // every other reading here: the upright metrics matched, the page
            // looked right, and only the request count moved.
            ["--font-plex-sans", [400, 500, 600], "italic"],
            ["--font-plex-mono", [400, 500, 600]],
          ];
          const probe = document.createElement("span");
          probe.style.cssText =
            "position:fixed;left:-9999px;top:0;font-size:100px;white-space:pre;visibility:hidden";
          probe.textContent = "Handgloves 0123 WiIl";
          document.body.appendChild(probe);
          const out = {};
          for (const [variable, weights, style = "normal"] of FACES) {
            const family = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
            if (!family) {
              for (const weight of weights) out[`${variable}@${weight}/${style}`] = "VARIABLE-UNSET";
              continue;
            }
            for (const weight of weights) {
              // WAIT FOR THE FACE. Setting font-family and measuring in the same
              // tick reports the FALLBACK's metrics — which is why an earlier run
              // had all three Chakra Petch weights at an identical 997.17: three
              // different weights cannot share an advance width, and that
              // identity was the tell that no real face had loaded.
              try {
                await document.fonts.load(`${style} ${weight} 100px ${family}`);
              } catch {
                out[`${variable}@${weight}/${style}`] = "LOAD-REJECTED";
                continue;
              }
              probe.style.fontFamily = family;
              probe.style.fontWeight = String(weight);
              probe.style.fontStyle = style;
              // Force layout after the face is available.
              void probe.offsetWidth;
              const r = probe.getBoundingClientRect();
              out[`${variable}@${weight}/${style}`] = `${r.width.toFixed(2)}x${r.height.toFixed(2)}`;
            }
          }
          probe.remove();
          return out;
        });
        report.rows.push({
          route,
          width,
          families,
          fontRequests: fontRequestsOnLoad.sort(),
          fontRequestCount: fontRequestsOnLoad.length,
          metrics,
        });
        console.log(
          `${String(width).padStart(4)} ${route.padEnd(9)} fonts:${String(fontRequestsOnLoad.length).padStart(2)} ` +
            `heading:${(families.heading ?? "?").split(",")[0]} body:${(families.body ?? "?").split(",")[0]}`,
        );
        await fresh.close();
      }
    }

    // LIVENESS: a run where no page fetched any font measured nothing — the
    // families would compare "equal" as two sets of system fallbacks.
    if (report.rows.every((r) => r.fontRequestCount === 0)) {
      throw new Error("no page fetched any font — every reading would compare equal while measuring nothing");
    }

    const out = args.get("out");
    if (out) {
      writeFileSync(out, JSON.stringify(report, null, 2));
      console.log(`\nwrote ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
