// probe:tuning-hub-stays-put — the Analysis tab's Tuning hub stays where it is, as the same node,
// before, during and after an analysis, at 1300x900 and 390x844 (Hugh, 2026-10-14).
//
// Two fixture decks, both CLONED under the probe account and deleted in a `finally`:
//  - one OVER its size (99 for a single commander, 98 for a pair). Analyze is refused for it, so
//    the press changes nothing and the hub must not move;
//  - one at EXACTLY its size and legal, never analyzed. Its press reads the bracket and, when the
//    account's credit note says so, writes the overview through the synopsis stand-in (no model
//    call outside production unless SYNOPSIS_LIVE=1; never set it for this probe).
//
// Four states per deck and width, sampled every animation frame from page load to the end:
//  idle      the tab settled, no analysis yet;
//  pressing  the first frame after the Analyze press;
//  running   the empty state in its loading phase (the reading, then the overview write);
//  done      the reading drawn, 2.5s after it landed.
// Asserted: the hub (`section[data-tuning-hub]`) is drawn in every sampled frame, is the SAME DOM
// node throughout (a handle taken at idle, compared and `isConnected` every frame), and its top
// (document coordinates) moves by at most 1px from idle through running. In the done state the
// reading is drawn ABOVE the hub, so its top moves by the reading's height by design; what is
// asserted there is that the hub sits directly under the analysis block (the same gap as at idle)
// and moved once, at the frame the reading landed, never in between. CLS is read from a
// PerformanceObserver over the whole sequence and printed (shifts from the press itself carry
// `hadRecentInput` and are listed apart).
// Before the first analysis: Suggested changes' tile is dimmed (inert) and Proposed cuts (over-size
// deck only: inert at size), Mana Balance and History open their tool when pressed.
//
// THE SECOND REPRO (Hugh, 2026-10-14), its own case, at both widths: on a deck over 99 Proposed cuts
// is opened, a result naming exactly the overage is stored (the stand-in for Look deeper: written
// through the real run store after the visit began, so no model is called), every cut is pressed
// through the real Cut button until the deck is at 99, and then the deck is analyzed. Asserted: the
// hub is drawn in every frame, Proposed cuts stays the open tool, and the tool panel under the tab
// row is never empty once its first read has landed (it finishes in place, C8).
//
// RUN IT AGAINST \`next dev\`, NEVER \`next start\`: the overview's model stand-in answers only
// outside production (\`synopsisLive\`), so a production server would make a REAL model call on the
// first press. Start the server with ANTHROPIC_API_KEY set to a dummy value as well, so a mistake
// fails instead of spending.
//
// The same switches must be given to the server: ANALYSIS_TAB_ENABLED, TUNING_ENABLED,
// MANA_BALANCE_ENABLED and PROPOSED_CUTS_ENABLED all `true`, and SYNOPSIS_STUB_DELAY_MS=3000 so the
// running state lasts long enough to be seen. Local-dev or a scratch branch only: it refuses
// staging and production by `neon.branch_id`, and a non-loopback PROBE_BASE.
//
//   PROBE_BASE=http://localhost:3462 pnpm probe:tuning-hub-stays-put
//   PROBE_WIDTH=390 runs one width.

import { neon } from "@neondatabase/serverless";
import type { Page, Browser } from "playwright";
import { randomUUID } from "node:crypto";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "") {
    throw new Error(`probe:tuning-hub-stays-put refuses PROBE_BASE ${BASE}: a loopback server with a port only.`);
  }
}
if (!EMAIL.includes("+clerk_test")) throw new Error("E2E_AUDIT_USER_EMAIL must be a +clerk_test account.");
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const WIDTHS = (process.env.PROBE_WIDTH ? [Number(process.env.PROBE_WIDTH)] : [1300, 390]);
const sql = neon(DATABASE_URL);
// PROBE_CASES=walk or =cuts runs one case; both by default.
const CASES = (process.env.PROBE_CASES ?? "walk,cuts").split(",");
// No signed-in reader here: the run store's switch reads take the environment itself (`process.env`).
process.env.PROPOSED_CUTS_ENABLED = "true";
process.env.ANALYSIS_TAB_ENABLED = "true";
const { readProposedCuts } = await import("../src/lib/decks/cuts-read");
const { persistCutsRun, startCutsRun } = await import("../src/lib/tuning/cuts-run-store");

let failures = 0;
function report(label: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page: Page): Promise<string> {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const clerk = (window as any).Clerk; // eslint-disable-line @typescript-eslint/no-explicit-any
      const s = clerk.client.signIn;
      let a = await s.create({ identifier: email });
      if (a.status === "needs_first_factor" || a.status === "needs_client_trust") {
        const f = a.supportedFirstFactors?.find((x: { strategy: string }) => x.strategy === "email_code");
        await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
        a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) {
      return (e as { errors?: { longMessage?: string }[] })?.errors?.[0]?.longMessage ?? String(e);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => (window as unknown as { Clerk: { user: { id: string } } }).Clerk.user.id);
}

type Shift = { at: number; value: number; input: boolean; sources: string[] };
type Stay = { frames: Frame[]; shifts: Shift[]; pressedAt: number | null; armed: boolean; handle: Element | null };
type LayoutShift = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: { node: Node | null; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[];
};
type Frame = { at: number; state: string; drawn: boolean; same: boolean | null; top: number | null; gap: number | null; heading: string | null; tool: string | null; toolEmpty: boolean };

// Installed before the page's own scripts. Every frame: which state the tab is in, whether the hub
// is drawn, whether it is the node first seen, and its top; plus every layout shift.
const OBSERVE = () => {
  const w: Stay = { frames: [], shifts: [], pressedAt: null, armed: false, handle: null };
  (window as unknown as { __stay: Stay }).__stay = w;
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as LayoutShift[]) {
        // What moved, named well enough to find: the node's tag, test id or first class, and its move.
        const sources = (e.sources ?? []).map((x) => {
          const n = x.node;
          const el = n instanceof HTMLElement ? n : null;
          const name = !n ? "?" : !el ? "#text" : `${el.tagName.toLowerCase()}${el.dataset.testid ? `[${el.dataset.testid}]` : el.hasAttribute("data-tuning-hub") ? "[hub]" : ""}`;
          return `${name} ${Math.round(x.previousRect.top)}→${Math.round(x.currentRect.top)} h${Math.round(x.previousRect.height)}→${Math.round(x.currentRect.height)}`;
        });
        w.shifts.push({ at: Math.round(e.startTime), value: e.value, input: e.hadRecentInput, sources });
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  const visible = (e: Element | null | undefined): e is Element => !!e && e.isConnected && e.getClientRects().length > 0;
  const tick = () => {
    const panel = document.querySelector("#panel-analysis");
    if (panel) {
      const empty = panel.querySelector<HTMLElement>("[data-testid='analysis-empty']");
      const verdict = [...panel.querySelectorAll("[data-testid='verdict-cell']")].find(visible);
      const loader = panel.querySelector("[data-opening-loader]");
      const state = visible(loader) ? "opening"
        : verdict ? "done"
          : visible(empty) && empty!.dataset.phase === "loading" ? "running"
            : visible(empty) ? (w.pressedAt !== null ? "pressing" : "idle") : "other";
      const hub = panel.querySelector("section[data-tuning-hub]");
      if (!w.handle && visible(hub) && state === "idle") w.handle = hub;
      // The block directly above the hub: the empty state, or the reading's own wrapper.
      const above = visible(empty) ? empty : verdict?.closest(".contents")?.lastElementChild ?? null;
      const top = hub && visible(hub) ? Math.round((hub.getBoundingClientRect().top + window.scrollY) * 10) / 10 : null;
      const aboveBottom = above && visible(above) ? Math.round((above.getBoundingClientRect().bottom + window.scrollY) * 10) / 10 : null;
      w.frames.push({
        at: Math.round(performance.now()),
        state,
        drawn: visible(hub),
        same: w.handle ? w.handle === hub && w.handle.isConnected : null,
        top,
        gap: top !== null && aboveBottom !== null ? Math.round((top - aboveBottom) * 10) / 10 : null,
        heading: empty?.querySelector("h2")?.textContent ?? null,
        tool: hub?.querySelector("#tuning-tool-panel")?.getAttribute("data-tuning-tool") ?? null,
        toolEmpty: (() => {
          const t = hub?.querySelector("#tuning-tool-panel");
          return !!t && visible(hub) && (t.textContent ?? "").trim() === "";
        })(),
      });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // Armed by the probe just before the Analyze press, so the tab press that opened the panel is not it.
  addEventListener("pointerdown", () => { if (w.armed && w.pressedAt === null) w.pressedAt = Math.round(performance.now()); }, true);
};

// Clones a deck's row and list under `owner`, publishing the id before the first write.
async function clone(owner: string, source: string, onId: (id: string) => void): Promise<string> {
  const id = randomUUID();
  onId(id);
  const cols = (await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'decks' order by ordinal_position`).map((r) => r.column_name as string);
  const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : c === "name" ? "'Probe · ' || name" : `"${c}"`)).join(", ");
  await sql.query(`insert into decks (${cols.map((c) => `"${c}"`).join(", ")}) select ${select} from decks where id = $3`, [id, owner, source]);
  await sql`insert into deck_cards (deck_id, oracle_id, quantity, auto) select ${id}, oracle_id, quantity, auto from deck_cards where deck_id = ${source}`;
  return id;
}

const SIZE = "case when d.partner_oracle_id is null then 99 else 98 end";
const BODY = "(select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id)";
// LEGAL, as probe:overview-hold picks: once at its size, a deck the analysis reads in full.
const LEGAL = `
      and not exists (select 1 from cards cm where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id) and not cm.commander_legal)
      and not exists (
        select 1 from deck_cards c join cards k on k.oracle_id = c.oracle_id
        where c.deck_id = d.id
          and (not k.commander_legal or not (k.color_identity <@ (
            select coalesce(array_agg(distinct ci), '{}') from cards cm, unnest(cm.color_identity) ci
            where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
          )))
      )`;
async function sources() {
  // The fewest over, so the stored result names every cut it takes to reach the line.
  const [over] = await sql.query(`select d.id, ${BODY} - ${SIZE} as over from decks d where ${BODY} > ${SIZE} ${LEGAL} order by 2, d.id limit 1`);
  const [whole] = await sql.query(`select d.id from decks d where ${BODY} = ${SIZE} ${LEGAL} order by d.id limit 1`);
  if (!over || !whole) throw new Error("local-dev needs an over-size deck and a whole legal deck to clone.");
  return { over: over.id, whole: whole.id };
}

async function openTab(page: Page, deckId: string) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  await page.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().click();
  await page.locator(`${PAGE} section[data-tuning-hub]`).first().waitFor({ timeout: 60_000 });
  await page.locator(`${PAGE} [data-testid='analysis-empty']`).first().waitFor({ timeout: 60_000 });
  // The hub's status lines and the overview's credit note land on their own reads.
  await page.waitForTimeout(2_000);
}

// Before the first analysis: Suggested changes dimmed, the others open their tool and come back.
async function tilesRespond(page: Page, at: (s: string) => string, over: boolean) {
  const hub = page.locator(`${PAGE} section[data-tuning-hub]`).first();
  report(at("Suggested changes is dimmed before the first analysis"),
    (await hub.locator("[data-tool-tile='suggested'][data-inert]").count()) === 1
      && (await hub.locator("button[data-tool-tile='suggested']").count()) === 0, "inert tile, no button");
  const tools = over ? ["cuts", "mana", "history"] : ["mana", "history"];
  if (!over) {
    report(at("Proposed cuts is inert at size"), (await hub.locator("[data-tool-tile='cuts'][data-inert]").count()) === 1, "inert tile");
  }
  for (const tool of tools) {
    const tile = hub.locator(`button[data-tool-tile='${tool}']`);
    let opened = false;
    if ((await tile.count()) === 1) {
      await tile.click();
      opened = await hub.locator(`[data-tuning-tool='${tool}']`).waitFor({ timeout: 15_000 }).then(() => true, () => false);
      // Back to the landing: the desktop's All tools tab, the phone's way back.
      const back = hub.locator("#tuning-tab-all:visible, button:visible", { hasText: /^(All tools|‹ Tuning)$/ }).first();
      await back.click();
      await hub.locator(`button[data-tool-tile='${tool}']`).waitFor({ timeout: 15_000 });
    }
    report(at(`${tool} opens its tool before the first analysis`), opened, opened ? "opened and returned" : "no pressable tile or no tool");
  }
}

type Span = { first: number; min: number; max: number } | null;
function summarise(frames: Frame[], pressedAt: number | null) {
  const by: Record<string, Frame[]> = {};
  for (const f of frames) {
    if (f.state === "opening" || f.state === "other") continue;
    (by[f.state] ??= []).push(f);
  }
  const span = (fs: Frame[]): Span => {
    const tops = fs.map((f) => f.top).filter((t): t is number => t !== null);
    return tops.length === 0 ? null : { first: tops[0], min: Math.min(...tops), max: Math.max(...tops) };
  };
  // The idle frames that count are the settled ones just before the press.
  const idle = (by.idle ?? []).slice(-30);
  return {
    idle: span(idle), pressing: span((by.pressing ?? []).concat((by.running ?? []).slice(0, 1)).slice(0, 1)),
    running: span(by.running ?? []), done: span((by.done ?? []).slice(-30)),
    idleGap: idle.at(-1)?.gap ?? null, doneGap: (by.done ?? []).at(-1)?.gap ?? null,
    frames: { idle: idle.length, pressing: (by.pressing ?? []).length, running: (by.running ?? []).length, done: (by.done ?? []).length },
    pressedAt,
  };
}

async function walk(browser: Browser, width: number, userId: string, deck: string, over: boolean) {
  const at = (s: string) => `${s} @ ${width} (${over ? "over size" : "at size"})`;
  const { context, page } = await newPage(browser, width, userId);

  await openTab(page, deck);
  await tilesRespond(page, at, over);

  // A fresh load for the sequence, observed from the first frame.
  await page.addInitScript(OBSERVE);
  await openTab(page, deck);
  const press = page.locator(`${PAGE} [data-testid='analysis-empty']`).first().getByRole("button", { name: "Analyze" });
  const note = await page.locator(`${PAGE} [data-testid='press-note']`).first().textContent().catch(() => null);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => { (window as unknown as { __stay: Stay }).__stay.armed = true; });
  await press.click({ force: over });
  if (over) {
    await page.waitForTimeout(3_000);
  } else {
    await page.locator(`${PAGE} [data-testid='verdict-cell']:visible`).first().waitFor({ timeout: 90_000 });
    await page.waitForTimeout(2_500);
  }
  const w = await page.evaluate(() => {
    const x = (window as unknown as { __stay: Stay }).__stay;
    return { frames: x.frames, shifts: x.shifts, pressedAt: x.pressedAt };
  });
  await context.close();

  const s = summarise(w.frames, w.pressedAt);
  const sequence = w.frames.filter((f) => f.state !== "opening" && f.state !== "other" && (w.pressedAt === null || f.at >= w.pressedAt - 500));
  const missing = sequence.filter((f) => !f.drawn);
  const replaced = sequence.filter((f) => f.same === false);
  const shiftsAfter = w.shifts.filter((e) => w.pressedAt !== null && e.at >= w.pressedAt - 500);
  const cls = shiftsAfter.filter((e) => !e.input).reduce((n, e) => n + e.value, 0);
  const clsInput = shiftsAfter.filter((e) => e.input).reduce((n, e) => n + e.value, 0);
  const headings = [...new Set(w.frames.map((f) => f.heading).filter(Boolean))];
  const row = {
    width, deck: over ? "over" : "at 99", idle: s.idle?.first ?? null,
    pressing: s.pressing?.first ?? null,
    running: s.running ? `${s.running.min}..${s.running.max}` : "-",
    done: s.done ? `${s.done.min}..${s.done.max}` : "-",
    sameNode: replaced.length === 0, hiddenFrames: missing.length,
    cls: Math.round(cls * 10000) / 10000, clsDuringInput: Math.round(clsInput * 10000) / 10000,
    frames: s.frames,
  };
  console.log(`  info  ${at("measured")} — ${JSON.stringify(row)}`);
  console.log(`  info  ${at("press note and loader headings")} — ${JSON.stringify({ note, headings })}`);

  report(at("the hub is drawn in every frame"), missing.length === 0, `${missing.length} frame(s) without it, states ${JSON.stringify([...new Set(missing.map((f) => f.state))])}`);
  report(at("the hub is never replaced"), replaced.length === 0 && sequence.some((f) => f.same === true), `${replaced.length} frame(s) on another node`);
  const base = s.idle?.first ?? null;
  const within = (sp: Span) => sp === null || (base !== null && Math.abs(sp.min - base) <= 1 && Math.abs(sp.max - base) <= 1);
  report(at("the hub's top holds from idle to the press"), base !== null && within(s.idle) && within(s.pressing), { idle: s.idle, pressing: s.pressing });
  if (over) {
    report(at("a refused press moves nothing"), base !== null && within(span3(w.frames, w.pressedAt)), span3(w.frames, w.pressedAt));
  } else {
    report(at("the hub's top holds while the analysis runs"), s.frames.running > 0 && within(s.running), { running: s.running, frames: s.frames.running });
    report(at("done: the hub sits under the reading at the idle gap"),
      s.done !== null && s.done.min === s.done.max && s.idleGap !== null && s.doneGap !== null && Math.abs(s.doneGap - s.idleGap) <= 1,
      { done: s.done, idleGap: s.idleGap, doneGap: s.doneGap });
    // The analysis block's own content may move inside its held height (the existing progress
    // state: the field and the second paragraph leave); nothing may shift the hub until the reading lands.
    const doneAt = sequence.find((f) => f.state === "done")?.at ?? Infinity;
    report(at("no layout shift moves the hub before the reading lands"),
      shiftsAfter.filter((e) => e.at < doneAt - 50 && e.sources.some((x) => x.startsWith("section[hub]"))).length === 0,
      JSON.stringify(shiftsAfter));
  }
  return row;
}

// Every top the hub held after the press, for a press that changed nothing.
function span3(frames: Frame[], pressedAt: number | null): Span {
  const tops = frames.filter((f) => pressedAt !== null && f.at >= pressedAt && f.top !== null).map((f) => f.top as number);
  return tops.length === 0 ? null : { first: tops[0], min: Math.min(...tops), max: Math.max(...tops) };
}

async function newPage(browser: Browser, width: number, userId: string) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  // tsx's keepNames wraps helpers in `__name`, which does not exist in the page.
  await context.addInitScript("window.__name = (f) => f;");
  const page = await context.newPage();
  await signIn(page);
  await clearAboutSheet(page, userId);
  return { context, page };
}

// The second repro: Proposed cuts run and pressed down to 99, then the deck analyzed.
async function cutsToTheLine(browser: Browser, width: number, userId: string, deck: string) {
  const at = (s: string) => `${s} @ ${width} (cut to the line)`;
  const { context, page } = await newPage(browser, width, userId);
  const hub = page.locator(`${PAGE} section[data-tuning-hub]`).first();
  const toolPanel = hub.locator("#tuning-tool-panel");
  await page.addInitScript(OBSERVE);
  await openTab(page, deck);

  // Look deeper's stand-in, written after the visit began so the hub shows it as this visit's.
  const inputs = (await readProposedCuts(deck, userId, process.env))!;
  const over = inputs.facts.over;
  const picks = inputs.facts.cards.slice(0, over);
  const run = await startCutsRun(userId, deck, inputs.fingerprint, inputs.readVersion, { env: process.env });
  if (run.kind !== "started") throw new Error(`start: ${run.kind}`);
  await persistCutsRun(run, picks.map((c, i) => ({ oracleId: c.oracleId, name: c.name, reason: `${c.name} is the least-played of the cards the list holds.`, cites: [{ kind: "offList" as const }], position: i })),
    { askedCount: over, survivedCount: picks.length, keptCount: picks.length, over, drops: [] });
  await sql`update model_calls set status = 'refunded' where id = ${run.callId}`;

  await hub.locator("button[data-tool-tile='cuts']").click();
  const cutsSection = toolPanel.locator("section[aria-labelledby='cuts-heading']");
  await cutsSection.locator("article").first().waitFor({ timeout: 30_000 });
  report(at(`the result names the ${over} over`), (await cutsSection.locator("article").count()) === over, { over, picks: picks.length });
  for (let i = 1; i <= over; i += 1) {
    await cutsSection.getByRole("button", { name: "Cut", exact: true }).first().click();
    await page.waitForFunction((n) => document.querySelectorAll("#tuning-tool-panel [data-testid='answered-cut']").length >= n, i, { timeout: 40_000 });
  }
  // The deck is at the line once the hub's tile reads it: the tile goes inert.
  await hub.locator("[data-tool-tile='cuts'][data-inert]").waitFor({ state: "attached", timeout: 40_000 }).catch(() => {});
  await page.waitForTimeout(1_500);
  const toolText = async () => ((await toolPanel.innerText().catch(() => "")) ?? "").trim();
  const beforeText = await toolText();
  report(at("at the line the tool finishes in place before the analysis"), /^Proposed cuts/.test(beforeText) && /Back to/.test(beforeText), beforeText.slice(0, 120));

  // The analysis, from the empty state above the hub.
  const press = page.locator(`${PAGE} [data-testid='analysis-empty']`).first().getByRole("button", { name: "Analyze" });
  await press.scrollIntoViewIfNeeded();
  await page.evaluate(() => { (window as unknown as { __stay: { armed: boolean } }).__stay.armed = true; });
  await press.click();
  await page.locator(`${PAGE} [data-testid='verdict-cell']:visible`).first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(Number(process.env.PROBE_SETTLE_MS ?? 2_500));
  const w = await page.evaluate(() => {
    const x = (window as unknown as { __stay: { frames: Frame[]; pressedAt: number | null } }).__stay;
    return { frames: x.frames, pressedAt: x.pressedAt };
  });
  const after = w.frames.filter((f) => w.pressedAt !== null && f.at >= w.pressedAt);
  const missing = after.filter((f) => !f.drawn);
  report(at("the hub is drawn in every frame of the analysis"), after.length > 0 && missing.length === 0, `${missing.length} of ${after.length} frame(s) without it`);
  const empty = after.filter((f) => f.tool !== null && f.toolEmpty);
  report(at("the open tool's panel is never empty"), empty.length === 0, `${empty.length} frame(s) with the tab row over an empty panel`);
  const selected = await page.evaluate(() => document.querySelector("#tuning-tool-panel")?.getAttribute("data-tuning-tool") ?? null);
  const afterText = await toolText();
  report(at("after the analysis Proposed cuts is still open, finished in place"), selected === "cuts" && /Back to/.test(afterText), { selected, text: afterText.slice(0, 120) });
  const headings = [...new Set(w.frames.map((f) => f.heading).filter(Boolean))];
  console.log(`  info  ${at("loader headings")} — ${JSON.stringify(headings)}`);
  await context.close();
}

async function cleanup(ids: string[]) {
  for (const id of ids) {
    try {
      const calls = [
        ...(await sql`select model_call_id from deck_synopses where deck_id = ${id} and model_call_id is not null`),
        ...(await sql`select model_call_id from deck_suggestion_runs where deck_id = ${id} and model_call_id is not null`),
      ].map((r) => r.model_call_id);
      await sql`delete from decks where id = ${id}`;
      if (calls.length > 0) await sql`delete from model_calls where id = any(${calls}::uuid[])`;
    } catch (error) {
      failures += 1;
      console.error(`cleanup: deck ${id} was left behind:`, (error as Error).message);
    }
  }
}

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:tuning-hub-stays-put refuses branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  const created: string[] = [];
  let about: Awaited<ReturnType<typeof captureAboutSeen>> | null = null;
  const rows: Awaited<ReturnType<typeof walk>>[] = [];
  try {
    const { over, whole } = await sources();
    for (const width of WIDTHS) {
      // Each width presses fresh clones, so both start never analyzed.
      const probe = await browser.newContext();
      const p = await probe.newPage();
      const userId = await signIn(p);
      await probe.close();
      if (!about) about = await captureAboutSeen(userId, sql);
      const overId = await clone(userId, over, (id) => created.push(id));
      const wholeId = await clone(userId, whole, (id) => created.push(id));
      if (CASES.includes("walk")) {
        rows.push(await walk(browser, width, userId, overId, true));
        rows.push(await walk(browser, width, userId, wholeId, false));
      }
      if (CASES.includes("cuts")) await cutsToTheLine(browser, width, userId, await clone(userId, over, (id) => created.push(id)));
    }
  } finally {
    await browser.close();
    await cleanup(created);
    console.log(`cleaned up ${created.length} deck(s)`);
    if (about) {
      try {
        await restoreAboutSeen(about, sql);
      } catch (error) {
        failures += 1;
        console.error(`cleanup: the About row was not restored: ${(error as Error).message}`);
      }
    }
  }
  console.log("\n| width | deck | idle | pressing | running | done | same node | hidden frames | CLS | CLS (input) |");
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.width} | ${r.deck} | ${r.idle} | ${r.pressing} | ${r.running} | ${r.done} | ${r.sameNode} | ${r.hiddenFrames} | ${r.cls} | ${r.clsDuringInput} |`);
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
