// Live password strength (Small items 11 addendum R1c, PR 2): the browser probe and contact sheet for the panel under Q1's
// and K5's new password, on `pnpm dev` against Clerk's DEVELOPMENT instance only (it refuses pk_live/sk_live).
//
// Run by hand, with a dev server on this worktree: `PROBE_BASE=http://localhost:<port> pnpm tsx scripts/probe-password-strength-ui.mts`.
// Not part of `pnpm test`: it needs a browser, a dev server and Clerk.
//
// Q1 (/sign-up): a per-run invitation (notify: false) for an address with no account, whose ticket is opened directly; the
// invitation is revoked in the `finally`. K5 (/sign-in): a `+clerk_test` dev user (`PROBE_K5_EMAIL`, default the audit
// user), through Forgot password and Clerk's fixed test code 424242. Only passwords Clerk REFUSES are ever pressed (from
// `strength-fixture.json`): the invitation is never accepted and the user's password never changes.
//
// For each surface and width (390, 1300) and each of the six themes (the `the99_theme` cookie and the page's `data-theme`),
// it types each state (E, U, W, G, S, and W·all on Q1), presses Q2 to Q4, and asserts the lit segments, the word, the guide
// states, the field's aria-describedby, the polite line after 1s, the alert, and the ink of the lit segments against the
// theme's tokens. It also asserts the estimator's chunk loads only on the field's first focus, and draws a blocked-chunk
// frame. Shots and one contact sheet per surface and width land in `PROBE_OUT`.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium, type Page } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { joinCopy, signInCopy, signUpCopy } from "../src/lib/copy/join";
import { strengthCopy } from "../src/lib/copy/strength";

const { CLERK_SECRET_KEY: SECRET, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PUBLISHABLE } = requireEnv([
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
]);
if (!PUBLISHABLE.startsWith("pk_test_") || !SECRET.startsWith("sk_test_")) {
  throw new Error("Refusing: this probe runs against Clerk's development instance only (pk_test/sk_test).");
}
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = process.env.PROBE_OUT ?? join(process.cwd(), "probe-out", "password-strength");
const K5_EMAIL = process.env.PROBE_K5_EMAIL ?? "alpha-test+clerk_test@the99.app";
if (!K5_EMAIL.includes("+clerk_test")) throw new Error("PROBE_K5_EMAIL must be a +clerk_test address (code 424242).");
const THEMES = ["amonkhet", "kamigawa", "ixalan", "phyrexia", "eldraine", "kaldheim"] as const;
const WIDTHS = [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1300, height: 900 }] as const;
const ESTIMATOR_CHUNK = /zxcvbn|strength-estimator|strength_estimator/;

// Only passwords Clerk refuses are pressed: each is checked against the recorded answers before the run starts.
const fixture = JSON.parse(readFileSync(new URL("../src/lib/auth/strength-fixture.json", import.meta.url), "utf8")) as {
  rows: { password: string; clerk: string }[];
};
const clerkSays = (pw: string) => fixture.rows.find((r) => r.password === pw)?.clerk;

type Guides = [boolean, boolean, boolean];
type State = {
  key: string;
  pw: string;
  /** Expected lit segments and word. */
  lit: number;
  word: string;
  /** Expected guides, where the build pins them (`null`: recorded, not asserted). */
  guides: Guides | null;
  press?: string;
  stillWeak?: boolean;
};
const W = strengthCopy.word;
const STATES: State[] = [
  { key: "E", pw: "", lit: 0, word: "", guides: [false, false, false] },
  { key: "U", pw: "colin9", lit: 0, word: "", guides: [false, true, false] },
  // Design drew `colinmtg`, which Clerk accepts: `sunflower` is the sample swap (Clerk refuses it as weak).
  { key: "W", pw: "sunflower", lit: 1, word: W.weak, guides: [true, false, false] },
  // Design drew `Kq#7mzpa`, which Clerk accepts: `Rummage#4` (score 1, no warning) is the sample swap.
  { key: "W-all", pw: "Rummage#4", lit: 1, word: W.weak, guides: [true, true, true], stillWeak: true },
  { key: "G", pw: "tidal-rummage", lit: 2, word: W.good, guides: [true, true, true] },
  { key: "S", pw: "copper fox casts ninety", lit: 3, word: W.strong, guides: [true, false, true] },
  { key: "Q2", pw: "colin9", lit: 0, word: "", guides: [false, true, false], press: signInCopy.tooShort },
  { key: "Q3", pw: "sunflower", lit: 0, word: "", guides: [true, false, false], press: signInCopy.tooWeak },
  // No breached sample ticks all three guides: `Strawberry!123` holds the third open (sample-state note).
  { key: "Q4", pw: "Strawberry!123", lit: 0, word: "", guides: [true, true, false], press: signInCopy.breached },
];
for (const s of STATES) {
  if (s.press && s.pw.length >= 8 && clerkSays(s.pw) === "accepted") throw new Error(`Refusing to press ${s.key}: Clerk accepts it.`);
  if (s.press && s.pw.length >= 8 && !clerkSays(s.pw)) throw new Error(`Refusing to press ${s.key}: no recorded Clerk answer.`);
}

const clerkApi = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Clerk ${init.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(body?.errors?.map((e: { code: string }) => e.code))}`);
  return body;
};

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail?: unknown) => {
  results.push({ name, ok, detail: ok ? undefined : JSON.stringify(detail) });
  if (!ok) console.log(`FAIL ${name} ${JSON.stringify(detail)}`);
};

/** The panel as drawn: meter, word, guides, the field's description, the polite line, the alert, and the lit ink. */
// The in-page reader is a plain string: tsx (esbuild keepNames) wraps a named function in `__name`, which the page lacks.
const READ_PANEL = `(label) => {
  const main = document.querySelector("main");
  const meter = main.querySelector("[data-strength]");
  const lit = meter ? [...meter.querySelectorAll("span[data-on]")] : [];
  const input = [...main.querySelectorAll("label")].find((l) => l.querySelector("span")?.textContent === label)?.querySelector("input");
  const resolve = (v) => {
    const probe = document.createElement("span");
    probe.style.background = "var(" + v + ")";
    main.appendChild(probe);
    const c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  };
  return {
    present: !!meter,
    lit: lit.length,
    litInk: lit.map((s) => getComputedStyle(s).backgroundColor),
    fgMuted: resolve("--fg-muted"),
    accent: resolve("--accent"),
    word: meter?.nextElementSibling?.textContent ?? null,
    guides: [...main.querySelectorAll("#password-strength li")].map((li) => li.hasAttribute("data-met")),
    describedBy: input?.getAttribute("aria-describedby") ?? null,
    live: main.querySelector("[data-strength-live]")?.textContent ?? null,
    alert: main.querySelector("[role=alert]")?.textContent ?? null,
    text: main.textContent ?? "",
  };
}`;
type Panel = {
  present: boolean; lit: number; litInk: string[]; fgMuted: string; accent: string; word: string | null;
  guides: boolean[]; describedBy: string | null; live: string | null; alert: string | null; text: string;
};

/** The panel as drawn: meter, word, guides, the field's description, the polite line, the alert, and the lit ink. */
async function readPanel(page: Page, label: string): Promise<Panel> {
  return page.evaluate(`(${READ_PANEL})(${JSON.stringify(label)})`) as Promise<Panel>;
}

function announce(lit: number, word: string, guides: Guides | null, read: Guides) {
  const met = (guides ?? read).filter(Boolean).length;
  return lit === 0 && !word ? strengthCopy.announceShort(met) : strengthCopy.announce(word, met);
}

/** The panel's box, padded, for the contact sheet: from the field's label to the press under it. */
async function panelClip(page: Page, label: string, pressName: string) {
  const top = await page.locator("main").getByText(label, { exact: true }).first().boundingBox();
  const bottom = await page.locator("main").getByRole("button", { name: pressName }).boundingBox();
  if (!top || !bottom) return undefined;
  const x = Math.max(0, Math.min(top.x, bottom.x) - 16);
  return { x, y: Math.max(0, top.y - 12), width: Math.max(bottom.width, 360) + 32, height: bottom.y + bottom.height - top.y + 24 };
}

async function setTheme(page: Page, theme: string) {
  await page.context().addCookies([{ name: "the99_theme", value: theme, url: BASE }]);
  await page.evaluate(`document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)})`);
}

type Surface = {
  key: "q1" | "k5";
  label: string;
  press: string;
  pressBusy?: string;
  open: (page: Page) => Promise<void>;
  states: State[];
};

async function runSurface(surface: Surface, width: (typeof WIDTHS)[number], browser: import("playwright").Browser) {
  const ctx = await browser.newContext({ viewport: { width: width.width, height: width.height }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: "the99_theme", value: "amonkhet", url: BASE }]);
  const page = await ctx.newPage();
  await setupClerkTestingToken({ page });
  const chunks: string[] = [];
  page.on("request", (r) => {
    if (ESTIMATOR_CHUNK.test(r.url())) chunks.push(r.url());
  });
  const cells: { theme: string; state: string; file: string }[] = [];
  const tag = `${surface.key}@${width.name}`;
  try {
    await surface.open(page);
    const field = page.locator("main").getByLabel(surface.label, { exact: true });
    await page.waitForTimeout(1500);
    check(`${tag}: the estimator chunk is not in the first load`, chunks.length === 0, chunks);
    await field.focus();
    await page.waitForTimeout(3000);
    check(`${tag}: the estimator chunk loads on the field's first focus`, chunks.length > 0, chunks.length);

    for (const theme of THEMES) {
      await setTheme(page, theme);
      for (const s of surface.states) {
        await field.fill(s.pw);
        if (s.press) {
          await page.locator("main").getByRole("button", { name: surface.press }).click();
          await page.locator("main").getByRole("alert").waitFor({ timeout: 15_000 });
          await page.waitForTimeout(1200);
        } else {
          // The polite line speaks once typing pauses for 1s.
          await page.waitForTimeout(1300);
        }
        const p = await readPanel(page, surface.label);
        const name = `${tag} ${theme} ${s.key}`;
        check(`${name}: lit ${s.lit}`, p.lit === s.lit, p.lit);
        check(`${name}: word "${s.word}"`, p.word === s.word, p.word);
        if (s.guides) check(`${name}: guides`, JSON.stringify(p.guides) === JSON.stringify(s.guides), p.guides);
        else check(`${name}: three guides`, p.guides.length === 3, p.guides);
        if (s.press) {
          check(`${name}: Clerk's line in the slot`, p.alert === s.press, p.alert);
          check(`${name}: describedby names the line and the guides`, p.describedBy === "sign-in-line password-strength", p.describedBy);
        } else {
          check(`${name}: no alert`, p.alert === null, p.alert);
          check(`${name}: describedby names the guides`, p.describedBy === "password-strength", p.describedBy);
          if (s.key !== "E") check(`${name}: polite line`, p.live === announce(s.lit, s.word, s.guides, p.guides as Guides), p.live);
          const ink = s.lit === 0 ? null : s.word === W.weak ? p.fgMuted : p.accent;
          if (ink) check(`${name}: lit ink is the theme's token`, p.litInk.every((c) => c === ink), { lit: p.litInk, want: ink });
        }
        check(`${name}: still-weak line ${s.stillWeak ? "shows" : "hidden"}`, p.text.includes(strengthCopy.stillWeak) === !!s.stillWeak);
        const file = `${surface.key}-${width.name}-${theme}-${s.key}.png`;
        await page.screenshot({ path: join(OUT, "cells", file), clip: await panelClip(page, surface.label, surface.press) });
        if (theme === "amonkhet") await page.screenshot({ path: join(OUT, "full", file), fullPage: true });
        cells.push({ theme, state: s.key, file });
        // The next keystroke clears a refusal.
        if (s.press) {
          await field.press("End");
          await field.press("x");
          const after = await readPanel(page, surface.label);
          check(`${name}: the next keystroke clears the refusal`, after.alert === null, after.alert);
        }
      }
    }
  } finally {
    await ctx.close();
  }
  return cells;
}

/** The blocked-chunk frame: the estimator's chunk fails, and 8+ characters still draw the under-8 frame. */
async function blockedFrame(surface: Surface, browser: import("playwright").Browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: "the99_theme", value: "amonkhet", url: BASE }]);
  const page = await ctx.newPage();
  await setupClerkTestingToken({ page });
  let blocked = 0;
  await page.route(ESTIMATOR_CHUNK, (route) => {
    blocked++;
    return route.abort();
  });
  try {
    await surface.open(page);
    const field = page.locator("main").getByLabel(surface.label, { exact: true });
    await field.focus();
    await page.waitForTimeout(2500);
    await field.fill("copper fox casts ninety");
    await page.waitForTimeout(1300);
    const p = await readPanel(page, surface.label);
    const name = `${surface.key} blocked chunk`;
    check(`${name}: the estimator's request was blocked`, blocked > 0, blocked);
    check(`${name}: meter 0, no word`, p.lit === 0 && p.word === "", p);
    check(`${name}: third guide open`, JSON.stringify(p.guides) === "[true,false,false]", p.guides);
    check(`${name}: the press still works`, await page.locator("main").getByRole("button", { name: surface.press }).isEnabled());
    const file = `${surface.key}-phone-amonkhet-blocked.png`;
    await page.screenshot({ path: join(OUT, "cells", file), clip: await panelClip(page, surface.label, surface.press) });
    return file;
  } finally {
    await ctx.close();
  }
}

function sheet(title: string, cells: { theme: string; state: string; file: string }[], extra?: string) {
  const states = [...new Set(cells.map((c) => c.state))];
  const rows = THEMES.map(
    (t) =>
      `<tr><th>${t}</th>${states.map((s) => {
        const c = cells.find((x) => x.theme === t && x.state === s);
        return `<td>${c ? `<img src="cells/${c.file}">` : ""}</td>`;
      }).join("")}</tr>`,
  ).join("");
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><style>body{font:12px system-ui;background:#fff;margin:12px}td,th{vertical-align:top;padding:4px}img{width:240px}</style>
<h1>${title}</h1><table><tr><th></th>${states.map((s) => `<th>${s}</th>`).join("")}</tr>${rows}</table>${extra ? `<p>Blocked chunk:</p><img src="cells/${extra}">` : ""}`;
}

mkdirSync(join(OUT, "cells"), { recursive: true });
mkdirSync(join(OUT, "full"), { recursive: true });
await clerkSetup({ publishableKey: PUBLISHABLE, secretKey: SECRET } as Parameters<typeof clerkSetup>[0]);

const stamp = Date.now();
const inviteEmail = `ps-probe-${stamp}+clerk_test@example.com`;
let invitationId: string | null = null;
const browser = await chromium.launch();
try {
  const invitation = await clerkApi("/invitations", {
    method: "POST",
    body: JSON.stringify({ email_address: inviteEmail, notify: false, redirect_url: `${BASE}/sign-up`, expires_in_days: 1 }),
  });
  invitationId = invitation.id;
  // The accept link (`/v1/tickets/accept?ticket=…`) hands this same ticket to `/sign-up` as `__clerk_ticket`.
  const accept = new URL(invitation.url).searchParams;
  const ticket = accept.get("__clerk_ticket") ?? accept.get("ticket");
  if (!ticket) throw new Error("The invitation's link carries no ticket.");

  const q1: Surface = {
    key: "q1",
    label: signInCopy.passwordLabel,
    press: signUpCopy.make,
    states: STATES,
    open: async (page) => {
      await page.goto(`${BASE}/sign-up?__clerk_ticket=${encodeURIComponent(ticket)}`, { waitUntil: "domcontentloaded" });
      await page.locator("main").getByLabel(signUpCopy.nameLabel).waitFor({ timeout: 45_000 });
      await page.locator("main").getByLabel(signUpCopy.nameLabel).fill("Colin");
    },
  };
  const k5: Surface = {
    key: "k5",
    label: signInCopy.newPasswordLabel,
    press: signInCopy.save,
    states: STATES.filter((s) => s.key !== "W-all"),
    open: async (page) => {
      await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
      const main = page.locator("main");
      // Typed before hydration, the address is dropped and Continue stays disabled: wait for Clerk first.
      await page.waitForFunction("window.Clerk?.loaded === true", null, { timeout: 60_000 });
      await main.getByLabel(joinCopy.emailLabel).fill(K5_EMAIL);
      await main.getByRole("button", { name: signInCopy.continue, exact: true }).click();
      await main.getByRole("button", { name: signInCopy.forgot }).click({ timeout: 30_000 });
      await main.getByRole("textbox", { name: joinCopy.codeAria }).fill("424242", { timeout: 30_000 });
      await main.getByRole("button", { name: joinCopy.confirm, exact: true }).click();
      await main.getByLabel(signInCopy.newPasswordLabel, { exact: true }).waitFor({ timeout: 30_000 });
    },
  };

  const sheets: string[] = [];
  // `PROBE_SURFACES=k5` re-runs one surface.
  const only = process.env.PROBE_SURFACES?.split(",");
  for (const surface of [q1, k5].filter((x) => !only || only.includes(x.key))) {
    for (const width of WIDTHS) {
      const cells = await runSurface(surface, width, browser);
      const extra = width.name === "phone" ? await blockedFrame(surface, browser) : undefined;
      const file = `sheet-${surface.key}-${width.name}.html`;
      writeFileSync(join(OUT, file), sheet(`${surface.key.toUpperCase()} at ${width.width}`, cells, extra));
      sheets.push(file);
    }
  }
  // Each sheet photographed whole, so the contact sheet is one image per surface and width.
  const ctx = await browser.newContext({ viewport: { width: 2600, height: 1200 } });
  const page = await ctx.newPage();
  for (const file of sheets) {
    await page.goto(`file://${join(OUT, file)}`);
    await page.screenshot({ path: join(OUT, file.replace(/\.html$/, ".png")), fullPage: true });
  }
  await ctx.close();
} finally {
  await browser.close();
  if (invitationId) {
    await clerkApi(`/invitations/${invitationId}/revoke`, { method: "POST" }).then(
      () => console.log("invitation revoked"),
      (e) => console.log(`REVOKE FAILED for ${invitationId}: ${e.message}`),
    );
  }
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
console.log(`${results.length - failed.length}/${results.length} checks pass; out: ${OUT}`);
process.exit(failed.length ? 1 : 0);
