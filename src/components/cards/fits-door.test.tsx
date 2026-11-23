import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const capture = vi.hoisted(() => vi.fn());
vi.mock("../../lib/analytics/posthog", () => ({ captureToolEvent: capture }));

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

  it("sends find_a_deck_opened from the card door, then opens", () => {
    const onPress = vi.fn();
    render(<FitsDoor cardName="Sol Ring" onPress={onPress} pickerOpen={false} layout="row" />);
    fireEvent.click(screen.getByTestId("fits-door"));
    expect(capture).toHaveBeenCalledWith("find_a_deck_opened", { from: "card_door" });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
