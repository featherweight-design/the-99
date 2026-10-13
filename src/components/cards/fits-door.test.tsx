import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FitsDoor } from "./fits-door";

describe("FitsDoor", () => {
  it("keeps its button, and the reader's focus on it, as a read's note comes and goes", () => {
    const props = { cardName: "Birds of Paradise", onPress: () => {}, pickerOpen: false, layout: "row" as const };
    const { rerender } = render(<FitsDoor {...props} reading />);
    const button = screen.getByTestId("fits-door");
    button.focus();
    expect(screen.getByTestId("fits-door-reading")).toBeInTheDocument();
    rerender(<FitsDoor {...props} reading={false} />);
    expect(screen.queryByTestId("fits-door-reading")).toBeNull();
    expect(screen.getByTestId("fits-door")).toBe(button);
    expect(document.activeElement).toBe(button);
  });
});
