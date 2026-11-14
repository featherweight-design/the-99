// Settings' Account section: the name through the shared field and the shipped write (a failure puts it back with the
// toast), the email and sign-in line with its door to Clerk's hosted page, and the devices read after paint (loading,
// failed with Try again, rows with this device first and no Sign out on it, a sign-out that dims, leaves or comes back).
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  rename: vi.fn(),
  signOut: vi.fn(),
  getSessions: vi.fn(),
  redirectToUserProfile: vi.fn(),
  user: null as unknown,
}));
vi.mock("../../app/friends/actions", () => ({ setDisplayNameAction: m.rename }));
vi.mock("../../app/settings/account-actions", () => ({ signOutDeviceAction: m.signOut }));
vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ loaded: true, session: { id: "sess_this" }, redirectToUserProfile: m.redirectToUserProfile }),
  useUser: () => ({ user: m.user }),
}));

import { AccountSection, type AccountFacts } from "./account-section";
import { accountCopy } from "../../lib/copy/account";
import { socialCopy } from "../../lib/copy/social";

const a = accountCopy;
const facts: AccountFacts = { name: "Wren Calloway", email: "wren@example.com", methods: ["google", "code"] };
const DAY = 86_400_000;
const session = (id: string, agoMs: number, browserName: string, deviceType: string, isMobile = false) => ({
  id, status: "active", lastActiveAt: new Date(Date.now() - agoMs),
  latestActivity: { browserName, deviceType, isMobile, city: "Oakland", country: "US" },
});
const SESSIONS = [session("sess_mac", 2 * DAY, "Chrome", "Macintosh"), session("sess_this", 0, "Safari", "iPhone", true)];

beforeEach(() => {
  vi.clearAllMocks();
  m.user = { id: "user_me", getSessions: m.getSessions };
  m.getSessions.mockResolvedValue(SESSIONS);
  m.rename.mockResolvedValue({ ok: true, displayName: "Wren C" });
  m.signOut.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("Account", () => {
  it("draws the name, the email with the account's methods, and the door to Clerk's page", () => {
    render(<AccountSection facts={facts} />);
    expect(screen.getByRole("heading", { name: a.head })).toBeTruthy();
    expect(screen.getByText("Wren Calloway")).toBeTruthy();
    expect(screen.getByText("wren@example.com")).toBeTruthy();
    expect(screen.getByText("Signs in with Google and email code.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: `${a.signIn.more} ›` }));
    expect(m.redirectToUserProfile).toHaveBeenCalledTimes(1);
  });

  it("changes the name through the shared field and the shipped write", async () => {
    render(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Wren C" } });
    fireEvent.submit(field.closest("form")!);
    expect(screen.getByText("Wren C")).toBeTruthy();
    await waitFor(() => expect(m.rename).toHaveBeenCalledWith("Wren C"));
  });

  it("puts the name back and says so when the write fails", async () => {
    m.rename.mockResolvedValue({ ok: false, reason: "limited" });
    render(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Wren C" } });
    fireEvent.submit(field.closest("form")!);
    expect(await screen.findByText(socialCopy.page.nameField.failed)).toBeTruthy();
    expect(screen.getByText("Wren Calloway")).toBeTruthy();
  });

  it("draws the server's cleaned name once the write lands", async () => {
    m.rename.mockResolvedValue({ ok: true, displayName: "Wren C." });
    render(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Wren C" } });
    fireEvent.submit(field.closest("form")!);
    expect(await screen.findByText("Wren C.")).toBeTruthy();
  });

  it("does not open the field again while a name is on its way, so no second name is lost", async () => {
    let finish!: (v: unknown) => void;
    m.rename.mockReturnValue(new Promise((r) => (finish = r)));
    render(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    const field = screen.getByLabelText(socialCopy.page.nameField.label);
    fireEvent.change(field, { target: { value: "Wren C" } });
    fireEvent.submit(field.closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    expect(screen.queryByLabelText(socialCopy.page.nameField.label)).toBeNull();
    await act(async () => finish({ ok: true, displayName: "Wren C" }));
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    expect(screen.getByLabelText(socialCopy.page.nameField.label)).toBeTruthy();
  });

  it("says the devices cannot be read when Clerk has no user to read them for", () => {
    m.user = null;
    render(<AccountSection facts={facts} />);
    expect(screen.getByRole("alert").textContent).toContain(a.devices.readFailed);
  });

  it("never brings back a device it signed out when a later read lists it from Clerk's cache", async () => {
    const { rerender } = render(<AccountSection facts={facts} />);
    fireEvent.click(await screen.findByRole("button", { name: a.devices.signOutAria("Chrome on Mac") }));
    await waitFor(() => expect(document.querySelector('[data-device-row="other"]')).toBeNull());
    // A new user resource (Clerk's update) for the same reader: the read runs again only on a change of WHO.
    m.user = { id: "user_me", getSessions: m.getSessions };
    rerender(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    expect(document.querySelector('[data-device-row="other"]')).toBeNull();
  });

  it("writes nothing for an unchanged name", () => {
    render(<AccountSection facts={facts} />);
    fireEvent.click(screen.getByRole("button", { name: a.name.change }));
    fireEvent.submit(screen.getByLabelText(socialCopy.page.nameField.label).closest("form")!);
    expect(m.rename).not.toHaveBeenCalled();
  });

  it("reads the devices after paint: loading, then this device first with no Sign out, then the rest", async () => {
    render(<AccountSection facts={facts} />);
    expect(screen.getByRole("status").textContent).toBe(a.devices.loading);
    expect(screen.getByText(a.devices.head(null))).toBeTruthy();
    expect(await screen.findByText(a.devices.head(2))).toBeTruthy();
    const rows = document.querySelectorAll("[data-device-row]");
    expect([...rows].map((r) => r.getAttribute("data-device-row"))).toEqual(["this", "other"]);
    expect(rows[0].textContent).toContain("Safari on iPhone");
    expect(rows[0].textContent).toContain(a.devices.thisDevice);
    expect(rows[0].querySelector("button")).toBeNull();
    expect(rows[1].textContent).toContain("Last active 2 days ago · Oakland, US");
    expect(screen.getByRole("button", { name: a.devices.signOutAria("Chrome on Mac") })).toBeTruthy();
  });

  it("says when the devices cannot be read, and Try again reads them again", async () => {
    m.getSessions.mockRejectedValueOnce(new Error("clerk"));
    render(<AccountSection facts={facts} />);
    expect((await screen.findByRole("alert")).textContent).toContain(a.devices.readFailed);
    fireEvent.click(screen.getByRole("button", { name: a.devices.retry }));
    expect(await screen.findByText(a.devices.head(2))).toBeTruthy();
    expect(m.getSessions).toHaveBeenCalledTimes(2);
  });

  it("signs a device out: the row dims while it goes, then leaves", async () => {
    let finish!: (v: unknown) => void;
    m.signOut.mockReturnValue(new Promise((r) => (finish = r)));
    render(<AccountSection facts={facts} />);
    fireEvent.click(await screen.findByRole("button", { name: a.devices.signOutAria("Chrome on Mac") }));
    expect(m.signOut).toHaveBeenCalledWith("sess_mac");
    expect(screen.getByText(a.devices.signingOut)).toBeTruthy();
    expect(document.querySelector('[data-device-row="other"]')!.className).toContain("opacity-[.55]");
    await act(async () => finish({ ok: true }));
    expect(document.querySelector('[data-device-row="other"]')).toBeNull();
    expect(screen.getByText(a.devices.head(1))).toBeTruthy();
    expect(screen.getByText(a.devices.signedOut("Chrome on Mac")).closest("[role]")!.getAttribute("role")).toBe("status");
  });

  it("puts a device back with the toast when its sign-out fails", async () => {
    m.signOut.mockResolvedValue({ ok: false, reason: "failed" });
    render(<AccountSection facts={facts} />);
    fireEvent.click(await screen.findByRole("button", { name: a.devices.signOutAria("Chrome on Mac") }));
    expect(await screen.findByText(a.devices.failed)).toBeTruthy();
    expect(screen.getByRole("button", { name: a.devices.signOutAria("Chrome on Mac") })).toBeTruthy();
  });
});
