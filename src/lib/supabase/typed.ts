import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Admin client with service role — bypasses RLS
export function createTypedAdminClient() {
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  return client
}

// Typed from() helper — resolves inference issues with older @supabase/supabase-js versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function from<T extends keyof Database['public']['Tables']>(client: any, table: T) {
  return client.from(table) as {
    select(cols?: string, opts?: object): any
    insert(vals: Database['public']['Tables'][T]['Insert'] | Database['public']['Tables'][T]['Insert'][], opts?: object): any
    update(vals: Database['public']['Tables'][T]['Update'], opts?: object): any
    delete(): any
    eq(col: string, val: unknown): any
    neq(col: string, val: unknown): any
    in(col: string, vals: unknown[]): any
    order(col: string, opts?: object): any
    limit(n: number): any
    range(from: number, to: number): any
    single(): any
    rpc(fn: string, params?: object): any
  }
}
