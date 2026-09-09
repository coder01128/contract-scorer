import { useState, useEffect, useCallback } from 'react'
import { supabase, isMissingConfig } from './lib/supabase'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import ContractDetail from './components/contract/ContractDetail'
import UploadFlow from './components/upload/UploadFlow'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [dealership, setDealership] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (isMissingConfig) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setDealership(null)
        setView('dashboard')
        setSelectedContract(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase
      .from('dealership_users')
      .select('dealership_id, dealerships(name)')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDealership({ id: data.dealership_id, name: data.dealerships.name })
        }
      })
  }, [session])

  const handleSelectContract = useCallback((contract) => {
    setSelectedContract(contract)
    setView('contract')
  }, [])

  const handleBack = useCallback(() => {
    setView('dashboard')
    setSelectedContract(null)
  }, [])

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false)
    setRefreshKey(k => k + 1)
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  if (isMissingConfig) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <h1>Contract Scorer</h1>
            <p>Configuration required</p>
          </div>
          <div className="error-message">
            Missing environment variables. Create a <code>.env.local</code> file with:
          </div>
          <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.8, overflow: 'auto' }}>
{`VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
VITE_ANTHROPIC_API_KEY=your_key`}
          </pre>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Contract Scorer</h1>
          {dealership && <span className="dealership-name">{dealership.name}</span>}
        </div>
        <div className="header-right">
          <button onClick={() => setShowUpload(true)} className="btn btn-primary">
            Upload Contract
          </button>
          <button onClick={() => supabase.auth.signOut()} className="btn btn-ghost">
            Sign Out
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'dashboard' ? (
          <Dashboard
            key={refreshKey}
            onSelectContract={handleSelectContract}
          />
        ) : (
          <ContractDetail
            contract={selectedContract}
            onBack={handleBack}
          />
        )}
      </main>

      {showUpload && dealership && (
        <UploadFlow
          dealership={dealership}
          userId={session.user.id}
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  )
}

export default App
