# DocEdit AI

A Notion-like document editor with an AI chat sidebar powered by Claude. Write, edit, and improve documents with AI assistance.

![DocEdit AI](https://img.shields.io/badge/Next.js-15-black) ![TipTap](https://img.shields.io/badge/TipTap-Editor-purple) ![Claude](https://img.shields.io/badge/Claude-AI-orange)

## Features

- **Rich Text Editor**: Headings (H1-H3), bold, italic, bullet/ordered lists
- **AI Chat Sidebar**: Conversational interface to write and edit content
- **Apply Suggestions**: One-click to insert AI-generated content into the document
- **Multiple Edit Modes**: Insert at cursor, replace selection, append to end
- **Text Selection Improvement**: Highlight text and click "Improve" for instant AI enhancement
- **Auto-Save**: Documents automatically save as you type
- **Chat History**: Conversations persist per document
- **Authentication**: Google OAuth via Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (for auth and database)
- Anthropic API key (for Claude)

### Environment Variables

Create a `.env.local` file (you can copy the template `env.example`):

```bash
cp env.example .env.local
```

Then fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Database Setup

Run the SQL in `supabase_setup.sql` in your Supabase SQL editor to create:
- `documents` table
- `chats` table
- Row Level Security policies

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploying to Vercel

### 1) Create a Vercel project

- Push this repo to GitHub/GitLab/Bitbucket
- In Vercel: **Add New → Project** → import the repo
- Vercel should auto-detect **Next.js**

### 2) Set Environment Variables in Vercel

In Vercel project settings → **Environment Variables**, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

Set them for **Production** (and **Preview** if you want preview deploys to work).

### 3) Configure Supabase OAuth Redirect URLs

This app uses `redirectTo: ${location.origin}/auth/callback` and exchanges the code in `app/auth/callback/route.ts`.

In Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**:
  - Local: `http://localhost:3000`
  - Production: `https://YOUR_DOMAIN` (custom domain) or `https://YOUR_PROJECT.vercel.app`
- **Redirect URLs** (add all you will use):
  - `http://localhost:3000/auth/callback`
  - `https://YOUR_DOMAIN/auth/callback`
  - `https://YOUR_PROJECT.vercel.app/auth/callback`

Then in Supabase Dashboard → **Authentication → Providers → Google**:
- Ensure your Google OAuth client has the Supabase callback URL configured (Supabase shows the exact callback URL to whitelist).

### 4) Deploy

- Trigger a deploy in Vercel (or push to `main`)
- Visit your deployed URL and sign in via Google

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │    Editor Pane      │    │       Chat Pane             │ │
│  │   (TipTap Editor)   │    │   (AI Conversation)         │ │
│  │                     │    │                             │ │
│  │  - EditorToolbar    │    │  - MessageList              │ │
│  │  - FloatingImprove  │◄───│  - SuggestionCard           │ │
│  │  - EditorContent    │    │  - Composer                 │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│            │                           │                    │
│            ▼                           ▼                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Zustand (editorStore)                      ││
│  │         Shares editor instance across components        ││
│  └─────────────────────────────────────────────────────────┘│
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                  /api/ai (Route Handler)                ││
│  │        Claude API with Tool Calling (apply_edit)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │        Supabase         │
              │  - Auth (Google OAuth)  │
              │  - Documents table      │
              │  - Chats table          │
              └─────────────────────────┘
```

### Key Design Decisions

1. **TipTap for Editor**: Chose TipTap over Slate.js for its simpler API, better React integration, and built-in extensions. Trade-off: Slightly larger bundle size.

2. **Zustand for State**: Lightweight state management to share the editor instance between EditorPane and ChatPane. The chat needs access to editor content and can apply edits directly.

3. **AI SDK v6 with Tool Calling**: Uses Anthropic's tool calling feature so the AI returns structured edit operations. The `apply_edit` tool has modes: `insert_at_cursor`, `replace_selection`, `append_to_end`, `inline_suggestion`.

4. **Streaming Responses**: AI responses stream in real-time, showing partial tool calls as they generate for better UX.

5. **Server Components + Client Split**: Document page uses server components to fetch data, then wraps client components in `EditorPaneWrapper` for interactivity.

### Trade-offs Made

| Decision | Trade-off |
|----------|-----------|
| **Supabase over local storage** | Requires setup but enables auth, persistence, and future collaboration |
| **Single document view** | Simpler UX, but no tabs for multiple documents |
| **HTML storage** | Stores editor content as HTML (not JSON), simpler but less structured |
| **No real-time collab** | Would require Supabase Realtime or Yjs, added complexity |
| **Fixed sidebar width** | Simpler layout, but not ideal for mobile |

## Improvements with More Time

- [ ] **Markdown shortcuts**: Type `# ` for H1, `**text**` for bold
- [ ] **Slash commands**: `/heading`, `/bullet`, `/quote`
- [ ] **Visual diff for suggestions**: Show old vs new text before applying
- [ ] **Dark mode toggle**: CSS variables are ready, just need UI toggle
- [ ] **Mobile responsive**: Collapsible chat sidebar
- [ ] **Export**: Download as Markdown or PDF
- [ ] **Collaborative editing**: Real-time multi-user with Supabase Realtime
- [ ] **Version history**: Track and restore previous versions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Editor**: TipTap (ProseMirror-based)
- **AI**: Anthropic Claude via AI SDK
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Google OAuth)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **State**: Zustand

## License

MIT
