import { renderHook, act } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { useAppStore } from "../stores/appStore";

const mockUser = {
  id: "user-1",
  username: "jake",
  display_name: "Jake",
  avatar_url: null,
  status: "online",
  created_at: "2025-01-01T00:00:00Z",
};

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}));

beforeEach(() => {
  useAppStore.setState({ currentUser: null });
  vi.clearAllMocks();
});

describe("useAuth", () => {
  it("returns null currentUser when no session", async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.currentUser).toBeNull();
  });

  it("fetches and sets user when session exists on mount", async () => {
    const { supabase } = await import("../lib/supabase");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: { user: { id: "user-1" } } },
    } as any);
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({ data: mockUser }),
    } as any);

    renderHook(() => useAuth());
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(useAppStore.getState().currentUser?.id).toBe("user-1");
  });

  it("signIn calls signInWithPassword with correct args", async () => {
    const { supabase } = await import("../lib/supabase");
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({ data: {}, error: null } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("test@example.com", "password123"); });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("signIn returns error on failure", async () => {
    const { supabase } = await import("../lib/supabase");
    const mockError = { message: "Invalid credentials" };
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({ data: {}, error: mockError } as any);

    const { result } = renderHook(() => useAuth());
    let error: any;
    await act(async () => { error = await result.current.signIn("bad@example.com", "wrong"); });
    expect(error).toEqual(mockError);
  });

  it("signUp calls signUp with correct args including username", async () => {
    const { supabase } = await import("../lib/supabase");
    vi.mocked(supabase.auth.signUp).mockResolvedValueOnce({ data: {}, error: null } as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@example.com", "pass", "newuser"); });
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "pass",
      options: { data: { username: "newuser", display_name: "newuser" } },
    });
  });

  it("signOut calls supabase signOut", async () => {
    const { supabase } = await import("../lib/supabase");
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({} as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signOut(); });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
