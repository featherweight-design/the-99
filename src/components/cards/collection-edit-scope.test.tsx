// Add a card from anywhere, D (READINESS O3): card details adds on every surface inside the signed-in shell, never on
// the public card page, which a signed-in reader still sees inside the shell.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname: string | null = "/decks";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { CollectionEditScope, isPublicCardPath, useCollectionEditScope } = await import("./collection-edit-scope");

function Probe() {
  return <p>{useCollectionEditScope() ? "in scope" : "no scope"}</p>;
}

afterEach(() => {
  pathname = "/decks";
});

describe("the collection edit scope", () => {
  it("is on for every shell page but the public card page", () => {
    for (const path of ["/", "/decks/441286bb-f632-4d1e-af0f-aa7282bbb40f", "/collection", "/friends/abc/decks/def", "/commander/sol", "/cards"]) {
      pathname = path;
      const { unmount } = render(<CollectionEditScope><Probe /></CollectionEditScope>);
      expect(screen.getByText("in scope")).toBeTruthy();
      unmount();
    }
  });

  it("is off on /card/[slug], so a signed-in reader's public card page draws no link", () => {
    pathname = "/card/sol-ring-0b3f2c9e6a41";
    render(<CollectionEditScope><Probe /></CollectionEditScope>);
    expect(screen.getByText("no scope")).toBeTruthy();
  });

  it("reads the public card path exactly", () => {
    expect(isPublicCardPath("/card/sol-ring-0b3f2c9e6a41")).toBe(true);
    expect(isPublicCardPath("/card")).toBe(true);
    expect(isPublicCardPath("/cards")).toBe(false);
    expect(isPublicCardPath("/collection/card/x")).toBe(false);
    expect(isPublicCardPath(null)).toBe(false);
  });

  it("is off outside it altogether", () => {
    render(<Probe />);
    expect(screen.getByText("no scope")).toBeTruthy();
  });
});
