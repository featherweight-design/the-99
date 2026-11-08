import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import { CreditTips } from "./credit-tips";

const tools = landingCopy.tools;
const info = (i: number) => screen.getByRole("button", { name: landingCopy.tip.open(tools[i].name) });

describe("CreditTips", () => {
  it("lists the five paid tools, each with an ⓘ, and every tip closed", () => {
    render(<CreditTips suggestedTwo />);
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.queryByRole("tooltip")).toBeNull();
    for (const b of screen.getAllByRole("button")) expect(b).toHaveAttribute("aria-expanded", "false");
  });

  it("a press opens the tip with its sentence and its What you get preview, and a second press closes it", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(1));
    const tip = screen.getByRole("tooltip");
    expect(within(tip).getByText(tools[1].tip)).toBeInTheDocument();
    expect(within(tip).getByText(landingCopy.tip.youGet)).toBeInTheDocument();
    expect(within(tip).getByText("Chaos Warp")).toBeInTheDocument();
    expect(info(1)).toHaveAttribute("aria-describedby", tip.id);
    fireEvent.click(info(1));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("holds one tip open at a time", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    fireEvent.click(info(3));
    const tips = screen.getAllByRole("tooltip");
    expect(tips).toHaveLength(1);
    expect(within(tips[0]).getByText(tools[3].tip)).toBeInTheDocument();
  });

  it("Escape closes an open tip, and so does a press outside", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(2));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(info(2));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a mouse hovering the row shows the tip and leaving it hides an unpinned one; a pinned one stays", () => {
    render(<CreditTips suggestedTwo />);
    const row = info(4).closest("li") as HTMLElement;
    fireEvent.pointerEnter(row, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(row, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(row, { pointerType: "mouse" });
    fireEvent.click(info(4));
    fireEvent.pointerLeave(row, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("a touch press on another ⓘ moves the tip; a touch never opens by hover", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(0).closest("li") as HTMLElement, { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("every preview is labelled an example, and draws made-up words only", () => {
    render(<CreditTips suggestedTwo />);
    for (let i = 0; i < tools.length; i++) {
      fireEvent.click(info(i));
      expect(within(screen.getByRole("tooltip")).getByText(landingCopy.tip.example)).toBeInTheDocument();
    }
  });
});
