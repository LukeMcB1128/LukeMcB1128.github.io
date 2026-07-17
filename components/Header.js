import Link from 'next/link'
import { useEffect, useState } from 'react'
import DarkModeToggle from './DarkModeToggle'

export default function Header() {
  const [canWrite, setCanWrite] = useState(false)

  useEffect(() => {
    setCanWrite(Boolean(localStorage.getItem('githubToken')))
  }, [])

  return (
    <header className="border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
          Luke Brittain
        </Link>
        <nav className="flex gap-4 items-center">
          <Link href="/" className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">
            Home
          </Link>
          <Link href="/blog" className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">
            Blog
          </Link>
          {canWrite && (
            <Link href="/write" className="text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors">
              Write
            </Link>
          )}
          <DarkModeToggle />
        </nav>
      </div>
    </header>
  )
}
