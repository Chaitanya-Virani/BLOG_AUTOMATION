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
export const supabase = url && anonKey ? createClient(url, anonKey) : null

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
