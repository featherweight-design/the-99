// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SeatState } from "@/lib/tracker/engine";
import { Panel, type PlaySeat } from "./panel";

const seat: PlaySeat = { seat: 0, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Sai", partner: null, deck: "Sai Artifacts" };
const base: SeatState = {
  seat: 0,
  commanders: 1,
  life: 40,
  counters: {} as SeatState["counters"],
  tax: [0, 0],
  mana: {} as SeatState["mana"],
  damage: {},
  out: null,
};
const cell = { x: 0, y: 0, w: 390, h: 422, rot: 0 } as const;
const render = (state: SeatState, active: boolean) =>
  renderToStaticMarkup(
    <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={state} active={active} round={1} outFrom={null} monarch={false} initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
  );

describe("tracker panel", () => {
  it("shows life, two tap halves and End turn only on the active seat", () => {
    const on = render(base, true);
    expect(on).toContain(">40<");
    expect(on).toContain('aria-label="Lose 1 life"');
    expect(on).toContain('aria-label="Gain 1 life"');
    expect(on).toContain("End turn");
    expect(on).toContain('data-testid="turn-ring"');
    const off = render(base, false);
    expect(off).not.toContain("End turn");
    expect(off).not.toContain('data-testid="turn-ring"');
  });
  it("flips to the Out face with Undo and no tap halves", () => {
    const html = render({ ...base, life: 0, out: { reason: { kind: "life" }, round: 3, entry: 4 } }, false);
    expect(html).toContain("Out · 0 life · round 3");
    expect(html).toContain("Undo");
    expect(html).not.toContain("Lose 1 life");
  });
  it("draws a badge for each counter in play and for the holder marks", () => {
    const counters = { ...base.counters, poison: 3, energy: 0 } as SeatState["counters"];
    const html = renderToStaticMarkup(
      <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={{ ...base, counters }} active={false} round={1} outFrom={null} monarch initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
    );
    expect(html).toContain('aria-label="Poison: 3"');
    expect(html).not.toContain("Energy");
    expect(html).toContain('aria-label="Monarch"');
  });
});
