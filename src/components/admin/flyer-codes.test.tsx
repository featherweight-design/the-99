// The Flyer codes section (flyer trial PR 4a/4b; Admin-Desktop A1 to A3, Admin-Phone P1 to P3): rows, full and revoked
// states, Print, Revoke and its confirm, New flyer code and its form, and the launch-list card.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
const makeCode = vi.fn();
const revokeCode = vi.fn();
vi.mock("../../app/admin/invites/flyer-actions", () => ({ makeCode: (...a: unknown[]) => makeCode(...a), revokeCode: (...a: unknown[]) => revokeCode(...a) }));

import { flyersView, type FlyerCodeRead } from "../../lib/admin/flyers-rule";
import { FlyerCodes } from "./flyer-codes";

const day = (d: number, m = 10) => new Date(Date.UTC(2026, m - 1, d, 9));
const code = (over: Partial<FlyerCodeRead>): FlyerCodeRead => ({
  id: "c", code: "MOX4QK", label: "Mox Boston", groupName: "mox-boston", capacity: 50, createdAt: day(30), revokedAt: null, taken: 12, listed: 0, ...over,
});
const view = flyersView(
  {
    codes: [code({}), code({ id: "k", code: "KNT3HZ", label: "Knight Moves Cafe", taken: 50, listed: 19 }), code({ id: "p", code: "PZA9TC", label: "Pizza Pod test", taken: 2, listed: 4, revokedAt: day(2, 11) })],
    listed: 23, held: 40, open: [], holds: [],
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
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toBeTruthy();
  });
});
