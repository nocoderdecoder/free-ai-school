import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert AI tool advisor who has evaluated every major AI tool on the market. You give specific, opinionated recommendations — not generic advice. You understand that business professionals need tools that are practical and immediately useful.`

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

  const { role, useCase, teamSize, budget, technical } = body
  if (!role || !useCase) {
    return new Response('Missing required fields', { status: 400 })
  }

  const userPrompt = `Recommend the best AI tools for this professional:

Role / job function: ${role}
Primary use case: ${useCase}
Team size: ${teamSize || 'Individual'}
Budget: ${budget || 'Free only'}
Technical level: ${technical || 'Non-technical'}

Lead with a 2-sentence "Your AI Toolkit Summary" that captures their situation and what AI can do for them.

Then recommend 4-5 specific AI tools. For each tool use ## Tool Name as the heading and include:
- What it does
- Why it fits their specific situation
- Pricing
- Getting started step
- One power tip

Be specific and opinionated. Favour tools that match their budget and technical level.`

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
