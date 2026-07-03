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
