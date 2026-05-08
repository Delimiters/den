import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2";
import { createClient } from "npm:@supabase/supabase-js@2";

const LIVEKIT_API_KEY    = Deno.env.get("LIVEKIT_API_KEY")!;
const LIVEKIT_API_SECRET = Deno.env.get("LIVEKIT_API_SECRET")!;
const LIVEKIT_URL        = Deno.env.get("LIVEKIT_URL")!;
const TOKEN_TTL_SECONDS  = 2 * 60 * 60; // 2 hours

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const body = await req.json();
  const { channelId, guildId, dmChannelId } = body;

  let roomName: string;

  if (dmChannelId) {
    // DM call — verify the caller is a participant in this DM channel
    const { data: participation } = await supabase
      .from("dm_participants")
      .select("user_id")
      .eq("channel_id", dmChannelId)
      .eq("user_id", user.id)
      .single();

    if (!participation) return new Response("Forbidden", { status: 403, headers: CORS });

    roomName = `dm-${dmChannelId}`;
  } else if (channelId && guildId) {
    // Guild voice channel — verify guild membership
    const { data: membership } = await supabase
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", guildId)
      .eq("user_id", user.id)
      .single();

    if (!membership) return new Response("Forbidden", { status: 403, headers: CORS });

    roomName = `guild-${guildId}-channel-${channelId}`;
  } else {
    return new Response("Missing channelId+guildId or dmChannelId", { status: 400, headers: CORS });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const identity = user.id;
  const participantName = profile?.display_name || profile?.username || identity;

  const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: dmChannelId ? 2 : 100,
    });
  } catch {
    // Room already exists
  }

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    ttl: TOKEN_TTL_SECONDS,
  });

  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  const jwt = await token.toJwt();

  // Per-room E2EE key: HMAC-SHA256(secret, roomName)
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LIVEKIT_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const keyBytes = await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(roomName));
  const e2eeKey = btoa(String.fromCharCode(...new Uint8Array(keyBytes)));

  return new Response(
    JSON.stringify({ token: jwt, url: LIVEKIT_URL, e2eeKey }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
