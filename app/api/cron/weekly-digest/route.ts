import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from 'next-sanity'
import { weeklyDigestEmail, type DigestItem } from '@/app/lib/email/templates'

const sanity = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

const SITE_URL = 'https://anshul.ai'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  // If no secret is configured, don't allow this route to run unauthenticated in production.
  if (!secret) return false
  const header = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return header === secret
}

function formatWeekOf(): string {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export async function POST(request: Request) {
  return handleDigest(request)
}

export async function GET(request: Request) {
  return handleDigest(request)
}

async function handleDigest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured — skipping weekly digest')
    return NextResponse.json({ skipped: true, reason: 'Resend not configured' })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('Supabase not configured — skipping weekly digest')
    return NextResponse.json({ skipped: true, reason: 'Supabase not configured' })
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  let trending: DigestItem[] = []
  let dealsEvents: DigestItem[] = []
  let articles: DigestItem[] = []

  try {
    const [trendingDocs, dealEventDocs, articleDocs] = await Promise.all([
      sanity.fetch<{ title: string; slug: { current: string }; excerpt?: string }[]>(
        `*[_type == "trending" && publishedAt > $cutoff] | order(publishedAt desc) { title, slug, excerpt }`,
        { cutoff }
      ),
      sanity.fetch<{ title: string; slug: { current: string }; excerpt?: string }[]>(
        `*[_type == "deal-event" && publishedAt > $cutoff] | order(publishedAt desc) { title, slug, excerpt }`,
        { cutoff }
      ),
      sanity.fetch<{ title: string; slug: { current: string }; excerpt?: string }[]>(
        `*[_type == "article" && _createdAt > $cutoff] | order(_createdAt desc) { title, slug, excerpt }`,
        { cutoff }
      ),
    ])

    trending = (trendingDocs || []).map((d) => ({
      title: d.title,
      url: `${SITE_URL}/trending/${d.slug?.current}`,
      excerpt: d.excerpt,
    }))
    dealsEvents = (dealEventDocs || []).map((d) => ({
      title: d.title,
      url: `${SITE_URL}/deals-events/${d.slug?.current}`,
      excerpt: d.excerpt,
    }))
    articles = (articleDocs || []).map((d) => ({
      title: d.title,
      url: `${SITE_URL}/learn/${d.slug?.current}`,
      excerpt: d.excerpt,
    }))
  } catch (err) {
    console.error('Failed to fetch Sanity content for weekly digest:', err)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }

  const totalNewContent = trending.length + dealsEvents.length + articles.length
  if (totalNewContent === 0) {
    console.log('No new content in the last 7 days — skipping weekly digest')
    return NextResponse.json({ skipped: true, reason: 'No new content' })
  }

  let subscriberEmails: string[] = []
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase.from('subscribers').select('email')
    if (error) {
      console.error('Supabase error fetching subscribers:', error)
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    subscriberEmails = (data || []).map((row: { email: string }) => row.email).filter(Boolean)
  } catch (err) {
    console.error('Supabase not available:', err)
    return NextResponse.json({ error: 'Supabase not available' }, { status: 500 })
  }

  if (subscriberEmails.length === 0) {
    console.log('No subscribers — skipping weekly digest')
    return NextResponse.json({ skipped: true, reason: 'No subscribers' })
  }

  const { subject, html, text } = weeklyDigestEmail({ trending, dealsEvents, articles }, formatWeekOf())

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || 'anshul.ai <onboarding@resend.dev>'

  // Resend's batch send caps at 100 recipients per call — chunk to be safe.
  const BATCH_SIZE = 100
  let sent = 0
  const errors: string[] = []

  for (let i = 0; i < subscriberEmails.length; i += BATCH_SIZE) {
    const batch = subscriberEmails.slice(i, i + BATCH_SIZE)
    try {
      await resend.emails.send({
        from,
        to: from, // send to self, bcc real recipients to avoid exposing the list
        bcc: batch,
        subject,
        html,
        text,
      })
      sent += batch.length
    } catch (err) {
      console.error('Failed to send digest batch:', err)
      errors.push(err instanceof Error ? err.message : String(err))
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    sent,
    totalSubscribers: subscriberEmails.length,
    newContent: { trending: trending.length, dealsEvents: dealsEvents.length, articles: articles.length },
    errors: errors.length > 0 ? errors : undefined,
  })
}
