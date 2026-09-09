import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SchoolApp } from './school/SchoolApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SchoolApp />
  </StrictMode>,
)
