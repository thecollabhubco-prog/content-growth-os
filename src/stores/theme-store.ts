'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (t: 'dark' | 'light') => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        document.documentElement.classList.toggle('light', next === 'light')
        document.documentElement.classList.toggle('dark', next === 'dark')
      },
      setTheme: (t) => {
        set({ theme: t })
        document.documentElement.classList.toggle('light', t === 'light')
        document.documentElement.classList.toggle('dark', t === 'dark')
      },
    }),
    {
      name: 'theme-store',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('light', state.theme === 'light')
          document.documentElement.classList.toggle('dark', state.theme === 'dark')
        }
      },
    }
  )
)
