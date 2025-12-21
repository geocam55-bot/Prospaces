import './styles/app.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// NEW ENTRY POINT - Complete cache invalidation
console.log('ProSpaces CRM - Entry point loaded')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
