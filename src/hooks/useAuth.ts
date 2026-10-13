import { useCallback, useEffect, useState } from 'react'
import type { AuthSessionState } from '../types'

async function authRequest(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers,
  })
  if (response.status === 204) return undefined
  const body = await response.json().catch(() => ({})) as AuthSessionState & { error?: string }
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
  return body
}

export function useAuth() {
  const [session, setSession] = useState<AuthSessionState>({ authenticated: false })
  const [status, setStatus] = useState<'checking' | 'idle' | 'submitting'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [manualAuthSequence, setManualAuthSequence] = useState(0)

  useEffect(() => {
    let active = true
    authRequest('/api/auth/session')
      .then((next) => { if (active && next) setSession(next) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Authentication is unavailable') })
      .finally(() => { if (active) setStatus('idle') })
    return () => { active = false }
  }, [])

  const submit = useCallback(async (mode: 'login' | 'register', email: string, password: string) => {
    setStatus('submitting')
    setError(null)
    try {
      const next = await authRequest(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (next?.authenticated) {
        setManualAuthSequence((current) => current + 1)
        setSession(next)
      }
      return next
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Could not sign in'
      setError(message)
      throw requestError
    } finally {
      setStatus('idle')
    }
  }, [])

  const logout = useCallback(async () => {
    await authRequest('/api/auth/logout', { method: 'DELETE' })
    setSession({ authenticated: false })
    setError(null)
  }, [])

  return { session, status, error, manualAuthSequence, submit, logout }
}
