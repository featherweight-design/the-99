// UpdateEntry — the orchestrator (#277). What is tested is the routing between
// the five steps, the two deck-identity fields this flow must NOT have, and the
// promise the whole surface rests on: the compare writes nothing.

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";

const previewDeckUpdate = vi.fn();
const updateDeckFromList = vi.fn();
const push = vi.fn();

// Records every code-started navigation the component starts through `usePendingPush`, which is
// what hands it to the navigation-pending provider (the plan's PR 3). The push still reaches the
// router mock, so the cases that assert it are unchanged.
const pushed = vi.hoisted(() => [] as string[]);
vi.mock("../shell/pending-push", async () => {
  const { useRouter } = await import("next/navigation");
  return {
    usePendingPush: () => {
      const router = useRouter();
      return { go: (href: string) => { pushed.push(href); router.push(href); } };
    },
  };
});

vi.mock("../../app/decks/update-actions", () => ({ previewDeckUpdate, updateDeckFromList }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { UpdateEntry } = await import("./update-entry");

const copy = deckImportCopy.update;

const preview = {
  ok: true as const,
  deckName: "Kykar, Wind's Fury",
  built: 91,
  lineCount: 106,
  notes: [],
  existingUnresolvedCount: 0,
  out: [
    {
      oracleId: "out-1",
      name: "Card out-1",
      sourceLine: null,
      typeLine: "Creature",
      quantity: 1,
      auto: true,
      owned: true,
    },
  ],
  in: [],
  fewer: [],
  more: [],
  unchanged: [],
  unresolved: [],
  noChange: false,
};

function renderEntry() {
  render(<UpdateEntry deckId="deck-1" deckName="Kykar, Wind's Fury" />);
}

function paste(text = "1 Sol Ring\n1 Cultivate") {
  fireEvent.change(screen.getByLabelText(deckImportCopy.entry.pasteLabel), {
    target: { value: text },
  });
}

function compare() {
  fireEvent.click(screen.getByRole("button", { name: copy.list.submit }));
}

beforeEach(() => {
  vi.clearAllMocks();
  previewDeckUpdate.mockResolvedValue(preview);
  updateDeckFromList.mockResolvedValue({ in: 0, out: 1, kept: 0 });
});

describe("the list step", () => {
  // The deck's name and its commander are facts about the deck being compared
  // against. The whole premise is that neither changes, so neither is offered.
  it("asks for no deck name and no commander", () => {
    renderEntry();
    expect(screen.queryByLabelText("Deck name")).not.toBeInTheDocument();
    // The paste is the only field on the surface. A commander picker would be a
    // second one, and the copy below says out loud that there isn't one.
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByText(copy.list.aboutKeeps)).toBeInTheDocument();
  });

  it("names the deck the list will be compared against", () => {
    renderEntry();
    expect(screen.getByRole("heading", { name: copy.list.heading("Kykar, Wind's Fury") })).toBeInTheDocument();
  });

  // "Compare", never "Import" — the button has to promise the screen it opens.
  it("promises a comparison rather than a write", () => {
    renderEntry();
    expect(screen.getByRole("button", { name: copy.list.submit })).toBeInTheDocument();
    // Substring matching rather than a regex built from the copy: the sentence
    // ends in a full stop, and every other metacharacter a copy edit might add
    // would quietly widen the match instead of failing.
    expect(screen.getByText(copy.list.reassure, { exact: false })).toBeInTheDocument();
  });

  it("cannot be submitted empty", () => {
    renderEntry();
    expect(screen.getByRole("button", { name: copy.list.submit })).toBeDisabled();
    paste();
    expect(screen.getByRole("button", { name: copy.list.submit })).not.toBeDisabled();
  });

  it("offers paste and file, and no link mode", () => {
    renderEntry();
    expect(screen.getByRole("button", { name: deckImportCopy.entry.modePaste })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: deckImportCopy.entry.modeFile })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /link/i })).not.toBeInTheDocument();
  });
});

describe("comparing", () => {
  // The claim the surface is built on. A player who compares and walks away has
  // changed nothing, so the compare must never reach the write.
  it("writes nothing", async () => {
    renderEntry();
    paste();
    compare();
    await waitFor(() => expect(previewDeckUpdate).toHaveBeenCalled());
    expect(updateDeckFromList).not.toHaveBeenCalled();
  });

  it("sends the list to the deck it was opened from", async () => {
    renderEntry();
    paste("1 Sol Ring");
    compare();
    await waitFor(() =>
      expect(previewDeckUpdate).toHaveBeenCalledWith({
        deckId: "deck-1",
        text: "1 Sol Ring",
        source: "paste",
      }),
    );
  });

  it("shows the diff when the plan has something in it", async () => {
    renderEntry();
    paste();
    compare();
    expect(await screen.findByRole("heading", { name: deckImportCopy.update.diff.heading })).toBeInTheDocument();
  });
});

describe("the terminal steps", () => {
  it("says nothing changed rather than drawing an empty diff", async () => {
    previewDeckUpdate.mockResolvedValue({ ...preview, out: [], noChange: true });
    renderEntry();
    paste();
    compare();
    expect(await screen.findByRole("heading", { name: copy.noChange.heading })).toBeInTheDocument();
    expect(screen.getByText(copy.noChange.body("91"))).toBeInTheDocument();
  });

  // The column centres its children, so without a stretch the button row shrank to its widest
  // label and the phone's full-width buttons drew their text against their own borders.
  it("stretches the no-change buttons' row to the column on the phone", async () => {
    previewDeckUpdate.mockResolvedValue({ ...preview, out: [], noChange: true });
    renderEntry();
    paste();
    compare();
    const back = await screen.findByRole("button", { name: copy.noChange.back });
    expect(back.parentElement!.className).toMatch(/(^| )self-stretch( |$)/);
  });

  it("lets a no-change return to the list step to try another paste", async () => {
    previewDeckUpdate.mockResolvedValue({ ...preview, out: [], noChange: true });
    renderEntry();
    paste();
    compare();
    fireEvent.click(await screen.findByRole("button", { name: copy.noChange.retry }));
    expect(screen.getByRole("button", { name: copy.list.submit })).toBeInTheDocument();
  });

  // State 13. A list naming a different commander is a different deck, and the
  // flow says so rather than swapping it.
  it("refuses a list that names a different commander", async () => {
    previewDeckUpdate.mockResolvedValue({
      ok: false,
      reason: "commanderConflict",
      listCommander: "Atraxa, Praetors' Voice",
      deckCommander: "Kykar, Wind's Fury",
    });
    renderEntry();
    paste();
    compare();
    expect(
      await screen.findByRole("heading", { name: copy.conflict.heading("Atraxa, Praetors' Voice") }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.conflict.body("Kykar, Wind's Fury"))).toBeInTheDocument();
  });

  it("sends a conflicting list to the import flow instead", async () => {
    previewDeckUpdate.mockResolvedValue({
      ok: false,
      reason: "commanderConflict",
      listCommander: "Atraxa, Praetors' Voice",
      deckCommander: "Kykar, Wind's Fury",
    });
    renderEntry();
    paste();
    compare();
    fireEvent.click(await screen.findByRole("button", { name: copy.conflict.primary }));
    expect(push).toHaveBeenCalledWith("/decks/import");
    expect(pushed).toContain("/decks/import");
  });

  // None of the three terminal screens is an error, so none of them is an alert.
  it("does not dress a terminal screen as a failure", async () => {
    previewDeckUpdate.mockResolvedValue({ ...preview, out: [], noChange: true });
    renderEntry();
    paste();
    compare();
    await screen.findByRole("heading", { name: copy.noChange.heading });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("failures on the list step", () => {
  it("says nothing parsed when the list had no lines", async () => {
    previewDeckUpdate.mockResolvedValue({ ok: false, reason: "noRows", notes: [] });
    renderEntry();
    paste();
    compare();
    expect(await screen.findByRole("alert")).toHaveTextContent(deckImportCopy.failures.empty.heading);
  });

  it("says nothing matched when every line failed to resolve", async () => {
    previewDeckUpdate.mockResolvedValue({
      ok: false,
      reason: "noneMatched",
      lineCount: 106,
      notes: [],
    });
    renderEntry();
    paste();
    compare();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      deckImportCopy.failures.noneMatched.heading,
    );
  });

  it("names the problem when the file was CSV-shaped but failed to parse", async () => {
    previewDeckUpdate.mockResolvedValue({
      ok: false,
      reason: "csvInvalid",
      detail: 'Row 3: invalid quantity "abc"',
      notes: [],
    });
    renderEntry();
    paste();
    compare();
    expect(await screen.findByRole("alert")).toHaveTextContent('Row 3: invalid quantity "abc"');
  });

  // A throw inside a transition reaches the error boundary and takes the
  // player's list with it, so the flow catches and stays put.
  it("keeps the paste when the compare throws", async () => {
    previewDeckUpdate.mockRejectedValue(new Error("boom"));
    renderEntry();
    paste("1 Sol Ring");
    compare();
    await screen.findByRole("alert");
    expect(screen.getByLabelText(deckImportCopy.entry.pasteLabel)).toHaveValue("1 Sol Ring");
    // The compare only reads, so the banner must not send the player to check for a deck.
    expect(screen.getByRole("alert").textContent).not.toMatch(/Check your decks/);
    expect(screen.getByRole("alert").textContent).toContain("nothing was changed");
  });
});

describe("applying", () => {
  it("sends the same text the compare sent, plus the kept ids", async () => {
    renderEntry();
    paste("1 Sol Ring");
    compare();
    fireEvent.click(
      await screen.findByRole("button", {
        name: deckImportCopy.update.diff.keepAria("Card out-1"),
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: deckImportCopy.update.diff.applyAria("0", "0", "Kykar, Wind's Fury"),
      }),
    );
    await waitFor(() =>
      expect(updateDeckFromList).toHaveBeenCalledWith({
        deckId: "deck-1",
        text: "1 Sol Ring",
        source: "paste",
        keep: ["out-1"],
        // What the preview showed locked, for the apply's re-check (Locked, never cut). This
        // fixture's preview predates locks and carries none.
        lockedSeen: [],
      }),
    );
  });

  it("returns to the deck carrying the counts the strip prints", async () => {
    updateDeckFromList.mockResolvedValue({ in: 19, out: 6, kept: 1 });
    renderEntry();
    paste();
    compare();
    fireEvent.click(
      await screen.findByRole("button", {
        name: deckImportCopy.update.diff.applyAria("0", "1", "Kykar, Wind's Fury"),
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1?updated=19-6-1"));
  });

  // A committed deck keeps its own account of what is pending, so the transient
  // arrival strip would be the second diff on one screen (OVERLAPS.md, call 2).
  it("carries no counts back to a versioned deck", async () => {
    updateDeckFromList.mockResolvedValue({ in: 19, out: 6, kept: 1, versioned: true });
    renderEntry();
    paste();
    compare();
    fireEvent.click(
      await screen.findByRole("button", {
        name: deckImportCopy.update.diff.applyAria("0", "1", "Kykar, Wind's Fury"),
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/decks/deck-1"));
  });

  // State 18. A refused write is not a failed parse: its copy promises the deck
  // is exactly as it was, which only a transaction can make true.
  it("says the deck is untouched when the write is refused", async () => {
    updateDeckFromList.mockRejectedValue(new Error("boom"));
    renderEntry();
    paste();
    compare();
    fireEvent.click(
      await screen.findByRole("button", {
        name: deckImportCopy.update.diff.applyAria("0", "1", "Kykar, Wind's Fury"),
      }),
    );
    expect(await screen.findByRole("heading", { name: copy.refused.heading })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("returns to the diff from a refusal rather than to the list", async () => {
    updateDeckFromList.mockRejectedValue(new Error("boom"));
    renderEntry();
    paste();
    compare();
    fireEvent.click(
      await screen.findByRole("button", {
        name: deckImportCopy.update.diff.applyAria("0", "1", "Kykar, Wind's Fury"),
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: copy.refused.action }));
    expect(
      await screen.findByRole("heading", { name: deckImportCopy.update.diff.heading }),
    ).toBeInTheDocument();
  });
});
