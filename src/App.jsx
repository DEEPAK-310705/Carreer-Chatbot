import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import Sidebar from './components/Sidebar'
import ChatArea from './components/ChatArea'
import Settings from './components/Settings'
import Dashboard from './components/Dashboard'
import CareerQuiz from './components/CareerQuiz'
import ResumeAnalyzer from './components/ResumeAnalyzer'
import * as db from './api/db'

// Generate or retrieve a persistent session ID
function getSessionId() {
  let id = localStorage.getItem('careerbot_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('careerbot_session_id', id)
  }
  return id
}

function App() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [theme, setTheme] = useState('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [botMode, setBotMode] = useState('general')
  const [activeView, setActiveView] = useState('chat')
  const [backendStatus, setBackendStatus] = useState('checking')
  const [dbConnected, setDbConnected] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('voice_enabled')
    return saved !== null ? saved === 'true' : true
  })
  const [selectedVoice, setSelectedVoice] = useState(localStorage.getItem('selected_voice') || 'female-indian')
  const messagesEndRef = useRef(null)

  // Conversation tracking
  const [sessionId] = useState(getSessionId)
  const [currentConversationId, setCurrentConversationId] = useState(() => localStorage.getItem('career_chat_id') || null)
  const [conversationList, setConversationList] = useState([])

  // Persist current conversation ID
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('career_chat_id', currentConversationId)
    } else {
      localStorage.removeItem('career_chat_id')
    }
  }, [currentConversationId])

  // Check backend health on mount and periodically
  useEffect(() => {
    checkBackendHealth()
    const interval = setInterval(checkBackendHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkBackendHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.status === 'ok') {
        setBackendStatus(data.apiKeyConfigured ? 'online' : 'no-key')
        setDbConnected(data.databaseConnected || false)
      } else {
        setBackendStatus('offline')
        setDbConnected(false)
      }
    } catch {
      setBackendStatus('offline')
      setDbConnected(false)
    }
  }

  // Initialize session and load data
  useEffect(() => {
    initSession()
  }, [])

  const initSession = async () => {
    // Initialize with DB session
    await db.getOrCreateSession(sessionId)

    // Load preferences from DB
    const prefs = await db.loadPreferences(sessionId)
    if (prefs) {
      setTheme(prefs.theme || 'dark')
      setBotMode(prefs.botMode || 'general')
      setVoiceEnabled(prefs.voiceEnabled !== undefined ? prefs.voiceEnabled : true)
      setSelectedVoice(prefs.selectedVoice || 'female-indian')
      document.documentElement.setAttribute('data-theme', prefs.theme || 'dark')
    } else {
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('chatbot_theme')
      if (savedTheme) {
        setTheme(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
      }
      const savedMode = localStorage.getItem('chatbot_mode')
      if (savedMode) setBotMode(savedMode)
    }

    // Load conversation list
    await refreshConversationList()

    // Load current chat from localStorage as fallback
    const savedHistory = localStorage.getItem('career_chat_history')
    if (savedHistory) {
      setMessages(JSON.parse(savedHistory))
    }
  }

  const refreshConversationList = useCallback(async () => {
    const convos = await db.listConversations(sessionId)
    setConversationList(convos)
    return convos
  }, [sessionId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save voice enabled state to localStorage
  useEffect(() => {
    localStorage.setItem('voice_enabled', voiceEnabled)
  }, [voiceEnabled])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('chatbot_theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    // Save to DB
    syncPreferences({ theme: newTheme })
  }

  const changeBotMode = (mode) => {
    setBotMode(mode)
    localStorage.setItem('chatbot_mode', mode)
    syncPreferences({ botMode: mode })
  }

  const changeVoice = (voice) => {
    setSelectedVoice(voice)
    localStorage.setItem('selected_voice', voice)
    syncPreferences({ selectedVoice: voice })
  }

  // Sync preferences to DB (debounced-style — fires on each change)
  const syncPreferences = async (overrides = {}) => {
    const prefs = {
      theme,
      botMode,
      voiceEnabled,
      selectedVoice,
      ...overrides,
    }
    await db.savePreferences(sessionId, prefs)
  }

  const saveChatHistory = (newMessages) => {
    localStorage.setItem('career_chat_history', JSON.stringify(newMessages))
  }

  const clearChatHistory = async () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      setMessages([])
      localStorage.removeItem('career_chat_history')
      setError('')
      setCurrentConversationId(null)

      // Delete all conversations from DB
      if (dbConnected) {
        await db.deleteAllConversations(sessionId)
        await refreshConversationList()
      }
    }
  }

  const exportChat = (format = 'txt') => {
    if (messages.length === 0) {
      setError('No messages to export')
      return
    }

    let content = 'Career Guidance Chatbot - Conversation Export\n'
    content += `Date: ${new Date().toLocaleString()}\n`
    content += `Mode: ${botMode.toUpperCase()}\n`
    content += '='.repeat(50) + '\n\n'

    messages.forEach((msg) => {
      content += `${msg.role.toUpperCase()}: ${msg.content}\n\n`
    })

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `career-chat-${Date.now()}.${format}`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const sendMessage = async (userMessage) => {
    if (backendStatus !== 'online') {
      setError(backendStatus === 'no-key'
        ? 'The server API key is not configured. Please set GEMINI_API_KEY in the server .env file.'
        : 'Backend server is offline. Please make sure the server is running.')
      return
    }

    if (!userMessage.trim()) return

    setError('')
    setIsLoading(true)
    setActiveView('chat')

    const userMsg = { role: 'user', content: userMessage, timestamp: new Date(), voice: selectedVoice }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    saveChatHistory(newMessages)

    // Create or update conversation in DB
    let convId = currentConversationId
    if (dbConnected) {
      if (!convId) {
        // Create new conversation
        const conv = await db.createConversation(sessionId, botMode, [userMsg])
        if (conv) {
          convId = conv._id
          setCurrentConversationId(convId)
          await refreshConversationList()
        }
      } else {
        // Add message to existing conversation
        await db.addMessage(convId, 'user', userMessage, selectedVoice)
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          mode: botMode
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Server error')
      }

      const botMsg = { role: 'bot', content: data.reply, timestamp: new Date(), voice: selectedVoice }
      const updatedMessages = [...newMessages, botMsg]
      setMessages(updatedMessages)
      saveChatHistory(updatedMessages)

      // Save bot reply to DB
      if (dbConnected && convId) {
        await db.addMessage(convId, 'bot', data.reply, selectedVoice)
        await refreshConversationList()
      }
    } catch (error) {
      console.error(error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const regenerateLastMessage = async () => {
    if (messages.length < 2) return

    const lastUserMessageIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMessageIdx === -1) return

    const actualIdx = messages.length - 1 - lastUserMessageIdx
    const userMessage = messages[actualIdx].content

    const truncatedMessages = messages.slice(0, actualIdx + 1)
    setMessages(truncatedMessages)
    saveChatHistory(truncatedMessages)

    await sendMessage(userMessage)
  }

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content)
    alert('Message copied to clipboard!')
  }

  const handleQuizDiscuss = (msg) => {
    setActiveView('chat')
    sendMessage(msg)
  }

  // Load a specific conversation from the DB
  const loadConversation = async (conversationId) => {
    const conv = await db.getConversation(conversationId)
    if (conv) {
      setMessages(conv.messages)
      setCurrentConversationId(conv._id)
      setBotMode(conv.mode || 'general')
      saveChatHistory(conv.messages)
      setActiveView('chat')
    }
  }

  // Start a new conversation
  const startNewConversation = () => {
    setMessages([])
    setCurrentConversationId(null)
    localStorage.removeItem('career_chat_history')
    setActiveView('chat')
  }

  // Delete a specific conversation
  const handleDeleteConversation = async (conversationId) => {
    const success = await db.deleteConversation(conversationId)
    if (success) {
      if (currentConversationId === conversationId) {
        startNewConversation()
      }
      await refreshConversationList()
    }
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />
      case 'quiz':
        return <CareerQuiz onDiscussWithAI={handleQuizDiscuss} />
      case 'resume':
        return <ResumeAnalyzer sessionId={sessionId} />
      case 'chat':
      default:
        return (
          <ChatArea
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSendMessage={sendMessage}
            onDismissError={() => setError('')}
            messagesEndRef={messagesEndRef}
            onCopyMessage={copyMessage}
            onRegenerateMessage={regenerateLastMessage}
            hasMessages={messages.length > 0}
            theme={theme}
            selectedVoice={selectedVoice}
          />
        )
    }
  }

  return (
    <div className="app" data-theme={theme}>
      {showSettings && (
        <Settings
          theme={theme}
          botMode={botMode}
          selectedVoice={selectedVoice}
          onThemeChange={toggleTheme}
          onModeChange={changeBotMode}
          onVoiceChange={changeVoice}
          onClose={() => setShowSettings(false)}
          onClearHistory={clearChatHistory}
          onExport={exportChat}
        />
      )}
      <div className="container">
        <Sidebar
          onSettingsClick={() => setShowSettings(true)}
          botMode={botMode}
          activeView={activeView}
          onViewChange={setActiveView}
          backendStatus={backendStatus}
          dbConnected={dbConnected}
          conversationList={conversationList}
          currentConversationId={currentConversationId}
          onLoadConversation={loadConversation}
          onNewConversation={startNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
        {renderActiveView()}
      </div>
    </div>
  )
}

export default App
