// The print page's bar (flyer trial PR 4c; small items 7, Print-Revoked.dc.html): a live code's Print and Download QR, and a
// revoked code's bar, which says when and has neither.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlyerPrintBar } from "./flyer-print-bar";

const qr = { size: 21, d: "M0 0h1v1h-1z" };

describe("FlyerPrintBar", () => {
  it("draws Print and Download QR for a live code", () => {
    render(<FlyerPrintBar store="Mox Boston" code="MOX4QK" qr={qr} />);
    expect(screen.getByTestId("flyer-print")).toBeTruthy();
    expect(screen.getByTestId("flyer-download-qr")).toBeTruthy();
    expect(screen.queryByTestId("flyer-revoked-note")).toBeNull();
  });

  it("says when a revoked code was revoked and draws neither Print nor Download QR", () => {
    render(<FlyerPrintBar store="Pizza Pod test" code="PZA9TC" qr={qr} revoked="Nov 2" />);
    expect(screen.getByTestId("flyer-revoked-note").textContent).toBe("Revoked Nov 2. This code no longer signs anyone up, so there’s nothing to print.");
    expect(screen.queryByTestId("flyer-print")).toBeNull();
    expect(screen.queryByTestId("flyer-download-qr")).toBeNull();
    expect(screen.getByText("PZA9TC").className).toContain("fb-muted");
    expect(screen.getByRole("link", { name: /Invites/ }).getAttribute("href")).toBe("/admin/invites");
  });
});
