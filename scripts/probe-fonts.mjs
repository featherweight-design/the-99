// Phase 4 gate for the theme system: measures every display-face heading under
// all six themes at both widths and reports the ones whose line count grows.
//
// The failure this exists to catch is a metrics failure, not a colour one. The
// six display faces have different advance widths at the same nominal size, so
// a heading that sits on one line in Cinzel can wrap in Metamorphous or
// Syncopate — and a wrapped heading in a fixed-height row clips rather than
// reflows. Cinzel is the baseline because it is what every heading was drawn
// against; any theme that adds a line to a heading Cinzel fits is a finding.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   PROBE_USER_EMAIL=you@example.com node --env-file=.env scripts/probe-fonts.mjs
import { readFileSync } from "node:fs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SECRET = process.env.CLERK_SECRET_KEY;
// The seeded account. An empty collection renders a fraction of the headings,
// and a heading that never renders cannot be caught wrapping. Named rather than
// defaulted: which account holds a collection is a property of the Clerk
// instance a run points at, not of this file.
const EMAIL = process.env.PROBE_USER_EMAIL;
if (!SECRET) throw new Error("Set CLERK_SECRET_KEY.");
if (!EMAIL) throw new Error("Set PROBE_USER_EMAIL to an account that holds a collection.");

async function clerkApi(path, init) {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Clerk ${path}: ${JSON.stringify(body)}`);
  return body;
}

async function signInTicket() {
  const users = await clerkApi(`/users?email_address=${encodeURIComponent(EMAIL)}`);
  const user = users[0];
  if (!user) throw new Error(`No Clerk user for ${EMAIL} in this instance.`);
  const { token } = await clerkApi("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: user.id, expires_in_seconds: 3600 }),
  });
  return token;
}

const BASELINE = "amonkhet";
// Read from the stylesheet rather than restated here, so a seventh theme cannot
// ship with its face unmeasured while the run still reports clean. Amonkhet is
// named because it deliberately has no block of its own: it is the `:root`
// default, which is what makes an unrecognised value degrade to a whole theme.
const SHEET = new URL("../src/app/globals.css", import.meta.url);
const THEMES = [
  ...new Set([
    "amonkhet",
    ...[...readFileSync(SHEET, "utf8").matchAll(/\[data-theme="([a-z]+)"\]/g)].map((m) => m[1]),
  ]),
];
if (THEMES.length < 2) throw new Error(`Read no [data-theme] blocks from ${SHEET.pathname}.`);
const ROUTES = ["/", "/collection", "/commanders", "/decks"];
const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "desktop", width: 1300, height: 900 },
];

async function signIn(page, ticket) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (ticket) => {
    try {
      const attempt = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket });
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, ticket);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// One sample per display-face element: its text, its line count, and whether it
// overflows the box it was given.
function sample(page) {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll(".font-display")) {
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      out.push({
        text: (el.textContent ?? "").trim().slice(0, 40),
        lines: Math.round(box.height / lineHeight),
        fontSize: style.fontSize,
        // A heading whose ink is wider than its box overflows it — whether it
        // spills over its neighbours under `overflow: visible` or is cut off
        // under `overflow: hidden`. Both are defects. The one overflow that is
        // not is an ellipsis: a `truncate` site is *meant* to run past its box,
        // so a wider face reaching that point sooner is a threshold shift, not
        // a defect. Without that exemption the run buries its real findings
        // under every long deck and commander name in the fixtures.
        clipped: el.scrollWidth > el.clientWidth + 1 && style.textOverflow !== "ellipsis",
      });
    }
    return out;
  });
}

await clerkSetup();

const browser = await chromium.launch();
const findings = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  // A sign-in token is single-use, so each context gets its own.
  await signIn(page, await signInTicket());

  for (const route of ROUTES) {
    // theme -> "text|fontSize" -> sample
    const seen = new Map();
    for (const theme of THEMES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      // The face is fetched on first paint under the new theme; without this the
      // measurement is taken against the fallback and every theme looks the same.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const rows = new Map();
      for (const row of await sample(page)) rows.set(`${row.text}|${row.fontSize}`, row);
      seen.set(theme, rows);
    }

    const baseline = seen.get(BASELINE);
    for (const theme of THEMES) {
      if (theme === BASELINE) continue;
      for (const [key, row] of seen.get(theme)) {
        const base = baseline.get(key);
        if (!base) continue;
        if (row.lines > base.lines) {
          findings.push(
            `${viewport.label} ${route} ${theme}: "${row.text}" wraps to ${row.lines} lines (${BASELINE}: ${base.lines}) at ${row.fontSize}`,
          );
        }
        if (row.clipped && !base.clipped) {
          findings.push(
            `${viewport.label} ${route} ${theme}: "${row.text}" is clipped at ${row.fontSize}`,
          );
        }
      }
    }
  }
  await context.close();
}

await browser.close();

if (findings.length === 0) {
  console.log(`No display heading gains a line or clips against ${BASELINE}.`);
} else {
  console.log(`${findings.length} heading(s) changed metrics:`);
  for (const f of findings) console.log("  " + f);
}
