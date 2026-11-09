import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCardDetail } from "../../cards/card-detail-context";
import { DemoDeckScope, DemoProviders, demoCardDetail } from "./demo-providers";

const wiring = () => ({ onOpen: vi.fn(), onClose: vi.fn(), openOracleId: null as string | null });

describe("demoCardDetail", () => {
  it("reports the frame's open card and session truthfully, and no read pending", () => {
    const closed = demoCardDetail(wiring());
    expect(closed.openOracleId).toBeNull();
    expect(closed.sessionActive).toBe(false);
    expect(closed.pendingOracleId).toBeNull();
    const open = demoCardDetail({ ...wiring(), openOracleId: "o1" });
    expect(open.openOracleId).toBe("o1");
    expect(open.sessionActive).toBe(true);
  });

  it("hands a press to the frame with the list, the opener and the deck, and close to the frame's close", () => {
    const w = wiring();
    const opener = document.createElement("button");
    const value = demoCardDetail(w, "over");
    value.open("o1", ["o1", { oracleId: "o2", name: "Two" }], undefined, { opener });
    expect(w.onOpen).toHaveBeenCalledWith("o1", [{ oracleId: "o1" }, { oracleId: "o2", name: "Two" }], opener, "over");
    value.open("o3");
    expect(w.onOpen).toHaveBeenLastCalledWith("o3", [], null, "over");
    value.close();
    expect(w.onClose).toHaveBeenCalledTimes(1);
  });

  it("has no deck, nothing to prefetch and holds no sheet", () => {
    const value = demoCardDetail(wiring());
    expect(value.deckId).toBeNull();
    expect(value.deckOracleIds.size).toBe(0);
    expect(value.prefetch("o1")).toBeUndefined();
    expect(value.registerSheet()).toBeTypeOf("function");
  });
});

describe("DemoProviders and DemoDeckScope", () => {
  function Press() {
    const { open } = useCardDetail();
    return <button type="button" onClick={(e) => open("o1", undefined, undefined, { opener: e.currentTarget })}>press</button>;
  }

  it("a press outside any deck scope carries no deck; inside one it carries that deck", () => {
    const w = wiring();
    render(
      <DemoProviders {...w}>
        <Press />
        <DemoDeckScope role="under">
          <Press />
        </DemoDeckScope>
      </DemoProviders>,
    );
    const [outside, inside] = screen.getAllByRole("button", { name: "press" });
    fireEvent.click(outside);
    expect(w.onOpen).toHaveBeenLastCalledWith("o1", [], outside, null);
    fireEvent.click(inside);
    expect(w.onOpen).toHaveBeenLastCalledWith("o1", [], inside, "under");
  });

  it("a deck scope with no providers around it draws its children as they are", () => {
    render(<DemoDeckScope role="played"><p>inside</p></DemoDeckScope>);
    expect(screen.getByText("inside")).toBeInTheDocument();
  });
});
