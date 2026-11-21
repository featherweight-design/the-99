// The table page's tracker (addendum S1 to S6): Start for the seated only, its reason over six seated, the waiting
// line, the game this device holds in Start's place (Back, and Discard with the shared toast's Undo), the Last game with
// the server's logged link (ruling 4), and the closed page's running game (S4).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackerCopy } from "../../lib/copy/tracker";
import { TABLES } from "../../lib/social/rule-zero-fixtures";
import type { TableView } from "../../lib/rule-zero/table-view";
import type { Game } from "../../lib/tracker/engine";
import type { PlaySeat } from "../../lib/tracker/seat";
import { named } from "../../lib/person-name/mint";
import { TableBody } from "./table-body";
import { TableClosed } from "./table-closed";

const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const gameLoggedAction = vi.hoisted(() => vi.fn(async (): Promise<unknown> => null));
vi.mock("next/navigation", () => ({ useRouter: () => nav, usePathname: () => "/friends/table/table-1" }));
vi.mock("../../app/friends/table/result-actions", () => ({ gameLoggedAction }));

const copy = trackerCopy.table;
const NOW = new Date("2026-11-20T20:00:00Z");
const KEY = "the99.tracker.table-1";

const players: PlaySeat[] = [
  { seat: 1, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Ghalta", partner: null, deck: "Ghalta" },
  { seat: 2, you: false, name: "Colin", art: null, partnerArt: null, commander: "Sai", partner: null, deck: "Sai" },
];
const base: Game = {
  config: { tableId: "table-1", startingLife: 40, seats: [{ seat: 1, commanders: 1 }, { seat: 2, commanders: 1 }], first: 1, layout: "phone-2", startedAt: Date.now() - 600_000, snapshot: { players, roster: "r" } },
  log: [{ t: "life", seat: 2, delta: -5 }],
};
const ENDED = Date.now() - 60_000;
const finished: Game = { ...base, log: [{ t: "life", seat: 2, delta: -40 }], endedAt: ENDED };
const keep = (game: Game) => window.localStorage.setItem(KEY, JSON.stringify({ v: 1, game, expiresAt: Date.now() + 3_600_000 }));

async function draw(view: TableView) {
  render(<TableBody view={view} now={NOW} />);
  await act(async () => {});
}
const start = () => screen.queryByRole("link", { name: copy.start });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("Start the game", () => {
  it("opens the tracker for a seated player, and is not there for a pod member off the table (ruling 3)", async () => {
    await draw(TABLES.T1);
    expect(start()?.getAttribute("href")).toBe("/friends/table/table-1/play");
    cleanup();
    await draw({ ...TABLES.T1, seats: TABLES.T1.seats.map((s) => ({ ...s, you: false })) });
    expect(start()).toBeNull();
  });

  it("stays in place, unavailable, with its reason over six seated (S1)", async () => {
    const seven = [...TABLES.T1.seats, ...TABLES.T1.seats.slice(1)].map((s, i) => ({ ...s, seat: i + 1, you: i === 0 }));
    await draw({ ...TABLES.T1, seats: seven });
    const button = screen.getByRole("button", { name: copy.start });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.getElementById(button.getAttribute("aria-describedby")!)?.textContent).toBe(copy.tooManyLead(7) + copy.tooManyFix);
  });

  it("says who is still picking a deck (S2)", async () => {
    await draw(TABLES.T10);
    expect(document.body.textContent).toContain("Max hasn’t picked a deck yet.");
  });
});

describe("the game this device holds", () => {
  it("takes Start's place while it runs, and Discard puts it back with Undo (S3)", async () => {
    keep(base);
    await draw(TABLES.T1);
    const card = screen.getByRole("region", { name: copy.inProgressAria });
    expect(start()).toBeNull();
    expect(screen.getByRole("link", { name: copy.resume }).getAttribute("href")).toBe("/friends/table/table-1/play");
    expect(card.textContent).toContain("35");
    fireEvent.click(screen.getByRole("button", { name: copy.discard }));
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(screen.queryByRole("region", { name: copy.inProgressAria })).toBeNull();
    expect(start()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.undo }));
    expect(JSON.parse(window.localStorage.getItem(KEY)!).game).toEqual(base);
    expect(screen.getByRole("region", { name: copy.inProgressAria })).toBeTruthy();
  });

  it("shows the last game, not logged until the viewer logs from the table after it ended (S6, ruling 4)", async () => {
    keep(finished);
    await draw({ ...TABLES.T1, loggedAt: new Date(ENDED - 10 * 60_000) });
    const card = screen.getByRole("region", { name: copy.lastAria });
    expect(card.textContent).toContain(copy.wonYou);
    expect(card.textContent).toContain(copy.notLogged);
    expect(start()?.getAttribute("href")).toBe("/friends/table/table-1/play?again=1");
    expect(document.body.textContent).toContain(copy.again);
    cleanup();
    await draw({ ...TABLES.T1, loggedAt: new Date(ENDED + 1000) });
    expect(screen.getByRole("region", { name: copy.lastAria }).textContent).not.toContain(copy.notLogged);
    cleanup();
    // A phone clock a minute ahead of the server: a log seconds after the end still counts.
    await draw({ ...TABLES.T1, loggedAt: new Date(ENDED - 60_000) });
    expect(screen.getByRole("region", { name: copy.lastAria }).textContent).not.toContain(copy.notLogged);
  });

  it("offers the Result's Undo on the last game, and opens the tracker to run it (U5)", async () => {
    keep(finished);
    await draw({ ...TABLES.T1, loggedAt: null });
    const card = screen.getByRole("region", { name: copy.lastAria });
    const row = card.querySelector('[data-testid="result-undo"]') as HTMLButtonElement;
    expect(row.getAttribute("aria-label")).toBe("Undo the last change: Colin −40 life, to 0 · round 1");
    expect(row.hasAttribute("aria-disabled")).toBe(false);
    expect(gameLoggedAction).toHaveBeenCalledWith("table-1", "r");
    fireEvent.click(row);
    expect(nav.push).toHaveBeenCalledWith("/friends/table/table-1/play?undo=1");
  });

  it("puts U3's note in Undo's place once anyone seated has logged the game (clarification 6)", async () => {
    gameLoggedAction.mockResolvedValueOnce({ seat: 2, at: new Date(ENDED + 60_000), you: false, publicId: "p2", name: named("Colin") });
    keep(finished);
    await draw({ ...TABLES.T1, loggedAt: null });
    const card = screen.getByRole("region", { name: copy.lastAria });
    expect(card.querySelector('[data-testid="result-undo"]')).toBeNull();
    expect(card.querySelector('[data-testid="last-logged-note"]')?.textContent).toContain("logged this game at");
    // The viewer has not logged it, so the card still says so.
    expect(card.textContent).toContain(copy.notLogged);
  });

  it("drops the row once the kept game is past its 6 am (U5)", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ v: 1, game: finished, expiresAt: Date.now() + 50 }));
    await draw({ ...TABLES.T1, loggedAt: null });
    expect(screen.getByRole("region", { name: copy.lastAria }).querySelector('[data-testid="result-undo"]')).not.toBeNull();
    await new Promise((r) => setTimeout(r, 80));
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByRole("region", { name: copy.lastAria }).querySelector('[data-testid="result-undo"]')).toBeNull();
  });

  it("still plays on a table its host closed (S4)", async () => {
    keep(base);
    render(<TableClosed closed={{ tableId: "table-1", viewerDeckId: "d1", podName: named("Thursday night"), setBy: null, how: { kind: "host", byYou: true, by: null, at: NOW, logOpen: true }, faces: [], loggedAt: null }} />);
    await act(async () => {});
    expect(screen.getByRole("region", { name: copy.inProgressAria })).toBeTruthy();
  });
});
