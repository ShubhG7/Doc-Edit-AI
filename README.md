# DocEdit AI

A Notion-like document editor with an AI chat sidebar powered by Claude. Write, edit, and iteratively improve documents with structured AI “edit operations” you can apply to the editor.

Built in **~24 hours** (prototype/POC). The README is intentionally explicit about setup + the architectural shortcuts taken to move fast.

![DocEdit AI](https://img.shields.io/badge/Next.js-16-black) ![TipTap](https://img.shields.io/badge/TipTap-Editor-purple) ![Claude](https://img.shields.io/badge/Claude-AI-orange)

### What you can do

- **Create and manage documents**: create/rename/delete from `/dashboard`
- **Rich text editing**: TipTap-based editor (StarterKit + headings/lists/basic formatting)
- **AI chat that can edit the doc**: AI replies stream in and can propose/apply edits
- **Multiple edit modes**:
  - Insert at cursor / append to end
  - Replace selection
  - Find-and-replace (auto-locates the target text, with fuzzy fallback)
  - Delete content (as a structured operation)
- **Inline suggestion blocks**: AI can insert “suggestion blocks” inside the document with Accept/Reject
- **Version history**: “git-like” versions persisted to `document_versions` (supports rollback)
- **Auto-save**: document HTML auto-saves on edits (debounced)
- **Per-document chat history**: chat messages persist to `chats.messages`
- **Auth**: Google OAuth via Supabase

---

### Setup (local)

#### Prerequisites

- Node.js **18+**
- A Supabase project (Auth + Postgres)
- An Anthropic API key

#### 1) Install dependencies

```bash
npm install
```

#### 2) Configure environment variables

Copy the template and fill in values:

```bash
cp env.example .env.local
```

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
```

#### 3) Create database tables + RLS policies

In Supabase Dashboard → **SQL Editor**, run `supabase_setup.sql`.

It creates:

- `documents`: stores `title`, `content` (HTML), and `user_id`
- `chats`: stores per-document messages as `jsonb` (one row per document)
- `document_versions`: stores a version history (“git-like” short hash + content HTML + metadata)

#### 4) Configure Supabase Auth (Google OAuth)

This app initiates OAuth with:

- `redirectTo: ${location.origin}/auth/callback` (see `components/auth/LoginButton.tsx`)
- the code exchange happens in `app/auth/callback/route.ts`

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**:
  - Local: `http://localhost:3000`
  - Prod: `https://YOUR_DOMAIN` or `https://YOUR_PROJECT.vercel.app`
- **Redirect URLs** (add the ones you’ll use):
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_DOMAIN/auth/callback`
  - `https://YOUR_PROJECT.vercel.app/auth/callback`

Then Supabase Dashboard → **Authentication → Providers → Google**:

- Enable Google provider
- Configure your Google OAuth client with the Supabase callback URL (Supabase shows the exact URL to whitelist)

#### 5) Run the app

```bash
npm run dev
```

Open `http://localhost:3000`

---

### Deploy (Vercel)

#### 1) Create a Vercel project

- Push to GitHub/GitLab/Bitbucket
- Vercel → **Add New → Project** → import repo

#### 2) Set environment variables

In Vercel → Project Settings → **Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

Set them for **Production** (and **Preview** if you want preview deploys).

#### 3) Configure Supabase redirect URLs for production

Repeat the Auth steps above, ensuring your production domain(s) are present in both:

- Supabase **URL Configuration**
- Google OAuth allowed redirect URIs (via Supabase provider settings)

---

### Architecture (how it works)

#### High-level flow

1) **Auth + routing**

- `/login`: Google OAuth via Supabase
- `/dashboard`: server-side gate (redirects to `/login` if not authenticated)
- `/doc/[id]`: server component loads the document + chat, then hands off to client UI

2) **Editor + chat**

- The editor is TipTap (`components/editor/EditorPane.tsx`)
- The chat is AI SDK v6 (`components/chat/ChatContext.tsx` + `useChat`)
- `Zustand` shares the live editor instance across components (`lib/store/editorStore.ts`)

3) **AI call + streaming**

- Route handler: `app/api/ai/route.ts` (Edge runtime)
- Uses `streamText()` and returns `toUIMessageStreamResponse()` so the UI streams tokens + tool calls
- The model is configured to emit structured tool calls:
  - `apply_edit`: describes an edit operation (mode + HTML payload + optional find/replace hints)
  - `update_document_title`: proposes a metadata title update

4) **Applying edits**

Edits are applied client-side for responsiveness and richer UX:

- Direct apply (insert/replace/append + sanitize HTML): `lib/editor/applyEdit.ts`
- Interactive flows (lock selection/cursor; find-and-replace auto-locate): `lib/store/editorStore.ts`
- Inline suggestion blocks: TipTap custom node `suggestionBlock` (`lib/editor/suggestionExtension.ts`)
  - Accept/Reject dispatches DOM events that `EditorPane` listens to and applies accordingly

5) **Persistence**

- Document auto-save: `documents.content` (HTML), debounced on editor updates
- Chat persistence:
  - normal flow: saves via Supabase client from the browser (best-effort)
  - unload safety: also uses `navigator.sendBeacon('/api/save-chat')` for reliable “save on close”
- Version history:
  - initialized on editor mount; persisted to `document_versions`
  - AI edits + suggestion accept-all save a new version after application
  - version UI allows rollback (sets editor HTML + title)

---

### Key architectural decisions (and why)

- **HTML as the storage format**
  - **Why**: fastest path for TipTap persistence and AI “insert HTML” edits.
  - **Consequence**: less structured than storing ProseMirror JSON; harder to do precise diffs and schema migrations.

- **Tool-calling for “edits”, not just text**
  - **Why**: avoids brittle prompt parsing; the model returns structured “what to do”.
  - **Consequence**: the client must implement safe application + fallback behaviors.

- **Client-side edit application**
  - **Why**: instant UX, selection/cursor-aware operations, in-editor suggestion blocks.
  - **Consequence**: requires strict sanitization and careful state coordination; server doesn’t “verify” edits.

- **Supabase as the backend**
  - **Why**: OAuth + Postgres + RLS with minimal custom backend code.
  - **Consequence**: requires Supabase setup; local dev needs cloud dependencies.

- **Edge runtime for `/api/ai`**
  - **Why**: lower latency for streaming responses.
  - **Consequence**: keep dependencies edge-compatible and avoid Node-only APIs in that route.

---

### Trade-offs (because this was built in ~24 hours)

- **Limited formatting surface area**
  - TipTap is set up for the basics; advanced nodes (tables, images, embeds) are not implemented.

- **Heuristic targeting for replacements**
  - Find-and-replace uses exact match, then a fuzzy-ish fallback. It’s good for common cases, not bulletproof for large docs.

- **Optimistic version hashing**
  - Version hashes are random short strings (fast), not content-derived (not stable/deduped).

- **Security posture is “prototype level”**
  - HTML is sanitized before applying edits, but a full threat model (and stricter allowed tags/attrs) wasn’t done.

- **Testing is minimal**
  - There’s a starter unit test for `applyEdit` (`lib/editor/applyEdit.test.ts`), but no comprehensive test suite yet.

---

### What I’d improve with more time

#### Product / UX

- **Better “diff” UX**: show a real before/after diff for edits and suggestions (not just insert/replace)
- **Slash commands + Markdown shortcuts**: faster authoring
- **Collapsible/resizable chat**: the mobile overlay exists; desktop resize would help
- **Exports**: Markdown / PDF / shareable links
- **Accessibility**: keyboard shortcuts, focus management, ARIA audits

#### AI correctness

- **More reliable targeting**: map edits to ProseMirror positions via structured anchors instead of plain-text matching
- **Guardrails**: prevent large unintended replacements; require user confirmation for high-impact edits
- **Prompt + tool schema iteration**: tighter constraints around `contentHtml` (e.g., allow only semantic tags; enforce non-empty operations)

#### Engineering

- **Store ProseMirror JSON (or dual-format)**: improves diffs, schema migrations, and robust edits
- **Real versioning**
  - content-hash-based version ids
  - server-generated version rows (authoritative)
  - “manual save checkpoints” + labels
- **Collaboration**: Yjs + awareness, backed by Supabase Realtime (or another sync layer)
- **Better test coverage**
  - editor store flows (selection lock/confirm)
  - suggestion accept/reject behaviors
  - API route contract tests for tool calls

---

### Tech stack

- **Framework**: Next.js (App Router) + React
- **Editor**: TipTap (ProseMirror)
- **AI**: Anthropic Claude via `ai` SDK (tool-calling + streaming)
- **DB/Auth**: Supabase (Postgres + RLS, Google OAuth)
- **State**: Zustand
- **Styling/UI**: Tailwind CSS + shadcn/ui (Radix primitives)

---

### License

MIT
