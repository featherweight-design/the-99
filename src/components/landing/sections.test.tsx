import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import type { LandingCommander } from "../../lib/public/landing-commanders";
import { Loop } from "./loop";
import { writtenCommanders, Written } from "./written";

const cmd = (name: string, over: Partial<LandingCommander> = {}): LandingCommander => ({
  name, slug: `${name.split(",")[0].toLowerCase().replace(/\W/g, "")}-0123456789ab`, colorIdentity: ["U"], artCropUri: "https://cards.scryfall.io/art/x.jpg", imageUri: null, prose: `${name} read.`, ...over,
});
const YSHTOLA = cmd("Y'shtola, Night's Blessed");
const TAM = cmd("Tam, the Possibility");
const PRECON = { name: "Mutant Menace", overview: "The Wise Mothman leads a Sultai counters deck." };

describe("Loop", () => {
  it("draws the four steps in order and the Free line once, with no chip", () => {
    render(<Loop />);
    const steps = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(steps).toEqual(landingCopy.loop.steps.map((s) => s.title));
    expect(screen.getAllByText(landingCopy.loop.free)).toHaveLength(1);
    expect(screen.getByTestId("landing-loop").textContent).not.toMatch(/always|no limits/i);
  });
});

describe("Written", () => {
  const draw = (props: Partial<Parameters<typeof Written>[0]> = {}) =>
    render(<Written commanders={[YSHTOLA, TAM]} precon={PRECON} wordCount={3379} publicPages {...props} />);

  it("links each commander card to its public page while public pages are on", () => {
    draw();
    const links = screen.getAllByRole("link", { name: landingCopy.written.open });
    expect(links.map((a) => a.getAttribute("href"))).toEqual([`/commander/${YSHTOLA.slug}`, `/commander/${TAM.slug}`]);
  });

  it("draws no link at all while public pages are off", () => {
    draw({ publicPages: false });
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByText(`${YSHTOLA.name} read.`)).toBeInTheDocument();
  });

  it("draws the precon's Overview with no link and no string for one", () => {
    draw();
    const card = screen.getByRole("heading", { name: "Mutant Menace" }).closest("article") as HTMLElement;
    expect(within(card).getByText(PRECON.overview)).toBeInTheDocument();
    expect(within(card).queryByRole("link")).toBeNull();
    expect(card.textContent).not.toMatch(/Open the precon/i);
  });

  it("says Most and Almost every, never Every, and names the real count", () => {
    draw();
    expect(screen.getByText(landingCopy.written.leadBoth)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("A write-up on why to build 3,379 commanders");
    expect(landingCopy.written.leadBoth).not.toMatch(/^Every|\. Every /);
  });

  it("leaves the precon half out when the loader returned nothing, and says only what is true", () => {
    draw({ precon: null });
    expect(screen.queryByText("Mutant Menace")).toBeNull();
    expect(screen.getByText(landingCopy.written.leadCommanders)).toBeInTheDocument();
  });

  it("draws the precon alone when no commander has a stored read", () => {
    draw({ commanders: [cmd(YSHTOLA.name, { prose: null })] });
    expect(screen.getByText(landingCopy.written.leadPrecon)).toBeInTheDocument();
    expect(screen.queryByText(landingCopy.written.commanderKicker)).toBeNull();
  });

  it("draws no section at all when nothing came back, and no count it was not given", () => {
    const { container } = draw({ commanders: [], precon: null });
    expect(container).toBeEmptyDOMElement();
    draw({ wordCount: undefined });
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(landingCopy.written.titleNoCount);
  });

  it("picks the board's two commanders in its order, and only those with a read", () => {
    expect(writtenCommanders([TAM, cmd("Jace, Multiverse Architect"), YSHTOLA]).map((c) => c.name)).toEqual([YSHTOLA.name, TAM.name]);
    expect(writtenCommanders([YSHTOLA, cmd(TAM.name, { prose: null })]).map((c) => c.name)).toEqual([YSHTOLA.name]);
  });
});
