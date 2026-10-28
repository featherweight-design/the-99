import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OnThisPage } from "./on-this-page";

// Copilot round 5 on #2329: a short last section never reaches the reading line, so at the foot of the page the
// previous chip kept `aria-current`.
const sections = [
  { id: "one", name: "One" },
  { id: "two", name: "Two" },
  { id: "three", name: "Three" },
];

function place(id: string, top: number) {
  const el = document.createElement("section");
  el.id = id;
  el.getBoundingClientRect = () => ({ top, bottom: top + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: top, toJSON: () => ({}) });
  document.body.appendChild(el);
}

function scrollTo(y: number, height: number) {
  Object.defineProperty(window, "scrollY", { value: y, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", { value: height, configurable: true });
}

afterEach(() => {
  for (const s of sections) document.getElementById(s.id)?.remove();
});

const lit = () => screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "location").map((a) => a.textContent);

describe("OnThisPage", () => {
  it("lights the last chip at the foot of the page, though its section is below the reading line", async () => {
    place("one", -900);
    place("two", 50);
    place("three", 400);
    scrollTo(1200, 2000);
    render(<OnThisPage sections={sections} />);
    expect(lit()).toEqual(["Three"]);
  });

  it("lights the section past the reading line when not at the foot", async () => {
    place("one", -900);
    place("two", 50);
    place("three", 400);
    scrollTo(600, 4000);
    render(<OnThisPage sections={sections} />);
    await act(async () => {});
    expect(lit()).toEqual(["Two"]);
  });
});
