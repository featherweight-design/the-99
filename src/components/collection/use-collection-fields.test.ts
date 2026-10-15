import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCollectionFields } from "./use-collection-fields";
import type { BrowseListCard } from "../../lib/collection/browse";
import { collectionDrawFieldsFor, cutCollectionWindow, decodeCollection, encodeCollection, type CollectionRow } from "../../lib/collection/list-wire";

// A card's art, printed name and set code come off one printing. The fields batch carries all
// three, so a withheld card draws them from ONE read, and a card picked here keeps its own.
const card = (i: number, over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
    name: `Card ${i}`, typeLine: "Instant", manaCost: "{U}", rarity: "common", colorIdentity: ["U"],
    imageUri: `https://cards.example/${i}.jpg`, printedName: null, quantity: 1,
    setCounts: [["RTR", 1]], primarySetCode: "RTR", ...over,
  }) as BrowseListCard;

const served = [card(0), card(1)];
// The page served card 1 withheld; it holds the list's columns and none of its draw fields.
const rows = (): CollectionRow[] =>
  decodeCollection(cutCollectionWindow(encodeCollection(served, null), new Set([served[0].oracleId])));
// The route answers from a list that moved since: card 1 was picked onto a Secret Lair printing
// on another device, which moves its art, its printed name and its set code together.
const moved = [card(0), card(1, { imageUri: "https://cards.example/sld.jpg", printedName: "Renamed", primarySetCode: "SLD" })];

let answer: (() => void) | null = null;
beforeEach(() => {
  answer = null;
  vi.stubGlobal("fetch", vi.fn((url: string) => new Promise<Response>((resolve) => {
    const ids = new URL(url, "http://x").searchParams.get("ids")!.split(",");
    answer = () => resolve(new Response(JSON.stringify({ fields: collectionDrawFieldsFor(moved, new Set(ids)) })));
  })));
});
afterEach(() => vi.unstubAllGlobals());

describe("useCollectionFields", () => {
  it("draws a withheld card's art, printed name and set code from the same read", async () => {
    const list = rows();
    const { result } = renderHook(() => useCollectionFields(list, list));
    await waitFor(() => expect(answer).not.toBeNull());
    await act(async () => answer!());
    await waitFor(() => expect(result.current.resolve(list[1])?.imageUri).toBe("https://cards.example/sld.jpg"));
    const drawn = result.current.resolve(list[1])!;
    expect(drawn.printedName).toBe("Renamed");
    expect(drawn.primarySetCode).toBe("SLD");
    expect(drawn).not.toHaveProperty("art");
  });

  // The page's own copy of the caption is what search, the filters and the name and set sorts
  // read. A batch showing it moved since means that copy is out of date: the page is read again,
  // once, so a search for the new name finds the card.
  it("reads the page again, once, when a withheld card's caption moved since it was read", async () => {
    const onStale = vi.fn();
    const list = rows();
    const { result } = renderHook(() => useCollectionFields(list, list, onStale));
    await waitFor(() => expect(answer).not.toBeNull());
    await act(async () => answer!());
    await waitFor(() => expect(result.current.resolve(list[1])).not.toBeNull());
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
  });

  it("does not read the page again when the batch's caption matches the page's", async () => {
    const onStale = vi.fn();
    const list = rows();
    moved[1] = card(1);
    try {
      const { result } = renderHook(() => useCollectionFields(list, list, onStale));
      await waitFor(() => expect(answer).not.toBeNull());
      await act(async () => answer!());
      await waitFor(() => expect(result.current.resolve(list[1])).not.toBeNull());
      await new Promise((r) => setTimeout(r, 100));
      expect(onStale).not.toHaveBeenCalled();
    } finally {
      moved[1] = card(1, { imageUri: "https://cards.example/sld.jpg", printedName: "Renamed", primarySetCode: "SLD" });
    }
  });

  // The foil film rides the same caption: a holding that stopped (or started) being all foil since the
  // page was read moves no name and no set code, so the film is compared too, both ways.
  it.each<[string, Partial<BrowseListCard>, Partial<BrowseListCard>]>([["stopped", { foil: "foil" }, {}], ["started", {}, { foil: "foil" }]])(
    "reads the page again when the drawn printing's film %s since it was read",
    async (_, page, now) => {
      const onStale = vi.fn();
      served[1] = card(1, page);
      moved[1] = card(1, now);
      try {
        const list = rows();
        const { result } = renderHook(() => useCollectionFields(list, list, onStale));
        await waitFor(() => expect(answer).not.toBeNull());
        await act(async () => answer!());
        await waitFor(() => expect(result.current.resolve(list[1])).not.toBeNull());
        await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
        // While the page reads again, the batch's art is drawn with the batch's film, never the page's.
        expect(result.current.resolve(list[1])?.foil).toBe(now.foil);
      } finally {
        served[1] = card(1);
        moved[1] = card(1, { imageUri: "https://cards.example/sld.jpg", printedName: "Renamed", primarySetCode: "SLD" });
      }
    },
  );

  // A renamed card a search or a filter leaves out of `wanted` is still a row the page holds.
  // The route still fetches it (the batch fills spare slots from `all`), and its moved caption
  // must still mark the page stale even though no visible row asked for it.
  it("reads the page again when a withheld card excluded from `wanted` moved since it was read", async () => {
    const onStale = vi.fn();
    const list = rows();
    const { result } = renderHook(() => useCollectionFields(list, [list[0]], onStale));
    await waitFor(() => expect(answer).not.toBeNull());
    await act(async () => answer!());
    await waitFor(() => expect(result.current.resolve(list[0])).not.toBeNull());
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
  });

  // A pick made here lays all three over the row. A batch that lands after it, read from the list
  // the pick moved, neither replaces the pick's caption nor sends the page for a fresh read.
  it("keeps a pick made before the batch lands, and refreshes nothing", async () => {
    const onStale = vi.fn();
    const list = rows();
    const picked = list.map((r, i) =>
      i === 1 ? { ...r, imageUri: "https://cards.example/mine.jpg", printedName: null, primarySetCode: "M10" } : r,
    );
    const { result } = renderHook(() => useCollectionFields(list, picked, onStale));
    await waitFor(() => expect(answer).not.toBeNull());
    await act(async () => answer!());
    await waitFor(() => expect(result.current.resolve(picked[1])).not.toBeNull());
    const drawn = result.current.resolve(picked[1])!;
    expect(drawn.imageUri).toBe("https://cards.example/mine.jpg");
    expect(drawn.printedName).toBeNull();
    expect(drawn.primarySetCode).toBe("M10");
    expect(onStale).not.toHaveBeenCalled();
  });

  // A pick applied through a RERENDER, not at mount: it replaces a `wanted` row without moving
  // its id or its position, so the keys `wantedKey` is built from do not move either. Without
  // `wanted` itself in the effect's deps, the loop would keep holding the pre-pick row and read
  // the landing batch's caption against it instead, missing the pick's own exemption.
  it("applies a pick made through a rerender while the batch is pending", async () => {
    const onStale = vi.fn();
    const list = rows();
    const { result, rerender } = renderHook(
      ({ wanted }) => useCollectionFields(list, wanted, onStale),
      { initialProps: { wanted: list } },
    );
    await waitFor(() => expect(answer).not.toBeNull());
    const picked = list.map((r, i) =>
      i === 1 ? { ...r, imageUri: "https://cards.example/mine.jpg", printedName: null, primarySetCode: "M10" } : r,
    );
    rerender({ wanted: picked });
    await act(async () => answer!());
    await waitFor(() => expect(result.current.resolve(picked[1])).not.toBeNull());
    const drawn = result.current.resolve(picked[1])!;
    expect(drawn.imageUri).toBe("https://cards.example/mine.jpg");
    expect(onStale).not.toHaveBeenCalled();
  });
});
