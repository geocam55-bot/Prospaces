import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// TAILWIND FIX v14 - Force CSS rebuild by updating import timestamp
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)