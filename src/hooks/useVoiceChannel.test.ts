import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useVoiceChannel } from "./useVoiceChannel";
import { useAppStore } from "../stores/appStore";
import { server } from "../test/msw/server";

const LIVEKIT_TOKEN_URL = "http://localhost:54321/functions/v1/livekit-token";

// Mock supabase module — keeps auth + DB calls simple in this suite
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

beforeEach(() => {
  useAppStore.setState({
    voiceChannelId: null,
    voiceToken: null,
    voiceLivekitUrl: null,
  } as any);
});

describe("useVoiceChannel", () => {
  it("join sets voice state after successful token fetch", async () => {
    server.use(
      http.post(LIVEKIT_TOKEN_URL, () =>
        HttpResponse.json({ token: "lk-jwt", url: "wss://test.livekit.cloud" })
      )
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    const { voiceChannelId, voiceToken, voiceLivekitUrl } = useAppStore.getState() as any;
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
  });

  it("join does nothing when token fetch fails", async () => {
    server.use(
      http.post(LIVEKIT_TOKEN_URL, () =>
        HttpResponse.json({ error: "Forbidden" }, { status: 403 })
      )
    );

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
    } as any);

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    act(() => { result.current.leave(); });
    await act(async () => {});

    const state = useAppStore.getState() as any;
    expect(state.voiceChannelId).toBeNull();
    expect(state.voiceToken).toBeNull();
    expect(state.voiceLivekitUrl).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("isConnected reflects voiceChannelId in store", () => {
    useAppStore.setState({ voiceChannelId: "ch-2", voiceToken: "t", voiceLivekitUrl: "wss://x" } as any);
    const { result } = renderHook(() => useVoiceChannel("user-1"));
    expect(result.current.isConnected).toBe(true);
    expect(result.current.voiceChannelId).toBe("ch-2");
  });
});
