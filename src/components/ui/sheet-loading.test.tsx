import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../cards/card-detail-provider", () => ({
  useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, pendingOracleId: null, revealing: false }),
}));

const { ModalChrome, ModalPanel } = await import("../decks/receipt-modal");
const { SheetLoading } = await import("./sheet-loading");

// jsdom does no layout, so these pin the flex chain that makes the loader fill a phone sheet (Hugh, 2026-10-27): the
// sheet's body is a column whose children grow, and the loader grows inside the sheet's own column. Break any link
// and the loader stands at its 250px minimum over empty sheet again.
describe("SheetLoading in a sheet", () => {
  const draw = () =>
    render(
      <ModalPanel title="Cheaper stand-ins" closeLabel="Close" onClose={() => {}}>
        <div data-testid="column" className="flex flex-col">
          <SheetLoading heading="Checking the binder" status="finding lands" />
        </div>
      </ModalPanel>,
    );

  it("the sheet's body is a column whose only child grows to fill it", () => {
    draw();
    const body = screen.getByTestId("column").parentElement!;
    expect(body.className).toMatch(/(^| )flex( |$)/);
    expect(body.className).toMatch(/(^| )flex-col( |$)/);
    expect(body.className).toMatch(/(^| )\[&>:only-child\]:grow( |$)/);
    // Growing never shrinks a child below its content, so a long sheet still scrolls.
    expect(body.className).toMatch(/(^| )overflow-y-auto( |$)/);
  });

  it("the loader grows inside the sheet's column, over the handoff's minimum", () => {
    draw();
    const loader = screen.getByRole("status");
    expect(loader.className).toMatch(/(^| )flex-1( |$)/);
    expect(loader.className).toMatch(/(^| )min-h-\[250px\]( |$)/);
    expect(loader).toHaveTextContent("Checking the binder");
    expect(loader).toHaveTextContent("finding lands");
  });

  it("the compact draw keeps the picker's shipped minimum and still grows", () => {
    render(<SheetLoading heading="Checking your decks" compact />);
    const loader = screen.getByRole("status");
    expect(loader.className).toMatch(/(^| )min-h-\[230px\]( |$)/);
    expect(loader.className).toMatch(/(^| )flex-1( |$)/);
    expect(loader.querySelector("p")).toBeNull();
  });
});

// Desktop: a sheet that `stand`s is its cap tall, loading or loaded, so the answer landing never resizes it (Hugh,
// 2026-10-27, the stand-ins sheet). Every other sheet hugs its content as shipped.
describe("ModalChrome stand", () => {
  const sheet = (props: { stand?: boolean; overCard?: { name: string; backAria: string } }) =>
    render(
      <ModalChrome title="Cheaper stand-ins" closeLabel="Close" onClose={() => {}} width={640} {...props}>
        <div />
      </ModalChrome>,
    ).getByTestId("receipt-modal").className;

  it("stands at the 85dvh cap", () => {
    const cls = sheet({ stand: true });
    expect(cls).toMatch(/(^| )md:h-\[85dvh\]( |$)/);
    expect(cls).not.toMatch(/(^| )md:h-auto( |$)/);
  });

  it("over a card, stands at the over-a-card cap", () => {
    const cls = sheet({ stand: true, overCard: { name: "Plateau", backAria: "Back to Plateau" } });
    expect(cls).toMatch(/(^| )md:h-\[calc\(\(100dvh\+min\(620px,85dvh\)\)\/2-60px\)\]( |$)/);
    expect(cls).not.toMatch(/(^| )md:h-auto( |$)/);
  });

  it("unset, hugs its content up to the cap as shipped", () => {
    const cls = sheet({});
    expect(cls).toMatch(/(^| )md:h-auto( |$)/);
    expect(cls).toMatch(/(^| )md:max-h-\[85dvh\]( |$)/);
  });
});
