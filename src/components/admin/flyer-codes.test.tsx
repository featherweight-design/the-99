// The Flyer codes section (flyer trial PR 4a; Admin-Desktop A1, Admin-Phone P1): rows, full and revoked states, Print,
// the launch-list card, and no New flyer code or Revoke yet.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("links Print to the code's print page and draws neither New flyer code nor Revoke", () => {
    render(<FlyerCodes view={view} />);
    expect(screen.getAllByRole("link", { name: "Print" }).map((a) => a.getAttribute("href"))).toEqual(["/admin/invites/flyers/MOX4QK", "/admin/invites/flyers/KNT3HZ"]);
    expect(screen.queryByText("New flyer code")).toBeNull();
    expect(screen.queryByText("Revoke")).toBeNull();
    expect(screen.queryByText("Download CSV")).toBeNull();
  });
});
