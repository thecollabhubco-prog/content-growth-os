'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useThemeStore } from '@/stores/theme-store'
import { EMPLOYEES } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import { cn } from '@/lib/utils'

export default function TopbarSimple() {
  const { theme, toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const { getName } = useEmployeeNames()

  return (
    <>
      <header className="h-14 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between px-4 shrink-0 z-40">
        {/* Logo (mobile) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">CG</span>
          </div>
          <span className="font-semibold text-sm">ContentOS</span>
        </div>

        {/* Desktop workspace name */}
        <span className="text-sm font-medium text-[var(--muted-foreground)] hidden md:block">My Workspace</span>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Mobile team button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-9 h-9 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
          >
            👥
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-semibold">
            A
          </div>
        </div>
      </header>

      {/* Mobile team drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[var(--card)] border-l border-[var(--border)] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <span className="font-semibold text-sm">My AI Team</span>
              <button onClick={() => setMenuOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--muted)]">✕</button>
            </div>
            <div className="p-3 space-y-0.5">
              {EMPLOYEES.map(emp => {
                const active = pathname === `/chat/${emp.id}`
                return (
                  <Link
                    key={emp.id}
                    href={`/chat/${emp.id}`}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                      active ? 'bg-[var(--primary)] text-white' : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0', emp.bgColor)}>
                      {emp.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{getName(emp.id)}</div>
                      <div className={cn('text-xs truncate', active ? 'text-white/70' : 'text-[var(--muted-foreground)]')}>{emp.role}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
