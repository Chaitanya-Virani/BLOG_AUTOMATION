# Design — Statically-Generated Next.js Blog (automation test harness)

**Date:** 2026-07-03
**Repo:** https://github.com/Chaitanya-Virani/BLOG_AUTOMATION.git
**Status:** Approved

## Purpose & the one invariant

This site is the **view** in an n8n → Supabase → Vercel automation loop: an n8n AI
agent inserts a blog row into a Supabase table, a Supabase Database Webhook triggers a
Vercel redeploy, and the rebuilt site surfaces the new post.

The single hard invariant everything else serves: **new database rows are invisible
until a rebuild happens.** No ISR, no `revalidate`, no client-side content fetching.
Every Supabase read happens at build time in a Server Component. The
"Built at: `<ISO>`" line on the index is the visible proof a rebuild occurred.

## Stack

- Next.js latest, App Router, TypeScript — **no** Tailwind, **no** `src` dir, **no** ESLint prompt
- `@supabase/supabase-js`, `react-markdown` + **`remark-gfm`**
- Fonts via CSS stacks (Georgia-ish serif headings, system sans body) — no network fonts
- Git initialized; remote `origin` → BLOG_AUTOMATION; spec committed

## Architecture — 5 components, each one job

| File | Responsibility | Depends on |
|------|----------------|------------|
| `lib/supabase.ts` | One shared anon client from `process.env.*` + typed data helpers | env vars |
| `app/layout.tsx` | Root layout: centered ~860px container, site metadata | globals.css |
| `app/page.tsx` | Index: list published posts (desc), render "Built at" line | supabase.ts |
| `app/blog/[slug]/page.tsx` | One article: fetch by slug, render Markdown, back-link, `notFound()` | supabase.ts, react-markdown, remark-gfm |
| `app/globals.css` | Wikipedia-style tokens + element styling | — |

## Static-generation enforcement (the critical part)

- Every route file exports `export const dynamic = 'force-static'`.
- `app/blog/[slug]/page.tsx`:
  - `export const dynamicParams = false` → slugs not present at build return 404.
  - `generateStaticParams()` selects all published slugs, emitting one static page each.
  - `params` is awaited: `const { slug } = await params`.
- Data helpers live in `lib/supabase.ts`:
  - `getPublishedPosts()` → `select ... where published = true order by created_at desc`
  - `getPostBySlug(slug)` → single published row or null
  - Both filter `published = true`; only published content is ever read.

## Data flow

Build time only: `generateStaticParams` and each page's Server Component call Supabase
over the anon key (RLS permits public SELECT). HTML is emitted to static files. At
runtime the site serves pure static HTML — the DB is never touched by a visitor.

## Error handling

- Missing slug → `notFound()` (404 page).
- Supabase query error at build → throw, **failing the build loudly** (a broken build
  must not silently ship stale/empty content).
- Missing env vars → client construction throws at build → build fails visibly.
- Zero published rows → index renders a graceful empty-state message (no crash).

## Design language (Wikipedia)

Light `#ffffff` background, near-black `#202122` text, serif headings sitting above thin
bottom-border rules, sans body at generous line-height, ~860px reading measure.
Links: unvisited `#3366cc`, visited `#795cb2`, underline on hover only. Index is a
bordered list of title links. An article reads like an encyclopedia entry: large serif
title under a rule, then styled prose — h2/h3, lists, blockquotes, inline code, and GFM
tables.

## Database deliverable — `supabase/schema.sql` (written only)

Contains, in order:
1. `create table test_blogs (...)` exactly as specified (id bigint identity PK, slug text
   unique not null, title text not null, body text, published boolean default true,
   created_at timestamptz default now()).
2. `alter table ... enable row level security` + a public anon `SELECT` policy `using (true)`.
3. 2–3 seed `INSERT` rows with real slugs and short Markdown bodies so the first build renders.

The file is **written only.** The live database is not touched by this project; the user
runs the SQL in the Supabase SQL editor themselves. (Supabase MCP may be wired up
separately for the user's own use, but schema is not auto-applied.)

## Verify (acceptance test)

`npm run build` completes and the route table shows the index and each `/blog/[slug]` as
static (○/●). All type/build errors fixed. Deliverables then include a README with
local-run commands + the two env vars, and a one-line summary of the user's remaining
manual wiring.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Documented in `.env.local.example`; read from `process.env`, never hardcoded.

## Out of scope (not touched)

n8n workflow, Supabase Database Webhook, Vercel Deploy Hook — configured by the user in
web dashboards.

## User's remaining manual wiring (one line)

Run `supabase/schema.sql` in the Supabase SQL editor, set the two env vars in Vercel, then
connect the Supabase Database Webhook → Vercel Deploy Hook so inserts trigger a redeploy.
