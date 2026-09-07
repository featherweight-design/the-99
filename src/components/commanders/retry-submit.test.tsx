import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RetryGhost, RetryLink } from "./retry-submit";
import { PENDING_OPACITY, PENDING_OPACITY_CLASS } from "./pending";

// `useFormStatus` reads a context React only populates while a real server
// action is in flight, which no test can produce. The hook is the seam.
const status = vi.hoisted(() => ({ pending: false }));
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  useFormStatus: () => status,
}));

// `retryRecs` drops every persisted score and re-ranks from EDHREC — measured
// at 2.9s, by a distance the slowest thing a player can start on this page.
// Before this the button was inert for the whole of it.
describe("retry submit", () => {
  it("marks and dims itself while the action is out", () => {
    status.pending = true;
    const { rerender } = render(<RetryGhost>Retry</RetryGhost>);
    const ghost = screen.getByRole("button", { name: "Retry" });
    expect(ghost.getAttribute("aria-busy")).toBe("true");
    expect(ghost.className).toContain(PENDING_OPACITY_CLASS);
    expect(ghost.querySelector("[data-pending-mark]")).not.toBeNull();

    rerender(<RetryLink fontSize={12}>Retry</RetryLink>);
    const link = screen.getByRole("button", { name: "Retry" });
    expect(link.style.opacity).toBe(String(PENDING_OPACITY));
    expect(link.querySelector("[data-pending-mark]")).not.toBeNull();
  });

  // Never `disabled`, per the note in pending.ts: disabling the element the
  // player is standing on blurs it, and a keyboard reader loses their place in
  // the middle of the one action they came to the banner for.
  it("stays pressable while it waits", () => {
    status.pending = true;
    render(<RetryGhost>Retry</RetryGhost>);
    expect(screen.getByRole("button", { name: "Retry" })).not.toBeDisabled();
  });

  it("is unmarked with nothing out", () => {
    status.pending = false;
    render(<RetryGhost>Retry</RetryGhost>);
    const ghost = screen.getByRole("button", { name: "Retry" });
    expect(ghost.getAttribute("aria-busy")).toBeNull();
    expect(ghost.querySelector("[data-pending-mark]")).toBeNull();
  });
});
