// The landing after a delete: "Your account is deleted." (role status) only on `?deleted=1`, the param stripped with
// mirrorUrl, and the toast's foot the landing's own (no tab bar).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ mirrorUrl: vi.fn() }));
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: m.mirrorUrl }));

import { DeletedToast } from "./deleted-toast";
import { accountCopy } from "../../lib/copy/account";

const at = (path: string) => window.history.replaceState(null, "", path);

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  at("/");
});

describe("DeletedToast", () => {
  it("says the account is deleted, as a status, and strips the param", () => {
    at("/?deleted=1&utm=x");
    render(<DeletedToast />);
    const toast = screen.getByText(accountCopy.deleted).closest("[role]")!;
    expect(toast.getAttribute("role")).toBe("status");
    expect(String(m.mirrorUrl.mock.calls[0][0])).toBe(`${window.location.origin}/?utm=x`);
    const foot = document.querySelector<HTMLElement>("[data-deleted-toast]")!;
    expect(foot.style.getPropertyValue("--tabbar-h")).toBe("0px");
  });

  it("draws nothing and writes nothing without the param", () => {
    at("/");
    const { container } = render(<DeletedToast />);
    expect(container.innerHTML).toBe("");
    expect(m.mirrorUrl).not.toHaveBeenCalled();
  });
});
