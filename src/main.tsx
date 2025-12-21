import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

// MINIMAL TEST - Just render a simple div
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: '20px', backgroundColor: 'blue', color: 'white', fontSize: '24px' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>MINIMAL TEST - ROOT MAIN.TSX</h1>
      <p>If you see this, React is working.</p>
      <div className="bg-red-500 text-white p-4 mt-4 rounded-lg shadow-xl border-4 border-yellow-400">
        If this has a RED background with YELLOW border, Tailwind is working.
      </div>
      <div className="bg-green-500 text-white p-4 mt-4 rounded-lg">
        This should be GREEN
      </div>
      <div className="bg-purple-500 text-white p-4 mt-4 rounded-lg">
        This should be PURPLE
      </div>
    </div>
  </React.StrictMode>,
)
