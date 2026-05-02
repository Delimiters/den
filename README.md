# Den

**Open-source, privacy-focused voice and text chat for communities.**

Den is a self-hostable chat platform built for gaming groups and online communities. It gives you real-time text messaging, voice channels with screen sharing, direct messages, and server organization — with full control over your data and no vendor lock-in.

- **Open source** — audit the code, fork it, run your own instance
- **Privacy first** — voice traffic relayed through your own server so participant IPs stay private; no biometric data, no behavioral tracking
- **Self-hostable** — entire stack runs on free-tier services for small communities; each service has a clear paid upgrade path
- **Desktop native** — built with Tauri 2.0 for a lean native app (~5 MB bundle); same codebase targets iOS and Android via Tauri 2

---

## Features

- **Servers & channels** — organize your community into servers with multiple text channels
- **Real-time messaging** — instant delivery via Supabase Realtime (WebSocket-backed PostgreSQL subscriptions)
- **Voice channels** — group voice with mute, deafen, and screen sharing via LiveKit WebRTC
- **Direct messages** — private one-on-one conversations with file attachments
- **File attachments** — images and files in chat, stored on Cloudflare R2 with zero egress cost
- **Message reactions** — emoji reactions on any message
- **Reply threads** — quote-reply to any message with context preview
- **Pinned messages** — pin important messages per channel
- **User presence** — online / idle / do not disturb / offline status
- **Roles & permissions** — bitfield permission system per server
- **Invite links** — shareable invite codes with optional expiry and use limits
- **Quick switcher** — `Ctrl+K` to jump between channels and DMs instantly
- **Desktop notifications** — native OS notifications for mentions and DMs when the window is unfocused
- **Server settings** — guild icon upload, name editing, role management

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Desktop | Tauri 2.0 + React 18 + TypeScript | 25× lighter than Electron; same codebase targets iOS/Android |
| UI | TailwindCSS v4 | CSS-native `@theme` tokens, no config file |
| State | Zustand | Flat store, minimal boilerplate |
| Backend | Supabase | DB + Auth + Realtime + Storage in one free-tier platform |
| Voice/Video | LiveKit Cloud (self-hostable SFU) | Open-source WebRTC; swap cloud → self-hosted with zero code changes |
| File storage | Cloudflare R2 | 10 GB/month free, zero egress fees |
| Build | Vite 7 | Fast HMR, Tauri-native |
| Tests | Vitest + React Testing Library | Vite-native, 130+ tests |

---

## Self-hosting cost (small community)

| Service | Purpose | Free tier |
|---|---|---|
| [Supabase](https://supabase.com) | Database, Auth, Realtime, Storage, Edge Functions | 500 MB DB, 50 K MAU |
| [LiveKit Cloud](https://livekit.io) | Voice / video / screen share | 10 K participant-minutes/month |
| [Cloudflare R2](https://developers.cloudflare.com/r2/) | File attachments CDN | 10 GB storage, zero egress |
| Tauri desktop app | Client | Self-distributed |
| **Total** | | **$0/month** |

Scale path: Supabase Pro ($25/mo) when hitting free limits. LiveKit can be self-hosted on a ~$4/mo VPS at any time with no code changes.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (for Tauri desktop builds)
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [LiveKit Cloud](https://cloud.livekit.io) project (free tier) — required for voice channels
- A [Cloudflare R2](https://dash.cloudflare.com) bucket — required for file attachments

### 1. Clone and install

```bash
git clone https://github.com/Delimiters/den.git
cd den
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Open the SQL Editor and run the migrations in order:

```
supabase/migrations/001_initial_schema.sql
supabase/fixes/001_fix_guild_members_rls.sql
supabase/fixes/002_reactions.sql
supabase/fixes/003_invite_links.sql
supabase/fixes/004_avatar_storage.sql
supabase/fixes/005_roles_permissions.sql
supabase/fixes/006_dm_tables.sql
supabase/fixes/007_attachments_storage.sql
supabase/fixes/008_dm_attachments.sql
supabase/fixes/009_custom_emojis.sql
supabase/fixes/010_voice_sessions.sql
supabase/fixes/011_guild_invites_rls.sql
supabase/fixes/012_message_replies.sql
supabase/fixes/013_pinned_messages.sql
```

3. In **Storage**, create a public bucket named `avatars`
4. In **Authentication → URL Configuration**, add `http://localhost:1420` to Allowed Redirect URLs

### 3. Configure environment

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Your Supabase URL and anon key are in **Project Settings → API**. The anon key is safe to expose to the client — Row Level Security enforces access at the database layer.

### 4. Deploy Edge Functions (voice + file uploads)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
```

Set required secrets:

```bash
# LiveKit (from cloud.livekit.io → your project)
supabase secrets set LIVEKIT_API_KEY=your-key
supabase secrets set LIVEKIT_API_SECRET=your-secret
supabase secrets set LIVEKIT_URL=wss://your-project.livekit.cloud

# Cloudflare R2 (from Cloudflare dashboard → R2 → Manage API tokens)
supabase secrets set R2_ACCESS_KEY_ID=your-key-id
supabase secrets set R2_SECRET_ACCESS_KEY=your-secret
supabase secrets set R2_BUCKET_NAME=your-bucket-name
supabase secrets set R2_ACCOUNT_ID=your-account-id
supabase secrets set R2_PUBLIC_URL=https://your-r2-public-url
```

Deploy:

```bash
supabase functions deploy upload-url --no-verify-jwt
supabase functions deploy livekit-token --no-verify-jwt
```

### 5. Run

**Browser preview (no Rust needed):**
```bash
npm run dev
# Open http://localhost:1420
```

**Full Tauri desktop app:**
```bash
. "$HOME/.cargo/env"
npm run tauri dev
```

---

## Development

```bash
npm run dev           # Vite dev server at http://localhost:1420
npm run tauri dev     # Full desktop app with hot reload
npm run build         # TypeScript check + Vite production build
npm test              # Vitest in watch mode
npm run test:once     # Single test run
npm run test:coverage # Coverage report (60% threshold enforced)
```

---

## Project structure

```
src/
├── components/
│   ├── auth/         # Sign in / sign up
│   ├── chat/         # Message, MessageList, MessageInput, EmojiPicker
│   ├── layout/       # AppLayout, GuildSidebar, ChannelSidebar, MemberList, DmSidebar
│   └── ui/           # Avatar, StatusIndicator, QuickSwitcher
├── hooks/
│   ├── useAuth.ts              # Session management
│   ├── usePresence.ts          # Online/offline presence tracking
│   ├── useRealtimeMessages.ts  # Message subscription + send
│   ├── useDirectMessages.ts    # DM subscription + send
│   └── useVoiceChannel.ts      # LiveKit join/leave
├── lib/supabase.ts             # Supabase client singleton
├── stores/appStore.ts          # Zustand global store
├── types/index.ts              # Shared TypeScript interfaces
└── utils/
    ├── message.ts              # formatTimestamp, shouldCompact, date helpers
    ├── upload.ts               # R2 pre-signed upload helper
    └── desktopNotification.ts  # Web Notifications API wrapper

supabase/
├── migrations/                 # Initial schema
├── fixes/                      # Incremental migrations (apply in order)
└── functions/
    ├── upload-url/             # Generates R2 pre-signed upload URLs
    └── livekit-token/          # Generates LiveKit room tokens
```

---

## CI/CD

GitHub Actions automatically deploys Supabase Edge Functions on push to `main`.

Required repository secrets (Settings → Secrets and variables → Actions → **Repository secrets**):

| Secret | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | From supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_REF` | Your project reference ID |

---

## Roadmap

- [x] Servers, channels, real-time text messaging
- [x] User presence (online / idle / DND / offline)
- [x] Direct messages
- [x] File attachments (images + files)
- [x] Emoji reactions
- [x] Message replies with context preview
- [x] Pinned messages
- [x] Roles and permissions
- [x] Voice channels with screen sharing (LiveKit)
- [x] Desktop notifications
- [x] Quick channel switcher (Ctrl+K)
- [x] @mentions and mention highlighting
- [x] Message search
- [x] Markdown rendering (bold, italic, strikethrough, code blocks, lists, blockquotes, headings)
- [x] Link previews / embeds
- [x] Custom per-server emojis
- [x] System tray + minimize to tray
- [ ] Auto-update (Tauri updater)
- [ ] Mobile (iOS / Android via Tauri 2.0)
- [ ] Web client (browser, no desktop app required)

---

## License

MIT — see [LICENSE](LICENSE)
