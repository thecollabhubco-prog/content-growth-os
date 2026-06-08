'use client'

import { Employee } from '@/lib/employees'
import { cn } from '@/lib/utils'

interface EmployeeCardProps {
  employee: Employee
  isSpeaking: boolean
  hasSpoken: boolean
  lastMessage?: string
  isSmall?: boolean
}

export default function EmployeeCard({ employee, isSpeaking, hasSpoken, lastMessage, isSmall }: EmployeeCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center rounded-2xl border transition-all duration-300 overflow-hidden',
        isSmall ? 'p-3 gap-2' : 'p-4 gap-3',
        isSpeaking
          ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/20'
          : hasSpoken
          ? 'border-[var(--border)] bg-[var(--card)]'
          : 'border-[var(--border)] bg-[var(--card)] opacity-70'
      )}
    >
      {/* Speaking ring animation */}
      {isSpeaking && (
        <>
          <div className="absolute inset-0 rounded-2xl border-2 border-[var(--primary)] animate-ping opacity-20" />
          <div className="absolute inset-0 rounded-2xl border border-[var(--primary)] opacity-60" />
        </>
      )}

      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold text-white transition-all duration-300',
            isSmall ? 'w-12 h-12 text-xl' : 'w-16 h-16 text-2xl',
            isSpeaking ? 'scale-110' : 'scale-100',
            employee.bgColor
          )}
        >
          {employee.emoji}
        </div>

        {/* Speaking indicator dot */}
        {isSpeaking && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[var(--primary)] rounded-full border-2 border-[var(--background)] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Name & Role */}
      <div className="text-center min-w-0 w-full">
        <div className={cn('font-semibold truncate', isSmall ? 'text-xs' : 'text-sm')}>
          {employee.defaultName}
        </div>
        <div className={cn('text-[var(--muted-foreground)] truncate', isSmall ? 'text-[10px]' : 'text-xs')}>
          {employee.role}
        </div>
      </div>

      {/* Speaking audio bars */}
      {isSpeaking && (
        <div className="flex items-end gap-0.5 h-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1 bg-[var(--primary)] rounded-full"
              style={{
                height: `${Math.random() * 16 + 4}px`,
                animation: `audioBar 0.${3 + i}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Last message snippet */}
      {!isSpeaking && lastMessage && !isSmall && (
        <div className="text-[10px] text-[var(--muted-foreground)] text-center line-clamp-2 px-1 mt-1 italic">
          "{lastMessage.substring(0, 60)}{lastMessage.length > 60 ? '...' : ''}"
        </div>
      )}

      {/* Mic muted state */}
      {!hasSpoken && !isSpeaking && (
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {isSmall ? '•' : 'Waiting...'}
        </div>
      )}
    </div>
  )
}
