-- test_blogs: source table for the statically-generated blog.
-- Run this in the Supabase SQL editor (SQL -> New query -> Run).

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

| Feature       | Supported |
|---------------|-----------|
| Tables        | yes       |
| Strikethrough | ~~yes~~   |

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
