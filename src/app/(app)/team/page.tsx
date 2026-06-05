'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EMPLOYEES, type Employee } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import { cn } from '@/lib/utils'

const DEPARTMENTS = ['All', 'Strategy', 'Content', 'Social Media', 'Video', 'Email', 'Design', 'Operations']

function EmployeeCard({ employee, name, onRename }: {
  employee: Employee
  name: string
  onRename: (id: string, name: string) => void
}) {
  const [editMode, setEditMode] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const [showProfile, setShowProfile] = useState(false)

  function saveRename() {
    if (editValue.trim()) onRename(employee.id, editValue.trim())
    setEditMode(false)
  }

  return (
    <>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--primary)]/50 transition-all group">
        {/* Avatar Header */}
        <div className={cn('h-20 flex items-center justify-center relative', employee.bgColor)}>
          <span className="text-4xl">{employee.emoji}</span>
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
              {employee.department}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4">
          {/* Name + rename */}
          <div className="flex items-start justify-between gap-2 mb-1">
            {editMode ? (
              <div className="flex gap-1 flex-1">
                <input
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditMode(false) }}
                  className="flex-1 text-sm font-semibold bg-[var(--muted)] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] min-w-0"
                />
                <button onClick={saveRename} className="text-xs text-green-400 shrink-0">✓</button>
                <button onClick={() => setEditMode(false)} className="text-xs text-[var(--muted-foreground)] shrink-0">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-semibold text-sm truncate">{name}</h3>
                <button
                  onClick={() => { setEditValue(name); setEditMode(true) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0"
                  title="Rename employee"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          <p className={cn('text-xs font-medium mb-2', employee.color)}>{employee.role}</p>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed mb-4 line-clamp-2">
            {employee.tagline}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <Link
              href={`/chat/${employee.id}`}
              className="flex-1 bg-[var(--primary)] text-white text-xs py-2 rounded-lg text-center font-medium hover:opacity-90 transition"
            >
              Message {name.split(' ')[0]}
            </Link>
            <button
              onClick={() => setShowProfile(true)}
              className="border border-[var(--border)] text-xs px-3 py-2 rounded-lg hover:bg-[var(--muted)] transition text-[var(--muted-foreground)]"
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={cn('h-24 flex items-center justify-center relative', employee.bgColor)}>
              <span className="text-5xl">{employee.emoji}</span>
              <button
                onClick={() => setShowProfile(false)}
                className="absolute top-3 right-3 w-7 h-7 bg-black/20 rounded-full flex items-center justify-center text-white hover:bg-black/40 transition text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start justify-between mb-1">
                <h2 className="text-lg font-bold">{name}</h2>
                <button
                  onClick={() => { setEditValue(name); setEditMode(true); setShowProfile(false) }}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] px-2 py-1 rounded-md transition"
                >
                  Rename
                </button>
              </div>
              <p className={cn('text-sm font-medium mb-1', employee.color)}>{employee.role}</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">{employee.department} Department</p>

              <p className="text-sm leading-relaxed mb-5 text-[var(--foreground)]">{employee.description}</p>

              <div className="mb-5">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Responsibilities</h4>
                <ul className="space-y-1.5">
                  {employee.responsibilities.map(r => (
                    <li key={r} className="flex items-center gap-2 text-sm">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', employee.bgColor)} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/chat/${employee.id}`}
                onClick={() => setShowProfile(false)}
                className="block w-full bg-[var(--primary)] text-white text-sm py-2.5 rounded-xl text-center font-medium hover:opacity-90 transition"
              >
                Message {name.split(' ')[0]}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function TeamPage() {
  const [filter, setFilter] = useState('All')
  const { getName, updateName } = useEmployeeNames()

  const filtered = filter === 'All'
    ? EMPLOYEES
    : EMPLOYEES.filter(e => e.department === filter)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My AI Team</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          {EMPLOYEES.length} AI employees ready to work. Click any name to rename them. Click a card to start delegating.
        </p>
      </div>

      {/* Department filter */}
      <div className="flex flex-wrap gap-2">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => setFilter(dept)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full transition-colors',
              filter === dept
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            )}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(emp => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            name={getName(emp.id)}
            onRename={updateName}
          />
        ))}
      </div>
    </div>
  )
}
