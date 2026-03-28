import React, { useEffect, useRef, useState } from 'react'
import './report.css'
import ReportRenderer from './ReportRenderer'
import RecipesView from './pages/RecipesView'
import { sanitizeMarkdownText } from './utils/textUtils'
import { downloadMedicalReportPDF } from './utils/pdfExport'

const API_BASE = 'http://localhost:8000'
const SESSIONS_STORAGE_KEY = 'ayurveda-chat-sessions'
const ACTIVE_SESSION_STORAGE_KEY = 'ayurveda-chat-active-session'
const DOCTORS_FALLBACK_URL = 'https://www.google.com/maps/search/ayurvedic+doctors+near+me'
const SIDEBAR_WIDTH_STORAGE_KEY = 'ayurveda-chat-sidebar-width'

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
)

const SidebarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <path d="M9 4v16"></path>
  </svg>
)

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
)

const PlanIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
)

const UserIcon = () => (
  <div className="msg-icon msg-icon-user">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  </div>
)

const BotIcon = () => (
  <div className="msg-icon msg-icon-bot">
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 8h-1V7a5 5 0 0 0-10 0v1H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM8 7a3 3 0 0 1 6 0v1H8V7zm9 12H7v-9h10v9zm-8-6h2v2H9v-2zm4 0h2v2h-2v-2z" />
    </svg>
  </div>
)

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
)

function createSession(title = 'New consultation') {
  const now = new Date().toISOString()
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    facts: [],
    diagnosis: '',
    recipesText: '',
    showPostReportOptions: false
  }
}

function loadSessions() {
  if (typeof window === 'undefined') return [createSession()]

  try {
    const raw = window.localStorage.getItem(SESSIONS_STORAGE_KEY)
    if (!raw) return [createSession()]

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return [createSession()]

    return parsed.map(session => ({
      ...createSession(),
      ...session,
      messages: Array.isArray(session.messages) ? session.messages : [],
      facts: Array.isArray(session.facts) ? session.facts : []
    }))
  } catch (_error) {
    return [createSession()]
  }
}

function loadActiveSessionId() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
}

function loadSidebarWidth() {
  if (typeof window === 'undefined') return 280
  const raw = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY))
  if (!raw || Number.isNaN(raw)) return 280
  return Math.min(600, Math.max(260, raw))
}

function parseReportOnly(diagnosisText) {
  if (!diagnosisText) return null
  try {
    const reportJson = diagnosisText.includes('---REPORT_DATA---')
      ? diagnosisText.split('---REPORT_DATA---').filter(Boolean).pop()
      : diagnosisText
    const cleanedJson = reportJson?.replace(/```json/g, '').replace(/```/g, '').trim() || ''
    const start = cleanedJson.indexOf('{')
    const end = cleanedJson.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      return JSON.parse(cleanedJson.substring(start, end + 1))
    }
  } catch (_e) { }
  return null
}

function createSessionTitleFromDiagnosis(diagnosisText) {
  if (!diagnosisText) return 'New consultation'

  try {
    const reportJson = diagnosisText.includes('---REPORT_DATA---')
      ? diagnosisText.split('---REPORT_DATA---').filter(Boolean).pop()
      : diagnosisText
    const cleanedJson = reportJson?.replace(/```json/g, '').replace(/```/g, '').trim() || ''
    const start = cleanedJson.indexOf('{')
    const end = cleanedJson.lastIndexOf('}')

    if (start !== -1 && end !== -1) {
      const report = JSON.parse(cleanedJson.substring(start, end + 1))
      const rawName = report?.diagnosis?.name
      if (rawName) {
        // Strip out anything in parentheses for a cleaner "Major Diagnosis" display
        return rawName.split('(')[0].replace(/\*/g, '').replace(/\s+/g, ' ').trim()
      }
    }
  } catch (_error) {
    // Fall back to the default title when report parsing fails.
  }

  return 'New consultation'
}

// Re-export for backward compatibility
export { sanitizeMarkdownText } from './utils/textUtils'

function formatTitleForDisplay(title) {
  if (!title || title === 'New consultation') return title || 'New consultation'
  // Remove markdown symbols and anything in parentheses
  return title.split('(')[0].replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

function getSessionPreview(session) {
  const lastMessage = [...session.messages].reverse().find(message => !message.isThinking)
  if (!lastMessage?.text) return 'No messages yet'
  const normalized = sanitizeMarkdownText(lastMessage.text)
  return normalized.length > 54 ? `${normalized.slice(0, 54)}...` : normalized
}

function formatSessionTime(timestamp) {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

function openExternal(url) {
  const nextWindow = window.open(url, '_blank', 'noopener,noreferrer')
  if (nextWindow) {
    nextWindow.opener = null
  }
}

function DoctorsPanel({ diagnosisText }) {
  return (
    <>
      <div className="side-panel-note">
        <h3>Find Ayurvedic doctors</h3>
        <p>
          Open a nearby search in Google Maps while keeping the consultation visible beside it.
        </p>
      </div>

      {diagnosisText && (
        <div className="side-panel-diagnosis">
          <span>Current diagnosis</span>
          <p>{createSessionTitleFromDiagnosis(diagnosisText)}</p>
        </div>
      )}

      <button type="button" className="side-panel-cta" onClick={() => openExternal(DOCTORS_FALLBACK_URL)}>
        Open Google Maps
      </button>
    </>
  )
}

function MessageActions({
  showPostReportOptions,
  recipesExisting,
  onAskAboutReport,
  onRecipes,
  onFindDoctors
}) {
  if (!showPostReportOptions) return null

  return (
    <div className="msg-actions">
      <div className="button-options post-report-options">
        <button type="button" className="action-btn-large" onClick={onAskAboutReport}>Ask about report</button>
        {!recipesExisting && <button type="button" className="action-btn-large" onClick={onRecipes}>Get recipes</button>}
        <button type="button" className="action-btn-large" onClick={onFindDoctors}>Find doctors</button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isLastMessage,
  showPostReportOptions,
  recipesExisting,
  onAskAboutReport,
  onRecipes,
  onFindDoctors
}) {
  return (
    <div className={`msg msg-${message.role}`}>
      <div className="msg-content">
        {message.isThinking ? (
          <div className="msg-body msg-bot">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : message.role === 'report' ? (
          <div className="msg-body">
            <ReportRenderer content={message.text} />
          </div>
        ) : (
          <div className="msg-icon-wrapper">
            {message.role === 'user' ? <UserIcon /> : <BotIcon />}
            <div className="msg-body">{sanitizeMarkdownText(message.text)}</div>
          </div>
        )}

        {isLastMessage && (
          <MessageActions
            showPostReportOptions={showPostReportOptions}
            recipesExisting={recipesExisting}
            onAskAboutReport={onAskAboutReport}
            onRecipes={onRecipes}
            onFindDoctors={onFindDoctors}
          />
        )}
      </div>
    </div>
  )
}

const PANEL_WIDTH_STORAGE_KEY = 'ayurveda_assistant_panel_width'

function loadPanelWidth() {
  if (typeof window === 'undefined') return 420
  const raw = Number(window.localStorage.getItem(PANEL_WIDTH_STORAGE_KEY))
  if (!raw || Number.isNaN(raw)) return 420
  return Math.min(800, Math.max(320, raw))
}

export default function Chat() {
  const [sessions, setSessions] = useState(() => loadSessions())
  const [activeSessionId, setActiveSessionId] = useState(() => loadActiveSessionId())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [activeSidePanel, setActiveSidePanel] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarWidth())
  const [panelWidth, setPanelWidth] = useState(() => loadPanelWidth())
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const openingRequestsRef = useRef(new Set())
  const isResizingSidebarRef = useRef(false)
  const isResizingPanelRef = useRef(false)

  const activeSession = sessions.find(session => session.id === activeSessionId) || sessions[0] || null

  useEffect(() => {
    if (!activeSession && sessions.length === 0) {
      const firstSession = createSession()
      setSessions([firstSession])
      setActiveSessionId(firstSession.id)
      return
    }

    if (activeSessionId && sessions.some(session => session.id === activeSessionId)) return

    if (sessions[0]) {
      setActiveSessionId(sessions[0].id)
    }
  }, [activeSession, activeSessionId, sessions])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
  }, [sessions])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth))
  }, [sidebarWidth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidth))
  }, [panelWidth])

  useEffect(() => {
    if (typeof window === 'undefined' || !activeSessionId) return
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId)
  }, [activeSessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [activeSessionId])

  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`
  }, [input])

  useEffect(() => {
    if (!activeSession) return
    if (activeSession.messages.length > 0) return
    if (openingRequestsRef.current.has(activeSession.id)) return

    openingRequestsRef.current.add(activeSession.id)

    async function fetchOpening(sessionId) {
      try {
        const res = await fetch(buildApiUrl('/ask', sessionId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'START_CONVERSATION' })
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)

        const data = await res.json()
        const botText = data.content || data.question || 'Namaste! I am your Ayurvedic AI assistant.'
        const nextMessages = botText.includes('---NEXT_BUBBLE---')
          ? botText.split('---NEXT_BUBBLE---').filter(Boolean).map(text => ({ role: 'bot', text: text.trim() }))
          : [{ role: 'bot', text: botText }]

        updateSessionById(sessionId, session => ({
          ...session,
          messages: nextMessages
        }))

        if (sessionId === activeSessionId) {
          setConnectionError(null)
        }
      } catch (_error) {
        openingRequestsRef.current.delete(sessionId)
        if (sessionId === activeSessionId) {
          setConnectionError('Unable to reach the assistant service right now.')
        }
      }
    }

    fetchOpening(activeSession.id)
  }, [activeSession, activeSessionId])

  useEffect(() => {
    function handlePointerMove(event) {
      if (isResizingSidebarRef.current) {
        setSidebarWidth(Math.min(600, Math.max(260, event.clientX - 24)))
      } else if (isResizingPanelRef.current) {
        const newWidth = window.innerWidth - event.clientX
        setPanelWidth(Math.min(800, Math.max(320, newWidth)))
      }
    }

    function handlePointerUp() {
      isResizingSidebarRef.current = false
      isResizingPanelRef.current = false
      document.body.classList.remove('sidebar-resizing')
      document.body.classList.remove('panel-resizing')
    }

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)

    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [])

  function updateSessionById(sessionId, updater) {
    setSessions(prevSessions => {
      const nextSessions = prevSessions.map(session => {
        if (session.id !== sessionId) return session
        const updated = updater(session)
        return {
          ...updated,
          updatedAt: new Date().toISOString()
        }
      })

      nextSessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      return nextSessions
    })
  }

  function buildApiUrl(path, sessionId) {
    return `${API_BASE}${path}?user_id=${encodeURIComponent(sessionId)}`
  }

  async function postAsk(sessionId, dataPayload) {
    const res = await fetch(buildApiUrl('/ask', sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPayload)
    })
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`)
    }
    return res.json()
  }

  async function postRecipes(sessionId, diagnosisText) {
    const res = await fetch(buildApiUrl('/recipes', sessionId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagnosis: diagnosisText })
    })
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`)
    }
    const data = await res.json()
    return data.recipes
  }

  async function handleSend() {
    if (!input.trim() || isLoading || !activeSession) return

    const sessionId = activeSession.id
    const userText = input.trim()
    setInput('')
    setIsLoading(true)
    setConnectionError(null)

    updateSessionById(sessionId, session => ({
      ...session,
      showPostReportOptions: false,
      messages: [...session.messages, { role: 'user', text: userText }, { role: 'bot', text: '', isThinking: true }]
    }))

    try {
      const resp = await postAsk(sessionId, {
        message: userText,
        diagnosis: activeSession.diagnosis || ''
      })

      if (resp.type === 'diagnosis') {
        updateSessionById(sessionId, session => ({
          ...session,
          title: createSessionTitleFromDiagnosis(resp.content),
          diagnosis: resp.content,
          showPostReportOptions: false,
          messages: session.messages.slice(0, -1).concat({ role: 'report', text: resp.content })
        }))

        window.setTimeout(() => {
          updateSessionById(sessionId, session => ({
            ...session,
            showPostReportOptions: true,
            messages: [...session.messages, { role: 'bot', text: 'What would you like to do next?' }]
          }))
        }, 1000)
      } else {
        const botText = resp.content || resp.question || 'Error: invalid response from server.'

        updateSessionById(sessionId, session => ({
          ...session,
          showPostReportOptions: Boolean(session.diagnosis),
          messages: botText.includes('---NEXT_BUBBLE---')
            ? sessionMessagesWithoutThinking(session.messages).concat(
              botText.split('---NEXT_BUBBLE---').filter(b => b.trim()).map(text => ({ role: 'bot', text: text.trim() }))
            )
            : session.messages.slice(0, -1).concat({ role: 'bot', text: botText })
        }))
      }
    } catch (_error) {
      if (sessionId === activeSessionId) {
        setConnectionError('Unable to reach the assistant service right now.')
      }

      updateSessionById(sessionId, session => ({
        ...session,
        messages: session.messages.slice(0, -1).concat({
          role: 'bot',
          text: 'Error: Could not connect to server. Please check if the backend is running.'
        })
      }))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRecipes() {
    if (!activeSession || !activeSession.diagnosis || isLoading) return

    const sessionId = activeSession.id
    setIsLoading(true)
    setSidebarOpen(false)
    setActiveSidePanel('recipes')

    updateSessionById(sessionId, session => ({
      ...session,
      showPostReportOptions: false,
      messages: [...session.messages, { role: 'bot', text: '', isThinking: true }]
    }))

    try {
      const recipes = await postRecipes(sessionId, activeSession.diagnosis)
      updateSessionById(sessionId, session => ({
        ...session,
        recipesText: recipes,
        showPostReportOptions: true,
        messages: session.messages.slice(0, -1)
      }))
    } catch (_error) {
      updateSessionById(sessionId, session => ({
        ...session,
        showPostReportOptions: Boolean(session.diagnosis),
        messages: session.messages.slice(0, -1).concat({ role: 'bot', text: 'Error: failed to get recipes.' })
      }))
      setActiveSidePanel(null)
    } finally {
      setIsLoading(false)
    }
  }

  function handleFindDoctors() {
    if (!activeSession?.diagnosis) return

    updateSessionById(activeSession.id, session => ({
      ...session,
      showPostReportOptions: true
    }))
    setSidebarOpen(false)
    setActiveSidePanel('doctors')
  }

  function handleAskAboutReport() {
    if (!activeSession) return

    updateSessionById(activeSession.id, session => ({
      ...session,
      showPostReportOptions: false,
      messages: [
        ...session.messages,
        {
          role: 'bot',
          text: 'Ask me anything about the report, and I can also help with recipes or finding a doctor afterward.'
        }
      ]
    }))
  }

  function handleNewSession() {
    const nextSession = createSession()
    setSessions(prev => [nextSession, ...prev])
    setActiveSessionId(nextSession.id)
    setInput('')
    setIsLoading(false)
    setConnectionError(null)
    setActiveSidePanel(null)
  }

  function handleSelectSession(sessionId) {
    setActiveSessionId(sessionId)
    setInput('')
    setConnectionError(null)
    setActiveSidePanel(null)
  }

  function handleDeleteSession(sessionId) {
    const remaining = sessions.filter(session => session.id !== sessionId)
    const nextSessions = remaining.length > 0 ? remaining : [createSession()]

    setSessions(nextSessions)

    if (activeSessionId === sessionId) {
      setActiveSessionId(nextSessions[0]?.id || null)
      setActiveSidePanel(null)
      setConnectionError(null)
    }
  }

  function startSidebarResize() {
    isResizingSidebarRef.current = true
    document.body.classList.add('sidebar-resizing')
  }

  function startPanelResize() {
    isResizingPanelRef.current = true
    document.body.classList.add('panel-resizing')
  }

  const placeholder = activeSession?.messages?.some(message => message.role === 'bot' && /\?$/.test(message.text?.trim() || ''))
    ? 'Type your answer...'
    : 'Message Ayurveda Clinical Assistant'

  return (
    <div
      className={`chat-layout${sidebarOpen ? ' sidebar-open' : ' sidebar-closed'}${activeSidePanel ? ' panel-open' : ''}`}
      style={{
        '--sidebar-width': `${sidebarWidth}px`,
        '--panel-width': `${panelWidth}px`
      }}
    >
      <aside className={`session-sidebar${sidebarOpen ? '' : ' hidden'}`}>
        <div className="sidebar-header sidebar-header-chatgpt">
          <button type="button" className="new-session-button new-session-button-chatgpt" onClick={handleNewSession}>
            <PlusIcon />
            <span>New chat</span>
          </button>
        </div>

        <div className="session-list">
          {sessions.map(session => (
            <div
              key={session.id}
              className={`session-card${session.id === activeSession?.id ? ' active' : ''}`}
            >
              <div className="session-card-main">
                <button
                  type="button"
                  className="session-select"
                  onClick={() => handleSelectSession(session.id)}
                  aria-current={session.id === activeSession?.id ? 'page' : undefined}
                >
                  <span className="session-card-title">{formatTitleForDisplay(session.title)}</span>
                  <span className="session-card-preview">{getSessionPreview(session)}</span>
                </button>
              </div>
              <div className="session-card-meta">
                <span>{formatSessionTime(session.updatedAt)}</span>
                <button
                  type="button"
                  className="session-delete"
                  onClick={() => handleDeleteSession(session.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Collapse tab on right edge of sidebar */}
        <button
          type="button"
          className="sidebar-collapse-tab"
          onClick={() => setSidebarOpen(false)}
          aria-label="Collapse sidebar"
        >
          &#8249;
        </button>
      </aside>

      {/* Floating expand tab when sidebar is hidden */}
      {!sidebarOpen && (
        <button
          type="button"
          className="sidebar-expand-tab"
          onClick={() => setSidebarOpen(true)}
          aria-label="Expand sidebar"
        >
          &#8250;
        </button>
      )}

      {sidebarOpen && <div className="sidebar-resizer" onMouseDown={startSidebarResize} aria-hidden="true" />}

      <div className="chat-main">
        <div className="chat-topbar chat-topbar-chatgpt">
          <div className="chat-topbar-left">
            {/* Topbar toggle removed - sidebar has its own tabs */}
          </div>
          <div className="chat-topbar-copy">
            <h2>{formatTitleForDisplay(activeSession?.title || 'New consultation')}</h2>
          </div>
          <div className="chat-topbar-actions">
            {activeSession?.diagnosis && (
              <button
                type="button"
                className="topbar-action-btn"
                title="Download Medical Report (PDF)"
                onClick={() => {
                  const report = parseReportOnly(activeSession.diagnosis)
                  if (report) {
                    downloadMedicalReportPDF(report)
                  } else {
                    console.warn('Could not parse report data from diagnosis')
                  }
                }}
              >
                <DownloadIcon />
                <span>Report</span>
              </button>
            )}
            {activeSession?.recipesText && (
              <button
                type="button"
                className="topbar-action-btn"
                title="View Personalized Plan"
                onClick={() => setActiveSidePanel('recipes')}
              >
                <PlanIcon />
                <span>Plan</span>
              </button>
            )}
            {activeSidePanel && (
              <button type="button" className="panel-close" onClick={() => setActiveSidePanel(null)}>
                Close
              </button>
            )}
          </div>
        </div>

        <div className="chat-surface chat-surface-chatgpt">
          {connectionError && (
            <div className="connection-error">
              <strong>Connection issue</strong>
              <span>{connectionError}</span>
              <small>Backend endpoint: {API_BASE}</small>
            </div>
          )}

          <div className="messages">
            {activeSession?.messages.map((message, index) => (
              <MessageBubble
                key={`${activeSession.id}-${index}`}
                message={message}
                isLastMessage={index === activeSession.messages.length - 1}
                showPostReportOptions={activeSession.showPostReportOptions}
                recipesExisting={Boolean(activeSession.recipesText)}
                onAskAboutReport={handleAskAboutReport}
                onRecipes={handleRecipes}
                onFindDoctors={handleFindDoctors}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="controls controls-chatgpt">
            <div className="input-wrapper input-wrapper-chatgpt">
              <textarea
                ref={inputRef}
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={placeholder}
                disabled={isLoading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                rows={1}
                className="chat-input"
                aria-label="Message input"
              />
              <button
                type="button"
                className="send-button send-button-chatgpt"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                title="Send Message"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeSidePanel && (
        <div className="panel-resizer" onMouseDown={startPanelResize} aria-hidden="true" />
      )}

      {activeSidePanel && (
        <aside className="side-panel" style={{ width: 'var(--panel-width)' }}>
          <div className="side-panel-header">
            <div>
              <p>{activeSidePanel === 'recipes' ? 'Recipes' : 'Doctors'}</p>
              <h3>{activeSidePanel === 'recipes' ? 'Personalized plan' : 'Nearby care'}</h3>
            </div>
            <button type="button" className="panel-close panel-close-icon" onClick={() => setActiveSidePanel(null)}>
              x
            </button>
          </div>

          <div className="side-panel-body">
            {activeSidePanel === 'recipes' ? (
              <RecipesView embedded recipes={activeSession?.recipesText || ''} />
            ) : (
              <DoctorsPanel diagnosisText={activeSession?.diagnosis} />
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

function sessionMessagesWithoutThinking(messages) {
  return messages.filter(message => !message.isThinking)
}
