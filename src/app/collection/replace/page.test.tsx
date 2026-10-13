import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
// The reader's resolved switches: the environment, so `vi.stubEnv` still sets them.
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => process.env }));
vi.mock("../../../lib/home/summary", () => ({ getCollectionStats: async () => ({ totalCards: 3 }) }));
vi.mock("../../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => true }));
vi.mock("../../../components/collection/replace-flow", () => ({
  ReplaceFlow: () => <div data-testid="flow" />,
}));

import ReplacePage from "./page";

// Bug batch 2026-10-12: the route's section is a flex column that takes `main`'s height, so a step
// that fills the screen (the choice, the review) can grow into it and its action bar sits on
// `main`'s foot. A plain block here left each step at its own height and a hole under the bar.
describe("/collection/replace", () => {
  it("wraps the flow in a flex column that grows into main", async () => {
    render(await ReplacePage());
    const section = screen.getByTestId("flow").parentElement!;
    expect(section.tagName).toBe("SECTION");
    expect(section.className.split(/\s+/)).toEqual(expect.arrayContaining(["flex", "flex-1", "flex-col"]));
  });
});
