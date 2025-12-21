import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// TAILWIND FIX v13 - Added default Tailwind colors to config so @apply works
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)