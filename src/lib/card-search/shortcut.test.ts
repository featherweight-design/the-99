import { describe, expect, it } from "vitest";
import { dialogIsUp, isAddShortcut, isMacPlatform, isSearchShortcut } from "./shortcut";

const key = (o: Partial<Parameters<typeof isSearchShortcut>[0]>) => ({
  key: "k",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...o,
});

describe("isSearchShortcut", () => {
  it("is ⌘K on a Mac and never Ctrl+K there", () => {
    expect(isSearchShortcut(key({ metaKey: true }), true)).toBe(true);
    expect(isSearchShortcut(key({ ctrlKey: true }), true)).toBe(false);
  });
  it("is Ctrl+K elsewhere and not the Windows key", () => {
    expect(isSearchShortcut(key({ ctrlKey: true }), false)).toBe(true);
    expect(isSearchShortcut(key({ metaKey: true }), false)).toBe(false);
  });
  it("ignores extra modifiers, other keys and IME composition", () => {
    expect(isSearchShortcut(key({ metaKey: true, shiftKey: true }), true)).toBe(false);
    expect(isSearchShortcut(key({ ctrlKey: true, altKey: true }), false)).toBe(false);
    expect(isSearchShortcut(key({ metaKey: true, key: "j" }), true)).toBe(false);
    expect(isSearchShortcut({ ...key({ metaKey: true }), isComposing: true }, true)).toBe(false);
  });
  it("reads an upper-case K (caps lock)", () => {
    expect(isSearchShortcut(key({ metaKey: true, key: "K" }), true)).toBe(true);
  });
});

describe("isMacPlatform", () => {
  it("reads userAgentData first, then platform", () => {
    expect(isMacPlatform({ userAgentData: { platform: "macOS" }, platform: "Win32" })).toBe(true);
    expect(isMacPlatform({ platform: "MacIntel" })).toBe(true);
    expect(isMacPlatform({ platform: "Win32" })).toBe(false);
    expect(isMacPlatform({})).toBe(false);
  });
});

describe("dialogIsUp", () => {
  const el = (attrs: Record<string, string>, parent?: unknown) => ({
    ...attrs,
    closest: (sel: string) => {
      if (attrs.hiddenAncestor && sel.includes("[hidden]")) return {};
      if (attrs.inertAncestor && sel.includes("[inert]")) return {};
      return null;
    },
    contains: () => false,
    parent,
  });
  const doc = (els: unknown[]) => ({ querySelectorAll: () => els as unknown as NodeListOf<Element> });
  it("is false with no dialog, and for the search's own", () => {
    const own = el({}) as unknown as Element;
    expect(dialogIsUp(doc([]), null)).toBe(false);
    expect(dialogIsUp(doc([own]), own)).toBe(false);
  });
  it("is true for another dialog, false when it is hidden", () => {
    expect(dialogIsUp(doc([el({})]), null)).toBe(true);
    expect(dialogIsUp(doc([el({ hiddenAncestor: "1" })]), null)).toBe(false);
  });
  it("is false for a dialog inside an inert figure", () => {
    expect(dialogIsUp(doc([el({ inertAncestor: "1" })]), null)).toBe(false);
  });
});

describe("isAddShortcut", () => {
  const enter = (o: Partial<Parameters<typeof isAddShortcut>[0]>) => key({ key: "Enter", ...o });
  it("is ⌘↵ or Ctrl ↵, one modifier only", () => {
    expect(isAddShortcut(enter({ metaKey: true }))).toBe(true);
    expect(isAddShortcut(enter({ ctrlKey: true }))).toBe(true);
    expect(isAddShortcut(enter({ metaKey: true, ctrlKey: true }))).toBe(false);
  });
  it("is not a bare ↵, which opens the card", () => {
    expect(isAddShortcut(enter({}))).toBe(false);
  });
  it("ignores Shift, Alt, other keys and IME composition", () => {
    expect(isAddShortcut(enter({ metaKey: true, shiftKey: true }))).toBe(false);
    expect(isAddShortcut(enter({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(isAddShortcut(key({ metaKey: true }))).toBe(false);
    expect(isAddShortcut({ ...enter({ metaKey: true }), isComposing: true })).toBe(false);
  });
});
