// Friends and pods in the seat picker (Social R3, PR 3): the friend list, a friend's decks opened on pick,
// Another commander and Just <name>, a friend already seated, and Seat a pod. The row and the commander
// search are `game-log-form-seats.test.tsx`.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { gameLogCopy } from "../../lib/copy/game-log";
import { gameSeatsCopy } from "../../lib/copy/game-seats";

const logGame = vi.fn<(deckId: string, input: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>>(async () => ({ ok: true }));
const DAVE = "00000000-0000-4000-8000-0000000000d1";
const JO = "00000000-0000-4000-8000-0000000000d2";
const LEE = "00000000-0000-4000-8000-0000000000d3";
const DECK = "00000000-0000-4000-8000-0000000000e1";
const SOKKA = "00000000-0000-4000-8000-0000000000a1";
const TYMNA = "00000000-0000-4000-8000-0000000000a2";
const friend = (publicId: string, displayName: string, deckCount: number) => ({ publicId, displayName, commanderArt: null, deckCount });
const deck = { deckId: DECK, name: "Avengers Tempo", commanderOracleId: SOKKA, partnerOracleId: null, commanderName: "Sokka, Swordmaster", commanderImageUri: null };
const hit = { oracleId: TYMNA, name: "Tymna the Weaver", typeLine: "Legendary Creature", manaCost: null, colorIdentity: ["W", "B"], partner: null, flavorName: null, imageUri: null };

const friends = vi.fn(async (): Promise<unknown[]> => []);
const friendDecks = vi.fn(async (_id: string): Promise<unknown[]> => []);
const pods = vi.fn(async (): Promise<unknown[]> => []);
const podSeats = vi.fn(async (_id: string): Promise<unknown[]> => []);
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../../app/decks/actions", () => ({ logGame: (id: string, input: Record<string, unknown>) => logGame(id, input) }));
vi.mock("../../app/decks/[id]/opponent-actions", () => ({
  searchOpponentCommandersAction: async () => [hit],
  listPickerFriendsAction: () => friends(),
  listFriendDecksAction: (id: string) => friendDecks(id),
  listPickerPodsAction: () => pods(),
  listPodSeatsAction: (id: string) => podSeats(id),
}));

const seats = gameSeatsCopy.seats;
const picker = gameSeatsCopy.picker;
const you = { name: "Kenrith, the Returned King", deckName: "Rainbow", imageUri: null };

async function mount() {
  render(<GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={vi.fn()} opponents={{ you }} />);
  fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
  // The pods are read when the row mounts, so the chips are there once they land.
  await waitFor(() => expect(pods).toHaveBeenCalled());
}
async function openPicker(opener: string | RegExp = seats.add) {
  fireEvent.click(screen.getByRole("button", { name: opener }));
  return screen.findByRole("dialog", { name: picker.title });
}
const save = () => fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.save }));
const won = () => fireEvent.click(screen.getByRole("radio", { name: gameLogCopy.form.won }));

beforeEach(() => {
  for (const m of [logGame, friends, friendDecks, pods, podSeats]) m.mockClear();
  friends.mockResolvedValue([friend(DAVE, "Dave", 2), friend(JO, "Jo", 0)]);
  friendDecks.mockResolvedValue([deck]);
  pods.mockResolvedValue([]);
  podSeats.mockResolvedValue([]);
});

describe("the friend list", () => {
  it("reads nothing social until the picker opens, then lists friends with their deck counts", async () => {
    await mount();
    expect(friends).not.toHaveBeenCalled();
    const dialog = await openPicker();
    expect(await within(dialog).findByText("Dave")).toBeInTheDocument();
    expect(within(dialog).getByText(picker.deckCount(2))).toBeInTheDocument();
    expect(within(dialog).getByText(picker.deckCount(0))).toBeInTheDocument();
    expect(within(dialog).getByRole("searchbox")).toHaveAttribute("placeholder", picker.placeholderFriends);
  });

  it("with no friends the field reads Any commander and nothing points at friends", async () => {
    friends.mockResolvedValue([]);
    await mount();
    const dialog = await openPicker();
    await waitFor(() => expect(friends).toHaveBeenCalled());
    expect(within(dialog).getByRole("searchbox")).toHaveAttribute("placeholder", picker.placeholder);
    expect(within(dialog).queryByText(picker.friends)).toBeNull();
    expect(within(dialog).getByText(picker.footAnyone)).toBeInTheDocument();
  });

  it("typing filters the friends and adds Commanders under them", async () => {
    await mount();
    const dialog = await openPicker();
    await within(dialog).findByText("Dave");
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "da" } });
    expect(within(dialog).queryByText("Jo")).toBeNull();
    expect(await within(dialog).findByRole("button", { name: /Tymna/ })).toBeInTheDocument();
    expect(within(dialog).getByText(picker.commanders)).toBeInTheDocument();
  });
});

describe("a friend's decks", () => {
  it("opens on pick, and one press seats the friend with that deck", async () => {
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    expect(friendDecks).toHaveBeenCalledWith(DAVE);
    fireEvent.click(await within(dialog).findByRole("button", { name: /Avengers Tempo/ }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    expect(screen.getByText("Dave")).toBeInTheDocument();
    expect(screen.getByText("Avengers Tempo")).toBeInTheDocument();
    // A friend has no label field, and no Add a name.
    expect(screen.queryByRole("button", { name: seats.addName })).toBeNull();
    won();
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ friend: DAVE, deck: DECK }]);
  });

  it("Just Dave seats the friend alone, with Which deck? under the name", async () => {
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(picker.justFriend("Dave")) }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    expect(screen.getByRole("button", { name: seats.whichDeck })).toBeInTheDocument();
    won();
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ friend: DAVE }]);
  });

  it("Another commander searches the catalog, and seats the friend with that commander", async () => {
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(picker.anotherCommander) }));
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "tym" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Tymna/ }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    expect(screen.queryByRole("button", { name: seats.whichDeck })).toBeNull();
    won();
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ friend: DAVE, commander: TYMNA }]);
  });

  it("a friend with no decks gets one sentence, then Pick a commander and Just <name>", async () => {
    friendDecks.mockResolvedValue([]);
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Jo/ }));
    expect(await within(dialog).findByText(picker.noDecks("Jo"))).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: new RegExp(picker.pickCommander) })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: new RegExp(picker.justFriend("Jo")) })).toBeInTheDocument();
    expect(within(dialog).getByText(picker.footNoDecks("Jo"))).toBeInTheDocument();
  });

  it("Back returns to the friends", async () => {
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: picker.back }));
    expect(await within(dialog).findByRole("button", { name: /Jo/ })).toBeInTheDocument();
  });

  it("a failed read of the decks says so, and is not an empty list", async () => {
    friendDecks.mockRejectedValue(new Error("x"));
    await mount();
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(picker.decksFailed("Dave"));
    expect(within(dialog).queryByText(picker.noDecks("Dave"))).toBeNull();
  });
});

describe("a friend already seated", () => {
  it("stays in the list, dimmed, `seated` and aria-disabled, and a press does nothing", async () => {
    await mount();
    let dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(picker.justFriend("Dave")) }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    dialog = await openPicker();
    const row = await within(dialog).findByRole("button", { name: /Dave/ });
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(within(row).getByText(picker.seated)).toBeInTheDocument();
    friendDecks.mockClear();
    fireEvent.click(row);
    expect(friendDecks).not.toHaveBeenCalled();
  });

  it("is not seated against its own seat: changing Dave's seat lists Dave as pickable", async () => {
    await mount();
    let dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole("button", { name: /Dave/ }));
    fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(picker.justFriend("Dave")) }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    dialog = await openPicker(seats.change("Dave"));
    expect(await within(dialog).findByRole("button", { name: /Dave/ })).not.toHaveAttribute("aria-disabled");
  });
});

describe("Seat a pod", () => {
  const pod = { id: "00000000-0000-4000-8000-0000000000c1", name: "Thursday", memberCount: 4 };
  const member = (publicId: string, displayName: string) => ({ publicId, displayName, decks: [] });

  it("draws no chips without a pod", async () => {
    await mount();
    expect(screen.queryByText(seats.seatPod)).toBeNull();
  });

  it("seats the pod's friends alone, sets the pod size to its member count, and pressing again clears them", async () => {
    pods.mockResolvedValue([pod]);
    podSeats.mockResolvedValue([member(DAVE, "Dave"), member(JO, "Jo"), member(LEE, "Lee")]);
    await mount();
    const chip = await screen.findByRole("button", { name: "Thursday" });
    fireEvent.click(chip);
    await waitFor(() => expect(screen.getByText(seats.count(3, 3))).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: seats.whichDeck })).toHaveLength(3);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: seats.add })).toBeNull();
    fireEvent.click(chip);
    expect(screen.getByText(seats.count(0, 3))).toBeInTheDocument();
    expect(chip).toHaveAttribute("aria-pressed", "false");
  });

  it("names who did not fit when the pod is larger than a table of eight", async () => {
    const big = { ...pod, memberCount: 9 };
    pods.mockResolvedValue([big]);
    podSeats.mockResolvedValue(Array.from({ length: 8 }, (_, i) => member(`00000000-0000-4000-8000-00000000001${i}`, `Friend ${i + 1}`)));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Thursday" }));
    expect(await screen.findByText(seats.podLeftOut("Friend 8"))).toBeInTheDocument();
    expect(screen.getByText(seats.count(7, 7))).toBeInTheDocument();
  });

  it("Which deck? opens the picker on that friend's decks", async () => {
    pods.mockResolvedValue([pod]);
    podSeats.mockResolvedValue([member(DAVE, "Dave")]);
    friends.mockResolvedValue([friend(DAVE, "Dave", 1)]);
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Thursday" }));
    fireEvent.click(await screen.findByRole("button", { name: seats.whichDeck }));
    const dialog = await screen.findByRole("dialog", { name: picker.title });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Avengers Tempo/ }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: picker.title })).toBeNull());
    expect(screen.getByText("Avengers Tempo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: seats.whichDeck })).toBeNull();
  });

  it("a pod that could not be read says so and seats nothing", async () => {
    pods.mockResolvedValue([pod]);
    podSeats.mockRejectedValue(new Error("x"));
    await mount();
    fireEvent.click(await screen.findByRole("button", { name: "Thursday" }));
    expect(await screen.findByText(seats.podFailed)).toBeInTheDocument();
    expect(screen.getByText(seats.count(0, 3))).toBeInTheDocument();
  });
});
