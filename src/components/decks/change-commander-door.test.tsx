import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { FullCardTrigger } from "../commanders/full-card-trigger";
import { ChangeCommanderDoor } from "./change-commander-door";
import { ChangeCommanderProvider } from "./change-commander-context";

const html = (node: React.ReactNode) =>
  render(<CardDetailProvider fetchCard={async () => null}>{node}</CardDetailProvider>).container.innerHTML;

describe("ChangeCommanderDoor with the switch off (no provider)", () => {
  // The spines mount the door where they mounted FullCardTrigger; production (switch off) must
  // draw the same DOM it drew before, byte for byte.
  it("draws exactly today's desktop trigger", () => {
    expect(html(<ChangeCommanderDoor oracleId="o1" width="desktop" hasCrop />)).toBe(
      html(<FullCardTrigger oracleId="o1" placement="deck-desktop" bandTapTarget={false} />),
    );
  });

  it("draws exactly today's phone trigger", () => {
    expect(html(<ChangeCommanderDoor oracleId="o1" width="mobile" hasCrop />)).toBe(
      html(<FullCardTrigger oracleId="o1" placement="deck-mobile" bandTapTarget={false} />),
    );
  });
});

describe("ChangeCommanderDoor with the switch off and no crop", () => {
  it("draws nothing, exactly as the spines drew nothing before", () => {
    expect(html(<ChangeCommanderDoor oracleId="o1" width="desktop" hasCrop={false} />)).toBe(html(null));
    expect(html(<ChangeCommanderDoor oracleId="o1" width="mobile" hasCrop={false} />)).toBe(html(null));
  });
});

describe("ChangeCommanderDoor with the switch on", () => {
  const on = (width: "desktop" | "mobile", pair = false, crop = true) => render(
    <CardDetailProvider fetchCard={async () => null}>
      <ChangeCommanderProvider deckId="d1" deckName="Deck" pair={pair} hasVersion>
        <ChangeCommanderDoor oracleId="o1" width={width} hasCrop={crop} />
      </ChangeCommanderProvider>
    </CardDetailProvider>,
  );

  it("offers both halves on desktop, labelled", () => {
    const { getByRole } = on("desktop");
    expect(getByRole("button", { name: "View card details" })).toBeTruthy();
    expect(getByRole("button", { name: "Change commander" })).toBeTruthy();
  });

  it("names the pair on a pair deck, on desktop", () => {
    expect(on("desktop", true).getByRole("button", { name: "Change pair" })).toBeTruthy();
  });

  it("names the phone's icon-only half with the one accessible name, pair or not", () => {
    expect(on("mobile", true).getByRole("button", { name: "Change commander" })).toBeTruthy();
  });

  it("draws the swap half alone when there is no crop, at both widths", () => {
    const desk = on("desktop", false, false);
    expect(desk.queryByRole("button", { name: "View card details" })).toBeNull();
    expect(desk.getByRole("button", { name: "Change commander" })).toBeTruthy();
    desk.unmount();
    const phone = on("mobile", false, false);
    expect(phone.queryByRole("button", { name: "View card details" })).toBeNull();
    expect(phone.getByRole("button", { name: "Change commander" })).toBeTruthy();
  });
});
