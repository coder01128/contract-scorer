export default function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-search">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="8" cy="8" r="5.5" />
          <line x1="12" y1="12" x2="16" y2="16" />
        </svg>
        <input
          type="text"
          placeholder="Search contracts, vendors, or services..."
          className="topbar-search-input"
          readOnly
        />
      </div>
      <div className="topbar-right">
        <button className="topbar-bell" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2a5 5 0 0 0-5 5c0 4-2 5-2 5h14s-2-1-2-5a5 5 0 0 0-5-5z" />
            <path d="M8.5 17a2 2 0 0 0 3 0" />
          </svg>
        </button>
        <div className="topbar-user">
          <div className="topbar-avatar">JD</div>
          <div className="topbar-user-info">
            <div className="topbar-user-name">John Doe</div>
            <div className="topbar-user-role">Admin</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </div>
      </div>
    </header>
  )
}
