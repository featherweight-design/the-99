import { describe, it, expect, vi, beforeEach } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("../cache/user-lists", () => ({ revalidateUserLists: vi.fn() }));

import { revalidateClaims } from "./revalidate-claims";

describe("what a claim change invalidates", () => {
  beforeEach(() => revalidatePath.mockClear());

  // The two a proxy toggle added. Both are invisible in a component test and in
  // development — Next serves a fresh render either way — so the only place they
  // can be asserted at all is here.
  it("invalidates every other deck's own page", () => {
    revalidateClaims("d1", "u1");
    // By PATTERN: the copy a proxy releases belongs to whichever deck was going
    // short for it, and that deck's page is where the relief is drawn. The
    // literal path in `claimSurfaces` covers the writing deck alone.
    expect(revalidatePath).toHaveBeenCalledWith("/decks/[id]", "page");
  });

  it("invalidates both precon routes, which name the reader's decks", () => {
    revalidateClaims("d1", "u1");
    expect(revalidatePath).toHaveBeenCalledWith("/decks/precons");
    expect(revalidatePath).toHaveBeenCalledWith("/decks/precons/[fileName]", "page");
  });

  it("invalidates the proxy list", () => {
    revalidateClaims("d1", "u1");
    expect(revalidatePath).toHaveBeenCalledWith("/collection/proxies");
  });

  it("still invalidates the writing deck and the shared lists", () => {
    revalidateClaims("d1", "u1");
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining([
      "/decks/d1", "/decks", "/", "/collection", "/commanders", "/discover",
    ]));
  });
});
