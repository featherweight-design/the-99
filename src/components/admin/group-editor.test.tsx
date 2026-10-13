// A group's editor (admin STATES G2 to G4): selecting and unselecting members, the pending bar's
// title and sentences, Undo, the search filter, a refusal, and the confirm a rise opens.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupWriteResult } from "../../lib/admin/group-writes";
import type { MemberRow, SavedGroup } from "../../lib/admin/groups-rule";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));
const save = vi.fn<(id: string, input: object) => Promise<GroupWriteResult>>();
const create = vi.fn<(input: object) => Promise<GroupWriteResult>>();
vi.mock("../../app/admin/groups/actions", () => ({ saveGroup: (id: string, i: object) => save(id, i), createGroup: (i: object) => create(i) }));

const { GroupEditor } = await import("./group-editor");

const T = "11111111-1111-4111-8111-111111111111";
const F = "22222222-2222-4222-8222-222222222222";
const SAVED: SavedGroup = { id: T, name: "testers", description: "Hugh plus one", dailyAllowance: null };
const none = { gains: [], losses: [] };
const ROWS: MemberRow[] = [
  { id: "u_hugh", name: "Hugh", email: "hugh@x.dev", saved: { id: T, name: "testers" }, toThis: none, toNone: { gains: [], losses: ["Overview v2"] } },
  { id: "u_theo", name: "Theo", email: null, saved: { id: F, name: "friends" }, toThis: { gains: ["Overview v2", "Swap tools"], losses: [] }, toNone: none },
  { id: "u_jun", name: "Jun", email: "jun@x.dev", saved: null, toThis: none, toNone: none },
];

const member = (name: string) => screen.getByRole("checkbox", { name: new RegExp(`^${name}`) });
const pending = () => screen.queryByTestId("group-pending");

beforeEach(() => {
  save.mockReset();
  create.mockReset();
  refresh.mockReset();
  push.mockReset();
});

describe("GroupEditor", () => {
  it("draws every account with its group and state, and no pending bar while nothing differs", () => {
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    expect(member("Hugh")).toHaveAttribute("aria-checked", "true");
    expect(member("Hugh")).toHaveTextContent("in testers");
    expect(member("Hugh")).toHaveTextContent("hugh@x.dev");
    expect(member("Hugh")).toHaveTextContent("u_hugh");
    expect(member("Theo")).toHaveAttribute("aria-checked", "false");
    expect(member("Theo")).toHaveTextContent("in friends");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(pending()).toBeNull();
  });

  it("selecting an account in another group names the move and what it gains, and Undo resets", () => {
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.click(member("Theo"));
    expect(member("Theo")).toHaveAttribute("aria-checked", "true");
    expect(member("Theo")).toHaveTextContent("moves from friends");
    expect(member("Theo")).toHaveTextContent("selected, not saved");
    expect(screen.getByText("2 selected, 1 not saved")).toBeInTheDocument();
    const bar = pending()!;
    expect(bar).toHaveTextContent("Theo selected, not saved");
    expect(bar).toHaveTextContent("Theo moves from friends to testers, and gains Overview v2 and Swap tools.");
    fireEvent.click(within(bar).getByRole("button", { name: "Undo" }));
    expect(member("Theo")).toHaveAttribute("aria-checked", "false");
    expect(pending()).toBeNull();
  });

  it("unselecting a member names what it loses", () => {
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.click(member("Hugh"));
    expect(pending()).toHaveTextContent("Saving removes Hugh from testers, and Hugh loses Overview v2.");
    expect(screen.getByText("0 selected, 1 not saved")).toBeInTheDocument();
  });

  it("filters the list by name, email or id", () => {
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    const search = screen.getByRole("searchbox", { name: "Find an account by name, email or id" });
    fireEvent.change(search, { target: { value: "JUN@" } });
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("data-member"))).toEqual(["u_jun"]);
    fireEvent.change(search, { target: { value: "u_th" } });
    expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("data-member"))).toEqual(["u_theo"]);
    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No account matches.")).toBeInTheDocument();
  });

  it("sends the whole desired state on Save, and leaves the refresh to the action's own revalidation", async () => {
    save.mockResolvedValueOnce({ ok: true, id: T });
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Daily credits/ }), { target: { value: "8" } });
    fireEvent.click(member("Jun"));
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Save" })));
    expect(save).toHaveBeenCalledWith(T, { name: "testers", description: "Hugh plus one", dailyAllowance: 8, members: ["u_hugh", "u_jun"] });
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("refuses a bad name on the page, and shows the server's name refusal under the field", async () => {
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    const name = screen.getByRole("textbox", { name: /^Name/ });
    fireEvent.change(name, { target: { value: "Two Words" } });
    fireEvent.click(within(pending()!).getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use lowercase letters");
    expect(save).not.toHaveBeenCalled();
    save.mockResolvedValueOnce({ ok: false, error: "name" });
    fireEvent.change(name, { target: { value: "friends" } });
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Save" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Another group has that name.");
  });

  it("opens the confirm on a rise, and re-sends with the confirmed count", async () => {
    save.mockResolvedValueOnce({ ok: false, error: "confirm", preview: { names: ["Theo"], count: 1, costs: [{ key: "intake", reserveMicroUsd: 240_000, meanMicroUsd: null }], credits: [5], whatsNew: 0 } });
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.click(member("Theo"));
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Save" })));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Turn Help me choose on for 1 more account?");
    expect(dialog).toHaveTextContent("Saving changes who is in testers");
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    // An edit made while the confirm is open is not what it describes, so the confirm sends the input it showed.
    fireEvent.click(member("Jun"));
    save.mockResolvedValueOnce({ ok: true, id: T });
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Turn on for 1" })));
    expect(save).toHaveBeenLastCalledWith(T, expect.objectContaining({ members: ["u_hugh", "u_theo"], confirmed: 1 }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("creates a new group and goes to its page", async () => {
    create.mockResolvedValueOnce({ ok: true, id: F });
    render(<GroupEditor saved={null} rows={ROWS} />);
    expect(screen.getAllByRole("checkbox").every((c) => c.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: /^Name/ }), { target: { value: "beta" } });
    fireEvent.click(member("Jun"));
    expect(pending()).toHaveTextContent("Saving adds Jun to beta. Nothing changes for Jun.");
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Create" })));
    expect(create).toHaveBeenCalledWith({ name: "beta", description: null, dailyAllowance: null, members: ["u_jun"] });
    expect(push).toHaveBeenCalledWith(`/admin/groups/${F}`);
  });

  it("says a failed save changed nothing", async () => {
    save.mockResolvedValueOnce({ ok: false, error: "failed" });
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.click(member("Jun"));
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Save" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("Didn’t save. Nothing changed.");
  });

  it("calls a lost reply unknown, never nothing changed, and refreshes to reconcile", async () => {
    save.mockRejectedValueOnce(new Error("offline"));
    render(<GroupEditor saved={SAVED} rows={ROWS} />);
    fireEvent.click(member("Jun"));
    await act(async () => fireEvent.click(within(pending()!).getByRole("button", { name: "Save" })));
    expect(within(pending()!).getByRole("alert")).toHaveTextContent("it may have saved");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
