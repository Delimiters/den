/**
 * Tests for useVoiceChannel — verifies join/leave behavior
 * against a mocked LiveKit token endpoint.
 */
import { renderHook, act } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { supabase } from "../lib/supabase";
import { useVoiceChannel } from "./useVoiceChannel";
import { useAppStore } from "../stores/appStore";
import { server } from "../test/msw/server";

const SUPABASE = "http://localhost:54321";
const LIVEKIT_TOKEN_URL = `${SUPABASE}/functions/v1/livekit-token`;

function seedVoiceState() {
  useAppStore.setState({
    voiceChannelId: "ch-1",
    voiceToken: "lk-jwt",
    voiceLivekitUrl: "wss://test.livekit.cloud",
  } as any);
}

beforeEach(() => {
  useAppStore.setState({
    voiceChannelId: null,
    voiceToken: null,
    voiceLivekitUrl: null,
  } as any);
  vi.restoreAllMocks();
});

describe("useVoiceChannel", () => {
  it("leave clears store when connected", async () => {
    seedVoiceState();

    const { result } = renderHook(() => useVoiceChannel("user-1"));
    expect(result.current.isConnected).toBe(true);

    act(() => { result.current.leave(); });

    expect(result.current.isConnected).toBe(false);
    expect(useAppStore.getState().voiceChannelId).toBeNull();
  });

  it("leave is idempotent — second call does nothing when not connected", () => {
    const { result } = renderHook(() => useVoiceChannel("user-1"));
    expect(result.current.isConnected).toBe(false);

    // Should not throw even when called without being connected
    act(() => { result.current.leave(); });
    act(() => { result.current.leave(); });

    expect(result.current.isConnected).toBe(false);
  });

  it("join sets store state after successful token fetch", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as any },
      error: null,
    });

    server.use(
      http.post(LIVEKIT_TOKEN_URL, () =>
        HttpResponse.json({ token: "lk-jwt", url: "wss://test.livekit.cloud" })
      )
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.voiceChannelId).toBe("ch-1");
    const state = useAppStore.getState() as any;
    expect(state.voiceToken).toBe("lk-jwt");
    expect(state.voiceLivekitUrl).toBe("wss://test.livekit.cloud");
  });

  it("join does nothing if token fetch fails", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as any },
      error: null,
    });

    server.use(
      http.post(LIVEKIT_TOKEN_URL, () => HttpResponse.json({ error: "forbidden" }, { status: 403 }))
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("join does nothing if no session", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(result.current.isConnected).toBe(false);
  });
});
