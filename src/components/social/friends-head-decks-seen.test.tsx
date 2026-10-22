// /friends' privacy line (friend decks handoff, `Privacy.dc.html`): with friend decks on, one of three sentences by the
// reader's own rules, each ending in a link to Settings; off, the shipped sentence.
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FriendsHead } from "./friends-head";
import { socialCopy } from "../../lib/copy/social";
import type { FriendDeckPrefs } from "../../lib/social/deck-visibility-rule";

const p = socialCopy.page;

function line(decksSeen?: FriendDeckPrefs | null) {
  const { container } = render(
    <FriendsHead name="Hugh" commander={null} onRename={vi.fn()} onOpenPicker={vi.fn()} invitePending={false} held={false} onInvite={vi.fn()} decksSeen={decksSeen} />,
  );
  return container.querySelector("[data-decks-seen]") as HTMLElement;
}

describe("the privacy line", () => {
  it("is the shipped sentence, with no link, while friend decks are off", () => {
    const el = line(null);
    expect(el.textContent).toBe(p.decksSeen);
    expect(el.querySelector("a")).toBeNull();
  });

  it("says what friends see under the default rules", () => {
    const el = line({ seeDecks: true, seeUnfinished: false });
    expect(el.textContent).toBe("Friends can see your decks and their lists, except drafts and decks you’re building. Change this in Settings.");
    const link = el.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/settings");
    expect(link.textContent).toBe("Settings");
    // The board's bare underline in the line's own faint ink, never the name line's accent.
    expect(link.className).toContain("underline");
    expect(link.className).not.toContain("accent-text");
    expect(el.className).toContain("mt-[6px]");
  });

  it("says all your decks with drafts included", () => {
    expect(line({ seeDecks: true, seeUnfinished: true }).textContent).toBe(
      "Friends can see all your decks and their lists. Change this in Settings.",
    );
  });

  it("says friends can’t see your decks with the first rule off, whatever the second", () => {
    for (const seeUnfinished of [false, true]) {
      const el = line({ seeDecks: false, seeUnfinished });
      expect(el.textContent).toBe("Friends can’t see your decks. Change this in Settings.");
      el.closest("div")?.remove();
    }
  });
});
