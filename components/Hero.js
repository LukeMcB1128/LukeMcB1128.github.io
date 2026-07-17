import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Hero() {
  const [canWrite, setCanWrite] = useState(false)

  useEffect(() => {
    setCanWrite(Boolean(localStorage.getItem('githubToken')))
  }, [])

  return (
    <div className="bg-gradient-to-r from-primary-500 to-primary-700 text-white rounded-xl p-8 mb-12">
      <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to My Blog</h1>
      <p className="text-xl mb-6">Sharing thoughts, ideas, and tutorials on web development and more.</p>
      <div className="flex space-x-4">
        <Link
          href="/blog"
          className="bg-white text-primary-700 hover:bg-gray-100 font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Read Latest Posts
        </Link>
        {canWrite && (
          <Link
            href="/write"
            className="bg-transparent border-2 border-white hover:bg-white/10 font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Write a Post
          </Link>
        )}
      </div>
    </div>
  )
}
