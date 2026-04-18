import { renderHook, act } from "@testing-library/react";
import { useVoiceChannel } from "./useVoiceChannel";
import { useAppStore } from "../stores/appStore";

// Mock supabase
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token" } },
      }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  useAppStore.setState({
    voiceChannelId: null,
    voiceToken: null,
    voiceLivekitUrl: null,
  });
  mockFetch.mockReset();
});

describe("useVoiceChannel", () => {
  it("join sets voice state after successful token fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "lk-jwt", url: "wss://test.livekit.cloud" }),
    });

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    const { voiceChannelId, voiceToken, voiceLivekitUrl } = useAppStore.getState();
    expect(voiceChannelId).toBe("ch-1");
    expect(voiceToken).toBe("lk-jwt");
    expect(voiceLivekitUrl).toBe("wss://test.livekit.cloud");
    expect(result.current.isConnected).toBe(true);
  });

  it("join does nothing when session is missing", async () => {
    const { supabase } = await import("../lib/supabase");
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(useAppStore.getState().voiceChannelId).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("join does nothing when token fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => "Forbidden",
    });

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(useAppStore.getState().voiceChannelId).toBeNull();
  });

  it("leave clears voice state", async () => {
    useAppStore.setState({
      voiceChannelId: "ch-1",
      voiceToken: "lk-jwt",
      voiceLivekitUrl: "wss://test.livekit.cloud",
    });

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.leave();
    });

    const { voiceChannelId, voiceToken, voiceLivekitUrl } = useAppStore.getState();
    expect(voiceChannelId).toBeNull();
    expect(voiceToken).toBeNull();
    expect(voiceLivekitUrl).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("isConnected reflects voiceChannelId in store", () => {
    useAppStore.setState({ voiceChannelId: "ch-2", voiceToken: "t", voiceLivekitUrl: "wss://x" });
    const { result } = renderHook(() => useVoiceChannel("user-1"));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.voiceChannelId).toBe("ch-2");
  });
});
