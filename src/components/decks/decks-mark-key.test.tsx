import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { deckNoticesCopy } from "../../lib/copy/notices";
import type { NoticeSummary } from "../../lib/notices/summary-sql";
import { DecksMarkKey } from "./decks-mark-key";
import { noticeSentence, noticeSpoken } from "./notice-tag";

const key = deckNoticesCopy.mark.key;
const draw = (notices: NoticeSummary[]) =>
  render(<ul><DecksMarkKey decks={notices.map((notice) => ({ notice }))} /></ul>);

describe("DecksMarkKey (tile marker addendum §3)", () => {
  it("is absent when no shown tile draws a mark", () => {
    const { container } = draw([null, null]);
    expect(container.querySelector("li")).toBeNull();
  });

  it("names only the marks a shown tile draws", () => {
    draw([{ kind: "unread", count: 2 }, null]);
    const group = screen.getByRole("group", { name: key.regionAria });
    expect(group.textContent).toContain(key.unread);
    expect(group.textContent).not.toContain(key.notLegal);
  });

  // The key sits on the page, not on a tile, so its sample's tint mixes into `--bg` (the canvas).
  it("grounds each sample on the page's --bg, never the tile's --surface-inset", () => {
    const { container } = draw([{ kind: "unread", count: 1 }, { kind: "notLegalRead", count: 1, dataUnread: 0 }]);
    const samples = [...container.querySelectorAll<HTMLElement>("[data-notice-mark]")];
    expect(samples).toHaveLength(2);
    for (const s of samples) expect(s.style.background).toMatch(/var\(--bg\)\)$/);
  });

  it("names both, legality first, and counts a read legality mark as red", () => {
    draw([{ kind: "unread", count: 1 }, { kind: "notLegalRead", count: 1, dataUnread: 0 }]);
    const words = [...screen.getByRole("group").children].map((entry) => entry.lastElementChild!.textContent);
    expect(words).toEqual([key.notLegal, key.unread]);
  });

  // F21: an item of the tile list, spanning the grid.
  it("is a full-width list item", () => {
    const { container } = draw([{ kind: "unread", count: 1 }]);
    const li = container.querySelector("li")!;
    expect(li.parentElement!.tagName).toBe("UL");
    expect(li.className).toMatch(/\bcol-span-full\b/);
  });
});

describe("the mark's words (F20)", () => {
  const t = deckNoticesCopy.mark.tooltip;
  const spoken = deckNoticesCopy.tag.spoken;

  it("names each kind alone", () => {
    expect(noticeSentence({ kind: "unread", count: 3 })).toBe(t.unread(3));
    expect(noticeSentence({ kind: "notLegalUnread", count: 2, dataUnread: 0 })).toBe(t.notLegal(2));
    expect(noticeSpoken({ kind: "notLegalRead", count: 2, dataUnread: 0 })).toBe(spoken.notLegal(2));
  });

  it("names both counts when both stand", () => {
    expect(noticeSentence({ kind: "notLegalRead", count: 1, dataUnread: 4 })).toBe(t.both(1, 4));
    expect(noticeSpoken({ kind: "notLegalUnread", count: 1, dataUnread: 4 })).toBe(`${spoken.notLegal(1)}, ${spoken.unread(4)}`);
  });
});
