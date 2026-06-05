'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const MOBILE_NAV = [
  { href: '/dashboard', icon: '⚡', label: 'Home' },
  { href: '/team', icon: '👥', label: 'Team' },
  { href: '/calendar', icon: '📅', label: 'Calendar' },
  { href: '/analytics', icon: '📊', label: 'Analytics' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] border-t border-[var(--border)] px-2 pb-safe">
      <div className="flex items-center justify-around">
        {MOBILE_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-3 rounded-xl transition-colors min-w-[60px]',
                active
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)]'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
