// Your requests on /friends (spare requests PR 3d; board `Asker-States`, call 7): absent when empty, the head with its
// count and order, each state's kicker, title and line, the diamond on an unseen answer, the ✕ (withdraw an open ask,
// clear the rest) and Ask again through the actions, the shared toast on a failure, and focus after each press.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spareCopy } from "../../lib/copy/social";
import type { YourRequest } from "../../lib/social/your-requests";
import { requestText, YourRequests } from "./your-requests";

const actions = vi.hoisted(() => ({ askSpareAction: vi.fn(), closeSpareAction: vi.fn(), refresh: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ askSpareAction: actions.askSpareAction, closeSpareAction: actions.closeSpareAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: actions.refresh }) }));

const r = spareCopy.request;
const m = r.mine;
const NOW = new Date("2026-10-22T12:00:00Z");
const DAY = 86_400_000;

const req = (id: string, state: YourRequest["state"], over: Partial<YourRequest> = {}): YourRequest => ({
  id, oracleId: `card-${id}`, card: { name: "Jace, Multiverse Architect", imageUri: null }, copies: 1,
  deckName: "Thopter Works", deckId: "deck-1", holder: { publicId: "pub-colin", displayName: "Colin", commander: null },
  state, daysLeft: state === "open" || state === "unavailable" || state === "unneeded" ? 12 : null,
  createdAt: new Date(NOW.getTime() - 2 * DAY), answeredAt: null, cleared: false, unseen: false, othersWithSpare: [],
  canAskAgain: state === "expired", ...over,
});

beforeEach(() => {
  actions.askSpareAction.mockReset();
  actions.closeSpareAction.mockReset();
  actions.refresh.mockReset();
});
afterEach(cleanup);

describe("requestText", () => {
  it("Requested: you asked, for the deck, with the days left (the days alone with no deck)", () => {
    const t = requestText(req("a", "open"), NOW);
    expect([t.kind, t.title, t.detail]).toEqual(["Requested", "You asked Colin for Jace, Multiverse Architect", "For Thopter Works · 12 days left"]);
    expect(requestText(req("a", "open", { deckName: null }), NOW).detail).toBe("12 days left");
  });

  it("Accepted: the friend can spare it, and the handover line, timed at the answer", () => {
    const answeredAt = new Date(NOW.getTime() - 3_600_000);
    const t = requestText(req("a", "yes", { answeredAt }), NOW);
    expect([t.kind, t.title, t.detail]).toEqual(["Accepted", "Colin can spare Jace, Multiverse Architect", m.acceptedDetail]);
    expect(t.at).toBe(answeredAt);
  });

  it("Declined: the friend is keeping it; nobody else, or who else has one", () => {
    expect(requestText(req("a", "no"), NOW).title).toBe("Colin is keeping Jace, Multiverse Architect");
    expect(requestText(req("a", "no"), NOW).detail).toBe("Nobody else you know has a spare of it.");
    expect(requestText(req("a", "no", { othersWithSpare: ["Max"] }), NOW).detail).toBe("Max has a spare too.");
    expect(requestText(req("a", "no", { othersWithSpare: ["Max", "Chris", "Sam"] }), NOW).detail).toBe("Max and 2 more have a spare too.");
  });

  it("No answer: the friend didn't answer, requested N days ago (the ask's own age), timed at the expiry", () => {
    const createdAt = new Date(NOW.getTime() - 15 * DAY);
    const t = requestText(req("a", "expired", { createdAt }), NOW);
    expect([t.kind, t.title, t.detail]).toEqual(["No answer", "Colin didn’t answer about Jace, Multiverse Architect", "Requested 15 days ago, for Thopter Works."]);
    expect(t.at.getTime()).toBe(createdAt.getTime() + 14 * DAY);
    // Whole days elapsed, never the expiry window's length: 21 days and a few hours read 21.
    const old = new Date(NOW.getTime() - 21 * DAY - 5 * 3_600_000);
    expect(requestText(req("a", "expired", { createdAt: old, deckName: null }), NOW).detail).toBe("Requested 21 days ago.");
  });

  it("No longer spare and No longer needed", () => {
    expect(requestText(req("a", "unavailable"), NOW)).toMatchObject({ kind: "No longer spare", title: "Colin no longer has a spare Jace, Multiverse Architect", detail: m.noLongerSpareDetail });
    expect(requestText(req("a", "unneeded"), NOW)).toMatchObject({ kind: "No longer needed", title: "You asked Colin for Jace, Multiverse Architect", detail: m.noLongerNeededDetail });
  });
});

describe("YourRequests", () => {
  it("is absent with no asks", () => {
    const { container } = render(<YourRequests rows={[]} now={NOW} />);
    expect(container.innerHTML).toBe("");
  });

  it("heads the section with its count and order, and draws every row with its ✕", () => {
    render(<YourRequests rows={[req("a", "open"), req("b", "yes"), req("c", "no"), req("d", "expired")]} now={NOW} />);
    const head = screen.getByRole("heading", { level: 2 });
    expect(head.textContent).toBe(`${m.head(4)}${m.order}`);
    const rows = screen.getAllByTestId("your-request");
    expect(rows.map((x) => x.dataset.state)).toEqual(["open", "yes", "no", "expired"]);
    for (const row of rows) expect(within(row).getByTestId("your-request-close").textContent).toBe("✕");
  });

  it("names the ✕ for what it does: withdraw an open ask, clear the rest", () => {
    render(<YourRequests rows={[req("a", "open"), req("b", "yes")]} now={NOW} />);
    expect(screen.getByRole("button", { name: m.withdrawAria("Colin", "Jace, Multiverse Architect") })).toBeTruthy();
    expect(screen.getByRole("button", { name: m.clearAria("Colin", "Jace, Multiverse Architect") })).toBeTruthy();
  });

  it("marks an unseen answer, and only that one", () => {
    render(<YourRequests rows={[req("a", "yes", { unseen: true }), req("b", "no")]} now={NOW} />);
    const [unseen, seen] = screen.getAllByTestId("your-request");
    expect(unseen.hasAttribute("data-unseen")).toBe(true);
    expect(seen.hasAttribute("data-unseen")).toBe(false);
  });

  // The server decides (`canAskAgain`: an open ask for the card, or a No from this friend inside the cooldown, a
  // cleared one included, would refuse it); the row only follows it.
  it("offers Ask again only on an unanswered ask the server would take", () => {
    render(<YourRequests rows={[req("a", "expired"), req("b", "expired", { canAskAgain: false }), req("c", "no", { canAskAgain: true })]} now={NOW} />);
    const [free, refused, declined] = screen.getAllByTestId("your-request");
    expect(within(free).getByRole("button", { name: r.askAgainAria("Colin", "Jace, Multiverse Architect") })).toBeTruthy();
    expect(within(refused).queryByTestId("friend-spare-ask")).toBeNull();
    expect(within(declined).queryByTestId("friend-spare-ask")).toBeNull();
  });

  it("✕ closes through the action and lands focus on the next row's ✕", async () => {
    actions.closeSpareAction.mockResolvedValue({ ok: true, closed: "withdrawn" });
    const { rerender } = render(<YourRequests rows={[req("a", "open"), req("b", "yes")]} now={NOW} />);
    const x = within(screen.getAllByTestId("your-request")[0]).getByTestId("your-request-close");
    x.focus();
    await act(async () => fireEvent.click(x));
    expect(actions.closeSpareAction).toHaveBeenCalledWith("a");
    // The action's redraw drops the row.
    rerender(<YourRequests rows={[req("b", "yes")]} now={NOW} />);
    expect(document.activeElement).toBe(within(screen.getByTestId("your-request")).getByTestId("your-request-close"));
  });

  it("✕ on the last row hands focus to the page's title as the section leaves", async () => {
    actions.closeSpareAction.mockResolvedValue({ ok: true, closed: "withdrawn" });
    const title = document.createElement("h1");
    title.id = "friends-title";
    title.tabIndex = -1;
    document.body.appendChild(title);
    const { rerender } = render(<YourRequests rows={[req("a", "open")]} now={NOW} />);
    const x = screen.getByTestId("your-request-close");
    x.focus();
    await act(async () => fireEvent.click(x));
    // The action's redraw has no rows left: the section goes, and focus must not fall to the body.
    await act(async () => { rerender(<YourRequests rows={[]} now={NOW} />); });
    await waitFor(() => expect(document.activeElement).toBe(title));
    title.remove();
  });

  it("Ask again asks the same friend for the same copies and deck, refreshes, and lands on the new Requested", async () => {
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new" });
    const expired = req("a", "expired", { copies: 2 });
    const { rerender } = render(<YourRequests rows={[expired]} now={NOW} />);
    const again = screen.getByRole("button", { name: r.askAgainAria("Colin", "Jace, Multiverse Architect") });
    again.focus();
    await act(async () => fireEvent.click(again));
    expect(actions.askSpareAction).toHaveBeenCalledWith({ friendPublicId: "pub-colin", oracleId: "card-a", copies: 2, deckId: "deck-1" });
    expect(actions.refresh).toHaveBeenCalledTimes(1);
    rerender(<YourRequests rows={[req("new", "open", { oracleId: "card-a" }), expired]} now={NOW} />);
    const fresh = screen.getAllByTestId("your-request")[0];
    expect(document.activeElement).toBe(within(fresh).getByTestId("your-request-status"));
  });

  it("Ask again lands on the new ask by its id, whatever state the redraw derives for it (here no longer needed)", async () => {
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new" });
    const expired = req("a", "expired");
    const { rerender } = render(<YourRequests rows={[expired]} now={NOW} />);
    const again = screen.getByTestId("friend-spare-ask");
    again.focus();
    await act(async () => fireEvent.click(again));
    rerender(<YourRequests rows={[req("new", "unneeded", { oracleId: "card-a" }), { ...expired, canAskAgain: false }]} now={NOW} />);
    const fresh = screen.getAllByTestId("your-request")[0];
    expect(fresh.dataset.state).toBe("unneeded");
    expect(document.activeElement).toBe(within(fresh).getByTestId("your-request-status"));
  });

  // The pressed control is taken at the press: a reader who tabs elsewhere while the action is out keeps their focus.
  it.each(["✕", "Ask again"])("a %s whose action is slow does not pull back a reader who moved on", async (which) => {
    let finishClose: (v: unknown) => void = () => {};
    let finishAsk: (v: unknown) => void = () => {};
    actions.closeSpareAction.mockReturnValue(new Promise((res) => { finishClose = res; }));
    actions.askSpareAction.mockReturnValue(new Promise((res) => { finishAsk = res; }));
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    const { rerender } = render(<YourRequests rows={[req("a", "expired"), req("b", "yes")]} now={NOW} />);
    const press = which === "✕" ? screen.getAllByTestId("your-request-close")[0] : screen.getByTestId("friend-spare-ask");
    press.focus();
    await act(async () => fireEvent.click(press));
    elsewhere.focus();
    await act(async () => (which === "✕" ? finishClose({ ok: true, closed: "cleared" }) : finishAsk({ ok: true, id: "new" })));
    rerender(<YourRequests rows={which === "✕" ? [req("b", "yes")] : [req("new", "open", { oracleId: "card-a" }), req("b", "yes")]} now={NOW} />);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  // A press that succeeded keeps every press locked until its redraw arrives: a second press during a slow refresh
  // would resend a write the first already made, and report a failure after a success.
  it.each(["✕", "Ask again"])("a %s that succeeded stays locked until the redraw arrives", async (which) => {
    actions.closeSpareAction.mockResolvedValue({ ok: true, closed: "cleared" });
    actions.askSpareAction.mockResolvedValue({ ok: true, id: "new" });
    const rows = [req("a", "expired"), req("b", "yes")];
    const { rerender } = render(<YourRequests rows={rows} now={NOW} />);
    const press = () => (which === "✕" ? screen.getAllByTestId("your-request-close")[0] : screen.getByTestId("friend-spare-ask"));
    await act(async () => fireEvent.click(press()));
    // The action is back, the redraw is not: the row still stands, and pressing it again sends nothing.
    expect((press() as HTMLButtonElement).disabled).toBe(true);
    await act(async () => fireEvent.click(press()));
    const sent = which === "✕" ? actions.closeSpareAction : actions.askSpareAction;
    expect(sent).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
    // The redraw releases the lock.
    await act(async () => {
      rerender(<YourRequests rows={which === "✕" ? [req("b", "yes")] : [req("new", "open", { oracleId: "card-a" }), req("b", "yes")]} now={NOW} />);
    });
    expect((screen.getAllByTestId("your-request-close")[0] as HTMLButtonElement).disabled).toBe(false);
  });

  it.each(["✕", "Ask again"])("a failed %s: the shared toast, the row as it was, no refresh", async (which) => {
    actions.closeSpareAction.mockResolvedValue({ ok: false, reason: "gone" });
    actions.askSpareAction.mockResolvedValue({ ok: false, reason: "asked" });
    render(<YourRequests rows={[req("a", "expired")]} now={NOW} />);
    const press = which === "✕" ? screen.getByTestId("your-request-close") : screen.getByTestId("friend-spare-ask");
    await act(async () => fireEvent.click(press));
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
    expect(screen.getByTestId("your-request").dataset.state).toBe("expired");
    expect(actions.refresh).not.toHaveBeenCalled();
  });
});
