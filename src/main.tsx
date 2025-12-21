import './styles/app.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// TAILWIND FIX v15 - Changed CSS file name to force cache invalidation
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)