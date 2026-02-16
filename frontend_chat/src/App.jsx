import React from 'react'
import Chat from './Chat'

// Lotus flower icon for the header
const LotusIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    width="24" 
    height="24"
  >
    <path d="M12 2C12 2 8 6 8 10c0 2.21 1.79 4 4 4s4-1.79 4-4c0-4-4-8-4-8zm0 14c-2.21 0-4-1.79-4-4 0-3 2.5-6.5 4-8.5 1.5 2 4 5.5 4 8.5 0 2.21-1.79 4-4 4z"/>
    <path d="M12 6c-1.5 0-3 1.5-3 3.5 0 2.5 1.5 4.5 3 6 1.5-1.5 3-3.5 3-6 0-2-1.5-3.5-3-3.5z"/>
  </svg>
)

export default function App() {
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">
            <LotusIcon />
          </div>
          <div>
            <h1 className="header-title">Ayurveda Clinical Assistant</h1>
            <p className="header-subtitle">AI-Powered Ayurvedic Health Consultation</p>
          </div>
        </div>
        {/* <div className="header-status">
          <span className="status-dot"></span>
          <span>Online</span>
        </div> */}
      </header>
      <main className="app-main">
        <Chat />
      </main>
    </div>
  )
}
