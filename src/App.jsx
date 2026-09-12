import { useState, useEffect, useCallback } from 'react'
import { supabase, isMissingConfig } from './lib/supabase'
import LoginPage from './components/auth/LoginPage'
import Dashboard from './components/dashboard/Dashboard'
import ContractDetail from './components/contract/ContractDetail'
import ContractsPage from './components/contracts/ContractsPage'
import AnalyticsPage from './components/analytics/AnalyticsPage'
import VendorsPage from './components/vendors/VendorsPage'
import ReportsPage from './components/reports/ReportsPage'
import SettingsPage from './components/settings/SettingsPage'
import UploadFlow from './components/upload/UploadFlow'
import HowItWorks from './components/dashboard/HowItWorks'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'

const INTRO_SEEN_KEY = 'hasSeenIntro'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [selectedContract, setSelectedContract] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [dealership, setDealership] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [vendorFilter, setVendorFilter] = useState('')

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [contracts, setContracts] = useState([])
  const [summary, setSummary] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState(null)

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
        setContracts([])
        setSummary(null)
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

  const loadData = useCallback(async () => {
    setDataLoading(true)
    setDataError(null)
    try {
      const [contractsRes, summaryRes] = await Promise.all([
        supabase.from('contracts').select('*').order('created_at', { ascending: false }),
        supabase.rpc('get_dashboard_summary'),
      ])
      if (contractsRes.error) throw contractsRes.error
      setContracts(contractsRes.data || [])
      if (!summaryRes.error && summaryRes.data?.[0]) setSummary(summaryRes.data[0])
    } catch (err) {
      setDataError(err.message)
    } finally {
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session) loadData()
  }, [session, refreshKey, loadData])

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
    setMobileMenuOpen(false)
    if (page !== 'contracts') setVendorFilter('')
  }, [])

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false)
    setRefreshKey(k => k + 1)
  }, [])

  const handleSelectVendor = useCallback((vendorName) => {
    setVendorFilter(vendorName)
    setCurrentPage('contracts')
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
        return (
          <Dashboard
            contracts={contracts}
            summary={summary}
            loading={dataLoading}
            error={dataError}
            onSelectContract={handleSelectContract}
            onUpload={() => setShowUpload(true)}
            onRetry={loadData}
          />
        )
      case 'contracts':
        return (
          <ContractsPage
            contracts={contracts}
            loading={dataLoading}
            onSelectContract={handleSelectContract}
            onUpload={() => setShowUpload(true)}
            initialVendorFilter={vendorFilter}
            onClearVendorFilter={() => setVendorFilter('')}
          />
        )
      case 'analytics':
        return <AnalyticsPage contracts={contracts} loading={dataLoading} />
      case 'vendors':
        return <VendorsPage contracts={contracts} loading={dataLoading} onSelectVendor={handleSelectVendor} />
      case 'reports':
        return <ReportsPage contracts={contracts} loading={dataLoading} />
      case 'settings':
        return <SettingsPage dealershipName={dealership?.name} />
      default:
        return (
          <Dashboard
            contracts={contracts}
            summary={summary}
            loading={dataLoading}
            error={dataError}
            onSelectContract={handleSelectContract}
            onUpload={() => setShowUpload(true)}
            onRetry={loadData}
          />
        )
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        dealershipName={dealership?.name}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />
      <div className="app-content">
        <TopBar onToggleMobileMenu={() => setMobileMenuOpen(o => !o)} />
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
