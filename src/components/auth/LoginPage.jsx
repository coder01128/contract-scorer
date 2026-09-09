import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const DEMO_EMAIL = 'demo@riverside.test'
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState(null)
  const [signupDone, setSignupDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setSignupDone(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  async function handleDemoLogin() {
    if (!DEMO_PASSWORD) {
      setError('Demo password not configured. Set VITE_DEMO_PASSWORD in .env.local.')
      return
    }
    setDemoLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    if (error) setError('Demo login failed: ' + error.message)
    setDemoLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Contract Scorer</h1>
          <p>AI-powered contract analysis for dealerships</p>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg demo-login-btn"
          onClick={handleDemoLogin}
          disabled={demoLoading || loading}
        >
          {demoLoading ? (
            <><span className="spinner" /> Signing in...</>
          ) : (
            'View Demo'
          )}
        </button>
        <p className="demo-login-sub">Instant access with sample data</p>

        <div className="login-divider">
          <span>or sign in with your account</span>
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Check your email to confirm your account, then sign in.
            </p>
            <button
              className="btn btn-outline btn-full"
              onClick={() => { setIsSignup(false); setSignupDone(false) }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@dealership.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-outline btn-full" disabled={loading || demoLoading}>
                {loading ? (
                  <><span className="spinner" /> {isSignup ? 'Creating account...' : 'Signing in...'}</>
                ) : (
                  isSignup ? 'Sign Up' : 'Sign In'
                )}
              </button>
            </form>
            <p className="login-toggle">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                className="btn-link"
                onClick={() => { setIsSignup(!isSignup); setError(null) }}
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
