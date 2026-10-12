import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckNotesView, NoteView } from "../../../lib/decks/notes-types";
import { formatTag } from "../../../lib/decks/notes-body";
import { formatNoteDate } from "./note-row";

const stub = vi.hoisted(() => ({
  addNote: vi.fn(),
  editNote: vi.fn(),
  setNoteDone: vi.fn(),
  deleteNote: vi.fn(),
  searchNoteCards: vi.fn(),
  open: vi.fn(),
}));

vi.mock("../../../app/decks/notes-actions", () => ({
  addNote: stub.addNote, editNote: stub.editNote, setNoteDone: stub.setNoteDone, deleteNote: stub.deleteNote, searchNoteCards: stub.searchNoteCards,
}));
vi.mock("../../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: stub.open }) }));

const { DeckNotesPanel } = await import("./deck-notes-panel");

const DECK = "22222222-2222-4222-8222-222222222222";
const SOL = "6d0a5f7e-1111-4222-8333-444455556666";
const cardsInDeck = [{ oracleId: SOL, name: "Sol Ring", typeLine: "Artifact", imageUri: null }];

const note = (id: string, text: string, over: Partial<NoteView> = {}): NoteView => ({
  id, body: text, drawn: [{ kind: "text", text }], createdAt: "2026-10-02T12:00:00.000Z", doneAt: null, ...over,
});
let clock = 1000;
const view = (open: NoteView[], done: NoteView[] = []): DeckNotesView => ({ open, done, readAt: ++clock });
// No user-event in this repo: a click is a click, and typing sets the whole value (the caret lands at the end).
const click = (el: HTMLElement) => { fireEvent.click(el); };
const type = (el: HTMLElement, text: string) => { fireEvent.change(el, { target: { value: ((el as HTMLInputElement).value ?? "") + text } }); };
const key = (el: HTMLElement, k: string) => { fireEvent.keyDown(el, { key: k }); };
const mount = (notes: DeckNotesView) => render(<DeckNotesPanel deckId={DECK} notes={notes} deckCards={cardsInDeck} />);

beforeEach(() => {
  vi.clearAllMocks();
  stub.addNote.mockResolvedValue({ ok: true, notes: null });
  stub.editNote.mockResolvedValue({ ok: true, notes: null });
  stub.setNoteDone.mockResolvedValue({ ok: true, notes: null });
  stub.deleteNote.mockResolvedValue({ ok: true, notes: null });
  stub.searchNoteCards.mockResolvedValue([]);
});
afterEach(cleanup);

describe("an empty deck", () => {
  it("draws the empty state and the input, with no Done group", () => {
    mount(view([]));
    expect(screen.getByText("The swap you meant to try.")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Add a note" })).toBeTruthy();
    expect(screen.queryByText(/Done \(/)).toBeNull();
  });
});

describe("formatNoteDate", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");
  it("names the year only outside the current one", () => {
    expect(formatNoteDate("2026-10-02T12:00:00.000Z", now)).toBe("2 Oct");
    expect(formatNoteDate("2025-10-02T12:00:00.000Z", now)).toBe("2 Oct 2025");
  });
});

describe("the list", () => {
  it("shows six open notes in the order given, then Show all N", async () => {
    const open = Array.from({ length: 8 }, (_, i) => note(`n${i}`, `note ${i}`));
    mount(view(open));
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getAllByText(/^note \d$/).map((el) => el.textContent)).toEqual(["note 0", "note 1", "note 2", "note 3", "note 4", "note 5"]);
    click(screen.getByRole("button", { name: "Show all 8" }));
    expect(screen.getAllByRole("checkbox")).toHaveLength(8);
  });

  it("keeps Done (N) closed until pressed, and dates a done note by its own date", async () => {
    mount(view([note("a", "open one")], [note("b", "finished", { doneAt: "2026-10-09T12:00:00.000Z" })]));
    expect(screen.queryByText("finished")).toBeNull();
    click(screen.getByRole("button", { name: /Done \(1\)/ }));
    expect(screen.getByText("finished")).toBeTruthy();
    expect(screen.getAllByText("done 9 Oct").length).toBeGreaterThan(0);
  });

  it("replaces the input with the cap line at 100 notes, done ones counting", () => {
    const open = Array.from({ length: 60 }, (_, i) => note(`o${i}`, `o ${i}`));
    const done = Array.from({ length: 40 }, (_, i) => note(`d${i}`, `d ${i}`, { doneAt: "2026-10-09T12:00:00.000Z" }));
    mount(view(open, done));
    expect(screen.getByText(/This deck holds 100 notes/)).toBeTruthy();
    expect(screen.getByText("done ones count too")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});

describe("adding", () => {
  it("sends the text, clears the field and says so", async () => {
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" });
    type(field, "try a sweeper");
    click(screen.getByRole("button", { name: "Add" }));
    expect(stub.addNote).toHaveBeenCalledWith(DECK, "try a sweeper");
    await waitFor(() => expect((field as HTMLInputElement).value).toBe(""));
    expect(screen.getByRole("status").textContent).toBe("Note added.");
  });

  it("keeps what was typed and shows the refusal when the write is refused", async () => {
    stub.addNote.mockResolvedValue({ ok: false, message: "We couldn’t save that note. What you typed is still here, so you can try again." });
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" });
    type(field, "keep me");
    click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((field as HTMLInputElement).value).toBe("keep me");
  });

  it("disables Add for whitespace only and takes no more than 140 characters", async () => {
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" }) as HTMLInputElement;
    type(field, "   ");
    expect((screen.getByRole("button", { name: "Add" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(field, { target: { value: "a".repeat(140) } });
    fireEvent.change(field, { target: { value: "a".repeat(141) } });
    expect(field.value).toBe("a".repeat(140));
  });

  it("offers this deck's cards after [[, picks with Enter and stores the tag with its id", async () => {
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" }) as HTMLInputElement;
    type(field, "try [[sol");
    expect(await screen.findByRole("option", { name: /Sol Ring/ })).toBeTruthy();
    key(field, "Enter");
    expect(field.value).toBe("try [[Sol Ring]] ");
    click(screen.getByRole("button", { name: "Add" }));
    expect(stub.addNote).toHaveBeenCalledWith(DECK, `try ${formatTag(SOL, "Sol Ring")}`);
  });

  it("leaves a [[Name]] typed without picking as plain text", async () => {
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" });
    fireEvent.change(field, { target: { value: "see [[Mana Crypt]]" } });
    click(screen.getByRole("button", { name: "Add" }));
    expect(stub.addNote).toHaveBeenCalledWith(DECK, "see [[Mana Crypt]]");
  });

  it("inserts [[]] with the [[ ]] button and opens the picker", async () => {
    mount(view([note("a", "x")]));
    const field = screen.getByRole("combobox", { name: "Add a note" }) as HTMLInputElement;
    click(screen.getByRole("button", { name: "Insert a card tag" }));
    expect(field.value).toBe("[[]]");
    expect(await screen.findByText(/Type a card name/)).toBeTruthy();
  });

  it("shows any card after the deck's, and a refused search in place", async () => {
    stub.searchNoteCards.mockResolvedValue(null);
    mount(view([note("a", "x")]));
    type(screen.getByRole("combobox", { name: "Add a note" }), "[[zz");
    expect(await screen.findByText("Couldn’t search just now.")).toBeTruthy();
  });
});

describe("the freshest view wins", () => {
  it("shows the notes a write answered with, and ignores a page payload that was read earlier", async () => {
    const before = view([note("a", "old note")]);
    const after = { ...view([note("a", "old note"), note("b", "just added")]), readAt: before.readAt + 10 };
    stub.addNote.mockResolvedValue({ ok: true, notes: after });
    const { rerender } = mount(before);
    const field = screen.getByRole("combobox", { name: "Add a note" });
    type(field, "just added");
    click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("just added")).toBeTruthy();
    // A refresh that was read BEFORE the write lands late: the panel keeps what it knows.
    rerender(<DeckNotesPanel deckId={DECK} notes={before} deckCards={cardsInDeck} />);
    expect(screen.getByText("just added")).toBeTruthy();
    // A payload read after it is adopted.
    rerender(<DeckNotesPanel deckId={DECK} notes={{ ...view([note("c", "from elsewhere")]), readAt: after.readAt + 5 }} deckCards={cardsInDeck} />);
    expect(screen.getByText("from elsewhere")).toBeTruthy();
    expect(screen.queryByText("just added")).toBeNull();
  });
});

describe("a row", () => {
  it("selects with the box named for its text, and unselects a done one", async () => {
    mount(view([note("a", "water the plants")], [note("b", "all done", { doneAt: "2026-10-09T12:00:00.000Z" })]));
    click(screen.getByRole("checkbox", { name: "Done: water the plants" }));
    expect(stub.setNoteDone).toHaveBeenCalledWith(DECK, "a", true);
    click(screen.getByRole("button", { name: /Done \(1\)/ }));
    click(screen.getByRole("checkbox", { name: "Done: all done" }));
    expect(stub.setNoteDone).toHaveBeenCalledWith(DECK, "b", false);
  });

  it("shows a refused select under the row and leaves the box as it was", async () => {
    stub.setNoteDone.mockResolvedValue({ ok: false, message: "We couldn’t mark that done. Nothing has changed." });
    mount(view([note("a", "x")]));
    click(screen.getByRole("checkbox"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
  });

  it("opens card details from a held tag and draws an unresolved one as plain text", async () => {
    const drawn: NoteView["drawn"] = [
      { kind: "text", text: "try " },
      { kind: "tag", oracleId: SOL, name: "Sol Ring", held: true, resolved: true, imageUri: null },
      { kind: "text", text: " and " },
      { kind: "tag", oracleId: "gone", name: "Gone Card", held: false, resolved: false, imageUri: null },
    ];
    mount(view([note("a", "x", { drawn })]));
    click(screen.getByRole("button", { name: "Sol Ring, card details" }));
    expect(stub.open).toHaveBeenCalledWith(SOL, undefined, null, expect.anything());
    expect(screen.getByText("Gone Card").tagName).toBe("SPAN");
    expect(screen.queryByRole("button", { name: /Gone Card/ })).toBeNull();
  });

  it("edits in place, keeps the date, and saves the serialized body", async () => {
    const body = `try ${formatTag(SOL, "Sol Ring")}`;
    mount(view([note("a", body, { drawn: [{ kind: "text", text: "try " }, { kind: "tag", oracleId: SOL, name: "Sol Ring", held: true, resolved: true, imageUri: null }] })]));
    click(screen.getByRole("button", { name: "Edit this note" }));
    const field = screen.getByRole("combobox", { name: "Edit this note" }) as HTMLInputElement;
    expect(field.value).toBe("try [[Sol Ring]]");
    expect(screen.getByText(/the date stays 2 Oct/)).toBeTruthy();
    type(field, " today");
    click(screen.getByRole("button", { name: "Save" }));
    expect(stub.editNote).toHaveBeenCalledWith(DECK, "a", `try ${formatTag(SOL, "Sol Ring")} today`);
  });

  it("deletes only after the confirm, and Keep it leaves the note", async () => {
    mount(view([note("a", "doomed")]));
    click(screen.getByRole("button", { name: "Delete this note" }));
    const pane = screen.getByText("Delete this note?").closest("div")!.parentElement!;
    click(within(pane).getByRole("button", { name: "Keep it" }));
    expect(stub.deleteNote).not.toHaveBeenCalled();
    click(screen.getByRole("button", { name: "Delete this note" }));
    click(screen.getByRole("button", { name: "Delete" }));
    expect(stub.deleteNote).toHaveBeenCalledWith(DECK, "a");
  });
});
