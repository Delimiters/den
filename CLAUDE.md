# Den — CLAUDE.md

Den is a privacy-focused chat app for gaming friend groups. Familiar chat layout and features. Desktop app first (Windows), built for eventual mobile.

## Why this exists

Concerns about privacy, biometric data collection, and closed-source platforms prompted this. The goal is community ownership: users run their own servers, the code is auditable, and there's no vendor lock-in.

Core values:
- **Privacy by default** — open source so users can audit; client-server voice relay so IPs stay private between participants
- **Familiar first** — nail the core chat experience before diverging; don't invent new UX while the foundation is unfinished
- **Free to start, designed to scale** — entire stack runs on free tiers for a small friend group; each service has a clear paid upgrade path
- **No lock-in** — Supabase is self-hostable; LiveKit Cloud can be swapped for a self-hosted SFU with zero code changes

The initial audience is a Windows gaming friend group. Mobile (iOS/Android) is planned and Tauri 2.0 already supports it with the same React codebase.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Desktop | Tauri 2.0 + React + TypeScript | 25x lighter than Electron; same codebase targets iOS/Android |
| UI | TailwindCSS v4 | v4 uses CSS-native `@theme`, no config file |
| State | Zustand | Lightweight; store shape is flat, not nested |
| Backend | Supabase | Handles DB, Auth, Realtime, Storage all in one free tier |
| Voice/Video | LiveKit | Open-source WebRTC SFU; same client code for cloud and self-hosted |
| File storage | Cloudflare R2 | 10 GB/month free, zero egress fees |
| Build | Vite 7 | Frontend only; Tauri CLI wraps it |
| Tests | Vitest + React Testing Library | Vite-native, globals enabled |
| E2E | Playwright | Smoke tests; CI builds app locally and tests against localhost:4173 |

## Commands

```bash
npm run dev          # Vite dev server (browser preview, port 1420)
npm run tauri dev    # Full Tauri desktop app with hot reload (needs Rust in PATH)
npm run build        # tsc check + Vite production build
npm test             # Vitest in watch mode
npm run test:once    # Vitest single run (use in CI / before committing)
npm run test:coverage # Coverage report (threshold: 60%)
npm run test:e2e     # Playwright e2e smoke tests (needs E2E_* env vars)
```

Rust must be sourced before Tauri commands: `. "$HOME/.cargo/env"`

## Project layout

```
src/
├── components/
│   ├── auth/         # AuthPage (login + register form)
│   ├── chat/         # Message, MessageInput, MessageList, MessageSearch, PinnedMessages
│   ├── layout/       # AppLayout, GuildSidebar, ChannelSidebar, DmSidebar, MemberList,
│   │                 #   ServerSettingsModal, UserSettingsModal
│   ├── ui/           # Avatar, StatusIndicator, EmojiPicker, QuickSwitcher,
│   │                 #   ImageLightbox, Toast, UserPopover
│   └── voice/        # VoiceChannelView, VoiceControls, VoiceStatusPanel, ParticipantTile
├── hooks/
│   ├── useAuth.ts              # Session management, sign-in/up/out
│   ├── useCustomEmojis.ts      # Loads per-guild custom emojis into store
│   ├── useDirectMessages.ts    # DM load + realtime subscription + send
│   ├── useDmUnreadTracker.ts   # Unread tracking for DM channels
│   ├── useLinkPreview.ts       # Fetches OG metadata via link-preview Edge Function; in-memory cache
│   ├── usePresence.ts          # Supabase Presence (online/idle/dnd/offline)
│   ├── useReactions.ts         # Emoji reaction load + realtime + toggle
│   ├── useRealtimeMessages.ts  # Guild message load + realtime + send (optimistic)
│   ├── useRoles.ts             # Guild roles and permission bits
│   ├── useToasts.ts            # Toast notification queue
│   ├── useTyping.ts            # Typing indicator broadcast + receive
│   ├── useUnreadTracker.ts     # Unread tracking for guild channels
│   └── useVoiceChannel.ts      # LiveKit join/leave + track management
├── lib/
│   └── supabase.ts   # Single Supabase client instance
├── stores/
│   └── appStore.ts   # Zustand global store (see Store section below)
├── types/
│   └── index.ts      # All shared TypeScript interfaces
└── utils/
    ├── desktopNotification.ts  # Web Notifications API wrapper
    ├── markdown.tsx            # MessageContent renderer (inline + block markdown)
    ├── message.ts              # formatTimestamp, shouldCompact, date separators
    ├── permissions.ts          # Bitfield permission helpers (hasPermission, etc.)
    ├── tauri.ts                # Tauri API shims (openUrl — falls back in browser)
    └── upload.ts               # Cloudflare R2 pre-signed upload helper
```

## Environment

Requires a `.env.local` file (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never commit `.env.local`. The anon key is safe to expose to the client — Supabase Row Level Security enforces access at the DB layer.

## Database

Migrations live in `supabase/migrations/` and `supabase/fixes/`. Run them in order in the Supabase SQL Editor to set up a fresh project.

Key tables: `users`, `guilds`, `guild_members`, `channels`, `messages`, `attachments`, `message_reactions`, `guild_invites`, `roles`, `guild_roles`, `member_roles`, `dm_channels`, `dm_participants`, `dm_messages`, `dm_attachments`, `voice_sessions`, `pinned_messages`, `user_presence`

Important DB behaviors:
- `on_auth_user_created` trigger auto-creates a `users` row on signup
- `on_guild_created` trigger auto-adds the owner as a member and creates a `#general` channel
- `join_guild_by_invite(invite text)` RPC — call via `supabase.rpc()`, returns the `guild_id`
- RLS is enabled on all tables — queries silently return empty if the user lacks access

Supabase query pattern:
```typescript
const { data, error } = await supabase
  .from("messages")
  .select("*, author:users!author_id(*), attachments(*)")
  .eq("channel_id", channelId)
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(50);
```

## Store (Zustand)

`useAppStore` in `src/stores/appStore.ts`. Shape:

```
currentUser       User | null
viewMode          "guild" | "dm"
currentGuildId    string | null
currentChannelId  string | null
currentDmId       string | null
guilds            Guild[]
channels          Channel[]       — channels for the currently selected guild
messages          Message[]       — NEWEST FIRST (index 0 = most recent)
members           GuildMember[]
dmChannels        DmChannel[]
unread            Record<string, true>   — channelIds with unread messages
typing            Record<string, string[]>
reactions         Record<string, MessageReaction[]>
voiceChannelId    string | null
```

**Critical: messages are newest-first.** `appendMessage` is idempotent (deduplicates by id) and pushes to the front. `prependMessages` pushes to the back (for pagination loading older history). Components call `.reverse()` before rendering to display oldest-at-top.

Side effects on navigation:
- `setCurrentGuild` clears `currentChannelId`, `channels`, `messages`, `members`
- `setCurrentChannel` clears `messages`
- `setCurrentDm` clears `messages`

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

Text messages use Supabase `postgres_changes` subscriptions. After a successful insert, `sendMessage` also optimistically appends the message to the store immediately (before the realtime echo), so the sender sees it instantly. The realtime handler deduplicates by id.

```typescript
supabase.channel(`messages:${channelId}`)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages",
      filter: `channel_id=eq.${channelId}` }, handler)
  .subscribe()
```

Presence: single `presence:global` channel owned by `usePresence`. Returns `onlineUserIds: Set<string>` which flows down as a prop to `MemberList`. Do NOT subscribe to the presence channel anywhere else — double subscription causes a Supabase error.

Realtime is enabled for: `messages`, `dm_messages`, `user_presence`, `guild_members`, `voice_sessions`.

## Markdown

`MessageContent` in `src/utils/markdown.tsx` handles both inline and block-level formatting:

- **Inline**: `**bold**`, `*italic*`, `~~strikethrough~~`, `` `code` ``, `https://` links, `@mentions`
- **Block**: ```` ``` ```` code blocks, `> ` blockquotes, `# ## ###` headings, `- ` / `* ` unordered lists, `1. ` ordered lists

Pass `currentUsername` to highlight the current user's own mentions with stronger styling.

## Permissions

Roles use a bitfield system in `src/utils/permissions.ts`. `Permissions` is an enum of bit flags. `hasPermission(myPermissions, Permissions.MANAGE_MESSAGES)` checks a single flag. Guild owners implicitly have all permissions.

## Voice

LiveKit rooms are named `guild-{guildId}-channel-{channelId}`. Token is fetched from the `livekit-token` Supabase Edge Function. `useVoiceChannel` handles join/leave and exposes track state. Screen share uses `localParticipant.setScreenShareEnabled()`.

## Testing conventions

- **Co-locate tests**: `Foo.test.tsx` lives next to `Foo.tsx`
- **Mock at the hook level**, not the Supabase client:
  ```typescript
  vi.mock("../../hooks/useAuth", () => ({
    useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn(), ... }),
  }));
  ```
- **Store tests**: use `useAppStore.getState()` and `useAppStore.setState()` directly — no rendering needed
- **Pure functions**: extract any logic that doesn't touch React or Supabase into `src/utils/` and test it standalone
- **Use `userEvent` over `fireEvent`** — it fires all intermediate browser events
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
- Never mention competitor platform names (e.g. Discord) in committed files or commit messages — plans/memory only

## What's built

- **Auth**: sign up, log in, sign out
- **Guilds**: create, join via invite code (expiry + use limits), guild icon rail, server settings (name, icon, roles)
- **Channels**: text channels + voice channels, categories, create/delete
- **Messaging**: real-time with Supabase Realtime, compact grouping, optimistic send, edit, delete, reply (quote-reply), pin
- **Reactions**: emoji reactions with picker, real-time sync
- **DMs**: direct messages, file attachments, unread tracking
- **File attachments**: images + files via Cloudflare R2, image lightbox
- **Presence**: online/idle/DND/offline status via Supabase Presence
- **Member list**: with presence indicators, user popover
- **Roles & permissions**: bitfield system, role management in server settings
- **Voice channels**: LiveKit group voice, mute/deafen, screen share, noise cancellation toggle
- **Markdown**: bold, italic, strikethrough, inline code, code blocks, blockquotes, headings, lists, links, @mentions
- **@mentions**: autocomplete dropdown in message input, self-mention highlight, message row tint
- **Message search**: per-channel search panel
- **Quick switcher**: Ctrl+K to jump channels/DMs
- **Desktop notifications**: native OS notifications for @mentions and DMs
- **System tray**: minimize to tray on close (Tauri desktop only); left-click tray icon toggles window
- **Custom emojis**: per-server emoji upload (`:name:` syntax), rendered inline; managed in Server Settings → Emojis tab; picker has Server Emojis tab
- **Link previews**: OG metadata fetched via `link-preview` Edge Function; compact card (site name, title, description, thumbnail) shown below messages with URLs
- **Up-arrow edit**: press Up in an empty input to edit the last sent message; shows "Editing message" indicator; Enter saves, Escape cancels
- **E2E tests**: Playwright smoke test (login → server → channel → message) builds app locally and tests against `localhost:4173` — no Vercel dependency

## What's next

- Auto-update (Tauri updater)
- Mobile (iOS / Android via Tauri 2.0)
