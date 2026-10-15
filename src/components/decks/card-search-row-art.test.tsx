import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchResult } from "../../app/decks/[id]/search-action";
import { CardSearchRowBody } from "./card-search-row";

// The add panel's result thumb is card art like any other: it fades in when it lands (`FadingImg`), and
// art already drawn is left alone.
const RESULT = {
  oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", owned: true, cardTypeGroup: "artifact", role: null,
  imageUri: "https://img/sol.jpg", manaCost: "{1}", cmc: 1, ownedCount: 1,
} as unknown as SearchResult;
const draw = () =>
  render(
    <CardSearchRowBody result={RESULT} query="sol" ownership="owned" dim={false} nameClassName="" trailing={null} seam="" />,
  );

describe("the add panel's result thumb", () => {
  beforeEach(() => vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(false));
  afterEach(() => vi.restoreAllMocks());

  it("is armed to fade in while its bytes are on their way", () => {
    const { container } = draw();
    expect(container.querySelector("img")?.dataset.arrival).toBe("pending");
  });

  it("draws at once when the art has already loaded", () => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    // Loaded, not broken: a complete image with no width never loaded (`failed`).
    vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(488);
    const { container } = draw();
    expect(container.querySelector("img")?.dataset.arrival).toBe("done");
  });
});
