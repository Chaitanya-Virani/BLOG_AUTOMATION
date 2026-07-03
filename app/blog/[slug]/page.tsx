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
