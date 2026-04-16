# Security

## Security Model

Den is designed with privacy and security as first-class concerns.

### Data Access (Row Level Security)

All database tables have Row Level Security (RLS) enforced at the Supabase/PostgreSQL layer — not just in the client. This means:

- Users can only read messages in channels they are members of
- Users can only edit or soft-delete their own messages
- Users cannot modify timestamps, move messages between channels, or change authorship
- Guild settings can only be modified by the guild owner
- Channels can only be updated/deleted by the guild owner
- Reactions can only be added/removed by the reacting user
- Invite codes are validated server-side including expiry and use limits

The anon key exposed in the client is safe to share — it cannot bypass RLS.

### Client Security

- **Content Security Policy** is enabled on the desktop app, restricting connections to `*.supabase.co` only. No third-party scripts, no external frames.
- **No local RPC server** is exposed. Other processes on the machine cannot connect to Den or read your messages.
- **No telemetry** is collected. The app makes no network requests outside of your own Supabase project.
- The Tauri IPC bridge only exposes the minimal default capability set — no file system access, no shell execution.

### Voice/Video (Phase 3)

Voice and video will use a server-relay architecture (LiveKit SFU) rather than peer-to-peer. This means:
- Your IP address is never exposed to other participants
- All media is routed through the relay server
- Mute/unmute is enforced server-side (cannot be spoofed by a modified client)

### What We Store

- Email address and hashed password (managed by Supabase Auth)
- Username and display name
- Messages you send (soft-deleted messages are retained in the DB until a hard-delete job runs)
- Avatar images uploaded to Supabase Storage
- Presence status (online/offline) with last-seen timestamp

We do not collect: device info, IP addresses, analytics events, or any data beyond what is functionally necessary.

## Responsible Disclosure

If you find a security vulnerability, please open a private GitHub issue or email the maintainer directly. Do not post vulnerabilities publicly until they have been addressed.

## Known Limitations

- No rate limiting on API calls (planned: Supabase Edge Function middleware)
- File upload MIME type is validated client-side only (server-side enforcement planned)
- No end-to-end encryption — messages are stored in plaintext in the Supabase database. The server (your Supabase project) can read message content. E2EE is a potential future feature.
