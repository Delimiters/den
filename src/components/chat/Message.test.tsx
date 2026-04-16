import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Message } from "./Message";
import type { Message as MessageType, User } from "../../types";

const author: User = {
  id: "user-1",
  username: "jake",
  display_name: "Jake Haley",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const baseMessage: MessageType = {
  id: "msg-1",
  channel_id: "ch-1",
  author_id: "user-1",
  content: "Hello, world!",
  created_at: new Date().toISOString(),
  edited_at: null,
  deleted_at: null,
  author,
};

describe("Message (full mode)", () => {
  it("renders the message content", () => {
    render(<Message message={baseMessage} />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("renders the author display name", () => {
    render(<Message message={baseMessage} />);
    expect(screen.getByText("Jake Haley")).toBeInTheDocument();
  });

  it("renders a timestamp", () => {
    render(<Message message={baseMessage} />);
    expect(screen.getByText(/Today at/i)).toBeInTheDocument();
  });

  it("falls back to username when display_name is missing", () => {
    const msg: MessageType = { ...baseMessage, author: { ...author, display_name: "" } };
    render(<Message message={msg} />);
    expect(screen.getByText("jake")).toBeInTheDocument();
  });

  it("falls back to 'Unknown' when author is missing entirely", () => {
    const msg: MessageType = { ...baseMessage, author: undefined };
    render(<Message message={msg} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows (edited) indicator when edited_at is set", () => {
    const msg: MessageType = { ...baseMessage, edited_at: new Date().toISOString() };
    render(<Message message={msg} />);
    expect(screen.getByText("(edited)")).toBeInTheDocument();
  });

  it("does not show (edited) when edited_at is null", () => {
    render(<Message message={baseMessage} />);
    expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
  });
});

describe("Message (compact mode)", () => {
  it("renders message content in compact mode", () => {
    render(<Message message={baseMessage} compact />);
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("does not render author name in compact mode", () => {
    render(<Message message={baseMessage} compact />);
    expect(screen.queryByText("Jake Haley")).not.toBeInTheDocument();
  });
});

describe("Message editing", () => {
  it("does not show edit/delete buttons for non-owner", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <Message
        message={baseMessage}
        currentUserId="other-user"
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    expect(screen.queryByTitle("Edit message")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Delete message")).not.toBeInTheDocument();
  });

  it("calls onEdit with new content when owner edits and submits", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <Message
        message={baseMessage}
        currentUserId="user-1"
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByTitle("Edit message"));
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Updated content");
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledWith("msg-1", "Updated content");
  });

  it("cancels edit on Escape without calling onEdit", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <Message
        message={baseMessage}
        currentUserId="user-1"
        onEdit={onEdit}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByTitle("Edit message"));
    await user.keyboard("{Escape}");

    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Hello, world!")).toBeInTheDocument();
  });

  it("calls onDelete when owner clicks delete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <Message
        message={baseMessage}
        currentUserId="user-1"
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByTitle("Delete message"));
    expect(onDelete).toHaveBeenCalledWith("msg-1");
  });
});
