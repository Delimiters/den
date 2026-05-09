import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Friendship, User } from "../types";

export function useFriendships(currentUserId: string) {
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("friendships")
      .select("*, requester:users!requester_id(*), addressee:users!addressee_id(*)")
      .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (data) {
      const normalized = (data as any[]).map((row) => {
        const friend: User =
          row.requester_id === currentUserId ? row.addressee : row.requester;
        return {
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: row.addressee_id,
          status: row.status,
          created_at: row.created_at,
          friend,
        } as Friendship;
      });
      setFriendships(normalized);
    }
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    load();

    const ch = supabase
      .channel(`friendships:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${currentUserId}` },
        load
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${currentUserId}` },
        load
      )
      .subscribe();

    return () => { ch.unsubscribe(); };
  }, [currentUserId, load]);

  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === currentUserId
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === currentUserId
  );

  async function sendRequest(addresseeId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: currentUserId, addressee_id: addresseeId });
    if (!error) load();
    return { error: error?.message ?? null };
  }

  async function acceptRequest(friendshipId: string) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
    load();
  }

  async function declineRequest(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    load();
  }

  async function removeFriend(friendshipId: string) {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    load();
  }

  return {
    friends,
    incoming,
    outgoing,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
  };
}
