// Spare requests on Shopping (plan `2026-10-22-spare-requests.md` PR 3b; handoff `design_handoff_the99_spare_requests`,
// `Shopping` and `Asker-States`): the modal's friend row in each state, its sub line, the ⓘ, the state line, Ask and
// Ask instead through the actions, the toast on a failed ask, the row press's mark and name, and the key's items.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { AskStateLine } from "../../lib/social/spare-requests";
import { spareCopy } from "../../lib/copy/social";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { ShoppingKey } from "../decks/shopping-key";
import { FriendSparesProvider, OtherWaysPress } from "./spare-markers";
import { cardMark, rowAsk, stateLine } from "./friend-spares";

const actions = vi.hoisted(() => ({ askSpareAction: vi.fn(), askInsteadAction: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => actions);

const r = spareCopy.request;
const asOf = new Date("2026-10-20T00:00:00Z");
const card = (oracleId: string, name: string, quantity = 1) =>
  ({ oracleId, name, owned: false, quantity, price: { cents: 500, foilCents: null, etchedCents: null, asOf } }) as unknown as DeckDetailCard;
const JACE = card("11111111-1111-4111-8111-111111111111", "Jace", 2);
const friend = (name: string, pods = ["Thursday pod"]) => ({ publicId: `p-${name}`, displayName: name, commander: null, pods });
const spare = (name: string, n: number, pods?: string[]) => ({ oracleId: JACE.oracleId, friend: friend(name, pods), spare: n });
const ask = (name: string, state: AskStateLine["state"], extra: Partial<AskStateLine> = {}): AskStateLine => ({
  id: `req-${name}-${state}`, oracleId: JACE.oracleId, holder: { publicId: `p-${name}`, displayName: name }, state,
  daysLeft: state === "open" ? 12 : null, createdAt: "2026-10-18T00:00:00Z", answeredAt: null, ...extra,
});

const fetchMock = vi.fn();
let served: { spares: unknown[]; asks: AskStateLine[] } = { spares: [], asks: [] };
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith("/api/spare-requests")
      ? { ok: true, json: async () => ({ asks: served.asks }) }
      : { ok: true, json: async () => ({ spares: served.spares }) });
  actions.askSpareAction.mockReset();
  actions.askInsteadAction.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Press({ c = JACE }: { c?: DeckDetailCard }) {
  return <OtherWaysPress card={c} standIn={false} standInAria="" limitFigure="" />;
}

async function mount(ui: React.ReactNode, { requests = true, deckId = "deck-1" }: { requests?: boolean; deckId?: string | null } = {}) {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <FriendSparesProvider oracleIds={[JACE.oracleId]} newestAsOf={asOf} requests={requests} deckId={deckId}>{ui}</FriendSparesProvider>
      </CardDetailProvider>,
    );
  });
}

async function openModal() {
  await act(async () => { fireEvent.click(screen.getByTestId("other-ways")); });
  return within(screen.getByRole("dialog"));
}

const rowOf = (dialog: ReturnType<typeof within>, name: string) =>
  dialog.getAllByTestId("friend-spare").find((li: HTMLElement) => li.textContent?.includes(name))!;

describe("the friend row's right element", () => {
  it("offers Ask with no ask anywhere, under `N spares · pods`, and no state line", async () => {
    served = { spares: [spare("Chris", 1, ["Thursday pod", "Cube night"])], asks: [] };
    await mount(<Press />);
    const d = await openModal();
    const row = rowOf(d, "Chris");
    expect(within(row).getByTestId("friend-spare-ask").textContent).toBe(r.ask);
    expect(within(row).getByTestId("friend-spare-ask").getAttribute("aria-label")).toBe(r.askAria("Chris", "Jace"));
    expect(within(row).getByTestId("friend-spare-sub").textContent).toBe("1 spare · Thursday pod, Cube night");
    expect(d.queryByTestId("friend-spares-line")).toBeNull();
  });

  it("reads Requested with the days left for the friend holding the open ask, and Ask instead for the rest", async () => {
    served = { spares: [spare("Colin", 2), spare("Max", 1, ["Cube night"])], asks: [ask("Colin", "open")] };
    await mount(<Press />);
    const d = await openModal();
    const colin = rowOf(d, "Colin");
    expect(within(colin).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(within(colin).getByTestId("friend-spare-sub").textContent).toBe("2 spares · 12 days left");
    expect(within(colin).queryByRole("button")).toBeNull();
    expect(within(rowOf(d, "Max")).getByTestId("friend-spare-ask").textContent).toBe(r.askInstead);
    expect(d.getByTestId("friend-spares-line").textContent).toBe(r.oneAtATime("Colin", "Max"));
  });

  it("reads Accepted after a yes, with its state line", async () => {
    served = { spares: [spare("Peter", 2)], asks: [ask("Peter", "yes", { answeredAt: "2026-10-19T00:00:00Z" })] };
    await mount(<Press />);
    const d = await openModal();
    const row = rowOf(d, "Peter");
    expect(within(row).getByTestId("friend-spare-status").textContent).toContain(r.accepted);
    expect(within(row).queryByRole("button")).toBeNull();
    expect(d.getByTestId("friend-spares-line").textContent).toBe(r.whenYours);
  });

  it("reads Declined with no Ask inside the cooldown, and says nobody else has one when nobody does", async () => {
    served = { spares: [spare("Chris", 1)], asks: [ask("Chris", "no", { answeredAt: "2026-10-19T00:00:00Z" })] };
    await mount(<Press />);
    const d = await openModal();
    const row = rowOf(d, "Chris");
    expect(within(row).getByTestId("friend-spare-status").textContent).toContain(r.declined);
    expect(within(row).queryByRole("button")).toBeNull();
    expect(d.getByTestId("friend-spares-line").textContent).toBe(r.nobodyElse);
  });

  it("offers Ask again after an expiry, the sub line saying no answer came", async () => {
    served = { spares: [spare("Max", 1)], asks: [ask("Max", "expired")] };
    await mount(<Press />);
    const d = await openModal();
    const row = rowOf(d, "Max");
    expect(within(row).getByTestId("friend-spare-ask").textContent).toBe(r.askAgain);
    expect(within(row).getByTestId("friend-spare-sub").textContent).toBe("1 spare · no answer in 14 days");
  });
});

describe("the section head", () => {
  it("drops `view only` and the foot line, and carries the old foot copy behind the ⓘ", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    await mount(<Press />);
    const d = await openModal();
    const section = d.getByTestId("friend-spares");
    expect(section.textContent).not.toContain(spareCopy.viewOnly);
    expect(section.textContent).not.toContain(spareCopy.foot);
    const tip = within(section).getByRole("button", { name: r.tipLabel });
    const box = document.getElementById(tip.getAttribute("aria-describedby")!)!;
    expect(box.textContent).toBe(r.tip);
    expect(box.hidden).toBe(true);
    await act(async () => { fireEvent.click(tip); });
    expect(box.hidden).toBe(false);
    // Open, the ⓘ takes the accent (`.ii.on`).
    expect(tip.getAttribute("aria-expanded")).toBe("true");
    expect(tip.className).toContain("aria-expanded:border-[color:var(--accent)]");
  });

  it("is as shipped with the switch off: `view only`, the foot line, no Ask, and no asks read", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    await mount(<Press />, { requests: false });
    const d = await openModal();
    const section = d.getByTestId("friend-spares");
    expect(section.textContent).toContain(spareCopy.viewOnly);
    expect(section.textContent).toContain(spareCopy.foot);
    expect(within(section).queryByRole("button")).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).startsWith("/api/spare-requests"))).toBe(false);
  });
});

describe("pressing Ask", () => {
  it("asks for the copies the row is short and the deck, then reads Requested once the action answers ok", async () => {
    served = { spares: [spare("Colin", 2), spare("Max", 1)], asks: [] };
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new-1" });
    await mount(<Press />);
    const d = await openModal();
    await act(async () => { fireEvent.click(within(rowOf(d, "Colin")).getByTestId("friend-spare-ask")); });
    expect(actions.askSpareAction).toHaveBeenCalledWith({ friendPublicId: "p-Colin", oracleId: JACE.oracleId, copies: 2, deckId: "deck-1" });
    expect(within(rowOf(d, "Colin")).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(within(rowOf(d, "Colin")).getByTestId("friend-spare-sub").textContent).toBe("2 spares · 14 days left");
    expect(within(rowOf(d, "Max")).getByTestId("friend-spare-ask").textContent).toBe(r.askInstead);
    // The row behind the modal took the mark.
    expect(screen.getByTestId("spare-glyph").getAttribute("data-mark")).toBe("requested");
  });

  it("sends no deck from the cart", async () => {
    served = { spares: [spare("Colin", 2)], asks: [] };
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new-1" });
    await mount(<Press />, { deckId: null });
    const d = await openModal();
    await act(async () => { fireEvent.click(within(rowOf(d, "Colin")).getByTestId("friend-spare-ask")); });
    expect(actions.askSpareAction).toHaveBeenCalledWith(expect.objectContaining({ deckId: null }));
  });

  it("moves the open ask with Ask instead, naming the ask it withdraws", async () => {
    served = { spares: [spare("Colin", 2), spare("Max", 1)], asks: [ask("Colin", "open")] };
    actions.askInsteadAction.mockResolvedValue({ ok: true, id: "new-2" });
    await mount(<Press />);
    const d = await openModal();
    await act(async () => { fireEvent.click(within(rowOf(d, "Max")).getByTestId("friend-spare-ask")); });
    expect(actions.askInsteadAction).toHaveBeenCalledWith(expect.objectContaining({ friendPublicId: "p-Max", fromRequestId: "req-Colin-open" }));
    expect(within(rowOf(d, "Max")).getByTestId("friend-spare-status").textContent).toBe(r.requested);
    expect(within(rowOf(d, "Colin")).getByTestId("friend-spare-ask").textContent).toBe(r.askInstead);
  });

  it("shows the shared toast on a refusal and leaves the row as it was", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    actions.askSpareAction.mockResolvedValue({ ok: false, reason: "not-spare" });
    await mount(<Press />);
    const d = await openModal();
    await act(async () => { fireEvent.click(within(rowOf(d, "Chris")).getByTestId("friend-spare-ask")); });
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
    expect(within(rowOf(d, "Chris")).getByTestId("friend-spare-ask").textContent).toBe(r.ask);
    expect(screen.getByTestId("spare-glyph").getAttribute("data-mark")).toBe("spare");
  });

  it("shows the toast when the action throws", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    actions.askSpareAction.mockRejectedValue(new Error("network"));
    await mount(<Press />);
    const d = await openModal();
    await act(async () => { fireEvent.click(within(rowOf(d, "Chris")).getByTestId("friend-spare-ask")); });
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
  });
});

describe("the row press's mark", () => {
  it("is plain with no ask, named as shipped", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    await mount(<Press />);
    expect(screen.getByTestId("other-ways").getAttribute("aria-label")).toBe(spareCopy.markerAria("Jace"));
    expect(screen.getByTestId("spare-glyph").getAttribute("data-mark")).toBe("spare");
  });

  it("takes the accent dot while requested, and says so in its name", async () => {
    served = { spares: [spare("Colin", 2)], asks: [ask("Colin", "open")] };
    await mount(<Press />);
    expect(screen.getByTestId("other-ways").getAttribute("aria-label")).toBe(r.markAria(spareCopy.markerAria("Jace"), "requested"));
    const glyph = screen.getByTestId("spare-glyph");
    expect(glyph.getAttribute("data-mark")).toBe("requested");
    expect(glyph.className).toContain("text-[color:var(--fact)]");
    expect(glyph.querySelector(".bg-\\[color\\:var\\(--accent\\)\\]")).not.toBeNull();
  });

  it("turns green with the tick once accepted", async () => {
    served = { spares: [spare("Peter", 2)], asks: [ask("Peter", "yes", { answeredAt: "2026-10-19T00:00:00Z" })] };
    await mount(<Press />);
    expect(screen.getByTestId("other-ways").getAttribute("aria-label")).toBe(r.markAria(spareCopy.markerAria("Jace"), "accepted"));
    const glyph = screen.getByTestId("spare-glyph");
    expect(glyph.getAttribute("data-mark")).toBe("accepted");
    expect(glyph.className).toContain("text-[color:var(--success)]");
  });

  it("goes back to plain after a decline or an expiry", async () => {
    served = { spares: [spare("Chris", 1)], asks: [ask("Chris", "no", { answeredAt: "2026-10-19T00:00:00Z" }), ask("Chris", "expired")] };
    await mount(<Press />);
    expect(screen.getByTestId("spare-glyph").getAttribute("data-mark")).toBe("spare");
  });
});

describe("the key's request items", () => {
  it("are absent while no row draws a mark", async () => {
    served = { spares: [spare("Chris", 1)], asks: [] };
    await mount(<ShoppingKey shoppingCount={3} />);
    expect(screen.getByTestId("spare-key")).toBeInTheDocument();
    expect(screen.queryByTestId("spare-key-requested")).toBeNull();
    expect(screen.queryByTestId("spare-key-accepted")).toBeNull();
  });

  it("add `requested` after the spare item while a row is requested", async () => {
    served = { spares: [spare("Colin", 2)], asks: [ask("Colin", "open")] };
    await mount(<ShoppingKey shoppingCount={3} />);
    const item = screen.getByTestId("spare-key-requested");
    expect(item.textContent).toBe(r.keyRequested);
    expect(screen.getByTestId("spare-key").compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByTestId("spare-key-accepted")).toBeNull();
  });

  it("add `accepted` while a row is accepted", async () => {
    served = { spares: [spare("Peter", 2)], asks: [ask("Peter", "yes", { answeredAt: "2026-10-19T00:00:00Z" })] };
    await mount(<ShoppingKey shoppingCount={3} />);
    expect(screen.getByTestId("spare-key-accepted").textContent).toBe(r.keyAccepted);
    expect(screen.queryByTestId("spare-key-requested")).toBeNull();
  });
});

describe("the rules the rows draw from", () => {
  it("rowAsk: an open ask the holder no longer offers still blocks the card, so the others read Ask instead", () => {
    const asks = [ask("Colin", "unavailable", { daysLeft: 3 })];
    expect(rowAsk(asks, "p-Max")).toEqual({ kind: "askInstead", fromRequestId: "req-Colin-unavailable", from: "Colin" });
    expect(cardMark(asks)).toBe("requested");
  });

  it("rowAsk: a decline holds that friend back even while another friend holds the open ask", () => {
    const asks = [ask("Colin", "open"), ask("Max", "no", { answeredAt: "2026-10-19T00:00:00Z" })];
    expect(rowAsk(asks, "p-Max")).toEqual({ kind: "declined" });
  });

  it("stateLine: says nothing while a decline leaves others to ask", () => {
    expect(stateLine([{ name: "Chris", ask: { kind: "declined" } }, { name: "Max", ask: { kind: "ask" } }])).toBeNull();
  });
});
