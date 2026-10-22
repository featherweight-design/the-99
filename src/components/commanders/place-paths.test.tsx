import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PlacePathsProvider } from "./place-paths";
import { ChooseDoorPress, DiscoverChooseLink, HelpMeChooseDoor } from "../intake/help-me-choose-door";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

afterEach(cleanup);

const doors = () => (
  <>
    <HelpMeChooseDoor pastRuns />
    <DiscoverChooseLink colors={["G"]} exactly={false} wide />
    <ChooseDoorPress />
  </>
);
const hrefs = () => screen.getAllByRole("link").map((l) => l.getAttribute("href"));

describe("every door into Help me choose follows the Commanders place switch", () => {
  it("names today's address with no provider and with the switch off", () => {
    render(doors());
    expect(hrefs().every((h) => h?.startsWith("/decks/new/choose"))).toBe(true);
    cleanup();
    render(<PlacePathsProvider place={false}>{doors()}</PlacePathsProvider>);
    expect(hrefs().every((h) => h?.startsWith("/decks/new/choose"))).toBe(true);
  });
  it("names the tab with it on, and never the retired address", () => {
    render(<PlacePathsProvider place>{doors()}</PlacePathsProvider>);
    const found = hrefs();
    expect(found.length).toBeGreaterThanOrEqual(4);
    expect(found.every((h) => h?.startsWith("/commanders/choose"))).toBe(true);
    expect(found).toContain("/commanders/choose?c=g");
    expect(found).toContain("/commanders/choose?v=history");
  });
});
