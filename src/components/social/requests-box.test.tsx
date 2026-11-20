// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { historyCopy } from "../../lib/copy/request-history";
import { RequestsBox } from "./requests-box";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));

const b = historyCopy.box;
const box = (o: Partial<Parameters<typeof RequestsBox>[0]> = {}) => (
  <RequestsBox waiting={<p>waiting rows</p>} mine={<p>my rows</p>} waitingCount={0} mineCount={0} unseenAnswer={false} history={false} {...o} />
);

afterEach(cleanup);

describe("RequestsBox", () => {
  it("opens on Waiting on you when anything waits, else on Your requests (also when both are empty)", () => {
    const a = render(box({ waitingCount: 2, mineCount: 1 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.waiting) }).getAttribute("aria-selected")).toBe("true");
    a.unmount();
    const c = render(box({ waitingCount: 0, mineCount: 3 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).getAttribute("aria-selected")).toBe("true");
    c.unmount();
    render(box());
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps both lists mounted and shows only the chosen tab", () => {
    render(box({ waitingCount: 1, mineCount: 1 }));
    expect(screen.getByText("waiting rows").closest("[hidden]")).toBeNull();
    expect(screen.getByText("my rows", { exact: true }).closest("[hidden]")).not.toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(b.mine) }));
    expect(screen.getByText("waiting rows").closest("[hidden]")).not.toBeNull();
    expect(screen.getByText("my rows").closest("[hidden]")).toBeNull();
  });

  it("draws a tab's empty state only when it has no rows, and the foot link only with a history", () => {
    const a = render(box());
    expect(screen.getByText(b.mineEmpty.title)).toBeTruthy();
    expect(screen.queryByRole("link", { name: b.history })).toBeNull();
    a.unmount();
    render(box({ waitingCount: 1, history: true }));
    expect(screen.queryByText(b.waitingEmpty.title)).toBeNull();
    expect(screen.getByRole("link", { name: b.history }).getAttribute("href")).toBe("/friends/requests");
  });

  it("puts the diamond on Your requests only for an answer not yet seen", () => {
    const a = render(box({ mineCount: 1, unseenAnswer: true }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).querySelector(".rotate-45")).not.toBeNull();
    a.unmount();
    render(box({ mineCount: 1 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).querySelector(".rotate-45")).toBeNull();
  });
});
