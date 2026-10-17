import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { LandingKeyed } from "./landing-keyed";

// A child holding state of its own, as the builder holds its tab, panels and Top off's list.
let mounts = 0;
function Held() {
  const [id] = useState(() => (mounts += 1));
  return <p>mount {id}</p>;
}

describe("LandingKeyed", () => {
  it("remounts its child for each new request, and keeps it through renders with none or the same one", () => {
    mounts = 0;
    const { rerender } = render(<LandingKeyed request={null}><Held /></LandingKeyed>);
    expect(screen.getByText("mount 1")).toBeTruthy();
    rerender(<LandingKeyed request={null}><Held /></LandingKeyed>);
    expect(screen.getByText("mount 1")).toBeTruthy();
    rerender(<LandingKeyed request="r1"><Held /></LandingKeyed>);
    expect(screen.getByText("mount 2")).toBeTruthy();
    // An edit's revalidation after the landing stripped `?tool=`: no request, the builder kept.
    rerender(<LandingKeyed request={null}><Held /></LandingKeyed>);
    rerender(<LandingKeyed request="r1"><Held /></LandingKeyed>);
    expect(screen.getByText("mount 2")).toBeTruthy();
    rerender(<LandingKeyed request="r2"><Held /></LandingKeyed>);
    expect(screen.getByText("mount 3")).toBeTruthy();
  });
});
