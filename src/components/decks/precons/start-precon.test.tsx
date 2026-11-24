import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

const action = vi.hoisted(() => vi.fn());
const addAction = vi.hoisted(() => vi.fn());
vi.mock("../../../app/decks/precon-actions", () => ({ createDeckFromPrecon: action, startPreconOwned: addAction }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ userId: "user_A" }) }));
import { StartPrecon, StartPreconDialog, type UpgradeStart } from "./start-precon";
import { preconUpgradeDeckCopy } from "../../../lib/copy/precon-upgrade";
import { preconsCopy } from "../../../lib/copy/precons";

const row: PreconRow = {
  fileName: "MysticIntellect_C19", name: "Mystic Intellect", setCode: "C19", releaseDate: "2019-08-23", twinName: null,
  commanders: [{ oracleId: "sevinne", name: "Sevinne, the Chronoclasm", imageUri: null, colorIdentity: ["U", "R", "W"] }],
  identity: ["W", "U", "R"], owned: 40, of: 80, unmapped: 0,
  built: [{ deckId: "d", deckName: "HD - Sevinne", shared: 50, sameCommanders: true, linked: false }],
};

describe("StartPrecon", () => {
  const open = () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={["Dockside Extortionist"]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
  };

  it("names a card the start keeps that isn't legal, the deck it repeats, and the facts", () => {
    open();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/1 card isn’t legal in Commander: Dockside Extortionist/)).toBeInTheDocument();
    expect(screen.getByText("You already have HD - Sevinne with this commander. This makes a second deck.")).toBeInTheDocument();
    expect(screen.getByText("all 100")).toBeInTheDocument();
    expect(screen.getByText(preconsCopy.start.facts.printingsValue)).toBeInTheDocument();
    // The deck is committed on start: no sentence about a draft, and no lead paragraph restating the Cards fact.
    expect(screen.queryByText(/draft/i)).toBeNull();
    expect(screen.queryByText(/Change anything before you commit/)).toBeNull();
    expect(screen.getByRole("textbox")).toHaveValue("Mystic Intellect");
  });

  it("says what the catalog lacks rather than claiming the precon's whole list", () => {
    render(<StartPrecon row={{ ...row, unmapped: 1 }} cards={99} body={98} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
    expect(screen.getByText("99; 1 isn’t in our catalog yet")).toBeInTheDocument();
    expect(screen.queryByText("all 99")).toBeNull();
  });

  it("refuses a name with a control character before sending it, as the server would", () => {
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Bad\u007fName" } });
    expect(screen.getByRole("button", { name: preconsCopy.start.submit })).toBeDisabled();
  });

  it("speaks of several illegal cards in the plural", () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={["Dockside Extortionist", "Trade Secrets"]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
    expect(screen.getByText(/2 cards aren’t legal in Commander: Dockside Extortionist, Trade Secrets\. They stay in/)).toBeInTheDocument();
  });

  it("starts the deck under the typed name, and keeps the dialog with the name on a failure", async () => {
    action.mockRejectedValueOnce(new Error("boom"));
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My Intellect" } });
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(preconsCopy.start.failed));
    expect(action).toHaveBeenCalledWith("MysticIntellect_C19", "My Intellect");
    expect(screen.getByRole("textbox")).toHaveValue("My Intellect");
  });

  it("will not start an empty name", () => {
    open();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: preconsCopy.start.submit })).toBeDisabled();
  });
});

// `createDeckFromPrecon` ends in `redirect()`, which throws. Caught as a failure, every successful
// start painted "Couldn’t start the deck" for the frame the navigation took (as #337 on the picker).
describe("StartPrecon, a redirecting action", () => {
  const isRedirect = (v: unknown) =>
    v instanceof Error && (v.message.startsWith("NEXT_REDIRECT") || String((v as { digest?: string }).digest).startsWith("NEXT_REDIRECT"));
  const swallow = (e: ErrorEvent | PromiseRejectionEvent) => {
    if (isRedirect("reason" in e ? e.reason : e.error)) e.preventDefault();
  };
  beforeAll(() => {
    window.addEventListener("error", swallow);
    window.addEventListener("unhandledrejection", swallow);
  });
  afterAll(() => {
    window.removeEventListener("error", swallow);
    window.removeEventListener("unhandledrejection", swallow);
  });

  it("is not a failure", async () => {
    const { redirect } = await import("next/navigation");
    action.mockImplementationOnce(async () => redirect("/decks/d1?from=precon"));
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("with the box selected, is not a failure either, and leaves no attempt for a later press to land on this deck", async () => {
    const { redirect } = await import("next/navigation");
    addAction.mockImplementationOnce(async () => redirect("/decks/d1?from=precon"));
    const creates = action.mock.calls.length;
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
    fireEvent.click(screen.getByRole("checkbox", { name: /I own this precon/ }));
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(addAction).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(window.sessionStorage.getItem(`the99:precon-add-attempt:user_A:${row.fileName}`)).toBeNull();
    expect(action.mock.calls.length).toBe(creates);
  });
});

// The modal rule: the box is capped in dvh and never scrolls itself; the body is its one scroller, `min-h-0` so it
// can shrink; the title and the buttons sit outside it, so an open keyboard over the name field never hides them.
describe("StartPrecon's capped column", () => {
  it("scrolls the body between a pinned title and pinned buttons", () => {
    render(<StartPrecon row={row} cards={100} body={99} illegal={[]} />);
    fireEvent.click(screen.getAllByRole("button", { name: preconsCopy.start.button })[0]);
    const dialog = screen.getByRole("dialog");
    const cls = dialog.className.split(/\s+/);
    expect(cls).toEqual(expect.arrayContaining(["flex", "flex-col", "overflow-hidden", "max-h-[88dvh]"]));
    expect(cls).not.toContain("overflow-y-auto");
    const scrollers = [...dialog.querySelectorAll<HTMLElement>(".overflow-y-auto")];
    expect(scrollers).toHaveLength(1);
    const body = scrollers[0];
    expect(body.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1"]));
    expect(body.contains(screen.getByRole("textbox"))).toBe(true);
    const title = screen.getByRole("heading");
    expect(body.contains(title)).toBe(false);
    expect(title.parentElement!.className).toContain("flex-none");
    const start = screen.getByRole("button", { name: preconsCopy.start.submit });
    expect(body.contains(start)).toBe(false);
    expect(start.parentElement!.className).toContain("flex-none");
    // The form between them is the column's flexing child, or the scroller never meets the cap.
    expect(start.closest("form")!.className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-0", "flex-1"]));
  });
});

// A Start from an Upgrade run whose picks went stale (fresh start R2): the run is still startable, so the dialog says the picks
// no longer match and does NOT retire it (`onUnavailable`), as the run-gone refusal does.
describe("StartPreconDialog, an upgraded start refused", () => {
  const upgrade: UpgradeStart = {
    runId: "11111111-1111-4111-8111-111111111111", lead: { name: "Sevinne", art: null, identity: ["U", "R", "W"] }, boxCommander: "Sevinne",
    changed: false, swaps: 3, strategy: "Spellslinger", bracket: "Core (2)", toBuy: 0,
  };
  const dialog = (onUnavailable: () => void) =>
    render(<StartPreconDialog row={row} cards={100} body={99} illegal={[]} addRef={{ current: { id: null } }} onDismiss={() => {}} upgrade={upgrade} onUnavailable={onUnavailable} />);

  it("on stale picks, says so and keeps the run", async () => {
    action.mockResolvedValueOnce({ ok: false, reason: "picks" });
    const onUnavailable = vi.fn();
    dialog(onUnavailable);
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(preconUpgradeDeckCopy.picksStale));
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it("on stale picks with the box selected, says so and keeps the run", async () => {
    addAction.mockResolvedValueOnce({ ok: false, reason: "picks" });
    const onUnavailable = vi.fn();
    dialog(onUnavailable);
    fireEvent.click(screen.getByRole("checkbox", { name: /I own this precon/ }));
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(preconUpgradeDeckCopy.picksStale));
    expect(onUnavailable).not.toHaveBeenCalled();
  });

  it("on a run that is gone, retires it", async () => {
    action.mockResolvedValueOnce({ ok: false, reason: "upgradeUnavailable" });
    const onUnavailable = vi.fn();
    dialog(onUnavailable);
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.start.submit }));
    await waitFor(() => expect(onUnavailable).toHaveBeenCalled());
  });
});
