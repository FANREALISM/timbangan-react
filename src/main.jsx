import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initDB } from './utils/dbService'
import { registerSW } from 'virtual:pwa-register'

// Daftarkan Service Worker untuk PWA
registerSW({ immediate: true })

// Jalankan inisialisasi sebelum render
initDB().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})