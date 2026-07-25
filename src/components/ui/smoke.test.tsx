import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

it("executes tsx tests in a DOM environment", () => {
  render(<button>hello</button>);
  expect(screen.getByRole("button").textContent).toBe("hello");
});
