import { useCallback, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAppStore } from "../stores/appStore";
import type { User } from "../types";

type SignalEvent =
  | { type: "call:invite"; dmChannelId: string; callerId: string; callerName: string; callerAvatar: string | null }
  | { type: "call:accept"; dmChannelId: string }
  | { type: "call:decline"; dmChannelId: string }
  | { type: "call:end"; dmChannelId: string };

async function fetchDmToken(dmChannelId: string): Promise<{ dmChannelId: string; token: string; url: string; e2eeKey: string | null } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
      body: JSON.stringify({ dmChannelId }),
    }
  );
  if (!res.ok) return null;
  const { token, url, e2eeKey } = await res.json();
  return { dmChannelId, token, url, e2eeKey: e2eeKey ?? null };
}

function signalTo(recipientId: string, event: SignalEvent) {
  const ch = supabase.channel(`call-lobby:${recipientId}`);
  ch.send({ type: "broadcast", event: event.type, payload: event }).then(() => {
    supabase.removeChannel(ch);
  });
}

export function useDmCallSignaling(currentUser: User) {
  const { setIncomingCall, setActiveDmCall, clearActiveDmCall, incomingCall } = useAppStore();
  const callerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`call-lobby:${currentUser.id}`)
      .on("broadcast", { event: "call:invite" }, ({ payload }: { payload: SignalEvent }) => {
        if (payload.type !== "call:invite") return;
        callerIdRef.current = payload.callerId;
        setIncomingCall({
          dmChannelId: payload.dmChannelId,
          callerId: payload.callerId,
          callerName: payload.callerName,
          callerAvatar: payload.callerAvatar,
        });
      })
      .on("broadcast", { event: "call:accept" }, async ({ payload }: { payload: SignalEvent }) => {
        if (payload.type !== "call:accept") return;
        const tokenData = await fetchDmToken(payload.dmChannelId);
        if (tokenData) setActiveDmCall(tokenData);
      })
      .on("broadcast", { event: "call:decline" }, () => {
        clearActiveDmCall();
        setIncomingCall(null);
      })
      .on("broadcast", { event: "call:end" }, () => {
        clearActiveDmCall();
        setIncomingCall(null);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id]);

  const startCall = useCallback(async (dmChannelId: string, recipientId: string) => {
    callerIdRef.current = recipientId;
    const tokenData = await fetchDmToken(dmChannelId);
    if (!tokenData) return;
    setActiveDmCall(tokenData);
    signalTo(recipientId, {
      type: "call:invite",
      dmChannelId,
      callerId: currentUser.id,
      callerName: currentUser.display_name || currentUser.username,
      callerAvatar: currentUser.avatar_url,
    });
  }, [currentUser]);

  const acceptCall = useCallback(async () => {
    const call = useAppStore.getState().incomingCall;
    if (!call) return;
    const tokenData = await fetchDmToken(call.dmChannelId);
    if (!tokenData) return;
    setActiveDmCall(tokenData);
    setIncomingCall(null);
    signalTo(call.callerId, { type: "call:accept", dmChannelId: call.dmChannelId });
  }, []);

  const declineCall = useCallback(() => {
    const call = useAppStore.getState().incomingCall;
    if (!call) return;
    setIncomingCall(null);
    signalTo(call.callerId, { type: "call:decline", dmChannelId: call.dmChannelId });
  }, []);

  const endCall = useCallback((dmChannelId: string, otherUserId: string) => {
    clearActiveDmCall();
    signalTo(otherUserId, { type: "call:end", dmChannelId });
  }, []);

  return { startCall, acceptCall, declineCall, endCall, incomingCall };
}
