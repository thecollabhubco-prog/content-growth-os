import Link from 'next/link'
import { EMPLOYEES } from '@/lib/employees'
import { cn } from '@/lib/utils'

const FEATURED = [
  'alex-morgan', 'james-harper', 'sophia-chen', 'ryan-blake',
  'maya-patel', 'olivia-rhodes', 'grace-sterling', 'kai-nakamura',
]

export default function DashboardPage() {
  const featured = EMPLOYEES.filter(e => FEATURED.includes(e.id))

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Good morning. 👋</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Your AI team is ready. Delegate anything — research, writing, publishing, analytics.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Research a topic', icon: '🔬', href: '/chat/alex-morgan', desc: 'Ask Alex' },
          { label: 'Write a blog post', icon: '✍️', href: '/chat/james-harper', desc: 'Ask James' },
          { label: 'Create LinkedIn content', icon: '💼', href: '/chat/sophia-chen', desc: 'Ask Sophia' },
          { label: 'Scan for trends', icon: '📈', href: '/chat/kai-nakamura', desc: 'Ask Kai' },
        ].map(action => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors group"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <div className="font-medium text-sm mb-0.5">{action.label}</div>
            <div className="text-xs text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">{action.desc} →</div>
          </Link>
        ))}
      </div>

      {/* Team preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Your AI Team</h2>
          <Link href="/team" className="text-xs text-[var(--primary)] hover:underline">
            View all {EMPLOYEES.length} employees →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featured.map(emp => (
            <Link
              key={emp.id}
              href={`/chat/${emp.id}`}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors group"
            >
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-xl mb-3',
                emp.bgColor
              )}>
                {emp.emoji}
              </div>
              <div className="font-medium text-sm truncate">{emp.defaultName}</div>
              <div className={cn('text-xs truncate mt-0.5', emp.color)}>{emp.role}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-2 group-hover:text-[var(--primary)] transition-colors">
                Message →
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Platform links */}
      <div>
        <h2 className="font-semibold mb-4">Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Content Calendar', icon: '📅', href: '/calendar' },
            { label: 'Analytics', icon: '📊', href: '/analytics' },
            { label: 'Publishing Connections', icon: '🔌', href: '/publishing' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3 hover:border-[var(--primary)] transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
