import { afterEach, describe, expect, it } from "vitest";
import { applyTheme } from "./apply";
import { THEME_COOKIE, themeCookieValue } from "./themes";

afterEach(() => {
  delete document.documentElement.dataset.theme;
  document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
});

describe("applyTheme", () => {
  it("paints the document and remembers the choice in the shipped cookie", () => {
    applyTheme("eldraine");
    expect(document.documentElement.dataset.theme).toBe("eldraine");
    expect(themeCookieValue(document.cookie)).toBe("eldraine");
  });
});
