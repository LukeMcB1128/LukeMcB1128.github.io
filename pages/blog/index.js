import Layout from '../../components/Layout'
import PostCard from '../../components/PostCard'
import { format } from 'date-fns'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export default function Blog({ posts, currentPage, totalPages }) {
  return (
    <Layout>
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Blog</h1>
        <p className="text-gray-600 dark:text-gray-400">Thoughts, stories and ideas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <a
            key={page}
            href={`/blog?page=${page}`}
            className={`px-4 py-2 rounded ${
              page === currentPage
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {page}
          </a>
        ))}
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const page = 1
  const postsPerPage = 10

  const postsDirectory = path.join(process.cwd(), 'content', 'blog')
  const fileNames = fs.readdirSync(postsDirectory).filter((fileName) => fileName.endsWith('.mdx'))

  // Read all posts and parse front matter
  const allPosts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, '')
    const filePath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContents)

    return {
      slug,
      ...data
    }
  })

  // Sort posts by date (newest first)
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date))

  // Convert dates to ISO string format for JSON serialization
  const serializedPosts = allPosts.map(post => ({
    ...post,
    date: new Date(post.date).toISOString()
  }))

  return {
    props: {
      posts: serializedPosts.slice(0, postsPerPage),
      currentPage: page,
      totalPages: Math.ceil(serializedPosts.length / postsPerPage)
    }
  }
}
