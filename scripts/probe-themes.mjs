// Phase 3 gate for the theme system: walks the app under all six themes at both
// widths and reports what is actually painted.
//
// The failure this exists to catch is a surface the tokenization sweep missed.
// A missed literal is invisible under Amonkhet, because the literal and the
// token agree there — it only shows up when a second theme is applied and one
// element stays brass while everything around it moves. So the probe samples
// every painted colour in the layout and flags any value that is identical
// across all six themes while sitting in a family that is supposed to move.
//
// Run by hand, like its siblings, and not part of `pnpm test`:
//   node --env-file=.env scripts/probe-themes.mjs
import { mkdir } from "node:fs/promises";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SECRET = process.env.CLERK_SECRET_KEY;
// Whose account to walk. The probe wants the seeded one — an empty collection
// paints a fraction of the elements, and an unpainted element cannot be caught
// keeping a literal. Its sibling probes sign in by password, but the audit user
// they name is not a member of this Clerk instance; a backend-issued sign-in
// ticket needs no password and works for whichever account actually holds data.
const EMAIL = process.env.PROBE_USER_EMAIL ?? "hugh@featherweight.design";
// The reel the run leaves behind. Playwright will not create a missing parent,
// so on a fresh machine the first screenshot throws and the whole walk is lost.
const SHOTS = process.env.PROBE_SHOT_DIR ?? "/tmp/theme-shots";
if (!SECRET) throw new Error("Set CLERK_SECRET_KEY.");

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

const THEMES = ["amonkhet", "kamigawa", "innistrad", "phyrexia", "duskmourn", "kaldheim"];
const ROUTES = ["/", "/collection", "/commanders", "/decks"];
const VIEWPORTS = [
  { label: "390", width: 390, height: 844 },
  { label: "desktop", width: 1300, height: 900 },
];

// Amonkhet's brass family, as rgb() — what a missed literal paints. Neutral
// chrome is excluded: a grey that happens to repeat across themes is a
// coincidence, but a brass that repeats is a literal.
const BRASS = new Set([
  "rgb(201, 162, 75)", "rgb(207, 135, 69)", "rgb(222, 151, 87)",
  "rgb(171, 110, 55)", "rgb(107, 72, 42)", "rgb(217, 151, 92)",
  "rgb(169, 134, 62)", "rgb(110, 91, 51)",
]);

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

// One sample per visible element: a stable path, plus the four painted colours.
function sample(page) {
  return page.evaluate(() => {
    const path = (el) => {
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && parts.length < 6; n = n.parentElement) {
        const i = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0;
        parts.unshift(`${n.tagName.toLowerCase()}:${i}`);
      }
      return parts.join(">");
    };
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) continue;
      const s = getComputedStyle(el);
      out.push({
        path: path(el),
        text: (el.textContent ?? "").trim().slice(0, 30),
        color: s.color,
        background: s.backgroundColor,
        borderColor: s.borderTopColor,
        fill: s.fill,
      });
    }
    return out;
  });
}

await clerkSetup();

await mkdir(SHOTS, { recursive: true });

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
    // theme -> path -> {prop: value}
    const seen = new Map();
    for (const theme of THEMES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.waitForTimeout(150);
      for (const row of await sample(page)) {
        const key = `${row.path}|${row.text}`;
        if (!seen.has(key)) seen.set(key, new Map());
        seen.get(key).set(theme, row);
      }
      await page.screenshot({
        path: `${SHOTS}/${theme}-${viewport.label}-${route.replace(/\W+/g, "_")}.png`,
        fullPage: false,
      });
    }

    for (const [key, byTheme] of seen) {
      if (byTheme.size !== THEMES.length) continue;
      for (const prop of ["color", "background", "borderColor", "fill"]) {
        const values = THEMES.map((t) => byTheme.get(t)[prop]);
        if (!BRASS.has(values[0])) continue;
        if (new Set(values).size === 1) {
          findings.push(`${viewport.label} ${route} ${prop}=${values[0]} on ${key}`);
        }
      }
    }
  }
  await context.close();
}

await browser.close();

if (findings.length === 0) {
  console.log("No element keeps an Amonkhet brass across all six themes.");
} else {
  console.log(`${findings.length} element(s) stayed brass under every theme:`);
  for (const f of findings) console.log("  " + f);
}
