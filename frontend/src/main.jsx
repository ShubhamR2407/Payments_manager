import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/* index.css removed - using global.css via App */
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
