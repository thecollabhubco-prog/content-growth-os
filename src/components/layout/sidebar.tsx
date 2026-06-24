'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EMPLOYEES } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import WorkspaceSwitcher from './workspace-switcher'
import ProjectSelector from './project-selector'

const NAV_TOP = [
  { href: '/dashboard', icon: '⚡', label: 'Command Center' },
  { href: '/team', icon: '👥', label: 'My Team' },
  { href: '/business', icon: '🏢', label: 'Business Memory' },
  { href: '/stories', icon: '📖', label: 'My Stories' },
  { href: '/meeting', icon: '🎙️', label: 'Voice Meeting' },
  { href: '/calendar', icon: '📅', label: 'Content Calendar' },
  { href: '/analytics', icon: '📊', label: 'Analytics' },
  { href: '/publishing', icon: '🔌', label: 'Connections' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
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
    <aside className="w-[var(--sidebar-width)] shrink-0 border-r border-[var(--border)] bg-[var(--card)] flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">CG</span>
          </div>
          <span className="font-semibold text-sm truncate">Content Growth OS</span>
        </div>
      </div>

      {/* Workspace Switcher + Project Selector */}
      <div className="border-b border-[var(--border)]">
        <WorkspaceSwitcher />
        <div className="border-t border-[var(--border)]/50">
          <ProjectSelector />
        </div>
      </div>

      {/* Top Nav */}
      <nav className="px-3 pt-3 pb-1">
        <ul className="space-y-0.5">
          {NAV_TOP.map(item => {
            const active = pathname === item.href
            return (
              <li key={item.href}>
                <Link href={item.href} className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                  active
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                )}>
                  <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mx-3 my-2 border-t border-[var(--border)]" />

      {/* AI Team */}
      <nav className="flex-1 px-3 pb-3 space-y-3 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] px-2 mb-1">
          My AI Team
        </p>
        {byDept.map(({ dept, members }) => (
          <div key={dept}>
            <p className="text-[10px] font-medium text-[var(--muted-foreground)]/60 px-2 mb-0.5 uppercase tracking-wider">
              {dept}
            </p>
            <ul className="space-y-0.5">
              {members.map(emp => {
                const active = pathname === `/chat/${emp.id}` || pathname.startsWith(`/chat/${emp.id}`)
                const name = getName(emp.id)
                return (
                  <li key={emp.id}>
                    <Link href={`/chat/${emp.id}`} className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group',
                      active
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                    )}>
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-semibold text-white',
                        emp.bgColor
                      )}>
                        {name.charAt(0)}
                      </div>
                      <span className="truncate text-xs">{name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
