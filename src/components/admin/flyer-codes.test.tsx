// The Flyer codes section (flyer trial PR 4a/4b; Admin-Desktop A1 to A3, Admin-Phone P1 to P3): rows, full and revoked
// states, Print, Revoke and its confirm, New flyer code and its form, and the launch-list card.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const makeCode = vi.fn();
const revokeCode = vi.fn();
const setLaunchDate = vi.fn();
vi.mock("../../app/admin/invites/flyer-actions", () => ({
  makeCode: (...a: unknown[]) => makeCode(...a),
  revokeCode: (...a: unknown[]) => revokeCode(...a),
  setLaunchDate: (...a: unknown[]) => setLaunchDate(...a),
}));

import { flyersView, type FlyerCodeRead } from "../../lib/admin/flyers-rule";
import { FlyerCodes } from "./flyer-codes";

const day = (d: number, m = 10) => new Date(Date.UTC(2026, m - 1, d, 9));
const code = (over: Partial<FlyerCodeRead>): FlyerCodeRead => ({
  id: "c", code: "MOX4QK", label: "Mox Boston", groupName: "mox-boston", capacity: 50, createdAt: day(30), revokedAt: null, taken: 12, listed: 0, ...over,
});
const view = flyersView(
  {
    codes: [code({}), code({ id: "k", code: "KNT3HZ", label: "Knight Moves Cafe", taken: 50, listed: 19 }), code({ id: "p", code: "PZA9TC", label: "Pizza Pod test", taken: 2, listed: 4, revokedAt: day(2, 11) })],
    listed: 23, held: 40, open: [], holds: [], launchDate: null,
  },
  new Date("2026-10-30T12:00:00Z"),
);

describe("FlyerCodes", () => {
  it("draws the header meta, a row per code and the launch-list card", () => {
    render(<FlyerCodes view={view} />);
    expect(screen.getByRole("heading", { name: "Flyer codes" })).toBeTruthy();
    expect(screen.getByText("2 live · from your invites, 40 left · 23 on the launch list")).toBeTruthy();
    expect(document.querySelectorAll("[data-flyer]")).toHaveLength(3);
    expect(within(screen.getByTestId("launch-list-card")).getByText("Launch list · 23")).toBeTruthy();
  });

  it("marks a full row and dims a revoked one with no Print", () => {
    render(<FlyerCodes view={view} />);
    expect(document.querySelector("[data-flyer=KNT3HZ]")!.getAttribute("data-state")).toBe("full");
    expect(document.querySelector("[data-flyer=KNT3HZ]")!.textContent).toContain("of 50 · full");
    const off = document.querySelector("[data-flyer=PZA9TC]")!;
    expect(off.getAttribute("data-state")).toBe("revoked");
    expect(off.textContent).toContain("revoked Nov 2");
    expect(within(off as HTMLElement).queryByRole("link", { name: "Print" })).toBeNull();
  });

  it("links Print to the code's print page and draws no CSV", () => {
    render(<FlyerCodes view={view} />);
    expect(screen.getAllByRole("link", { name: "Print" }).map((a) => a.getAttribute("href"))).toEqual(["/admin/invites/flyers/MOX4QK", "/admin/invites/flyers/KNT3HZ"]);
    expect(screen.queryByText("Download CSV")).toBeNull();
  });

  it("draws Revoke on every live and full row and none on a revoked one", () => {
    render(<FlyerCodes view={view} />);
    expect(screen.getAllByTestId("flyer-revoke")).toHaveLength(2);
    expect(within(document.querySelector("[data-flyer=PZA9TC]") as HTMLElement).queryByText("Revoke")).toBeNull();
  });
});

describe("FlyerCodes with no codes", () => {
  const empty = flyersView({ codes: [], listed: 0, held: 37, open: [], holds: [], launchDate: null }, new Date("2026-10-30T12:00:00Z"));

  it("keeps New flyer code, writes the zero meta and holds the muted line in a card (No-Codes.dc.html)", () => {
    render(<FlyerCodes view={empty} />);
    expect(screen.getByText("none yet · from your invites, 37 left")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New flyer code" })).toBeTruthy();
    expect(screen.getByTestId("flyer-codes-empty").textContent).toBe("No flyer codes yet: make one for a store, then print its flyer.");
    expect(document.querySelectorAll("[data-flyer]")).toHaveLength(0);
  });

  it("keeps the launch list card at zero with its new meta and no Download CSV", () => {
    render(<FlyerCodes view={empty} />);
    const card = screen.getByTestId("launch-list-card");
    expect(within(card).getByText("Launch list · 0")).toBeTruthy();
    expect(within(card).getByText("no emails yet · a used-up or ended flyer asks for one")).toBeTruthy();
    expect(screen.queryByText("Download CSV")).toBeNull();
  });

  it("draws no empty line when a code exists", () => {
    render(<FlyerCodes view={view} />);
    expect(screen.queryByTestId("flyer-codes-empty")).toBeNull();
  });
});

describe("New flyer code", () => {
  beforeEach(() => {
    makeCode.mockReset().mockResolvedValue({ ok: true, code: "ABC234" });
    refresh.mockClear();
  });
  const groups = [{ id: "g-pod", name: "pizza-pod" }];

  it("opens in place with Store, Group (a new group named from the store), the chips and the spend line, and Cancel closes it", () => {
    render(<FlyerCodes view={view} groups={groups} />);
    fireEvent.click(screen.getByRole("button", { name: "New flyer code" }));
    const form = screen.getByTestId("flyer-new-form");
    expect(screen.queryByRole("button", { name: "New flyer code" })).toBeNull();
    fireEvent.change(within(form).getByLabelText("Store"), { target: { value: "Mox Boston" } });
    expect(within(form).getByRole("option", { name: "New group: mox-boston" })).toBeTruthy();
    expect(within(form).getByRole("option", { name: "pizza-pod" })).toBeTruthy();
    expect(within(form).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["50 sign-ups", "3 free runs a day", "15 welcome credits", "3 invites each", "ends at launch"]);
    expect(within(form).getByText("Each sign-up spends one of your invites.")).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("flyer-new-form")).toBeNull();
    expect(makeCode).not.toHaveBeenCalled();
  });

  it("dims Make code until the store has text, then makes a code in a new group and closes", async () => {
    render(<FlyerCodes view={view} groups={groups} />);
    fireEvent.click(screen.getByRole("button", { name: "New flyer code" }));
    const make = screen.getByRole("button", { name: "Make code" }) as HTMLButtonElement;
    expect(make.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Mox Boston" } });
    expect(make.disabled).toBe(false);
    fireEvent.click(make);
    await waitFor(() => expect(screen.queryByTestId("flyer-new-form")).toBeNull());
    expect(makeCode).toHaveBeenCalledWith("Mox Boston", null);
    expect(refresh).toHaveBeenCalled();
  });

  it("makes the code in an existing group when one is picked", async () => {
    render(<FlyerCodes view={view} groups={groups} />);
    fireEvent.click(screen.getByRole("button", { name: "New flyer code" }));
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Pizza Pod 2" } });
    fireEvent.change(screen.getByLabelText("Group"), { target: { value: "g-pod" } });
    fireEvent.click(screen.getByRole("button", { name: "Make code" }));
    await waitFor(() => expect(makeCode).toHaveBeenCalledWith("Pizza Pod 2", "g-pod"));
  });

  it("keeps the form and says so when the make fails", async () => {
    makeCode.mockResolvedValue({ ok: false, error: "failed" });
    render(<FlyerCodes view={view} groups={groups} />);
    fireEvent.click(screen.getByRole("button", { name: "New flyer code" }));
    fireEvent.change(screen.getByLabelText("Store"), { target: { value: "Mox" } });
    fireEvent.click(screen.getByRole("button", { name: "Make code" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Store") as HTMLInputElement).value).toBe("Mox");
  });
});

describe("Revoke", () => {
  beforeEach(() => {
    revokeCode.mockReset().mockResolvedValue({ ok: true, changed: true });
    refresh.mockClear();
  });

  it("confirms in a dialog that names the store, the code and how many joined, and Keep it writes nothing", () => {
    render(<FlyerCodes view={view} />);
    fireEvent.click(within(document.querySelector("[data-flyer=MOX4QK]") as HTMLElement).getByTestId("flyer-revoke"));
    const dialog = screen.getByRole("dialog", { name: "Revoke Mox Boston’s code?" });
    expect(dialog.textContent).toContain("People can no longer join with MOX4QK. The 12 who joined keep their accounts, their group and their invites. Printed flyers will say it no longer works.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(revokeCode).not.toHaveBeenCalled();
  });

  it("revokes the pressed code and closes", async () => {
    render(<FlyerCodes view={view} />);
    fireEvent.click(within(document.querySelector("[data-flyer=KNT3HZ]") as HTMLElement).getByTestId("flyer-revoke"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke code" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(revokeCode).toHaveBeenCalledWith("k");
    expect(refresh).toHaveBeenCalled();
  });

  it("stays open with an error line when the revoke is refused", async () => {
    revokeCode.mockResolvedValue({ ok: false, error: "off" });
    render(<FlyerCodes view={view} />);
    fireEvent.click(within(document.querySelector("[data-flyer=MOX4QK]") as HTMLElement).getByTestId("flyer-revoke"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke code" }));
    const alert = await within(screen.getByRole("dialog")).findByRole("alert");
    expect(alert.textContent).toBe("Couldn’t revoke the code, so nothing changed. Try again.");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("says the code may be revoked, and refreshes the list, when the reply is lost", async () => {
    revokeCode.mockRejectedValue(new Error("network"));
    render(<FlyerCodes view={view} />);
    fireEvent.click(within(document.querySelector("[data-flyer=MOX4QK]") as HTMLElement).getByTestId("flyer-revoke"));
    fireEvent.click(screen.getByRole("button", { name: "Revoke code" }));
    const alert = await within(screen.getByRole("dialog")).findByRole("alert");
    expect(alert.textContent).toBe("Lost the connection, so the code may be revoked. Check the list before trying again.");
    expect(refresh).toHaveBeenCalled();
  });
});

// The launch card's second row (flyer admin PR B; Launch-Date.dc.html D1 to D5, P1 to P4).
describe("the launch date row", () => {
  const withDate = (launchDate: string | null) =>
    flyersView({ codes: [], listed: 23, held: 40, open: [], holds: [], launchDate }, new Date("2026-10-30T12:00:00Z"));
  const dateInput = () => screen.getByLabelText("Launch date") as HTMLInputElement;

  beforeEach(() => setLaunchDate.mockReset());

  it("starts empty with the label, a date field, the help line and no button (D1/P1)", () => {
    render(<FlyerCodes view={withDate(null)} />);
    const row = screen.getByTestId("launch-date-row");
    expect(within(row).getByText("Optional. Leave it blank until the date is firm.")).toBeTruthy();
    expect(dateInput().type).toBe("date");
    expect(dateInput().value).toBe("");
    expect(screen.queryByTestId("launch-date-save")).toBeNull();
    expect(screen.queryByTestId("launch-date-clear")).toBeNull();
    expect(within(row).queryByRole("alert")).toBeNull();
  });

  it("shows Save only while the field differs from what is saved (D2/P2)", () => {
    render(<FlyerCodes view={withDate(null)} />);
    fireEvent.change(dateInput(), { target: { value: "2026-11-20" } });
    expect(screen.getByTestId("launch-date-save").textContent).toBe("Save");
    fireEvent.change(dateInput(), { target: { value: "" } });
    expect(screen.queryByTestId("launch-date-save")).toBeNull();
  });

  it("saves, then says Saved and offers Clear (D3/P3)", async () => {
    setLaunchDate.mockResolvedValue({ ok: true, state: "saved", value: "2026-11-20" });
    render(<FlyerCodes view={withDate(null)} />);
    fireEvent.change(dateInput(), { target: { value: "2026-11-20" } });
    fireEvent.click(screen.getByTestId("launch-date-save"));
    await waitFor(() => expect(screen.getByTestId("launch-date-status").textContent).toBe("Saved"));
    expect(setLaunchDate).toHaveBeenCalledWith("2026-11-20");
    expect(screen.getByTestId("launch-date-clear").textContent).toBe("Clear");
    expect(screen.queryByTestId("launch-date-save")).toBeNull();
    expect(dateInput().value).toBe("2026-11-20");
  });

  it("clears by saving a blank, then says Cleared with an empty field (D4/P4)", async () => {
    setLaunchDate.mockResolvedValue({ ok: true, state: "cleared", value: null });
    render(<FlyerCodes view={withDate("2026-11-20")} />);
    expect(dateInput().value).toBe("2026-11-20");
    fireEvent.click(screen.getByTestId("launch-date-clear"));
    await waitFor(() => expect(screen.getByTestId("launch-date-status").textContent).toBe("Cleared"));
    expect(setLaunchDate).toHaveBeenCalledWith("");
    expect(dateInput().value).toBe("");
    expect(screen.queryByTestId("launch-date-clear")).toBeNull();
  });

  it("saves an emptied field as a blank (blank is a valid saved value)", async () => {
    setLaunchDate.mockResolvedValue({ ok: true, state: "cleared", value: null });
    render(<FlyerCodes view={withDate("2026-11-20")} />);
    fireEvent.change(dateInput(), { target: { value: "" } });
    fireEvent.click(screen.getByTestId("launch-date-save"));
    await waitFor(() => expect(setLaunchDate).toHaveBeenCalledWith(""));
  });

  it("keeps what was typed and alerts with the setting dialog's line when a save is refused (D5)", async () => {
    setLaunchDate.mockResolvedValue({ ok: false, error: "past" });
    render(<FlyerCodes view={withDate(null)} />);
    fireEvent.change(dateInput(), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByTestId("launch-date-save"));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Didn’t save. Nothing changed.");
    expect(dateInput().value).toBe("2020-01-01");
    expect(screen.getByTestId("launch-date-save")).toBeTruthy();
    fireEvent.change(dateInput(), { target: { value: "2026-12-01" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("alerts the same way when the reply is lost", async () => {
    setLaunchDate.mockRejectedValue(new Error("network"));
    render(<FlyerCodes view={withDate(null)} />);
    fireEvent.change(dateInput(), { target: { value: "2026-11-20" } });
    fireEvent.click(screen.getByTestId("launch-date-save"));
    expect((await screen.findByRole("alert")).textContent).toBe("Didn’t save. Nothing changed.");
    expect(dateInput().value).toBe("2026-11-20");
  });
});
