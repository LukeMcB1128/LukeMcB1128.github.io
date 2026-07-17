import Layout from '../components/Layout'
import { useEffect, useState } from 'react'

// --- Configuration -------------------------------------------------------
const REPO_OWNER = 'LukeMcB1128'
const REPO_NAME = 'LukeMcB1128.github.io'
const GITHUB_BRANCH = 'main'         // branch where posts live

// Encode string to base64 for GitHub API
function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)))
}

export default function Write() {
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [checkedToken, setCheckedToken] = useState(false)

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem('githubToken')))
    setCheckedToken(true)
  }, [])

  const handleSaveToken = (e) => {
    e.preventDefault()
    if (!tokenInput.trim()) return
    localStorage.setItem('githubToken', tokenInput.trim())
    setTokenInput('')
    setHasToken(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const token = localStorage.getItem('githubToken') || ''
    if (!token) {
      setMessage('Error: GitHub token not found in localStorage.')
      setIsSubmitting(false)
      return
    }

    const slug = title.toLowerCase().replace(/\s+/g, '-')
    const filePath = `content/blog/${slug}.mdx`

    // Build front‑matter and content
    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const frontMatter = [
      '---',
      `title: ${title}`,
      `date: ${new Date().toISOString()}`,
      ...tagsArray.map(tag => `tag: ${tag}`),
      '---',
      '',
      content
    ].join('\n')

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`

    try {
      // First, check if file exists to get its SHA (required for update)
      let sha
      try {
        const headRes = await fetch(apiUrl, { headers: { Authorization: `token ${token}` } })
        if (headRes.ok) {
          const data = await headRes.json()
          sha = data.sha
        }
      } catch (_) {}

      const body = {
        message: `Add post ${slug}`,
        content: b64Encode(frontMatter),
        branch: GITHUB_BRANCH,
        ...(sha && { sha })
      }

      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'GitHub API error')
      }

      setMessage('Post created successfully! Refresh the site to see it.')
      setTitle('')
      setTags('')
      setContent('')
    } catch (error) {
      setMessage(`Error creating post: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!checkedToken) {
    return <Layout />
  }

  if (!hasToken) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Author Access</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Writing posts requires a GitHub token with push access to this site&apos;s repository.
            Paste yours below — it is stored only in this browser.
          </p>
          <form onSubmit={handleSaveToken} className="flex gap-3">
            <input type="password" value={tokenInput} onChange={(e)=>setTokenInput(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" placeholder="GitHub personal access token"/>
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors">Save</button>
          </form>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Write a New Post</h1>
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message}</div>)}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input type="text" id="title" value={title} onChange={(e)=>setTitle(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" placeholder="Enter post title"/>
          </div>
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
            <input type="text" id="tags" value={tags} onChange={(e)=>setTags(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" placeholder="e.g., JavaScript, React, Next.js"/>
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
            <textarea id="content" value={content} onChange={(e)=>setContent(e.target.value)} required rows={20} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white" placeholder="Write your post content here in Markdown..."/>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50">{isSubmitting ? 'Creating Post...' : 'Create Post'}</button>
          </div>
        </form>
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Markdown Guide</h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
            <li><strong>Headers:</strong> # H1, ## H2, ### H3</li>
            <li><strong>Bold:</strong> **bold text**</li>
            <li><strong>Italic:</strong> *italic text*</li>
            <li><strong>Lists:</strong> - item 1, - item 2</li>
            <li><strong>Code:</strong> `inline code` or ```block code```</li>
            <li><strong>Links:</strong> [link text](url)</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
