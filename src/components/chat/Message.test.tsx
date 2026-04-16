import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
  created_at: new Date().toISOString(), // "today" so timestamp reads "Today at..."
  edited_at: null,
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
    const msg: MessageType = {
      ...baseMessage,
      author: { ...author, display_name: "" },
    };
    render(<Message message={msg} />);
    expect(screen.getByText("jake")).toBeInTheDocument();
  });

  it("falls back to 'Unknown' when author is missing entirely", () => {
    const msg: MessageType = { ...baseMessage, author: undefined };
    render(<Message message={msg} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
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

  it("does not render 'Today at' timestamp in compact mode (only short time)", () => {
    render(<Message message={baseMessage} compact />);
    expect(screen.queryByText(/Today at/i)).not.toBeInTheDocument();
  });
});
