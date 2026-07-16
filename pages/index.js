import Layout from '../components/Layout'
import Hero from '../components/Hero'
import PostCard from '../components/PostCard'
import { format } from 'date-fns'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export default function Home({ posts }) {
  return (
    <Layout>
      <Hero />
      
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Latest Posts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Link 
            href="/blog" 
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            View All Posts
          </Link>
        </div>
      </section>
    </Layout>
  )
}

export async function getStaticProps() {
  const postsDirectory = path.join(process.cwd(), 'content', 'blog')
  const fileNames = fs.readdirSync(postsDirectory)
  
  // Read all posts and parse front matter
  const posts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, '')
    const filePath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContents)
    
    return {
      slug,
      ...data
    }
  })
  
  // Sort posts by date (newest first) and take the first 3
  posts.sort((a, b) => new Date(b.date) - new Date(a.date))
  const latestPosts = posts.slice(0, 3)
  
  // Convert dates to ISO string format for JSON serialization
  const serializedPosts = latestPosts.map(post => {
    // Ensure date is properly converted to string
    let postDate = post.date;
    
    // Handle different date formats
    if (postDate instanceof Date) {
      postDate = postDate.toISOString();
    } else if (typeof postDate === 'string') {
      // Try to parse the string as a date and convert to ISO
      const parsedDate = new Date(postDate);
      if (!isNaN(parsedDate.getTime())) {
        postDate = parsedDate.toISOString();
      }
    } else if (typeof postDate === 'number') {
      // Handle timestamp numbers
      postDate = new Date(postDate).toISOString();
    }
    
    return {
      ...post,
      date: postDate
    }
  })
  
  return {
    props: {
      posts: serializedPosts
    }
  }
}