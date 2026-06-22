import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '../../lib/rateLimit'

export async function POST(req: NextRequest) {
  const rate = await checkRateLimit(req, { tool: 'generate-passage', limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return rateLimitResponse(rate)

  try {
    const { prompt } = await req.json()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data?.content?.[0]?.text || ''
    return NextResponse.json({ content: [{ text }] })
  } catch (e) {
    console.error('generate-passage error:', e)
    return NextResponse.json({ content: [{ text: '' }] }, { status: 500 })
  }
}