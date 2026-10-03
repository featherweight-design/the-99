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
});
