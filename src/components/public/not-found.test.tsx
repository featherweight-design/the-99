import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "../../app/not-found";
import { PublicNotFound } from "./not-found";
import CardNotFound from "../../app/card/[slug]/not-found";
import CommanderNotFound from "../../app/commander/[slug]/not-found";
import { shellCopy } from "../../lib/copy/shell";

describe("the public not-found (C3)", () => {
  it("draws the top bar, the 404, the shipped heading and caption, and ONE way out, Back home, as a plain link", () => {
    render(<PublicNotFound />);
    expect(screen.getByTestId("public-top-bar")).toBeTruthy();
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(shellCopy.notFound.heading);
    expect(screen.getByText(shellCopy.notFound.caption)).toBeTruthy();
    const main = screen.getByRole("main");
    const links = main.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe(shellCopy.notFound.primaryCta);
    expect(links[0].getAttribute("href")).toBe("/");
    expect(screen.queryByText(shellCopy.notFound.secondaryCta)).toBeNull();
    // The Scryfall hand-off is in the bar (README call 5).
    expect(screen.getAllByText(/Scryfall/).length).toBeGreaterThan(0);
  });

  it("shares its body with the app's own not-found, which keeps View decks", () => {
    const pub = render(<PublicNotFound />);
    const publicBody = pub.container.querySelector("main > div")!.className;
    pub.unmount();
    const app = render(<NotFound />);
    expect(app.container.firstElementChild!.className).toBe(publicBody);
    expect(screen.getByText(shellCopy.notFound.secondaryCta).closest("a")?.getAttribute("href")).toBe("/decks");
    expect(screen.getByText(shellCopy.notFound.primaryCta).closest("a")?.getAttribute("href")).toBe("/");
  });

  it("is what both public routes draw for an unknown address: the card's and the commander's", () => {
    for (const Boundary of [CardNotFound, CommanderNotFound]) {
      const { unmount } = render(<Boundary />);
      expect(screen.getByTestId("public-not-found")).toBeTruthy();
      expect(screen.queryByText(shellCopy.notFound.secondaryCta)).toBeNull();
      unmount();
    }
  });
});
