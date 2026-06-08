import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an elite executive coach and meeting strategist. You prepare leaders for high-stakes meetings with precision and clarity. Your briefs are concise, tactical, and immediately actionable — not generic advice.`

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

  const { meetingType, objective, attendees, context, duration } = body
  if (!objective) {
    return new Response('Missing required fields', { status: 400 })
  }

  const userPrompt = `Generate a battle-ready meeting brief for this meeting:

Meeting type: ${meetingType || 'Client presentation'}
Objective: ${objective}
Attendees: ${attendees || 'Not specified'}
Background / context: ${context || 'None provided'}
Duration: ${duration || '60 minutes'}

Produce a tight, specific brief with these sections:

## Objective & Success Criteria
One crisp statement of what winning looks like.

## Key Attendees & Their Agenda
For each attendee or group mentioned, what they care about and what they want from this meeting.

## Your Talking Points
3-5 bullets — the most important things to communicate, in priority order.

## Anticipated Objections or Questions
List the 3 most likely pushbacks or questions, with a sharp, specific response for each.

## Opening Line
The exact words to use to open the meeting and set the right tone.

## Ideal Outcome
What you want to walk out of this meeting with — a decision, a commitment, a next step.

Be specific, tactical, and concise. No filler.`

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
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
