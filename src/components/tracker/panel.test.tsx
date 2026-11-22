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
    <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={state} active={active} round={1} seats={new Map()} monarch={false} initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
  );

describe("tracker panel", () => {
  it("shows life, two tap halves and End turn only on the active seat", () => {
    const on = render(base, true);
    expect(on).toContain(">40<");
    expect(on).toContain('aria-label="You lose 1 life"');
    expect(on).toContain('aria-label="You gain 1 life"');
    expect(on).toContain('aria-label="Your sheet"');
    expect(on).toContain("End turn");
    expect(on).toContain('data-testid="turn-ring"');
    const off = render(base, false);
    expect(off).not.toContain("End turn");
    expect(off).not.toContain('data-testid="turn-ring"');
  });
  it("flips to the Out face with Undo and no tap halves", () => {
    const html = render({ ...base, life: 0, out: { reason: { kind: "life" }, round: 3, entry: 4 } }, false);
    expect(html).toContain(">Out<");
    expect(html).toContain("0 life · round 3");
    expect(html).toContain("Undo");
    // The front face stays mounted so the flip can play back on Undo, but it is inert: its tap halves take no press.
    const front = html.slice(html.indexOf('data-testid="panel-front"') - 200, html.indexOf('data-testid="panel-back"'));
    expect(front).toMatch(/inert=""[^>]*data-testid="panel-front"/);
    expect(front).toContain("lose 1 life");
    expect(html.slice(html.indexOf('data-testid="panel-back"'))).not.toContain("lose 1 life");
  });
  it("draws a badge for each counter in play and for the holder marks", () => {
    const counters = { ...base.counters, poison: 3, energy: 0 } as SeatState["counters"];
    const html = renderToStaticMarkup(
      <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={{ ...base, counters }} active={false} round={1} seats={new Map()} monarch initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
    );
    expect(html).toContain('aria-label="Poison 3. Open it in the sheet"');
    expect(html).not.toContain("Energy");
    expect(html).toContain('aria-label="Monarch"');
  });
  it("draws End turn icon-only, named for a screen reader, in a name row under 240 px (phone 6 Ends' sides)", () => {
    const at = (c: { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90 }) =>
      renderToStaticMarkup(
        <Panel cell={c} canvas={{ w: 390, h: 844 }} seat={seat} state={base} active round={1} seats={new Map()} monarch={false} initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
      );
    const short = at({ x: 6, y: 425, w: 155, h: 217, rot: 90 });
    expect(short).toContain('aria-label="End turn"');
    expect(short).toContain("size-11");
    expect(short).not.toMatch(/>End turn</);
    const long = at({ x: 6, y: 425, w: 155, h: 273, rot: 90 });
    expect(long).toMatch(/>End turn</);
    expect(long).not.toContain('aria-label="End turn"');
  });
  it("draws the damage taken from a commander with its name, and the top tax", () => {
    const from = { ...seat, seat: 2, you: false, commander: "Ghalta, Primal Hunger", art: "/a.jpg" } as PlaySeat;
    const html = renderToStaticMarkup(
      <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={{ ...base, damage: { "2:0": 6 }, tax: [2, 0] }} active={false} round={1} seats={new Map([[2, from]])} monarch={false} initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
    );
    expect(html).toContain('aria-label="Ghalta, Primal Hunger 6. Open it in the sheet"');
    expect(html).toContain('aria-label="Tax +4. Open it in the sheet"');
  });
  it("names the commander that put the seat out", () => {
    const from = { ...seat, seat: 2, you: false, commander: "Ghalta, Primal Hunger" } as PlaySeat;
    const html = renderToStaticMarkup(
      <Panel cell={cell} canvas={{ w: 390, h: 844 }} seat={seat} state={{ ...base, out: { reason: { kind: "commander", from: 2, cmdr: 0 }, round: 3, entry: 4 } }} active={false} round={3} seats={new Map([[2, from]])} monarch={false} initiative={false} onSheet={() => {}} disabled={false} onLife={() => {}} onEndTurn={() => {}} onUndo={() => {}} />,
    );
    expect(html).toContain("21 commander damage from Ghalta, Primal Hunger · round 3");
  });
});
