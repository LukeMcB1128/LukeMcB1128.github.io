import Layout from '../../components/Layout'
import { format } from 'date-fns'
import { MDXRemote } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export default function Post({ post, source }) {
  return (
    <Layout>
      <article className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{post.title}</h1>
          <div className="flex items-center text-gray-600 dark:text-gray-400 mb-6">
            <span>{format(new Date(post.date), 'MMMM d, yyyy')}</span>
            <span className="mx-2">•</span>
            <span>{post.readingTime} min read</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map((tag) => (
              <span 
                key={tag} 
                className="bg-primary-100 text-primary-800 text-sm font-medium px-3 py-1 rounded dark:bg-primary-900 dark:text-primary-100"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>
        
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <MDXRemote {...source} />
        </div>
      </article>
    </Layout>
  )
}

export async function getStaticProps({ params }) {
  const { slug } = params
  
  // Read the MDX file
  const filePath = path.join(process.cwd(), 'content', 'blog', `${slug}.mdx`)
  
  if (!fs.existsSync(filePath)) {
    return {
      notFound: true,
    }
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  
  // Extract front matter and content
  const { data, content } = matter(fileContents)
  const serializedData = {
    ...data,
    date: new Date(data.date).toISOString()
  }
  // Parse MDX content with serialized data
  const source = await serialize(content, {
    scope: serializedData
  })

  return {
    props: {
      post: {
        slug,
        ...serializedData
      },
      source
    }
  }
}

export async function getStaticPaths() {
  const postsDirectory = path.join(process.cwd(), 'content', 'blog')
  const fileNames = fs.readdirSync(postsDirectory).filter((fileName) => fileName.endsWith('.mdx'))
  
  const paths = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, '')
    return {
      params: {
        slug
      }
    }
  })

  return {
    paths,
    fallback: false
  }
}