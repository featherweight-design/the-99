import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { named } from "../../lib/person-name/mint";
import { OpponentInitials } from "./opponent-initials";

const draw = (n: Parameters<typeof OpponentInitials>[0]["n"]) => render(<p data-testid="face"><OpponentInitials n={n} /></p>);

describe("OpponentInitials", () => {
  it("makes initials from letters and digits only, one rule with the friend faces", () => {
    for (const [name, want] of [["Jo", "JO"], ["  Émile  Zola ", "ÉZ"], ["Dave", "DA"], ["Jo-Ann Lee", "JL"], ["O’Brien", "OB"]] as const) {
      const { unmount } = draw(named(name));
      expect(screen.getByTestId("face")).toHaveTextContent(want);
      unmount();
    }
  });

  it("draws ? for a name with no letter or digit", () => {
    draw(named("*** !!"));
    expect(screen.getByTestId("face")).toHaveTextContent("?");
  });

  it("marks another reader's initials, and not the reader's own", () => {
    const { unmount } = draw(named("Jo Park"));
    expect(screen.getByText("JP")).toHaveClass("ph-no-capture");
    unmount();
    draw("Jo Park");
    expect(screen.getByTestId("face").querySelector(".ph-no-capture")).toBeNull();
  });
});
