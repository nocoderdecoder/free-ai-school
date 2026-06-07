import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an AI adoption expert who has helped 200+ companies implement AI. You give frank, practical assessments without sugarcoating. You understand both the technical and organisational dimensions of AI adoption.

Format your response using ## for main sections and - for bullet points. Be specific and concrete — no generic advice. Give a clear readiness score (1-10) and prioritise actions by impact.`

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

  const { companySize, industry, currentAI, primaryGoal, teamFunction } = body
  if (!companySize || !industry || !currentAI || !primaryGoal || !teamFunction) {
    return new Response('Missing required fields', { status: 400 })
  }

  const userPrompt = `Assess this organisation's AI readiness:

Company Size: ${companySize}
Industry: ${industry}
Current AI Use: ${currentAI}
Primary Goal with AI: ${primaryGoal}
Primary Team/Function: ${teamFunction}

Provide a structured AI Readiness Assessment with these sections:

## Readiness Score
Give a score from 1-10 with a one-sentence verdict. Be honest.

## Where You Are
Describe their current position on the AI adoption curve and what it means practically.

## Your Biggest Opportunity
The single highest-impact AI use case for this organisation right now, with specifics.

## Top 3 Recommended Next Steps
Concrete actions in priority order. For each: what to do, how long it takes, expected impact.

## Recommended AI Tools for Your Stage
3-4 specific tools matched to their situation, team function, and goal. Explain why each one.

## Common Pitfall to Avoid
The most likely mistake organisations like this make with AI adoption.`

  const stream = anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
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
