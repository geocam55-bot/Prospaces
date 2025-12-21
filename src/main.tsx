import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// NUCLEAR REBUILD v7 - ES MODULE FIX! package.json has "type": "module"
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)