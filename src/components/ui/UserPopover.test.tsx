import { render, screen, fireEvent } from "@testing-library/react";
import { UserPopover } from "./UserPopover";
import type { User } from "../../types";

const user: User = {
  id: "user-1",
  username: "jake",
  display_name: "Jake H",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

const mockRect = {
  top: 100, bottom: 120, left: 50, right: 100,
  width: 50, height: 20, x: 50, y: 100,
  toJSON: () => ({}),
} as DOMRect;

describe("UserPopover", () => {
  it("renders display name and username", () => {
    render(<UserPopover user={user} anchorRect={mockRect} onClose={vi.fn()} />);
    expect(screen.getByText("Jake H")).toBeInTheDocument();
    expect(screen.getByText("@jake")).toBeInTheDocument();
  });

  it("renders status", () => {
    render(<UserPopover user={user} anchorRect={mockRect} onClose={vi.fn()} />);
    expect(screen.getByText("online")).toBeInTheDocument();
  });

  it("shows Message button when onOpenDm is provided", () => {
    render(<UserPopover user={user} anchorRect={mockRect} onClose={vi.fn()} onOpenDm={vi.fn()} />);
    expect(screen.getByRole("button", { name: /message/i })).toBeInTheDocument();
  });

  it("does not show Message button when onOpenDm is omitted", () => {
    render(<UserPopover user={user} anchorRect={mockRect} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /message/i })).not.toBeInTheDocument();
  });

  it("calls onOpenDm and onClose when Message button clicked", () => {
    const onOpenDm = vi.fn();
    const onClose = vi.fn();
    render(<UserPopover user={user} anchorRect={mockRect} onClose={onClose} onOpenDm={onOpenDm} />);
    fireEvent.click(screen.getByRole("button", { name: /message/i }));
    expect(onOpenDm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to username when display_name is empty", () => {
    const noDisplay: User = { ...user, display_name: "" };
    render(<UserPopover user={noDisplay} anchorRect={mockRect} onClose={vi.fn()} />);
    expect(screen.getByText("jake")).toBeInTheDocument();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<UserPopover user={user} anchorRect={mockRect} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
