import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { landingCopy } from "../../lib/copy/landing";
import { LaunchListProvider, LaunchPanel, type LaunchAction } from "./launch-panel";

const c = landingCopy.launch;
const action = vi.fn<LaunchAction>();

function draw(panels = 1) {
  return render(
    <LaunchListProvider action={action}>
      {Array.from({ length: panels }, (_, i) => <LaunchPanel key={i} />)}
    </LaunchListProvider>,
  );
}
const type = (value: string, at = 0) => fireEvent.change(screen.getAllByPlaceholderText(c.emailPlaceholder)[at], { target: { value } });
const press = (at = 0) => fireEvent.click(screen.getAllByRole("button", { name: c.press })[at]);

beforeEach(() => {
  action.mockReset();
  action.mockResolvedValue({ ok: true });
});

describe("LaunchPanel states", () => {
  it("entry: the field, the press and the fine print", () => {
    draw();
    expect(screen.getByLabelText(c.emailLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: c.press })).toBeEnabled();
    expect(screen.getByText(c.fine)).toBeInTheDocument();
  });

  it("not an email: the shipped words, checked before sending, nothing sent", () => {
    draw();
    type("sam@example");
    press();
    expect(screen.getByRole("alert")).toHaveTextContent(c.notAnEmail);
    expect(action).not.toHaveBeenCalled();
  });

  it("sending: Sending…, disabled, and the field keeps its text", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    action.mockReturnValue(new Promise((r) => (finish = r)));
    draw();
    type("sam@example.com");
    press();
    const btn = await screen.findByRole("button", { name: c.sending });
    expect(btn).toBeDisabled();
    expect(screen.getByPlaceholderText(c.emailPlaceholder)).toHaveValue("sam@example.com");
    finish({ ok: true });
    await screen.findByText(c.sentTitle);
  });

  it("sent: replaces the form in place and says where the email will go", async () => {
    draw();
    type(" Sam@Example.com ");
    press();
    expect(await screen.findByText(c.sentTitle)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: c.press })).toBeNull();
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith(" Sam@Example.com ");
  });

  it("an address already on the list draws exactly as sent: the action's answer is the same ok", async () => {
    action.mockResolvedValueOnce({ ok: true });
    const first = draw();
    type("a@x.dev");
    press();
    await screen.findByText(c.sentTitle);
    const sent = first.container.innerHTML;
    first.unmount();
    action.mockResolvedValueOnce({ ok: true });
    const again = draw();
    type("a@x.dev");
    press();
    await screen.findByText(c.sentTitle);
    expect(again.container.innerHTML).toBe(sent);
  });

  it("throttled: the shipped words, the field kept and the press back", async () => {
    action.mockResolvedValue({ ok: false, reason: "throttled" });
    draw();
    type("sam@example.com");
    press();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.throttled);
    expect(screen.getByPlaceholderText(c.emailPlaceholder)).toHaveValue("sam@example.com");
    await waitFor(() => expect(screen.getByRole("button", { name: c.press })).toBeEnabled());
  });

  it("the action refusing the field answers with the not-an-email words", async () => {
    action.mockResolvedValue({ ok: false, reason: "invalid" });
    draw();
    type("a@b.cd");
    press();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.notAnEmail);
  });

  it("a thrown action keeps the field and says so", async () => {
    action.mockRejectedValue(new Error("network"));
    draw();
    type("sam@example.com");
    press();
    expect(await screen.findByRole("alert")).toHaveTextContent(c.failed);
    expect(screen.getByPlaceholderText(c.emailPlaceholder)).toHaveValue("sam@example.com");
  });

  it("a visitor who left their address in the hero sees the sent card in the close too", async () => {
    draw(2);
    type("sam@example.com", 0);
    press(0);
    await waitFor(() => expect(screen.getAllByText(c.sentTitle)).toHaveLength(2));
    expect(screen.queryAllByRole("button", { name: c.press })).toHaveLength(0);
  });
});
