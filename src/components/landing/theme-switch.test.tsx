import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, THEMES } from "../../lib/theme/themes";
import { ThemeSwitch } from "./theme-switch";

afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
});

describe("ThemeSwitch", () => {
  it("draws six swatches and marks the theme the document wears, named", () => {
    document.documentElement.dataset.theme = "kamigawa";
    render(<ThemeSwitch />);
    expect(screen.getAllByRole("radio")).toHaveLength(THEMES.length);
    expect(screen.getByRole("radio", { checked: true })).toHaveAttribute("aria-label", "Neon Rain, Kamigawa: Neon Dynasty");
    expect(screen.getByRole("status")).toHaveTextContent("Neon Rain");
  });

  it("a press re-themes the page and writes the shipped cookie, name, path and max age", async () => {
    const writes: string[] = [];
    const set = Object.getOwnPropertyDescriptor(Document.prototype, "cookie")!.set!;
    Object.defineProperty(document, "cookie", { configurable: true, get: () => "", set: (v: string) => { writes.push(v); set.call(document, v); } });
    try {
      render(<ThemeSwitch />);
      act(() => { fireEvent.click(screen.getByRole("radio", { name: /^Canopy/ })); });
      expect(document.documentElement.dataset.theme).toBe("ixalan");
      expect(writes.at(-1)).toContain(`${THEME_COOKIE}=ixalan; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`);
      // The ring follows the document through a MutationObserver, which reports after the click's own turn.
      await waitFor(() => expect(screen.getByRole("radio", { checked: true })).toHaveAttribute("aria-label", expect.stringContaining("Canopy")));
    } finally {
      delete (document as unknown as { cookie?: string }).cookie;
    }
  });

  it("arrow keys move and choose, wrapping", () => {
    document.documentElement.dataset.theme = THEMES[THEMES.length - 1].key;
    render(<ThemeSwitch />);
    act(() => { fireEvent.keyDown(screen.getByRole("radio", { checked: true }), { key: "ArrowRight" }); });
    expect(document.documentElement.dataset.theme).toBe(THEMES[0].key);
  });

  it("Home and End go to the first and last theme", () => {
    document.documentElement.dataset.theme = THEMES[2].key;
    render(<ThemeSwitch />);
    act(() => { fireEvent.keyDown(screen.getByRole("radio", { checked: true }), { key: "End" }); });
    expect(document.documentElement.dataset.theme).toBe(THEMES[THEMES.length - 1].key);
    act(() => { fireEvent.keyDown(screen.getByRole("radio", { checked: true }), { key: "Home" }); });
    expect(document.documentElement.dataset.theme).toBe(THEMES[0].key);
  });

  it("hydrates with no ring and no name, so a server render never shows a wrong theme ringed", () => {
    document.documentElement.dataset.theme = "kamigawa";
    const html = renderToString(<ThemeSwitch />);
    expect(html).not.toContain('aria-checked="true"');
  });
});
