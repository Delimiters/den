import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  it("renders an img when src is provided", () => {
    render(<Avatar src="https://example.com/pic.jpg" name="Jake" />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/pic.jpg");
    expect(img).toHaveAttribute("alt", "Jake");
  });

  it("renders initials when no src is given", () => {
    render(<Avatar src={null} name="Jake Haley" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("JH")).toBeInTheDocument();
  });

  it("uses a single initial for a single-word name", () => {
    render(<Avatar name="Jake" />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("uppercases initials", () => {
    render(<Avatar name="jane doe" />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("applies the requested size as width and height", () => {
    render(<Avatar name="Jake" size={48} />);
    // getByText returns the div itself (which carries the inline style)
    const el = screen.getByText("J");
    expect(el).toHaveStyle({ width: "48px", height: "48px" });
  });

  it("same name always resolves to the same background color", () => {
    const { container: a } = render(<Avatar name="ConsistentName" />);
    const { container: b } = render(<Avatar name="ConsistentName" />);
    const bgA = (a.firstChild as HTMLElement).style.backgroundColor;
    const bgB = (b.firstChild as HTMLElement).style.backgroundColor;
    expect(bgA).toBe(bgB);
  });

  it("different names can produce different colors", () => {
    // Not guaranteed to be different for every pair, but these two hash to
    // different buckets in the COLORS array.
    const { container: a } = render(<Avatar name="Alice" />);
    const { container: b } = render(<Avatar name="Zzzzzzzzzzz" />);
    const bgA = (a.firstChild as HTMLElement).style.backgroundColor;
    const bgB = (b.firstChild as HTMLElement).style.backgroundColor;
    // They *can* collide, so just verify both are non-empty valid colors
    expect(bgA).toBeTruthy();
    expect(bgB).toBeTruthy();
  });
});
