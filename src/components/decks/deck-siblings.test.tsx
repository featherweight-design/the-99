import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Sibling, SiblingCard } from "../cards/card-detail-provider";
import { DeckSiblingsProvider, useCommanderSiblings, usePublishDeckSiblings } from "./deck-siblings";

const card = (oracleId: string): SiblingCard => ({ oracleId, name: oracleId, imageUri: `${oracleId}.jpg` });
const ids = (list: readonly Sibling[] | undefined) => list?.map((s) => (typeof s === "string" ? s : s.oracleId));

function Publisher({ list }: { list: readonly SiblingCard[] }) {
  usePublishDeckSiblings(list);
  return null;
}

function Reader({ commanders, seen }: { commanders: readonly SiblingCard[]; seen: (list: readonly Sibling[] | undefined) => void }) {
  seen(useCommanderSiblings(commanders));
  return null;
}

describe("deck siblings", () => {
  it("pages the commanders first, then the list as the decklist draws it", () => {
    let last: readonly Sibling[] | undefined;
    render(
      <DeckSiblingsProvider>
        <Reader commanders={[card("cmd"), card("partner")]} seen={(l) => (last = l)} />
        <Publisher list={[card("b"), card("a")]} />
      </DeckSiblingsProvider>,
    );
    expect(ids(last)).toEqual(["cmd", "partner", "b", "a"]);
  });

  // A commander the list also carries is paged once, at the head, not twice.
  it("never lists a commander twice", () => {
    let last: readonly Sibling[] | undefined;
    render(
      <DeckSiblingsProvider>
        <Reader commanders={[card("cmd")]} seen={(l) => (last = l)} />
        <Publisher list={[card("a"), card("cmd")]} />
      </DeckSiblingsProvider>,
    );
    expect(ids(last)).toEqual(["cmd", "a"]);
  });

  // Before the decklist has drawn, the commander pages alone rather than not at all.
  it("is the commanders alone until the decklist publishes", () => {
    let last: readonly Sibling[] | undefined;
    render(
      <DeckSiblingsProvider>
        <Reader commanders={[card("cmd")]} seen={(l) => (last = l)} />
      </DeckSiblingsProvider>,
    );
    expect(ids(last)).toEqual(["cmd"]);
  });

  // Another tab unmounts the decklist; the list it published must not outlive it.
  it("drops the list when the decklist unmounts", () => {
    let last: readonly Sibling[] | undefined;
    const reader = <Reader commanders={[card("cmd")]} seen={(l) => (last = l)} />;
    const { rerender } = render(
      <DeckSiblingsProvider>
        {reader}
        <Publisher list={[card("a")]} />
      </DeckSiblingsProvider>,
    );
    expect(ids(last)).toEqual(["cmd", "a"]);
    act(() => rerender(<DeckSiblingsProvider>{reader}</DeckSiblingsProvider>));
    expect(ids(last)).toEqual(["cmd"]);
  });

  // A printing pick can rename a card without moving its id or art; the reader still follows.
  it("follows a renamed card", () => {
    let last: readonly Sibling[] | undefined;
    const tree = (name: string) => (
      <DeckSiblingsProvider>
        <Reader commanders={[card("cmd")]} seen={(l) => (last = l)} />
        <Publisher list={[{ oracleId: "a", name, imageUri: "a.jpg" }]} />
      </DeckSiblingsProvider>
    );
    const { rerender } = render(tree("Old"));
    act(() => rerender(tree("New")));
    expect((last?.[1] as SiblingCard).name).toBe("New");
  });

  // Outside the deck page the commander opens exactly as before: no list.
  it("is undefined outside a provider", () => {
    let last: readonly Sibling[] | undefined = [];
    render(<Reader commanders={[card("cmd")]} seen={(l) => (last = l)} />);
    expect(last).toBeUndefined();
  });

  // The decklist re-renders on every edit with a fresh array. Only a change in what it draws
  // reaches the header, and it does reach it.
  it("follows the list when it changes, and only then", () => {
    let renders = 0;
    let last: readonly Sibling[] | undefined;
    const { rerender } = render(
      <DeckSiblingsProvider>
        <Reader commanders={[card("cmd")]} seen={(l) => { renders++; last = l; }} />
        <Publisher list={[card("a")]} />
      </DeckSiblingsProvider>,
    );
    const before = renders;
    act(() =>
      rerender(
        <DeckSiblingsProvider>
          <Reader commanders={[card("cmd")]} seen={(l) => { renders++; last = l; }} />
          <Publisher list={[card("a")]} />
        </DeckSiblingsProvider>,
      ),
    );
    const sameList = last;
    expect(renders - before).toBe(1); // the rerender itself, and no second render from the store
    act(() =>
      rerender(
        <DeckSiblingsProvider>
          <Reader commanders={[card("cmd")]} seen={(l) => { renders++; last = l; }} />
          <Publisher list={[card("a"), card("c")]} />
        </DeckSiblingsProvider>,
      ),
    );
    expect(ids(last)).toEqual(["cmd", "a", "c"]);
    expect(last).not.toBe(sameList);
  });
});
