'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await authClient.signIn.email({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message ?? 'Sign in failed')
    } else {
      router.push('/today')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="text-white/50 mt-1 text-sm">Welcome back to Daily Planner</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#4ade80]"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#4ade80]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4ade80] text-black font-medium py-2 rounded-lg text-sm hover:bg-[#22c55e] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-white/40 text-sm mt-6 text-center">
          No account?{' '}
          <Link href="/signup" className="text-[#4ade80] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
