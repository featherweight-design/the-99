import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadChoice, type SyncChoice } from "./upload-choice";

const noop = () => {};
const base = {
  filename: "The Vault 10-14-26.csv",
  rows: 3570,
  replaceBefore: 4616,
  addBefore: 4616,
  replaceAfter: 4345,
  addAfter: 8961,
  facts: { editsSinceUpload: 4, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true },
  overlap: { held: 99, of: 100 },
  onContinue: noop,
  onCancel: noop,
};
const sync = (over: Partial<SyncChoice> = {}): SyncChoice => ({
  unavailable: null,
  anchorAt: "2026-10-02T12:00:00.000Z",
  before: 4616,
  after: 4632,
  note: { kind: "keeps", cards: 121 },
  next: { kind: "sync" },
  stale: null,
  followUp: null,
  ...over,
});

const words = () => screen.getAllByRole("radio").map((r) => r.textContent);

describe("UploadChoice with the Sync switch off", () => {
  it("draws Replace and Add exactly as shipped: their words, their order and the two-column grid", () => {
    render(<UploadChoice {...base} picked={null} onPick={noop} />);
    expect(words()).toEqual([
      "Replace my collectionYour collection becomes exactly this file. Anything not in it leaves.4,616 → 4,345 cards⚠4 changes you made in the app since your Oct 2 upload will be overwritten.",
      "Add these cardsThe file’s quantities are added to yours. Nothing is removed, and your art picks stay.4,616 → 8,961 cardsⓘYou already own 99% of these cards. Adding the file raises those counts.",
    ]);
    expect(screen.getByRole("heading").textContent).toBe("Replace or add?Replace your collection, or add to it?");
    expect(screen.getByRole("radiogroup").className).toContain("md:grid-cols-2");
    expect(screen.getByRole("radiogroup").className).not.toContain("md:grid-cols-3");
    expect(screen.queryByText("Sync my collection")).toBeNull();
  });

  it("puts the radio on the title row on desktop (R2), for Replace and Add too", () => {
    render(<UploadChoice {...base} picked={null} onPick={noop} />);
    const replace = screen.getAllByRole("radio")[0];
    expect(replace.className).toContain("md:block");
    const ring = replace.querySelector("[aria-hidden]")?.className ?? "";
    expect(ring).toContain("md:absolute");
    // The ring keeps its 2px drop under top 22 on desktop too.
    expect(ring).toContain("mt-[2px]");
    expect(ring).not.toContain("md:mt-0");
    expect(within(replace).getByText("Replace my collection").className).toContain("md:pl-[34px]");
  });
});

describe("UploadChoice with Sync", () => {
  it("draws three cards with nothing picked, Sync third with its figure and quiet note, under one title", () => {
    render(<UploadChoice {...base} sync={sync()} picked={null} onPick={noop} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("data-choice"))).toEqual(["replace", "add", "sync"]);
    expect(radios.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(within(radios[2]).getByText("4,616 → 4,632 cards")).toBeTruthy();
    expect(within(radios[2]).getByText("Keeps the 121 cards you changed in the app since your Oct 2 upload.")).toBeTruthy();
    expect(screen.getByRole("heading").textContent).toBe("What’s this file for?");
    expect(screen.getByRole("radiogroup").className).toContain("md:grid-cols-3");
    // Replace and Add keep their words with the third card beside them.
    expect(radios[0].textContent).toContain("Your collection becomes exactly this file.");
    expect(radios[1].textContent).toContain("The file’s quantities are added to yours.");
  });

  it("names the review it leads to, and holds Continue for Sync until its review ships", () => {
    render(<UploadChoice {...base} sync={sync()} picked="sync" onPick={noop} />);
    expect(screen.getByText("Next: what this sync takes from the file, what it keeps, and anything it needs you to decide.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review the sync →" })).toBeDisabled();
  });

  it("draws the tokens-only and nothing-new notes", () => {
    const { unmount } = render(<UploadChoice {...base} sync={sync({ note: { kind: "tokensOnly", tokens: 114 } })} picked={null} onPick={noop} />);
    expect(screen.getByText("Your cards stay as they are. Sync records the file’s 114 tokens.")).toBeTruthy();
    unmount();
    render(<UploadChoice {...base} sync={sync({ note: { kind: "nothingNew" } })} picked={null} onPick={noop} />);
    expect(screen.getByText("Nothing new in this file. It matches your last upload, tokens included.")).toBeTruthy();
  });

  it("keeps an unavailable Sync drawn, focusable and described by its reason, in a box where the figure was", () => {
    const onPick = vi.fn();
    render(<UploadChoice {...base} sync={sync({ unavailable: "noRecord" })} picked={null} onPick={onPick} />);
    const card = screen.getByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    const reason = document.getElementById(card.getAttribute("aria-describedby") ?? "");
    expect(reason?.textContent).toBe(
      "Sync compares against your last full upload, and there isn’t one it can read. Replace or Add work as usual.",
    );
    expect(reason?.className).toContain("border-dashed");
    expect(reason?.className).toContain("mt-[6px]");
    expect(card.className).toContain("bg-[color:var(--surface-sunken)]");
    expect(within(card).queryByText("4,616 → 4,632 cards")).toBeNull();
    // Focusable, and pressing it picks nothing.
    card.focus();
    expect(document.activeElement).toBe(card);
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: " " });
    expect(onPick).not.toHaveBeenCalled();
  });

  it("names the anchor's date in Sync's note, not the newest upload's that Replace's warning names", () => {
    render(<UploadChoice {...base} sync={sync({ anchorAt: "2026-09-28T12:00:00.000Z" })} picked={null} onPick={noop} />);
    expect(screen.getByText("Keeps the 121 cards you changed in the app since your Sep 28 upload.")).toBeTruthy();
    expect(screen.getByText("4 changes you made in the app since your Oct 2 upload will be overwritten.")).toBeTruthy();
  });

  it("says the file changes nothing without claiming it matches the last upload", () => {
    render(<UploadChoice {...base} sync={sync({ note: { kind: "noChange" } })} picked={null} onPick={noop} />);
    expect(screen.getByText("Nothing in this file changes your collection.")).toBeTruthy();
    expect(screen.queryByText(/It matches your last upload/)).toBeNull();
  });

  it("names a never-uploaded collection's reason alone", () => {
    render(<UploadChoice {...base} sync={sync({ unavailable: "neverUploaded", anchorAt: null })} picked={null} onPick={noop} />);
    const card = screen.getByRole("radio", { name: "Sync my collection" });
    expect(document.getElementById(card.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "Sync compares a file with your last upload, and your collection was built in the app without one. Replace or Add will work.",
    );
  });

  it("roves over three cards, wrapping, with focus going with the pick", () => {
    const picks: string[] = [];
    render(<UploadChoice {...base} sync={sync()} picked={null} onPick={(m) => picks.push(m)} />);
    const [replace, add, syncCard] = screen.getAllByRole("radio");
    expect(replace.tabIndex).toBe(0);
    fireEvent.keyDown(replace, { key: "ArrowRight" });
    expect(document.activeElement).toBe(add);
    fireEvent.keyDown(add, { key: "ArrowDown" });
    expect(document.activeElement).toBe(syncCard);
    fireEvent.keyDown(syncCard, { key: "ArrowRight" });
    expect(document.activeElement).toBe(replace);
    fireEvent.keyDown(replace, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(syncCard);
    expect(picks).toEqual(["add", "sync", "replace", "sync"]);
  });

  it("lands the arrow on an unavailable Sync without picking it", () => {
    const picks: string[] = [];
    render(<UploadChoice {...base} sync={sync({ unavailable: "noRecord" })} picked="add" onPick={(m) => picks.push(m)} />);
    const [, add, syncCard] = screen.getAllByRole("radio");
    fireEvent.keyDown(add, { key: "ArrowRight" });
    expect(document.activeElement).toBe(syncCard);
    expect(picks).toEqual([]);
  });
});

describe("UploadChoice · the stale file", () => {
  const followUp = (pick: "additions" | "tokens" | "everything" = "additions", onPick = noop) => ({
    // Each option's tokens are its own pick's: 40, 38 and 44, never the file's total.
    pick, adds: { cards: 3, tokens: 40 }, tokens: 38, all: { up: 3, leaving: 16, down: 2, tokens: 44 }, onPick,
  });

  it("heads the step with the older banner, in “looks”, above the cards", () => {
    render(<UploadChoice {...base} sync={sync({ stale: { kind: "older", missing: 16 } })} picked={null} onPick={noop} />);
    const banner = screen.getByText("This file looks older than your Oct 2 upload.").parentElement!;
    expect(banner.textContent).toContain("It’s missing 16 cards that upload added, which usually means an earlier export.");
    expect(banner.compareDocumentPosition(screen.getByRole("radiogroup")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("note").contains(banner)).toBe(true);
    // The lede tightens above the banner.
    expect(screen.getByText("Nothing changes until you confirm on the next screen.").className).toContain("mb-[18px]");
  });

  it("keeps the lede's shipped margin with no banner", () => {
    render(<UploadChoice {...base} sync={sync()} picked={null} onPick={noop} />);
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByText("Nothing changes until you confirm on the next screen.").className).toContain("mb-[24px]");
  });

  it("draws the no-newer banner with the tokens the file has", () => {
    render(<UploadChoice {...base} sync={sync({ stale: { kind: "noNewer", tokens: 114 } })} picked={null} onPick={noop} />);
    const banner = screen.getByText("This file looks no newer than your Oct 2 upload.").parentElement!;
    expect(banner.textContent).toContain("Its cards match that upload exactly. What it does have is 114 tokens your collection hasn’t recorded.");
  });

  it("draws the follow-up only with Sync picked, after the cards and never inside one, with what it adds picked", () => {
    const s = sync({ stale: { kind: "older", missing: 16 }, followUp: followUp() });
    const { rerender } = render(<UploadChoice {...base} sync={s} picked="replace" onPick={noop} />);
    expect(screen.queryByRole("group", { name: "What should Sync take from this file?" })).toBeNull();
    rerender(<UploadChoice {...base} sync={s} picked="sync" onPick={noop} />);
    const group = screen.getByRole("group", { name: "What should Sync take from this file?" });
    expect(screen.getByRole("radiogroup").contains(group)).toBe(false);
    const options = within(group).getAllByRole("radio");
    expect(options.map((o) => (o as HTMLInputElement).checked)).toEqual([true, false, false]);
    // The native radio is hidden and the board's ring is drawn beside it: the picked one carries the dot.
    expect(options.every((o) => o.className.includes("sr-only"))).toBe(true);
    const rings = [...group.querySelectorAll("[data-ring]")];
    expect(rings).toHaveLength(3);
    expect(rings.map((r) => r.childElementCount)).toEqual([1, 0, 0]);
    expect(rings[0].getAttribute("aria-hidden")).toBe("true");
    expect(options[0].closest("label")?.className).toContain("has-[:focus-visible]:shadow-[0_0_0_2px_var(--accent)]");
    expect(within(group).getByText("3 cards going up or new, and its 40 tokens. Nothing leaves or goes down.")).toBeTruthy();
    expect(within(group).getByText("Its 38 tokens. Your cards stay as they are.")).toBeTruthy();
    expect(within(group).getByText("3 going up or new, 16 leaving, 2 going down, and its 44 tokens.")).toBeTruthy();
  });

  it("waits for an option's own read before drawing its body, and drops a token clause with no tokens to change", () => {
    const f = { ...followUp(), adds: { cards: 3, tokens: 0 }, tokens: null, all: { up: 3, leaving: 16, down: 2, tokens: 0 } };
    render(<UploadChoice {...base} sync={sync({ stale: { kind: "older", missing: 16 }, followUp: f })} picked="sync" onPick={noop} />);
    const group = screen.getByRole("group", { name: "What should Sync take from this file?" });
    expect(within(group).getByText("3 cards going up or new. Nothing leaves or goes down.")).toBeTruthy();
    expect(within(group).getByText("3 going up or new, 16 leaving, 2 going down.")).toBeTruthy();
    expect(within(group).getByRole("radio", { name: "Only its tokens" })).toBeTruthy();
  });

  it("hands a follow-up press to the flow", () => {
    const onPick = vi.fn();
    render(<UploadChoice {...base} sync={sync({ stale: { kind: "older", missing: 16 }, followUp: followUp("additions", onPick) })} picked="sync" onPick={noop} />);
    fireEvent.click(screen.getByRole("radio", { name: /Only its tokens/ }));
    expect(onPick).toHaveBeenCalledWith("tokens");
  });

  it("draws no follow-up when there is none to draw (S1)", () => {
    render(<UploadChoice {...base} sync={sync({ stale: { kind: "noNewer", tokens: 114 }, note: { kind: "tokensOnly", tokens: 114 } })} picked="sync" onPick={noop} />);
    expect(screen.queryByRole("group")).toBeNull();
  });
});
