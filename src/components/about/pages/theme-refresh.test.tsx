import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A theme picked from the account menu repaints in place; the About page's captures are chosen on the server, so a
// move to another theme asks the server again (Copilot round 2 on #2329).
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { ThemeRefresh } = await import("./theme-refresh");

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  refresh.mockClear();
  document.documentElement.dataset.theme = "amonkhet";
});
afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe("ThemeRefresh", () => {
  it("refreshes when the theme moves to another than the page was drawn in", async () => {
    render(<ThemeRefresh drawnIn="amonkhet" />);
    document.documentElement.dataset.theme = "kamigawa";
    await flush();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("refreshes at mount when the page was drawn in another theme than <html> already has (Back after a change)", async () => {
    document.documentElement.dataset.theme = "kamigawa";
    render(<ThemeRefresh drawnIn="amonkhet" />);
    await flush();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh at mount when the page was drawn in the theme <html> has", async () => {
    render(<ThemeRefresh drawnIn="amonkhet" />);
    await flush();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not refresh when the theme is set to the one the page was drawn in", async () => {
    render(<ThemeRefresh drawnIn="amonkhet" />);
    document.documentElement.dataset.theme = "amonkhet";
    await flush();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("stops watching once unmounted", async () => {
    const { unmount } = render(<ThemeRefresh drawnIn="amonkhet" />);
    unmount();
    document.documentElement.dataset.theme = "kamigawa";
    await flush();
    expect(refresh).not.toHaveBeenCalled();
  });
});
