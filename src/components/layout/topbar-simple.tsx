'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useThemeStore } from '@/stores/theme-store'
import { EMPLOYEES } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/workspace/context'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Command Center',
  '/team': 'My Team',
  '/business': 'Business Memory',
  '/stories': 'My Stories',
  '/meeting': 'Voice Meeting',
  '/calendar': 'Calendar',
  '/analytics': 'Analytics',
  '/publishing': 'Connections',
  '/settings': 'Settings',
  '/brain': 'Knowledge Brain',
  '/research': 'Research',
  '/trends': 'Trends',
}

export default function TopbarSimple() {
  const { theme, toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const { getName } = useEmployeeNames()
  const { workspace, activeProjectName } = useWorkspace()

  const pageTitle = PAGE_TITLES[pathname] || (pathname.startsWith('/chat/') ? 'Chat' : '')

  return (
    <>
      <header
        className="h-12 flex items-center justify-between px-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--sidebar-bg)' }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary)' }}>
            <span className="text-white font-bold text-[11px]">C</span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Content OS</span>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden md:flex items-center gap-1.5" style={{ color: 'var(--muted-foreground)' }}>
          <span className="text-[13px]">{workspace.name}</span>
          {activeProjectName && <>
            <span className="text-[13px] opacity-30">/</span>
            <span className="text-[13px]">{activeProjectName}</span>
          </>}
          {pageTitle && <>
            <span className="text-[13px] opacity-30">/</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--foreground)' }}>{pageTitle}</span>
          </>}
        </div>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors duration-100"
            style={{ color: 'var(--muted-foreground)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)' }}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Mobile menu */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ color: 'var(--muted-foreground)' }}
          >
            👥
          </button>

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold ml-1"
            style={{ background: 'var(--primary)' }}
          >
            A
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 flex flex-col overflow-y-auto"
            style={{ background: 'var(--sidebar-bg)', borderLeft: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-4 h-12 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>AI Team</span>
              <button onClick={() => setMenuOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-sm" style={{ color: 'var(--muted-foreground)' }}>✕</button>
            </div>
            <div className="p-2 space-y-px">
              {EMPLOYEES.map(emp => {
                const active = pathname === `/chat/${emp.id}`
                const name = getName(emp.id)
                return (
                  <Link
                    key={emp.id}
                    href={`/chat/${emp.id}`}
                    onClick={() => setMenuOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors')}
                    style={active ? { background: 'var(--surface)', color: 'var(--foreground)' } : { color: 'var(--muted-foreground)' }}
                  >
                    <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--muted)' }}>
                      {emp.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>{emp.role}</p>
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
