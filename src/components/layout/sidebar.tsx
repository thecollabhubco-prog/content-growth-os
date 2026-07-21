'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EMPLOYEES } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import WorkspaceSwitcher from './workspace-switcher'
import ProjectSelector from './project-selector'

const NAV_TOP = [
  { href: '/dashboard',  emoji: '⚡', label: 'Command Center' },
  { href: '/team',       emoji: '👥', label: 'My Team' },
  { href: '/library',    emoji: '📚', label: 'Content Library' },
  { href: '/business',   emoji: '🏢', label: 'Business Memory' },
  { href: '/stories',    emoji: '📖', label: 'My Stories' },
  { href: '/meeting',    emoji: '🎙️', label: 'Voice Meeting' },
  { href: '/calendar',   emoji: '📅', label: 'Calendar' },
  { href: '/analytics',  emoji: '📊', label: 'Analytics' },
  { href: '/publishing', emoji: '🔌', label: 'Connections' },
  { href: '/settings',   emoji: '⚙️', label: 'Settings' },
]

const DEPT_ORDER = ['Strategy', 'Content', 'Social Media', 'Video', 'Email', 'Design', 'Operations']

export default function Sidebar() {
  const pathname = usePathname()
  const { getName } = useEmployeeNames()

  const byDept = DEPT_ORDER.map(dept => ({
    dept,
    members: EMPLOYEES.filter(e => e.department === dept),
  })).filter(d => d.members.length > 0)

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 h-12 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0"
          style={{ background: 'var(--primary)', opacity: 0.9 }}
        >
          <span className="text-white font-bold text-[11px]">C</span>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
          Content OS
        </span>
      </div>

      {/* Workspace + Project switchers */}
      <div className="shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <WorkspaceSwitcher />
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <ProjectSelector />
        </div>
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-2 pb-4">

        {/* Top Nav */}
        <nav className="px-2 mb-1">
          <ul className="space-y-px">
            {NAV_TOP.map(item => {
              const active = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-100 relative',
                    )}
                    style={active ? {
                      background: 'var(--surface)',
                      color: 'var(--foreground)',
                      fontWeight: 500,
                    } : {
                      color: 'var(--muted-foreground)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
                        ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
                        ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                      }
                    }}
                  >
                    {/* Active accent bar */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[18px] rounded-r-full"
                        style={{ background: 'var(--primary)' }}
                      />
                    )}
                    {/* Emoji in a subtle pill */}
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-md text-sm shrink-0 transition-all"
                      style={{
                        background: active ? 'var(--primary-subtle)' : 'transparent',
                        fontSize: '14px',
                        lineHeight: 1,
                      }}
                    >
                      {item.emoji}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="mx-3 my-3" style={{ borderTop: '1px solid var(--border)' }} />

        {/* AI Team */}
        <nav className="px-2">
          <p
            className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            AI Team
          </p>

          <div className="space-y-4">
            {byDept.map(({ dept, members }) => (
              <div key={dept}>
                <p
                  className="px-2.5 mb-1 text-[9px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--muted-foreground)', opacity: 0.45 }}
                >
                  {dept}
                </p>
                <ul className="space-y-px">
                  {members.map(emp => {
                    const active = pathname.startsWith(`/chat/${emp.id}`)
                    const name = getName(emp.id)
                    return (
                      <li key={emp.id}>
                        <Link
                          href={`/chat/${emp.id}`}
                          className="flex items-center gap-2 px-2.5 py-[6px] rounded-lg transition-all duration-100 relative"
                          style={active ? {
                            background: 'var(--surface)',
                            color: 'var(--foreground)',
                          } : {
                            color: 'var(--muted-foreground)',
                          }}
                          onMouseEnter={e => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                            }
                          }}
                          onMouseLeave={e => {
                            if (!active) {
                              (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'
                              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                            }
                          }}
                        >
                          {active && (
                            <span
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[14px] rounded-r-full"
                              style={{ background: 'var(--primary)' }}
                            />
                          )}
                          {/* Emoji avatar */}
                          <span
                            className="w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 text-sm"
                            style={{
                              background: active ? 'var(--primary-subtle)' : 'var(--muted)',
                              fontSize: '12px',
                            }}
                          >
                            {emp.emoji}
                          </span>
                          <span className="text-[13px] truncate">{name}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  )
}
