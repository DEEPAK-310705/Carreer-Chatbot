import { useState } from 'react'
import './Sidebar.css'

function Sidebar({
  onSettingsClick,
  botMode,
  activeView,
  onViewChange,
  backendStatus,
  dbConnected,
  conversationList = [],
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  onDeleteConversation,
  onChangeApiKey,
}) {
  const [showHistory, setShowHistory] = useState(false)

  const navTabs = [
    { id: 'chat', label: 'AI Chat', icon: '💬', desc: 'Career guidance chat' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', desc: 'Charts & analytics' },
    { id: 'quiz', label: 'Career Quiz', icon: '🧩', desc: 'Find your path' },
    { id: 'resume', label: 'Resume', icon: '📄', desc: 'AI resume analysis' }
  ]

  const botModes = [
    { id: 'general', label: '💼 General Guidance', icon: '💼' },
    { id: 'interview', label: '🎤 Interview Prep', icon: '🎤' },
    { id: 'resume', label: '📄 Resume Builder', icon: '📄' },
    { id: 'salary', label: '💰 Salary Guide', icon: '💰' },
    { id: 'skills', label: '🎓 Skill Development', icon: '🎓' }
  ]

  const getStatusInfo = () => {
    switch (backendStatus) {
      case 'online':
        return { dot: 'active', text: '✓ Server Online', color: 'var(--success)' }
      case 'no-key':
        return { dot: 'warning', text: '⚠ API Key Missing', color: 'var(--warning)' }
      case 'offline':
        return { dot: '', text: '✗ Server Offline', color: 'var(--error)' }
      case 'checking':
      default:
        return { dot: 'checking', text: '⋯ Connecting...', color: 'var(--text-muted)' }
    }
  }

  const statusInfo = getStatusInfo()

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }

  return (
    <aside className="sidebar">
      <div className="top-section">
        <div className="logo">
          <div className="logo-icon">💼</div>
          <div className="logo-text">CareerBot</div>
        </div>

        <button className="settings-btn" onClick={onSettingsClick} title="Settings">
          ⚙️
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        {navTabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onViewChange(tab.id)}
            title={tab.desc}
          >
            <span className="nav-tab-icon">{tab.icon}</span>
            <div className="nav-tab-info">
              <span className="nav-tab-label">{tab.label}</span>
              <span className="nav-tab-desc">{tab.desc}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Chat History (DB-connected) */}
      {dbConnected && (
        <div className="section">
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💾 Chat History</span>
            <button
              className="history-toggle-btn"
              onClick={() => setShowHistory(!showHistory)}
              title={showHistory ? 'Collapse' : 'Expand'}
            >
              {showHistory ? '▲' : '▼'}
            </button>
          </div>

          <button className="new-chat-btn" onClick={onNewConversation}>
            ✨ New Chat
          </button>

          {showHistory && (
            <div className="conversation-list">
              {conversationList.length === 0 ? (
                <p className="mode-info" style={{ textAlign: 'center', padding: '8px 0' }}>
                  No saved conversations yet
                </p>
              ) : (
                conversationList.map(conv => (
                  <div
                    key={conv._id}
                    className={`conversation-item ${currentConversationId === conv._id ? 'active' : ''}`}
                    onClick={() => onLoadConversation(conv._id)}
                  >
                    <div className="conv-title">{conv.title}</div>
                    <div className="conv-meta">
                      <span className="conv-count">{conv.messageCount} msgs</span>
                      <span className="conv-time">{formatDate(conv.updatedAt)}</span>
                    </div>
                    <button
                      className="conv-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this conversation?')) {
                          onDeleteConversation(conv._id)
                        }
                      }}
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="section">
        <div className="section-title">Current Mode</div>
        <div className="mode-display">
          {botModes.find(m => m.id === botMode)?.icon} {botModes.find(m => m.id === botMode)?.label}
        </div>
        <p className="mode-info">Change mode in settings to customize AI responses</p>
      </div>

      <div className="section">
        <div className="section-title">Server Status</div>
        <div className="key-status">
          <div className={`status-dot ${statusInfo.dot}`}></div>
          <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>
        </div>
        {dbConnected && (
          <div className="key-status" style={{ marginTop: '4px' }}>
            <div className="status-dot active"></div>
            <span style={{ color: 'var(--success)' }}>🗄️ Database Connected</span>
          </div>
        )}
        {!dbConnected && backendStatus === 'online' && (
          <div className="key-status" style={{ marginTop: '4px' }}>
            <div className="status-dot warning"></div>
            <span style={{ color: 'var(--warning)' }}>🗄️ No Database</span>
          </div>
        )}
        {backendStatus === 'no-key' && (
          <p className="mode-info" style={{ color: 'var(--warning)', marginTop: '6px' }}>
            Set GEMINI_API_KEY or OPENROUTER_API_KEY in server/.env
          </p>
        )}
        {backendStatus === 'offline' && (
          <p className="mode-info" style={{ color: 'var(--error)', marginTop: '6px' }}>
            Run: cd server && node server.js
          </p>
        )}
        {onChangeApiKey && (
          <button className="new-chat-btn" style={{ marginTop: '8px' }} onClick={onChangeApiKey}>
            🔑 Change API Key
          </button>
        )}
      </div>

      <div className="section">
        <div className="section-title">Pro Tips</div>
        <div className="section-content">
          • <span className="highlight">Enter</span> to send<br />
          • <span className="highlight">Shift+Enter</span> for new line<br />
          • Copy & regenerate messages<br />
          • Export your chat history<br />
          • Dark/Light theme support
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
