import './Settings.css'

function Settings({ theme, botMode, selectedVoice, onThemeChange, onModeChange, onVoiceChange, onClose, onClearHistory, onExport }) {
  const botModes = [
    { id: 'general', label: 'General Guidance', emoji: '💼', desc: 'General career advice' },
    { id: 'interview', label: 'Interview Prep', emoji: '🎤', desc: 'Prepare for interviews' },
    { id: 'resume', label: 'Resume Builder', emoji: '📄', desc: 'Resume & cover letter tips' },
    { id: 'salary', label: 'Salary Guide', emoji: '💰', desc: 'Salary negotiation' },
    { id: 'skills', label: 'Skill Development', emoji: '🎓', desc: 'Learn new skills' }
  ]

  const voices = [
    { id: 'female-indian', label: 'Female (Indian Accent)', emoji: '👩‍🦰', desc: 'Cute female voice with Indian accent' },
    { id: 'female', label: 'Female (American)', emoji: '👩', desc: 'Female voice with American accent' },
    { id: 'male', label: 'Male (American)', emoji: '👨', desc: 'Male voice with American accent' }
  ]

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ Settings & Preferences</h2>
          <button className="close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* Theme Section */}
          <div className="settings-section">
            <h3>🎨 Theme</h3>
            <div className="theme-toggle">
              <button 
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={onThemeChange}
              >
                ☀️ Light
              </button>
              <button 
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={onThemeChange}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          {/* Bot Mode Section */}
          <div className="settings-section">
            <h3>🤖 AI Coach Mode</h3>
            <div className="modes-grid">
              {botModes.map(mode => (
                <button
                  key={mode.id}
                  className={`mode-card ${botMode === mode.id ? 'active' : ''}`}
                  onClick={() => onModeChange(mode.id)}
                >
                  <div className="mode-emoji">{mode.emoji}</div>
                  <div className="mode-label">{mode.label}</div>
                  <div className="mode-desc">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selection */}
          <div className="settings-section">
            <h3>🎙️ Voice Selection</h3>
            <div className="voices-grid">
              {voices.map(voice => (
                <button
                  key={voice.id}
                  className={`voice-card ${selectedVoice === voice.id ? 'active' : ''}`}
                  onClick={() => onVoiceChange(voice.id)}
                >
                  <div className="voice-emoji">{voice.emoji}</div>
                  <div className="voice-label">{voice.label}</div>
                  <div className="voice-desc">{voice.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Data Management */}
          <div className="settings-section">
            <h3>💾 Data & Export</h3>
            <div className="action-buttons">
              <button className="export-btn" onClick={() => onExport('txt')}>
                📥 Export as Text
              </button>
              <button className="clear-btn" onClick={onClearHistory}>
                🗑️ Clear All Chats
              </button>
            </div>
            <p className="settings-note">
              All your data is stored locally in your browser. No data is sent to any server except your API requests.
            </p>
          </div>

          {/* Info Section */}
          <div className="settings-section">
            <h3>ℹ️ About</h3>
            <div className="about-info">
              <p><strong>CareerBot AI v3.0</strong></p>
              <p>Your AI-powered career guidance platform with interactive dashboard, career quiz, resume analyzer, and voice capabilities. Powered by Gemini or OpenRouter API.</p>
              <ul>
                <li>✓ 📊 Interactive Career Dashboard</li>
                <li>✓ 🧩 Career Discovery Quiz</li>
                <li>✓ 📄 AI Resume Analyzer</li>
                <li>✓ 🎯 Skill Gap Analysis</li>
                <li>✓ 5 AI coaching modes</li>
                <li>✓ 3 voice options with TTS</li>
                <li>✓ Voice input & output</li>
                <li>✓ Dark/Light premium themes</li>
                <li>✓ Export conversations</li>
                <li>✓ Local data storage</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
