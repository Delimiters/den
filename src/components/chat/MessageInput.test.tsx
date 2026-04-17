import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "./MessageInput";

function setup(onSend = vi.fn()) {
  const user = userEvent.setup();
  render(<MessageInput channelName="general" onSend={onSend} />);
  const textarea = screen.getByPlaceholderText("Message #general");
  return { user, textarea, onSend };
}

describe("MessageInput", () => {
  it("renders a textarea with the channel name as placeholder", () => {
    render(<MessageInput channelName="random" onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText("Message #random")).toBeInTheDocument();
  });

  it("calls onSend with the trimmed content when Enter is pressed", async () => {
    const { user, textarea, onSend } = setup();
    await user.click(textarea);
    await user.type(textarea, "hey there");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend).toHaveBeenCalledWith("hey there", []);
  });

  it("clears the textarea after sending", async () => {
    const { user, textarea } = setup();
    await user.click(textarea);
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");
    expect(textarea).toHaveValue("");
  });

  it("does NOT call onSend when Shift+Enter is pressed", async () => {
    const { user, textarea, onSend } = setup();
    await user.click(textarea);
    await user.type(textarea, "first line");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does NOT call onSend for whitespace-only content", async () => {
    const { user, textarea, onSend } = setup();
    await user.click(textarea);
    await user.type(textarea, "   ");
    await user.keyboard("{Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace before calling onSend", async () => {
    const { user, textarea, onSend } = setup();
    await user.click(textarea);
    await user.type(textarea, "  hello  ");
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("hello", []);
  });

  it("calls onSend when the send button is clicked", async () => {
    const { user, textarea, onSend } = setup();
    await user.click(textarea);
    await user.type(textarea, "click test");
    const sendBtn = screen.getByTitle("Send message");
    await user.click(sendBtn);
    expect(onSend).toHaveBeenCalledWith("click test", []);
  });

  it("send button is disabled when textarea is empty", () => {
    setup();
    expect(screen.getByTitle("Send message")).toBeDisabled();
  });

  it("send button becomes enabled after typing", async () => {
    const { user, textarea } = setup();
    await user.type(textarea, "a");
    expect(screen.getByTitle("Send message")).not.toBeDisabled();
  });
});
