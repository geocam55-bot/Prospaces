import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'

// MINIMAL TEST - Just render a simple div
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: '20px', backgroundColor: 'blue', color: 'white', fontSize: '24px' }}>
      <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>MINIMAL TEST</h1>
      <p>If you see this, React is working.</p>
      <div className="bg-red-500 text-white p-4 mt-4">
        If this has a red background, Tailwind is working.
      </div>
    </div>
  </React.StrictMode>,
)
