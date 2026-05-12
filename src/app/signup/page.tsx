'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await authClient.signUp.email({ name, email, password })
    if (result.error) {
      setLoading(false)
      setError(result.error.message ?? 'Sign up failed')
      return
    }
    // Create app user + settings records
    try {
      await fetch('/api/auth/setup', { method: 'POST' })
    } catch {
      // non-fatal — settings route auto-creates on first access
    }
    setLoading(false)
    router.push('/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-white/50 mt-1 text-sm">Start planning your day</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#4ade80]"
            />
          </div>
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
              minLength={8}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#4ade80]"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4ade80] text-black font-medium py-2 rounded-lg text-sm hover:bg-[#22c55e] disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-white/40 text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-[#4ade80] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
