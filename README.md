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

> Note: this project uses Next.js 16 with the default (non–Cache Components) caching model,
> under which the `dynamic` / `dynamicParams` route-segment config options apply.

## What you still need to wire up

Run `supabase/schema.sql` in Supabase, set the two env vars in Vercel, then connect the
Supabase Database Webhook → Vercel Deploy Hook so each insert triggers a redeploy.
