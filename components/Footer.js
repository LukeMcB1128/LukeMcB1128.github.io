import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-xl font-bold text-primary-600 dark:text-primary-400">
              Luke Brittain
            </Link>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Luke Brittain. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="#" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
              Twitter
            </Link>
            <Link href="#" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
              GitHub
            </Link>
            <Link href="#" className="text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors">
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}