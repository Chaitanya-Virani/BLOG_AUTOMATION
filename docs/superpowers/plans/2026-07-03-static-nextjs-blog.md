# Static Next.js Blog (Automation Harness) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a statically-generated Next.js blog that reads published posts from a Supabase `test_blogs` table at build time, so new rows only appear after a redeploy.

**Architecture:** App Router + TypeScript, no Tailwind/src-dir/ESLint. All Supabase reads happen at build time in Server Components via a shared anon client. The index lists posts and prints a build timestamp; each `/blog/[slug]` is pre-rendered via `generateStaticParams` with `dynamicParams = false` so unknown slugs 404 until the next build. Markdown bodies render with react-markdown + remark-gfm.

**Tech Stack:** Next.js (latest, App Router, TS), @supabase/supabase-js, react-markdown, remark-gfm, plain CSS.

## Global Constraints

- Next.js **latest** via `create-next-app`; App Router; TypeScript; **no** Tailwind; **no** `src` dir; **no** ESLint prompt; **no** import alias (use relative imports).
- Every route file exports `export const dynamic = 'force-static'`. **No** ISR, **no** `revalidate`, **no** client-side content fetching.
- `app/blog/[slug]/page.tsx` exports `export const dynamicParams = false` and defines `generateStaticParams`.
- `params` is a Promise — always `const { slug } = await params`.
- Only ever read rows where `published = true`, ordered by `created_at` **descending**.
- Env vars read from `process.env`, never hardcoded: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Error handling: env absent → `console.warn` + return empty (build still completes); env present but query errors → throw.
- Design: Wikipedia-style. Light `#ffffff` bg, near-black `#202122` text; serif headings above thin bottom-border rules; sans body, generous line-height; ~860px measure. Links unvisited `#3366cc`, visited `#795cb2`, underline on hover only.
- Do **not** connect to or run against any live database. `supabase/schema.sql` is written only.
- Git remote `origin` → `https://github.com/Chaitanya-Virani/BLOG_AUTOMATION.git`.

---

### Task 1: Scaffold the Next.js app + install dependencies

**Files:**
- Create: whole Next.js scaffold in `D:\Projects\BLOG_TESTING` (package.json, tsconfig.json, next.config.ts, app/, etc.)
- Note: `.git` and `docs/` already exist and are in create-next-app's allowlist, so scaffolding into `.` is safe.

**Interfaces:**
- Produces: a buildable baseline app; `npm run build` and `npm run dev` scripts; `react-markdown`, `remark-gfm`, `@supabase/supabase-js` in dependencies.

- [ ] **Step 1: Scaffold into the current directory**

Run (from `D:\Projects\BLOG_TESTING`):
```bash
npx create-next-app@latest . --ts --app --no-tailwind --no-src-dir --no-eslint --no-import-alias --use-npm --yes
```
Expected: create-next-app completes, prints "Success!", generates `app/`, `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, and installs base deps. It will NOT complain about existing `.git`/`docs`.

- [ ] **Step 2: Install runtime dependencies**

Run:
```bash
npm install @supabase/supabase-js react-markdown remark-gfm
```
Expected: added to `dependencies` in `package.json`, exit 0.

- [ ] **Step 3: Verify the baseline builds**

Run:
```bash
npm run build
```
Expected: build completes; route table shows `/` as static (○). (The default create-next-app home page is still present at this point — that's fine.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app + add supabase/markdown deps"
```

---

### Task 2: Shared Supabase client + typed data helpers

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local.example`

**Interfaces:**
- Produces:
  - `type Post = { id: number; slug: string; title: string; body: string; published: boolean; created_at: string }`
  - `getPublishedPosts(): Promise<Post[]>` — all published rows, `created_at` desc.
  - `getPostBySlug(slug: string): Promise<Post | null>` — one published row or null.

- [ ] **Step 1: Write `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

export type Post = {
  id: number
  slug: string
  title: string
  body: string
  published: boolean
  created_at: string
}

const SELECT_COLUMNS = 'id, slug, title, body, published, created_at'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// A single shared anon client. Null when env vars are absent so the build can still
// complete offline (and the very first deploy, before env is set, does not hard-fail).
export const supabase =
  url && anonKey ? createClient(url, anonKey) : null

function warnUnconfigured(what: string): void {
  console.warn(
    `[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — ${what}`,
  )
}

export async function getPublishedPosts(): Promise<Post[]> {
  if (!supabase) {
    warnUnconfigured('returning no posts.')
    return []
  }
  const { data, error } = await supabase
    .from('test_blogs')
    .select(SELECT_COLUMNS)
    .eq('published', true)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`[supabase] failed to load posts: ${error.message}`)
  return (data as Post[]) ?? []
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!supabase) {
    warnUnconfigured('cannot load post.')
    return null
  }
  const { data, error } = await supabase
    .from('test_blogs')
    .select(SELECT_COLUMNS)
    .eq('published', true)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(`[supabase] failed to load post "${slug}": ${error.message}`)
  return (data as Post | null) ?? null
}
```

- [ ] **Step 2: Write `.env.local.example`**

```bash
# Copy to .env.local and fill in from your Supabase project (Settings → API).
# Both are safe to expose to the browser (anon key + public URL), hence NEXT_PUBLIC_.
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: exit 0, no type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts .env.local.example
git commit -m "feat: add shared supabase client and post data helpers"
```

---

### Task 3: Root layout + Wikipedia-style global CSS

**Files:**
- Modify/Replace: `app/layout.tsx`
- Replace: `app/globals.css`
- Delete: `app/page.module.css` (if create-next-app created it) — unused.

**Interfaces:**
- Produces: a `.container` wrapper (~860px, centered) and element styling relied on by the index and article pages (`.article-list`, `.built-at`, `.empty`, `.back-link`, `article`).

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Test Blog',
  description: 'A statically generated blog — content-automation test harness.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Replace `app/globals.css`**

```css
:root {
  --text: #202122;
  --muted: #54595d;
  --bg: #ffffff;
  --rule: #a2a9b1;
  --rule-light: #c8ccd1;
  --link: #3366cc;
  --link-visited: #795cb2;
  --code-bg: #f8f9fa;
  --measure: 860px;
  --serif: Georgia, 'Times New Roman', 'Liberation Serif', serif;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial,
    sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.container {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

/* Headings — serif, with a thin rule under h1/h2 (Wikipedia section style). */
h1,
h2,
h3 {
  font-family: var(--serif);
  font-weight: 400;
  line-height: 1.3;
  color: var(--text);
}

h1 {
  font-size: 1.9rem;
  margin: 0 0 0.6rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--rule);
}

h2 {
  font-size: 1.5rem;
  margin: 1.8rem 0 0.6rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--rule-light);
}

h3 {
  font-size: 1.2rem;
  margin: 1.4rem 0 0.5rem;
}

p {
  margin: 0 0 1rem;
}

/* Links — classic wiki colors, underline on hover only. */
a {
  color: var(--link);
  text-decoration: none;
}

a:visited {
  color: var(--link-visited);
}

a:hover {
  text-decoration: underline;
}

/* Index build-timestamp tell. */
.built-at {
  font-family: var(--sans);
  font-size: 0.85rem;
  color: var(--muted);
  margin: -0.2rem 0 1.6rem;
}

.empty {
  color: var(--muted);
  font-style: italic;
}

/* Article index — a simple bordered list of title links. */
.article-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--rule-light);
  border-radius: 2px;
}

.article-list li {
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--rule-light);
}

.article-list li:last-child {
  border-bottom: none;
}

.article-list a {
  font-size: 1.05rem;
}

.back-link {
  font-size: 0.9rem;
  margin-bottom: 1.2rem;
}

/* Article prose. */
article {
  font-size: 1.05rem;
}

article ul,
article ol {
  margin: 0 0 1rem;
  padding-left: 1.5rem;
}

article li {
  margin: 0.25rem 0;
}

article blockquote {
  margin: 1rem 0;
  padding: 0.2rem 0 0.2rem 1rem;
  border-left: 4px solid var(--rule-light);
  color: var(--muted);
}

article code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
  background: var(--code-bg);
  border: 1px solid var(--rule-light);
  border-radius: 2px;
  padding: 0.1rem 0.3rem;
}

article pre {
  background: var(--code-bg);
  border: 1px solid var(--rule-light);
  border-radius: 2px;
  padding: 0.8rem 1rem;
  overflow-x: auto;
}

article pre code {
  background: none;
  border: none;
  padding: 0;
}

article table {
  border-collapse: collapse;
  margin: 1rem 0;
  width: 100%;
}

article th,
article td {
  border: 1px solid var(--rule-light);
  padding: 0.4rem 0.7rem;
  text-align: left;
}

article th {
  background: var(--code-bg);
}
```

- [ ] **Step 3: Remove the unused CSS module if present**

Run:
```bash
rm -f app/page.module.css
```
Expected: no error (file removed or already absent).

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/globals.css
git add -A
git commit -m "feat: wikipedia-style global css and root layout"
```

---

### Task 4: Article index page

**Files:**
- Replace: `app/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPosts()` from `lib/supabase`.
- Produces: static `/` route listing posts + a build-time `Built at:` ISO timestamp.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from 'next/link'
import { getPublishedPosts } from '../lib/supabase'

export const dynamic = 'force-static'

export default async function HomePage() {
  const posts = await getPublishedPosts()
  const builtAt = new Date().toISOString()

  return (
    <main>
      <h1>Test Blog</h1>
      <p className="built-at">Built at: {builtAt}</p>

      {posts.length === 0 ? (
        <p className="empty">No published articles yet.</p>
      ) : (
        <ul className="article-list">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Build and confirm `/` is static**

Run:
```bash
npm run build
```
Expected: build completes; route table lists `/` as `○` (Static). Console shows the `[supabase] ... not set` warning (env not configured locally) — that is expected and the build still succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: static article index with build timestamp"
```

---

### Task 5: Individual article page (static params + notFound + markdown)

**Files:**
- Create: `app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPosts()` and `getPostBySlug(slug)` from `lib/supabase`.
- Produces: one static page per published slug; unknown slugs 404 (`dynamicParams = false`).

- [ ] **Step 1: Create `app/blog/[slug]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getPublishedPosts, getPostBySlug } from '../../../lib/supabase'

export const dynamic = 'force-static'
export const dynamicParams = false

export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) notFound()

  return (
    <main>
      <p className="back-link">
        <Link href="/">← Back to all articles</Link>
      </p>
      <article>
        <h1>{post.title}</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </article>
    </main>
  )
}
```

- [ ] **Step 2: Build and confirm the blog route is static**

Run:
```bash
npm run build
```
Expected: build completes. Route table lists `/blog/[slug]` as static. Offline (no env) `generateStaticParams` returns `[]`, so 0 slug pages are prebuilt — the route still appears and the build succeeds. With real env + seed data applied, each slug appears as a prerendered `●` page.

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: exit 0 (note `notFound()` returns `never`, so `post` is narrowed to non-null after the guard).

- [ ] **Step 4: Commit**

```bash
git add app/blog/[slug]/page.tsx
git commit -m "feat: static per-slug article page with markdown + gfm"
```

---

### Task 6: Supabase schema + seed SQL (written only)

**Files:**
- Create: `supabase/schema.sql`

**Interfaces:**
- Produces: DDL + RLS policy + seed rows the user runs manually in the Supabase SQL editor. **Not executed against any live DB by this project.**

- [ ] **Step 1: Create `supabase/schema.sql`**

```sql
-- test_blogs: source table for the statically-generated blog.
-- Run this in the Supabase SQL editor (SQL → New query → Run).

create table if not exists public.test_blogs (
  id bigint generated always as identity primary key,
  slug text unique not null,
  title text not null,
  body text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Row Level Security: allow anonymous (public) read access only.
alter table public.test_blogs enable row level security;

drop policy if exists "Public read access" on public.test_blogs;
create policy "Public read access"
  on public.test_blogs
  for select
  to anon
  using (true);

-- Seed rows so the first build renders something.
insert into public.test_blogs (slug, title, body, published) values
(
  'hello-world',
  'Hello, World',
  $md$This is the **first** post in the automation test harness.

It exists to prove that a build-time read from Supabase renders correctly.

## Why this page is static

The site is rebuilt on deploy. A new row does *not* appear until the next
rebuild — that is the whole point of the test.
$md$,
  true
),
(
  'markdown-showcase',
  'Markdown Showcase',
  $md$A quick tour of the Markdown features that render here.

### Lists

- First item
- Second item
- Third item

### A table (GFM)

| Feature     | Supported |
|-------------|-----------|
| Tables      | yes       |
| Strikethrough | ~~yes~~ |

### Code

Inline `const x = 42` and a block:

```ts
export function greet(name: string) {
  return `Hello, ${name}`
}
```

> Blockquotes work too.
$md$,
  true
),
(
  'how-the-pipeline-works',
  'How the Pipeline Works',
  $md$An n8n AI agent inserts a row into `test_blogs`. A Supabase Database Webhook
fires a Vercel Deploy Hook, which rebuilds the site. The rebuilt static pages
then surface the new post.

1. Agent writes the row.
2. Webhook triggers redeploy.
3. Build reads published rows at build time.
4. New article goes live.
$md$,
  true
);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add test_blogs schema, RLS read policy, and seed rows"
```

---

### Task 7: README + final acceptance build + push

**Files:**
- Create/Replace: `README.md`

**Interfaces:**
- Produces: local-run instructions, env var docs, and the one-line summary of remaining manual wiring. Final full build is the acceptance test.

- [ ] **Step 1: Write `README.md`**

````markdown
# BLOG_AUTOMATION — Statically-Generated Next.js Blog

The "view" in a content-automation loop: an n8n agent inserts a row into a Supabase
`test_blogs` table → a Supabase Database Webhook triggers a Vercel redeploy → the rebuilt
**static** site surfaces the new post. New rows are invisible until a rebuild happens — by
design.

## Local development

1. Apply the database schema: open the Supabase SQL editor and run
   [`supabase/schema.sql`](supabase/schema.sql).
2. Configure env vars:

   ```bash
   cp .env.local.example .env.local
   ```

   Then set both values (Supabase dashboard → Settings → API):

   - `NEXT_PUBLIC_SUPABASE_URL` — e.g. `https://YOUR-PROJECT-REF.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon / public key

3. Install and run:

   ```bash
   npm install
   npm run dev      # http://localhost:3000
   ```

4. Production build (this is what Vercel runs):

   ```bash
   npm run build
   npm start
   ```

## How it stays static

- Every page: `export const dynamic = 'force-static'`.
- `app/blog/[slug]/page.tsx`: `generateStaticParams` + `export const dynamicParams = false`,
  so a slug that didn't exist at build time returns 404 until the next rebuild.
- All Supabase reads happen at build time in Server Components. No ISR, no `revalidate`,
  no client-side content fetching.
- The index shows a `Built at: <ISO>` timestamp — proof a rebuild happened.

## What you still need to wire up

Run `supabase/schema.sql` in Supabase, set the two env vars in Vercel, then connect the
Supabase Database Webhook → Vercel Deploy Hook so each insert triggers a redeploy.
````

- [ ] **Step 2: Final acceptance build**

Run:
```bash
npm run build
```
Expected: build completes with no type/build errors; route table shows `/` and `/blog/[slug]` as static (○/●). This is the acceptance test.

- [ ] **Step 3: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with local-run steps and wiring notes"
git push -u origin main
```
Expected: pushes to `https://github.com/Chaitanya-Virani/BLOG_AUTOMATION.git`. (If the remote already has commits, coordinate with the user before force-related actions — do not force-push.)

---

## Notes for the executor

- If `create-next-app` picks a different structure (e.g. `next.config.mjs` vs `.ts`), keep its choice; the plan's file contents still apply.
- If `npm run build` fails with a Supabase runtime error **while env vars are set**, that is the intended fail-loud path — check the DB/policy, don't suppress it.
- Do not attempt to run SQL against the live database or touch n8n / the webhook / the deploy hook — those are the user's manual steps.
