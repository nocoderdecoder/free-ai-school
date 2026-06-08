import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a senior strategy consultant and competitive intelligence expert with 20 years of experience advising technology companies. You give frank, specific, and actionable competitive analysis — not generic observations. You understand both product strategy and go-to-market dynamics.`

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('API key not configured', { status: 503 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { yourProduct, competitor, industry, angle, purpose } = body
  if (!yourProduct || !competitor) {
    return new Response('Missing required fields', { status: 400 })
  }

  const userPrompt = `Generate a competitive analysis for the following:

Our product / company: ${yourProduct}
Competitor: ${competitor}
Industry / market: ${industry || 'Not specified'}
Analysis angle: ${angle || 'Full comparison'}
Purpose: ${purpose || 'Sales enablement'}

Produce a sharp, specific competitive brief with these sections:

## Competitive Snapshot
3 sentences that capture the competitive dynamic between these two players.

## Their Key Strengths
3-4 bullets — what the competitor genuinely does well.

## Their Weaknesses & Gaps
3-4 bullets — real weaknesses and gaps, not wishful thinking.

## Where You Win
3-4 bullets — where our product has a genuine, defensible advantage.

## Where They Win
3-4 bullets — honest assessment of where the competitor has the edge.

## Positioning Recommendation
How to differentiate and position against this competitor specifically. Be concrete.

## Battle Card Essentials
The 3 points to always make when this competitor comes up in a sales conversation or investor discussion.

Be frank, specific, and immediately actionable. Tailor the analysis to the stated purpose: ${purpose || 'Sales enablement'}.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      stream.on('text', (text: string) => {
        controller.enqueue(new TextEncoder().encode(text))
      })
      await stream.finalMessage()
      controller.close()
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
