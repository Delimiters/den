# Den — CLAUDE.md

Den is a privacy-focused Discord alternative for gaming friend groups. Discord clone layout and features. Desktop app first (Windows), built for eventual mobile.

## Why this exists

Discord's push toward biometric data collection (face scans) and its closed-source nature prompted this. The goal is community ownership: users run their own servers, the code is auditable, and there's no vendor lock-in.

Core values:
- **Privacy by default** — open source so users can audit; client-server voice relay so IPs stay private between participants
- **Shameless clone first** — get the Discord experience right before diverging; don't invent new UX while the foundation is unfinished
- **Free to start, designed to scale** — entire stack runs on free tiers for a small friend group; each service has a clear paid upgrade path
- **No lock-in** — Supabase is self-hostable; LiveKit Cloud can be swapped for a self-hosted SFU with zero code changes

The initial audience is a Windows gaming friend group. Mobile (iOS/Android) is planned and Tauri 2.0 already supports it with the same React codebase.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Desktop | Tauri 2.0 + React + TypeScript | 25x lighter than Electron; same codebase targets iOS/Android in Tauri 2 |
| UI | TailwindCSS v4 + Shadcn/ui (planned) | v4 uses CSS-native `@theme`, no config file |
| State | Zustand | Lightweight; store shape is flat, not nested |
| Server state | TanStack Query (installed, not yet wired) | For data fetching with caching |
| Backend | Supabase | Handles DB, Auth, Realtime, Storage all in one free tier |
| Voice/Video | LiveKit (planned Phase 3) | Open-source WebRTC SFU; same client code for cloud and self-hosted |
| Build | Vite 7 | Frontend only; Tauri CLI wraps it |
| Tests | Vitest + React Testing Library | Vite-native, globals enabled |

## Commands

```bash
npm run dev          # Vite dev server (browser preview, port 1420)
npm run tauri dev    # Full Tauri desktop app with hot reload (needs Rust in PATH)
npm run build        # tsc check + Vite production build
npm test             # Vitest in watch mode
npm run test:once    # Vitest single run (use in CI / before committing)
npm run test:coverage # Coverage report (threshold: 60%)
```

Rust must be sourced before Tauri commands: `. "$HOME/.cargo/env"`

## Project layout

```
src/
├── components/
│   ├── auth/         # AuthPage (login + register form)
│   ├── chat/         # Message, MessageInput, MessageList
│   ├── layout/       # AppLayout, GuildSidebar, ChannelSidebar, MemberList
│   └── ui/           # Avatar, StatusIndicator (pure presentational)
├── hooks/
│   ├── useAuth.ts           # Session management, sign-in/up/out
│   ├── usePresence.ts       # Supabase Presence tracking (online/offline)
│   └── useRealtimeMessages.ts  # Message load + realtime subscription
├── lib/
│   └── supabase.ts   # Single Supabase client instance
├── stores/
│   └── appStore.ts   # Zustand global store (see Store section below)
├── types/
│   └── index.ts      # All shared TypeScript interfaces
├── utils/
│   └── message.ts    # Pure functions: formatTimestamp, shouldCompact
└── test/
    └── setup.ts      # jest-dom import + afterEach cleanup
```

## Environment

Requires a `.env.local` file (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never commit `.env.local`. The anon key is safe to expose to the client — Supabase Row Level Security enforces access at the DB layer.

## Database

Full schema in `supabase/migrations/001_initial_schema.sql`. Run it in the Supabase SQL Editor to set up the project.

Key tables: `users`, `guilds`, `channels`, `messages`, `guild_members`, `user_presence`

Important DB behaviors:
- `on_auth_user_created` trigger auto-creates a `users` row on signup
- `on_guild_created` trigger auto-adds the owner as a member and creates a `#general` channel
- `join_guild_by_invite(invite text)` RPC — call via `supabase.rpc()`, returns the `guild_id`
- RLS is enabled on all tables — queries silently return empty if the user lacks access

Supabase query pattern:
```typescript
const { data, error } = await supabase
  .from("messages")
  .select("*, author:users(*)")
  .eq("channel_id", channelId)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(50);
```

## Store (Zustand)

`useAppStore` in `src/stores/appStore.ts`. Shape:

```
currentUser       User | null
currentGuildId    string | null
currentChannelId  string | null
guilds            Guild[]
channels          Channel[]       — channels for the currently selected guild
messages          Message[]       — NEWEST FIRST (index 0 = most recent)
members           GuildMember[]
```

**Critical: messages are newest-first.** `appendMessage` pushes to the front. `prependMessages` pushes to the back (for pagination loading older history). Components call `.reverse()` before rendering to display oldest-at-top.

Side effects on navigation:
- `setCurrentGuild` clears `currentChannelId`, `channels`, `messages`, `members`
- `setCurrentChannel` clears `messages`

In tests, always reset the store in `beforeEach`:
```typescript
beforeEach(() => {
  useAppStore.setState({
    currentUser: null, currentGuildId: null, currentChannelId: null,
    guilds: [], channels: [], messages: [], members: [],
  });
});
```

## Realtime

Text messages use Supabase `postgres_changes` subscriptions:
```typescript
supabase.channel(`messages:${channelId}`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
      filter: `channel_id=eq.${channelId}` }, handler)
  .subscribe()
```

Presence uses Supabase's built-in Presence feature (`channel.track()`). The `user_presence` table is also written to for persistence (last_seen).

Realtime is enabled for: `messages`, `user_presence`, `guild_members`.

## Testing conventions

- **Co-locate tests**: `Foo.test.tsx` lives next to `Foo.tsx`
- **Mock at the hook level**, not the Supabase client. Components are tested against mocked hooks:
  ```typescript
  vi.mock("../../hooks/useAuth", () => ({
    useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn(), ... }),
  }));
  ```
- **Store tests**: use `useAppStore.getState()` and `useAppStore.setState()` directly — no rendering needed
- **Pure functions**: extract any logic that doesn't touch React or Supabase into `src/utils/` and test it standalone
- **Use `userEvent` over `fireEvent`** — it fires all intermediate browser events (focus, input, etc.)
- **Reset mocks in `beforeEach`**: `mockFn.mockReset()` then re-configure the default return value
- Vitest globals (`describe`, `it`, `expect`, `vi`) are enabled — no imports needed
- `vi.useFakeTimers()` / `vi.setSystemTime()` for anything time-dependent; always `vi.useRealTimers()` in `afterEach`

Coverage threshold is 60% (enforced). Aim to keep it climbing, not falling.

## CSS / theming

Tailwind v4 — no `tailwind.config.js`. Custom tokens defined in `src/index.css` under `@theme`:

```css
@theme {
  --color-guild-rail: #1e1f22;   /* leftmost column */
  --color-sidebar: #2b2d31;      /* channel list + member list */
  --color-main: #313338;         /* message area */
  --color-input-bg: #383a40;
  --color-overlay: #232428;      /* modals */
  --color-accent: #5865f2;       /* primary action color */
  --color-status-online: #23a559;
  /* ... */
}
```

Use these via utility classes: `bg-sidebar`, `text-accent`, `bg-status-online`, etc.
Do not hardcode hex colors in component className strings.

## Key conventions

- TypeScript strict mode is on. No `any` unless absolutely unavoidable with a comment explaining why.
- `||` for display name fallbacks (empty string should fall through), `??` only when `null`/`undefined` is the specific concern.
- Channel names are lowercased and hyphenated on creation: `name.toLowerCase().replace(/\s+/g, "-")`
- Voice channel LiveKit room naming: `guild-{guildId}-channel-{channelId}`
- Message content max length: 2000 characters (enforced at DB level via check constraint)

## What's built (Phase 1 complete)

- Auth: sign up, log in, sign out
- Guilds: create, join via invite code, guild icon rail
- Channels: text channels, create channel
- Real-time messaging with Supabase Realtime
- Compact message grouping (same author within 7 min)
- User presence (online/offline via Supabase Presence + `user_presence` table)
- Member list with presence indicators
- Invite modal with copy-to-clipboard

## What's next (Phase 2)

- Direct messages (DMs)
- Message editing and deletion
- File attachments (Cloudflare R2)
- Emoji reactions
- Roles and permissions
- User avatars / profile editing
- Invite link expiry and use limits

## What's next (Phase 3)

- Voice channels (LiveKit — persistent rooms per voice channel)
- Video calls + screen sharing
- Push-to-talk + mute/deafen controls
