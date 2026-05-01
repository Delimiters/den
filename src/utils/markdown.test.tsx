import { render, screen } from "@testing-library/react";
import { MessageContent } from "./markdown";

describe("MessageContent", () => {
  it("renders plain text unchanged", () => {
    render(<MessageContent content="hello world" />);
    expect(screen.getByText(/hello world/)).toBeInTheDocument();
  });

  it("renders **bold** as strong element", () => {
    render(<MessageContent content="this is **bold** text" />);
    const el = screen.getByText("bold");
    expect(el.tagName).toBe("STRONG");
  });

  it("renders *italic* as em element", () => {
    render(<MessageContent content="this is *italic* text" />);
    const el = screen.getByText("italic");
    expect(el.tagName).toBe("EM");
  });

  it("renders `code` as code element", () => {
    render(<MessageContent content="use `console.log` here" />);
    const el = screen.getByText("console.log");
    expect(el.tagName).toBe("CODE");
  });

  it("renders https:// links as anchor elements", () => {
    render(<MessageContent content="check https://example.com out" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com");
  });

  it("does not render javascript: as a link", () => {
    render(<MessageContent content="javascript:alert(1)" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders ``` code blocks as pre elements", () => {
    render(<MessageContent content={"```\nconst x = 1;\n```"} />);
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });

  it("renders > blockquotes", () => {
    render(<MessageContent content="> quoted text" />);
    const el = screen.getByText("quoted text").closest("blockquote");
    expect(el).toBeInTheDocument();
  });

  it("renders combined formatting in one message", () => {
    render(<MessageContent content="**bold** and *italic* and `code`" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("code").tagName).toBe("CODE");
  });

  it("renders ~~strikethrough~~ as s element", () => {
    render(<MessageContent content="this is ~~deleted~~ text" />);
    const el = screen.getByText("deleted");
    expect(el.tagName).toBe("S");
  });

  it("renders @mention with highlight styling", () => {
    render(<MessageContent content="hey @jake check this out" />);
    const mention = screen.getByText("@jake");
    expect(mention).toBeInTheDocument();
    expect(mention.className).toContain("text-accent");
  });

  it("renders # heading as a div with bold text", () => {
    render(<MessageContent content="# Big Title" />);
    const el = screen.getByText("Big Title").closest("div");
    expect(el?.className).toContain("font-bold");
  });

  it("renders ## and ### headings", () => {
    render(<MessageContent content={"## Section\n### Sub"} />);
    expect(screen.getByText("Section").closest("div")?.className).toContain("font-semibold");
    expect(screen.getByText("Sub").closest("div")?.className).toContain("font-semibold");
  });

  it("renders - list items as a ul", () => {
    render(<MessageContent content={"- first\n- second\n- third"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe("first");
  });

  it("renders * list items as a ul", () => {
    render(<MessageContent content={"* apple\n* banana"} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });

  it("stops list on non-list line", () => {
    render(<MessageContent content={"- item\nnot a list"} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/not a list/)).toBeInTheDocument();
  });
});
