import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, source } = body
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  // Try Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      const { error } = await supabase
        .from('subscribers')
        .upsert(
          { email, source: source || 'website', subscribed_at: new Date().toISOString() },
          { onConflict: 'email' }
        )

      if (error) {
        console.error('Supabase error:', error)
        // Don't fail — just log it
      }
    } catch (err) {
      console.error('Supabase not available:', err)
    }
  }

  // Always succeed (even without Supabase)
  return NextResponse.json({ success: true })
}
