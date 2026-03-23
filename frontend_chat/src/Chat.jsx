import React, { useState, useRef, useEffect } from 'react'
import './report.css'
import ReportRenderer from './ReportRenderer'
import RecipesView from './pages/RecipesView'

// API Configuration
// For local testing: use 'http://localhost:8000'
// For mobile testing on same network: use your computer's IP (e.g., 'http://192.168.1.100:8000')
// You can change this URL to match your setup
const API_BASE = 'http://localhost:8000';

// SVG Icons as components
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
)

const StethoscopeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"></path>
    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"></path>
    <circle cx="20" cy="10" r="2"></circle>
  </svg>
)

function systemText(message) {
  return { role: 'system', text: message }
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [facts, setFacts] = useState([])
  const [input, setInput] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [validatedReview, setValidatedReview] = useState('')
  const [offerRecipesFlag, setOfferRecipesFlag] = useState(false)
  const [isFinal, setIsFinal] = useState(false)
  const [recipesText, setRecipesText] = useState('')
  const [rawJsonHtml, setRawJsonHtml] = useState('')
  const [showQueryButtons, setShowQueryButtons] = useState(false)
  const [showActionButtons, setShowActionButtons] = useState(false)
  const [showRecipesPage, setShowRecipesPage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch opening message on mount
  useEffect(() => {
    async function fetchOpening() {
      try {
        const res = await fetch(API_BASE + '/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "START_CONVERSATION" }) // Send a trigger
        })
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        const data = await res.json()
        const botText = data.content || data.question || 'Namaste! I am your Ayurvedic AI assistant.';
        
        // Handle split messages for the initial greeting
        if (botText.includes('---NEXT_BUBBLE---')) {
          const bubbles = botText.split('---NEXT_BUBBLE---').filter(b => b.trim());
          const newMessages = bubbles.map(text => ({ role: 'bot', text: text.trim() }));
          setMessages(newMessages);
        } else {
          setMessages([{ role: 'bot', text: botText }])
        }
      } catch (err) {
        setConnectionError(err.message)
      }
    }
    fetchOpening()
  }, [])

  const lastBot = messages.slice().reverse().find(m => m.role === 'bot')
  const lastBotText = lastBot ? lastBot.text : ''

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-expand textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  async function postAsk(dataPayload) {
    const res = await fetch(API_BASE + '/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataPayload)
    })
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    const j = await res.json()
    return j
  }

  function syntaxHighlight(json) {
    if (!json) return ''
    const text = typeof json === 'string' ? json : JSON.stringify(json, null, 2)
    const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return esc
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\\\.|[^\\\\"])*")(?=\s*:)/g, '<span class="json-key">$1</span>')
      .replace(/(:\s*)("(\\u[a-zA-Z0-9]{4}|\\\\.|[^\\\\"])*")/g, '$1<span class="json-string">$2</span>')
      .replace(/(:\s*)(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/g, '$1<span class="json-number">$2</span>')
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
  }

  // Remove common markdown characters and headings left by LLMs
  function cleanMarkdown(text) {
    if (!text) return ''
    return String(text)
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#+\s/g, '')
      .replace(/`/g, '')
      .trim()
  }

  // Split cleaned text into sections and render simple structured blocks
  function renderDiagnosisSections(text) {
    if (!text) return null
    const parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
    return parts.map((p, i) => {
      const lines = p.split('\n').map(l => l.trim()).filter(Boolean)
      const first = lines[0] || ''
      const rest = lines.slice(1).join('\n')

      // key: value pattern
      if (/^\w[\w\s\-]{0,60}:/.test(first)) {
        const idx = first.indexOf(':')
        const key = first.slice(0, idx)
        const val = first.slice(idx + 1).trim() + (rest ? '\n' + rest : '')
        return (
          <div key={i} className="diagnosis-section">
            <div className="section-title"><h3>{key}</h3></div>
            <div className="kv-value">{val}</div>
          </div>
        )
      }

      // numbered heading like "1. Diagnosis"
      if (/^\d+\./.test(first) || /^[A-Z\s]{3,}/.test(first)) {
        return (
          <div key={i} className="diagnosis-section">
            <div className="section-title"><h3>{first}</h3></div>
            <div className="kv-value">{rest}</div>
          </div>
        )
      }

      // default plain paragraph block
      return (
        <div key={i} className="diagnosis-section">
          <div className="kv-value">{p}</div>
        </div>
      )
    })
  }

  async function postFinalize(factsArray) {
    const res = await fetch(API_BASE + '/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facts: factsArray })
    })
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    const j = await res.json()
    return j.diagnosis
  }

  async function postRecipes(factsArray, diagnosisText) {
    const res = await fetch(API_BASE + '/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facts: factsArray, diagnosis: diagnosisText })
    })
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    const j = await res.json()
    return j.recipes
  }

  async function handleSend() {
    if (!input.trim() || isLoading) return

    const userText = input.trim()
    setInput('')
    inputRef.current?.focus()

    setIsLoading(true)
    setConnectionError(null);

    // Add user message to UI
    setMessages(m => [...m, { role: 'user', text: userText }])
    // Show thinking state
    setMessages(m => [...m, { role: 'bot', text: '', isThinking: true }])

    try {
      // Logic is handled by the backend. We just send the message.
      // The backend maintains the session/history based on user_id.
      const resp = await postAsk({ message: userText })
      
      if (resp.type === 'diagnosis') {
        setIsFinal(true)
        setDiagnosis(resp.content)
        // Ensure we handle the "content" field correctly for the report
        setMessages(m => m.slice(0, -1).concat({ role: 'report', text: resp.content }))
        
        // After diagnosis, ask if they have queries
        setTimeout(() => {
          setMessages(m => [...m, { role: 'bot', text: 'Do you have any queries about the document?' }])
          setShowQueryButtons(true)
        }, 1000)
      } else {
        const botText = resp.content || resp.question || 'Error: invalid response from server.'
        
        // Handle split messages if '---NEXT_BUBBLE---' is present
        if (botText.includes('---NEXT_BUBBLE---')) {
          const bubbles = botText.split('---NEXT_BUBBLE---').filter(b => b.trim());
          const newMessages = bubbles.map(text => ({ role: 'bot', text: text.trim() }));
          
          setMessages(m => {
            const history = m.slice(0, -1); // Remove the thinking bubble
            return [...history, ...newMessages];
          });
        } else {
          setMessages(m => m.slice(0, -1).concat({ role: 'bot', text: botText }))
        }
      }
    } catch (e) {
      setConnectionError(`Could not connect to API at ${API_BASE}. Make sure the backend is running.`);
      setMessages(m => m.slice(0, -1).concat({ role: 'bot', text: 'Error: Could not connect to server. Please check if the backend is running.' }))
    }

    setIsLoading(false)
  }

  async function handleFinalize() {
    setIsLoading(true)
    setMessages(m => [...m, { role: 'bot', text: '', isThinking: true, loadingText: 'Generating final diagnosis...' }])
    try {
      const diag = await postFinalize(facts)
      setDiagnosis(diag)
      setMessages(m => m.slice(0, -1).concat({ role: 'report', text: diag }))
    } catch (e) {
      setMessages(m => m.slice(0, -1).concat({ role: 'bot', text: 'Error: failed to finalize.' }))
    }
    setIsLoading(false)
  }

  async function handleRecipes() {
    if (!diagnosis || isLoading) return
    setIsLoading(true)
    setMessages(m => [...m, { role: 'bot', text: '', isThinking: true, loadingText: 'Generating personalized recipes...' }])
    try {
      const r = await postRecipes(facts, diagnosis)
      setRecipesText(r)
      setShowRecipesPage(true)
    } catch (e) {
      setMessages(m => m.slice(0, -1).concat({ role: 'bot', text: 'Error: failed to get recipes.' }))
    }
    setIsLoading(false)
  }

  function handleFindDoctors() {
    try {
      if (navigator && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            const q = 'ayurvedic doctors'
            const url = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lon},14z`
            window.open(url, '_blank')
          },
          _err => {
            window.open('https://www.google.com/maps/search/ayurvedic+doctors+near+me', '_blank')
          },
          { timeout: 10000 }
        )
      } else {
        window.open('https://www.google.com/maps/search/ayurvedic+doctors+near+me', '_blank')
      }
    } catch (e) {
      window.open('https://www.google.com/maps/search/ayurvedic+doctors+near+me', '_blank')
    }
  }

  function handleQueryChoice(choice) {
    setShowQueryButtons(false)
    if (choice === 'yes') {
      setMessages(m => [...m, { role: 'user', text: 'Yes' }, { role: 'bot', text: 'Please go ahead with your questions about the report.' }])
    } else {
      setMessages(m => [...m, { role: 'user', text: 'No' }, { role: 'bot', text: 'You can now generate personalized recipes or find a doctor near you.' }])
      setShowActionButtons(true)
    }
  }

  const getPlaceholder = () => {
    if (lastBotText && /\?$/.test(lastBotText.trim())) {
      return 'Type your answer...'
    }
    return 'Describe your main health concern...'
  }

  return (
    <div className="chat-container">
      {showRecipesPage && recipesText && (
        <RecipesView recipes={recipesText} onBack={() => setShowRecipesPage(false)} />
      )}
      {connectionError && (
        <div className="connection-error">
          {connectionError}
          <br />
          <small>API: {API_BASE}</small>
        </div>
      )}
      
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg msg-${m.role}`}>
            {m.isThinking ? (
              <div className="msg-body msg-bot">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : (
              // If this message is a report, render the ReportRenderer in place
              m.role === 'report' ? (
                <div className="msg-body">
                  <ReportRenderer 
                    content={m.text} 
                  />
                </div>
              ) : (
                <div className="msg-body">{m.text}</div>
              )
            )}
            {i === messages.length - 1 && showQueryButtons && (
              <div className="button-options">
                <button className="option-btn" onClick={() => handleQueryChoice('yes')}>Yes</button>
                <button className="option-btn" onClick={() => handleQueryChoice('no')}>No</button>
              </div>
            )}
            {i === messages.length - 1 && showActionButtons && (
              <div className="button-options main-actions">
                <button className="action-btn-large" onClick={handleRecipes}>🍳 Get Recipes</button>
                <button className="action-btn-large" onClick={handleFindDoctors}>🏥 Find Doctors</button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="controls">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={getPlaceholder()}
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            rows={1}
            className="chat-input"
          />
          <button 
            className="send-button" 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <SendIcon />
            Send
          </button>
        </div>
        {offerRecipesFlag && (
          <div style={{ marginLeft: 12 }}>
            <button className="action-btn" onClick={handleRecipes} disabled={isLoading || !diagnosis}>
              Get Recipes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
