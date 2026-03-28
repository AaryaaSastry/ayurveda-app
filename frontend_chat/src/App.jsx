import React from 'react'
import Chat from './Chat'

const AyurvedicLogo = () => (
  <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="app-logo-svg">
    <circle cx="20" cy="20" r="18" fill="white" stroke="#577C9B" strokeWidth="1.5" />
    {/* Minimalist Symmetrical Medical/Botanical Symbol */}
    <path 
      d="M20 8V32M10 18C10 18 13 14 20 14C27 14 30 18 30 18M10 22C10 22 13 26 20 26C27 26 30 22 30 22" 
      stroke="#577C9B" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
    />
    <path 
      d="M20 14L20 26M14 20H26" 
      stroke="#577C9B" 
      strokeWidth="2" 
      strokeLinecap="round" 
    />
  </svg>
)

export default function App() {
  return (
    <div className="app-root">
      <nav className="app-navbar">
        <div className="app-navbar-content">
          <AyurvedicLogo />
          <h1 className="app-title">Ayurveda Clinical Assistant</h1>
        </div>
      </nav>
      <main className="app-main app-main-chatgpt">
        <Chat />
      </main>
    </div>
  )
}

