import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
    console.log("ANTHROPIC RAW:", JSON.stringify(data))
    const text = data?.content?.[0]?.text || ''
    return NextResponse.json({ content: [{ text }] })
  } catch (e) {
    console.log("ROUTE ERROR:", e)
    return NextResponse.json({ content: [{ text: '' }] }, { status: 500 })
  }
}