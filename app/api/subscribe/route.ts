import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { welcomeEmail } from '@/app/lib/email/templates'

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
      } else {
        // Fire-and-forget welcome email — never block or fail the subscribe response on this.
        await sendWelcomeEmail(email)
      }
    } catch (err) {
      console.error('Supabase not available:', err)
    }
  }

  // Always succeed (even without Supabase)
  return NextResponse.json({ success: true })
}

async function sendWelcomeEmail(email: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured — skipping welcome email')
    return
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html, text } = welcomeEmail()

    await resend.emails.send({
      // NOTE: sandbox sender — update RESEND_FROM_EMAIL once a custom domain is verified in Resend.
      from: process.env.RESEND_FROM_EMAIL || 'anshul.ai <onboarding@resend.dev>',
      to: email,
      subject,
      html,
      text,
    })
  } catch (err) {
    console.error('Failed to send welcome email:', err)
    // Never fail the subscribe request because of an email error.
  }
}
