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

  it("a mouse hovering the ⓘ shows the tip and leaving it hides an unpinned one; a pinned one stays", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(4), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(info(4), { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(info(4), { pointerType: "mouse" });
    fireEvent.click(info(4));
    fireEvent.pointerLeave(info(4), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("a mouse over the row but not the ⓘ opens nothing, and an unpinned tip takes no pointer", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(1).closest("li") as HTMLElement, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(info(1), { pointerType: "mouse" });
    expect(screen.getByRole("tooltip").className).toContain("pointer-events-none");
    fireEvent.click(info(1));
    expect(screen.getByRole("tooltip").className).not.toContain("pointer-events-none");
  });

  it("a pinned tip survives the button's blur (a press inside the tip blurs it), and closes on a second press", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.click(info(0));
    fireEvent.blur(info(0));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(info(0));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("an unpinned (keyboard or hover) tip closes on blur", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(2), { pointerType: "mouse" });
    fireEvent.blur(info(2));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("a touch never opens a tip by hover, and a touch press on another ⓘ moves the one open tip", () => {
    render(<CreditTips suggestedTwo />);
    fireEvent.pointerEnter(info(0), { pointerType: "touch" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerDown(info(0), { pointerType: "touch" });
    fireEvent.click(info(0), { detail: 1 });
    fireEvent.pointerDown(info(3), { pointerType: "touch" });
    fireEvent.click(info(3), { detail: 1 });
    const tips = screen.getAllByRole("tooltip");
    expect(tips).toHaveLength(1);
    expect(within(tips[0]).getByText(tools[3].tip)).toBeInTheDocument();
  });

  it("every preview draws its tool's own example rows, labelled an example", () => {
    render(<CreditTips suggestedTwo />);
    for (let i = 0; i < tools.length; i++) {
      fireEvent.click(info(i));
      const tip = screen.getByRole("tooltip");
      expect(within(tip).getByText(landingCopy.tip.example)).toBeInTheDocument();
      for (const [, name, note] of tools[i].example.rows) {
        expect(within(tip).getByText(note)).toBeInTheDocument();
        if (name) expect(within(tip).getByText(name)).toBeInTheDocument();
      }
    }
  });
});
