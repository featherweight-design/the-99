import { fireEvent, render } from "@testing-library/react";
import { ENV_VIEW } from "@/test/env-view";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AboutPage } from "./about-page";

vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn(() => Promise.resolve()) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Admin PR 9c: the credits entry and How it works state the READER'S own daily limit, read once by
// the route (`dailyLimitFor`), and the default (`MODEL_DAILY_ALLOWANCE`) when there is no reader.
afterEach(() => {
  delete process.env.HOW_IT_WORKS_ENABLED;
  delete process.env.MODEL_DAILY_ALLOWANCE;
});

function credits(container: HTMLElement): string {
  return container.querySelector("#credits")?.textContent ?? "";
}
/** Opens "Written text and credits" (rows draw closed) and reads its body. */
function written(container: HTMLElement): string {
  const head = container.querySelector<HTMLButtonElement>("[aria-controls='how-written-body']")!;
  if (head.getAttribute("aria-expanded") !== "true") fireEvent.click(head);
  return container.querySelector("#how-written-body")?.textContent ?? "";
}

describe("the reader's credit limit on /about", () => {
  it.each([
    [1, "one"],
    [5, "five"],
    [10, "ten"],
    [12, "12"],
  ])("states a limit of %i in the credits entry and How it works", (limit, spelled) => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} creditLimit={limit} />);
    expect(credits(container)).toContain(`You get ${spelled}, and each one comes back 24 hours after you use it.`);
    expect(credits(container)).not.toContain("{allowance}");
    expect(written(container)).toContain(`Credits: you have ${limit} in any 24 hours`);
    expect(written(container)).not.toContain("{allowance}");
  });

  it("states the default with no reader: MODEL_DAILY_ALLOWANCE, else five", () => {
    process.env.HOW_IT_WORKS_ENABLED = "true";
    const unset = render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(credits(unset.container)).toContain("You get five,");
    expect(written(unset.container)).toContain("Credits: you have 5 in any 24 hours");
    unset.unmount();
    process.env.MODEL_DAILY_ALLOWANCE = "1";
    const one = render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(credits(one.container)).toContain("You get one,");
    expect(written(one.container)).toContain("Credits: you have 1 in any 24 hours");
  });

  it("draws the specimen at the default limit, whatever the reader's own", () => {
    process.env.MODEL_DAILY_ALLOWANCE = "1";
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} creditLimit={12} />);
    expect(credits(container)).toContain("You get 12,");
    expect(credits(container)).toContain("1 of 1");
    expect(credits(container)).not.toMatch(/\b2 of\b/);
  });
});
