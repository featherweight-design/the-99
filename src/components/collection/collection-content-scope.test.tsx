// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../shell/pending-report", () => ({ usePendingContentScope: () => ({ current: null }) }));

const { CollectionContentScope } = await import("./collection-content-scope");

describe("CollectionContentScope", () => {
  it("continues the shell main's flex stretch chain, so a tab's loading screen fills the view", () => {
    const { getByText } = render(
      <CollectionContentScope place="commanders">
        <p>tab</p>
      </CollectionContentScope>,
    );
    const wrapper = getByText("tab").parentElement!;
    expect(wrapper.classList.contains("flex")).toBe(true);
    expect(wrapper.classList.contains("flex-col")).toBe(true);
    expect(wrapper.classList.contains("flex-1")).toBe(true);
  });
});
