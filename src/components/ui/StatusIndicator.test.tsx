import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StatusIndicator } from "./StatusIndicator";
import type { UserStatus } from "../../types";

const statuses: UserStatus[] = ["online", "idle", "dnd", "offline"];

describe("StatusIndicator", () => {
  it.each(statuses)("renders a visible dot for status '%s'", (status) => {
    const { container } = render(<StatusIndicator status={status} />);
    const dot = container.firstChild as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot.tagName).toBe("SPAN");
  });

  it("applies the correct color class for online", () => {
    const { container } = render(<StatusIndicator status="online" />);
    expect(container.firstChild).toHaveClass("bg-status-online");
  });

  it("applies the correct color class for idle", () => {
    const { container } = render(<StatusIndicator status="idle" />);
    expect(container.firstChild).toHaveClass("bg-status-idle");
  });

  it("applies the correct color class for dnd", () => {
    const { container } = render(<StatusIndicator status="dnd" />);
    expect(container.firstChild).toHaveClass("bg-status-dnd");
  });

  it("applies the correct color class for offline", () => {
    const { container } = render(<StatusIndicator status="offline" />);
    expect(container.firstChild).toHaveClass("bg-status-offline");
  });

  it("applies the requested size as inline style", () => {
    const { container } = render(<StatusIndicator status="online" size={14} />);
    expect(container.firstChild).toHaveStyle({ width: "14px", height: "14px" });
  });

  it("defaults to 10px size", () => {
    const { container } = render(<StatusIndicator status="online" />);
    expect(container.firstChild).toHaveStyle({ width: "10px", height: "10px" });
  });
});
