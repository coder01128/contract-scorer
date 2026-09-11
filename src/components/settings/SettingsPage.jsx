export default function SettingsPage({ dealershipName }) {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Settings</h1>
          <p className="dashboard-subtitle">Manage your dealership profile and preferences</p>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Dealership Profile</h2>
        <div className="settings-card">
          <div className="settings-profile-row">
            <div className="settings-logo-placeholder">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="24" height="24" rx="4" />
                <circle cx="12" cy="13" r="3" />
                <path d="M28 24l-6-6-14 14" />
              </svg>
              <span>Logo</span>
            </div>
            <div className="settings-fields">
              <div className="settings-field">
                <label>Dealership Name</label>
                <input type="text" value={dealershipName || 'Not configured'} readOnly className="settings-input" />
              </div>
              <div className="settings-field">
                <label>Industry</label>
                <input type="text" value="Automotive Dealership" readOnly className="settings-input" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Scoring Weights</h2>
        <p className="settings-section-desc">How the Deal Score is calculated from sub-scores.</p>
        <div className="settings-card">
          <div className="settings-weight">
            <div className="settings-weight-header">
              <span className="settings-weight-name">Pricing</span>
              <span className="settings-weight-pct">40%</span>
            </div>
            <div className="settings-weight-track">
              <div className="settings-weight-fill" style={{ width: '40%', background: '#3b82f6' }} />
            </div>
          </div>
          <div className="settings-weight">
            <div className="settings-weight-header">
              <span className="settings-weight-name">Terms</span>
              <span className="settings-weight-pct">30%</span>
            </div>
            <div className="settings-weight-track">
              <div className="settings-weight-fill" style={{ width: '30%', background: '#10b981' }} />
            </div>
          </div>
          <div className="settings-weight">
            <div className="settings-weight-header">
              <span className="settings-weight-name">Flexibility</span>
              <span className="settings-weight-pct">30%</span>
            </div>
            <div className="settings-weight-track">
              <div className="settings-weight-fill" style={{ width: '30%', background: '#f59e0b' }} />
            </div>
          </div>
          <p className="settings-weight-note">Weights are fixed. Contact support to customize.</p>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Team Members</h2>
        <div className="settings-card">
          <table className="settings-team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="settings-team-user">
                    <div className="vendor-avatar" style={{ background: '#3b82f6', width: 32, height: 32, fontSize: 13 }}>JD</div>
                    <span>John Doe</span>
                  </div>
                </td>
                <td>john@dealership.com</td>
                <td><span className="settings-role-badge">Admin</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
