import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface BackNavValue {
  back: (() => void) | null
  setBack: (fn: (() => void) | null) => void
}

const BackNavContext = createContext<BackNavValue | null>(null)

export function BackNavProvider({ children }: { children: ReactNode }) {
  const [back, setBackState] = useState<(() => void) | null>(null)
  const setBack = (fn: (() => void) | null) => setBackState(() => fn)
  const value = useMemo(() => ({ back, setBack }), [back])
  return <BackNavContext.Provider value={value}>{children}</BackNavContext.Provider>
}

export function useBackNav() {
  const ctx = useContext(BackNavContext)
  if (!ctx) throw new Error('useBackNav must be used within BackNavProvider')
  return ctx
}
