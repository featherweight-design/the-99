// The dice overlay (bugs 9 and 10): a tap on the landed die, or on the coin, rolls again; only a tap off them, on the
// veil, closes. The coin is drawn here as a CSS coin, tossed end over end onto the face it landed on.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiceRoll, type Roll } from "./dice-roll";

vi.mock("./dice", () => ({
  throwDice: vi.fn(async () => true),
  diePoints: vi.fn(async () => [{ x: 120, y: 300 }]),
  hideDice: vi.fn(),
  reducedMotion: () => false,
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function draw(roll: Roll, tablet = false) {
  const onAgain = vi.fn();
  const onClose = vi.fn();
  render(
    <DiceRoll roll={roll} label="Rolled a 4. Tap to roll again" onAgain={onAgain} onClose={onClose} tablet={tablet}>
      <span data-testid="dice-value">4</span>
    </DiceRoll>,
  );
  return { onAgain, onClose };
}

describe("DiceRoll", () => {
  it("lays a re-roll button over each landed die, and only the veil closes", async () => {
    const { onAgain, onClose } = draw({ kind: "d20", values: [4], k: 1 });
    const die = await screen.findByTestId("dice-die");
    expect(die.getAttribute("aria-label")).toBe("Rolled a 4. Tap to roll again");
    expect(die.style.left).toBe("120px");
    expect(die.style.top).toBe("300px");
    expect(screen.getByTestId("dice-roll").hasAttribute("data-landed")).toBe(true);
    fireEvent.click(die);
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("draws the coin flipping onto the face it landed on, and a tap on it flips again", () => {
    vi.useFakeTimers();
    const { onAgain, onClose } = draw({ kind: "coin", values: [2], k: 3 });
    const coin = screen.getByTestId("dice-coin");
    // The tablet addendum's toss: end over end about its width (rotateX), then a rattle as it lies flat.
    expect(coin.className).toContain("motion-safe:animate-[coin-spin_.9s_cubic-bezier(.12,.6,.3,1)_both,coin-settle_.25s_ease-out_.9s_forwards]");
    expect(coin.style.getPropertyValue("--rx")).toBe("180deg");
    expect(coin.style.getPropertyValue("--t")).toBe("5px");
    expect(coin.querySelectorAll(".coin-face")).toHaveLength(2);
    expect(coin.querySelectorAll(".coin-rim")).toHaveLength(7);
    expect((coin.parentElement as HTMLElement).className).toContain("motion-safe:animate-[coin-arc_.9s_linear_both]");
    expect((coin.parentElement!.parentElement as HTMLElement).style.width).toBe("72px");
    // At rest (and under reduced motion, where nothing animates) the inline transform shows the face it landed on.
    expect(coin.style.transform).toBe("rotateZ(-10deg) rotateX(180deg)");
    // The result waits for the coin to settle.
    expect(screen.queryByTestId("dice-value")).toBeNull();
    act(() => vi.advanceTimersByTime(1150));
    expect(screen.getByTestId("dice-value")).toBeTruthy();
    fireEvent.click(coin);
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("draws the coin at 120px with a thicker edge on a tablet, landing heads on its front face", () => {
    draw({ kind: "coin", values: [1], k: 4 }, true);
    const coin = screen.getByTestId("dice-coin");
    expect(coin.style.getPropertyValue("--rx")).toBe("0deg");
    expect(coin.style.getPropertyValue("--t")).toBe("8px");
    expect((coin.parentElement!.parentElement as HTMLElement).style.width).toBe("120px");
    expect(coin.style.transform).toMatch(/rotateX\(0deg\)$/);
  });

  // jsdom loads no stylesheet, so a renamed or deleted keyframe would pass the class assertions above.
  it("has a keyframe in globals.css for every animation the coin names", () => {
    draw({ kind: "coin", values: [2], k: 3 });
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const box = screen.getByTestId("dice-coin").parentElement!.parentElement as HTMLElement;
    const classes = [...box.querySelectorAll("*")].map((el) => el.getAttribute("class") ?? "").join(" ");
    const names = [...classes.matchAll(/animate-\[([^\]]+)\]/g)].flatMap((m) => m[1].split(/,(?![^(]*\))/).map((a) => a.split("_")[0]));
    expect(new Set(names)).toEqual(new Set(["coin-shadow", "coin-land", "coin-arc", "coin-spin", "coin-settle"]));
    for (const name of names) expect(css).toMatch(new RegExp(`@keyframes ${name} \\{`));
  });
});
