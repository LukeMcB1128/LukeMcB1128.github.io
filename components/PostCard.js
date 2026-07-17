import Link from 'next/link'
import { format } from 'date-fns'

export default function PostCard({ post }) {
  return (
    <article className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transform transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400">
            {post.title}
          </Link>
        </h2>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
          <span>{format(new Date(post.date), 'MMMM d, yyyy')}</span>
          <span className="mx-2">•</span>
          <span>{post.readingTime} min read</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {post.excerpt}
        </p>
        <div className="flex flex-wrap gap-2">
          {(post.tags || []).map((tag) => (
            <span
              key={tag}
              className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-primary-900 dark:text-primary-100"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
