const navItems = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'contracts', label: 'Contracts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5z" />
        <path d="M12 2v5h5" />
        <line x1="7" y1="10" x2="13" y2="10" />
        <line x1="7" y1="13" x2="13" y2="13" />
      </svg>
    ),
  },
  {
    id: 'analytics', label: 'Analytics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="3" height="7" rx="0.5" />
        <rect x="8.5" y="6" width="3" height="11" rx="0.5" />
        <rect x="14" y="3" width="3" height="14" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'vendors', label: 'Vendors',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="3" />
        <path d="M1 17c0-3 3-5 6-5s6 2 6 5" />
        <circle cx="15" cy="5" r="2.5" />
        <path d="M15 10c2.5 0 4 1.5 4 4" />
      </svg>
    ),
  },
  {
    id: 'reports', label: 'Reports',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="12" height="15" rx="1.5" />
        <path d="M8 1.5h4v2.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V1.5z" />
        <line x1="7" y1="9" x2="13" y2="9" />
        <line x1="7" y1="12" x2="11" y2="12" />
      </svg>
    ),
  },
  {
    id: 'settings', label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1.5v2M10 16.5v2M3.8 3.8l1.4 1.4M14.8 14.8l1.4 1.4M1.5 10h2M16.5 10h2M3.8 16.2l1.4-1.4M14.8 5.2l1.4-1.4" />
      </svg>
    ),
  },
]

export default function Sidebar({ currentPage, onNavigate, dealershipName }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#3b82f6" />
            <path d="M8 9h12M8 14h8M8 19h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div className="sidebar-brand">Contract Scorer</div>
          <div className="sidebar-dealership">{dealershipName || 'Loading...'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item${currentPage === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="sidebar-status-dot" />
          <span>System Online</span>
        </div>
        <div className="sidebar-status-time">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </aside>
  )
}
