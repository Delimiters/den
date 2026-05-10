import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageSearch } from "./MessageSearch";

vi.mock("../../lib/supabase", () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [] }),
  };
  return { supabase: { from: vi.fn(() => chain) } };
});

import { supabase } from "../../lib/supabase";

const channelId = "ch-1";

function resetChain(data: unknown[] = []) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
  };
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
}

describe("MessageSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChain();
  });

  it("renders the search input", () => {
    render(<MessageSearch channelId={channelId} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText("Search messages…")).toBeInTheDocument();
  });

  it("shows hint for short queries", () => {
    render(<MessageSearch channelId={channelId} onClose={vi.fn()} />);
    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
  });

  it("shows 'No results' when search returns empty", async () => {
    render(<MessageSearch channelId={channelId} onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Search messages…"), "xyz");
    await waitFor(() => expect(screen.getByText(/No results for/)).toBeInTheDocument(), { timeout: 2000 });
  });

  it("displays results returned by Supabase", async () => {
    resetChain([
      {
        id: "m1",
        channel_id: channelId,
        author_id: "u1",
        content: "hello world",
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        author: { id: "u1", username: "alice", display_name: "Alice", avatar_url: null },
      },
    ]);

    render(<MessageSearch channelId={channelId} onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText("Search messages…"), "hello");
    await waitFor(() => expect(screen.getByText("Alice")).toBeInTheDocument(), { timeout: 2000 });
    // Content is rendered in the same row; verify via body text
    expect(document.body.textContent).toContain("hello world");
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(<MessageSearch channelId={channelId} onClose={onClose} />);
    await userEvent.type(screen.getByPlaceholderText("Search messages…"), "{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the Esc button is clicked", async () => {
    const onClose = vi.fn();
    render(<MessageSearch channelId={channelId} onClose={onClose} />);
    await userEvent.click(screen.getByText("Esc"));
    expect(onClose).toHaveBeenCalled();
  });
});
