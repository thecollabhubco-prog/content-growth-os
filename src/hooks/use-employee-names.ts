'use client'

import { useState, useEffect } from 'react'
import { EMPLOYEES, getEmployeeName, setEmployeeName } from '@/lib/employees'

export function useEmployeeNames() {
  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const loaded: Record<string, string> = {}
    EMPLOYEES.forEach(e => {
      loaded[e.id] = getEmployeeName(e.id)
    })
    setNames(loaded)
  }, [])

  function getName(id: string): string {
    return names[id] || EMPLOYEES.find(e => e.id === id)?.defaultName || id
  }

  function updateName(id: string, name: string) {
    setEmployeeName(id, name)
    setNames(prev => ({ ...prev, [id]: name }))
  }

  function resetName(id: string) {
    localStorage.removeItem(`employee_name_${id}`)
    const defaultName = EMPLOYEES.find(e => e.id === id)?.defaultName || id
    setNames(prev => ({ ...prev, [id]: defaultName }))
  }

  return { names, getName, updateName, resetName }
}
