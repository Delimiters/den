/**
 * MSW-based tests for useVoiceChannel — exercises the real Supabase client
 * at the HTTP level instead of mocking the module.
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

describe("useVoiceChannel (MSW)", () => {
  it("leave fires DELETE to voice_sessions before clearing store", async () => {
    seedVoiceState();

    const deleteCalls: string[] = [];
    server.use(
      http.delete(`${SUPABASE}/rest/v1/voice_sessions`, ({ request }) => {
        deleteCalls.push(request.url);
        return HttpResponse.json({});
      })
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));
    expect(result.current.isConnected).toBe(true);

    act(() => { result.current.leave(); });
    await act(async () => {});

    expect(deleteCalls).toHaveLength(1);
    expect(deleteCalls[0]).toContain("voice_sessions");
    expect(result.current.isConnected).toBe(false);
  });

  it("leave is idempotent — second call does not fire another DELETE", async () => {
    seedVoiceState();

    const deleteCalls: string[] = [];
    server.use(
      http.delete(`${SUPABASE}/rest/v1/voice_sessions`, ({ request }) => {
        deleteCalls.push(request.url);
        return HttpResponse.json({});
      })
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    act(() => { result.current.leave(); });
    act(() => { result.current.leave(); }); // simulates onDisconnected double-fire

    await act(async () => {});

    expect(deleteCalls).toHaveLength(1);
  });

  it("join fires POST to voice_sessions on successful token fetch", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-token" } as any },
      error: null,
    });

    server.use(
      http.post(LIVEKIT_TOKEN_URL, () =>
        HttpResponse.json({ token: "lk-jwt", url: "wss://test.livekit.cloud" })
      )
    );

    const upsertBodies: unknown[] = [];
    server.use(
      http.post(`${SUPABASE}/rest/v1/voice_sessions`, async ({ request }) => {
        upsertBodies.push(await request.json());
        return HttpResponse.json({});
      })
    );

    const { result } = renderHook(() => useVoiceChannel("user-1"));

    await act(async () => {
      await result.current.join("ch-1", "guild-1");
    });

    expect(upsertBodies).toHaveLength(1);
    expect(upsertBodies[0]).toMatchObject({
      user_id: "user-1",
      channel_id: "ch-1",
      guild_id: "guild-1",
    });
    expect(result.current.isConnected).toBe(true);
  });
});
