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

  // Validate the caller — use anon client with user's auth header so RLS works
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return new Response("Unauthorized", { status: 401, headers: CORS });

  const { channelId, guildId } = await req.json();
  if (!channelId || !guildId) {
    return new Response("Missing channelId or guildId", { status: 400, headers: CORS });
  }

  // Verify user is a member of the guild
  const { data: membership } = await supabase
    .from("guild_members")
    .select("user_id")
    .eq("guild_id", guildId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return new Response("Forbidden", { status: 403, headers: CORS });
  }

  // Fetch the user's display name for the participant identity label
  const { data: profile } = await supabase
    .from("users")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const roomName = `guild-${guildId}-channel-${channelId}`;
  const identity = user.id;
  const participantName = profile?.display_name || profile?.username || identity;

  // Ensure the room exists (creates it if not, no-ops if it does)
  const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  try {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // room stays open 5 min after last participant leaves
      maxParticipants: 100,
    });
  } catch {
    // Room likely already exists — that's fine
  }

  // Generate participant token
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    ttl: TOKEN_TTL_SECONDS,
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return new Response(
    JSON.stringify({ token: jwt, url: LIVEKIT_URL }),
    { headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
