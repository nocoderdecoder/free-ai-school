import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert GTM strategist with 15 years of experience at Google, Salesforce, and top SaaS companies. You specialise in practical, actionable go-to-market strategies for technology products.

Write in a direct, confident, and practical tone. Use concrete specifics — no generic advice. Format your response using ## for main sections and - for bullet points. Do not use excessive qualifiers like "it depends" or "consider". Give clear recommendations.`

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

  const { product, industry, stage, icp, motion, challenge } = body
  if (!product || !industry || !stage || !icp) {
    return new Response('Missing required fields', { status: 400 })
  }

  const userPrompt = `Create a comprehensive GTM playbook for the following:

Product/Company: ${product}
Industry/Market: ${industry}
Company Stage: ${stage}
Ideal Customer Profile: ${icp}
Primary GTM Motion: ${motion || 'Not specified'}
Biggest GTM Challenge: ${challenge || 'Not specified'}

Write a structured GTM playbook with these sections:

## Positioning Statement
Write a crisp, 2-sentence positioning statement.

## Ideal Customer Profile
Define the ICP precisely: company size, industry, role, and 3 key pain points.

## Top 3 GTM Channels
For each channel, explain why it fits this specific product and motion, and give a concrete first action.

## 90-Day Activation Plan
Month 1, Month 2, Month 3 — specific actions and milestones.

## Key Metrics to Track
List 5 metrics that matter for this stage and motion.

## AI Tools to Accelerate This GTM
Recommend 3-4 AI tools specifically for this GTM motion and explain how to use each.`

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
