import { useState, useEffect, useCallback } from 'react'
import { supabase, isMissingConfig } from './lib/supabase'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import ContractDetail from './components/contract/ContractDetail'
import UploadFlow from './components/upload/UploadFlow'
import HowItWorks from './components/dashboard/HowItWorks'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'

const INTRO_SEEN_KEY = 'hasSeenIntro'

function PlaceholderPage({ title }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>This section is coming soon.</p>
    </div>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
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
        setCurrentPage('dashboard')
        setSelectedContract(null)
        setShowHowItWorks(false)
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
        if (data) setDealership({ id: data.dealership_id, name: data.dealerships.name })
      })

    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) setShowHowItWorks(true)
    } catch {}
  }, [session])

  const dismissIntro = useCallback(() => {
    setShowHowItWorks(false)
    try { localStorage.setItem(INTRO_SEEN_KEY, '1') } catch {}
  }, [])

  const handleSelectContract = useCallback((contract) => {
    setSelectedContract(contract)
  }, [])

  const handleBack = useCallback(() => {
    setSelectedContract(null)
  }, [])

  const handleNavigate = useCallback((page) => {
    setCurrentPage(page)
    setSelectedContract(null)
  }, [])

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false)
    setRefreshKey(k => k + 1)
  }, [])

  if (loading) {
    return <div className="loading-screen"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
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
VITE_ANTHROPIC_API_KEY=your_key
VITE_DEMO_PASSWORD=your_demo_password`}
          </pre>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />

  function renderPage() {
    if (selectedContract) {
      return <ContractDetail contract={selectedContract} onBack={handleBack} />
    }
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={refreshKey} onSelectContract={handleSelectContract} />
      case 'contracts':
        return <Dashboard key={`contracts-${refreshKey}`} onSelectContract={handleSelectContract} />
      case 'analytics':
        return <PlaceholderPage title="Analytics" />
      case 'vendors':
        return <PlaceholderPage title="Vendors" />
      case 'reports':
        return <PlaceholderPage title="Reports" />
      case 'settings':
        return <PlaceholderPage title="Settings" />
      default:
        return <Dashboard key={refreshKey} onSelectContract={handleSelectContract} />
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        dealershipName={dealership?.name}
      />
      <div className="app-content">
        <TopBar />
        <main className="app-main">
          {renderPage()}
        </main>
      </div>

      {showHowItWorks && (
        <HowItWorks onClose={dismissIntro} onTryIt={() => setShowUpload(true)} />
      )}

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
